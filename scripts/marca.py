"""
Prepara el isotipo HM de Hormimonte para la aplicacion y el papel.

DE DONDE SALE. El unico original que tenemos es una captura chica y
desenfocada (`public/marca/Captura de pantalla 2026-08-25 122846.png`).
Se probaron dos caminos:

  · dibujarlo a mano desde medidas  -> `scripts/marca-dibujada.py`
    957 bytes, 3 formas, 0,56% de error de forma
  · trazarlo del bitmap            -> este, `public/marca/origen-trazado.svg`
    76 KB, 170 caminos, 0,26% de error de forma

Fran eligio el trazado: es mas fiel a la forma. Se paga en peso y en que el
borde se ve algo dentado por debajo de 48 px, porque el trazador siguio el
temblor del JPEG nodo por nodo.

QUE LE HACE ESTE SCRIPT AL ORIGEN:

  1. aplana los 165 colores a 3. Los otros 162 eran basura de compresion
     —marrones sucios entre el rojo y el gris—, no decisiones de diseno.
  2. saca el rectangulo blanco de fondo, para que la marca quede
     transparente y se pueda apoyar sobre el crema de la barra.
  3. recorta el viewBox a la marca.
  4. saca la variante de una sola tinta para imprimir en laser monocroma.

NO se redondean las coordenadas: probado, ahorra 28% de peso pero sube el
error de forma de 0,26% a 0,63%, que es peor que la version dibujada. Ahi
se pierde el unico motivo para haber elegido esta.

Uso:  python3 scripts/marca.py
"""
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / 'public/marca/origen-trazado.svg'

ROJO, CARBON, BLANCO = '#DA251B', '#454142', '#FFFFFF'
# Para una sola tinta NO se usa opacidad: los 170 caminos estan apilados y
# una opacidad por camino se compone donde se superponen, y ensucia todo.
# Dos grises planos hacen el mismo trabajo sin ese problema.
MONO_ARO, MONO_GRIS = '#1A1A1A', '#6E6E6E'

CAJA = '129 69 757 860'          # la marca dentro del lienzo de 1024 del origen


def tinta(hexa):
    """A cual de las tres tintas se parece mas este color."""
    c = [int(hexa[i:i + 2], 16) for i in (1, 3, 5)]
    d = {}
    for nombre, ref in (('rojo', ROJO), ('carbon', CARBON), ('blanco', BLANCO)):
        r = [int(ref[i:i + 2], 16) for i in (1, 3, 5)]
        d[nombre] = sum((a - b) ** 2 for a, b in zip(c, r))
    return min(d, key=d.get)


def preparar(aro, gris):
    svg = ORIGEN.read_text()
    reparto = {'rojo': 0, 'carbon': 0, 'blanco': 0}

    def recolorear(m):
        n = tinta(m.group(1))
        reparto[n] += 1
        return f'fill="{ {"rojo": aro, "carbon": gris, "blanco": BLANCO}[n] }"'

    svg = re.sub(r'fill="(#[0-9A-Fa-f]{6})"', recolorear, svg)
    # El trazador escupe 2 decimales; con 1 alcanza y sobra a este tamano.
    # Bajar a enteros NO: probado, ahorra 28% pero el error de forma sube de
    # 0,26% a 0,63% y ahi ya conviene la version dibujada.
    svg = re.sub(r'd="([^"]+)"',
                 lambda m: 'd="' + re.sub(r'\d+\.\d{2,}',
                     lambda n: f'{float(n.group(0)):.1f}', m.group(1)) + '"', svg)
    # el fondo: el primer camino es el rectangulo del lienzo entero
    svg = re.sub(r'<path d="M0 0 [^"]*" fill="[^"]*"[^/]*/>', '', svg, count=1)
    svg = re.sub(r'width="1024"\s+height="1024"', f'viewBox="{CAJA}"', svg)
    svg = re.sub(r'\s+', ' ', svg).replace('> <', '><').strip()
    svg = svg.replace('<svg ', '<svg role="img" aria-label="Hormimonte" ', 1)
    return svg, reparto


def main():
    color, reparto = preparar(ROJO, CARBON)
    mono, _ = preparar(MONO_ARO, MONO_GRIS)
    print(f'caminos por tinta: {reparto}')

    for nombre, svg in (('isotipo.svg', color), ('isotipo-mono.svg', mono)):
        destino = RAIZ / 'public/marca' / nombre
        destino.write_text(svg)
        print(f'{destino.relative_to(RAIZ)} — {len(svg):,} bytes')

    # El favicon: la marca completa. A 16 px la H se empasta, pero es la marca
    # de verdad en vez del cuadrado con una H inventada que habia antes.
    icono = RAIZ / 'app/icon.svg'
    icono.write_text(color)
    print(f'{icono.relative_to(RAIZ)} — {len(color):,} bytes')


if __name__ == '__main__':
    main()
