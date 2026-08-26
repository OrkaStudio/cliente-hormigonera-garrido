"""
Isotipo HM de Hormimonte, dibujado a mano desde las medidas del original.

MODELO (corregido con Fran el 25/08, mirando el logo con zoom):
el fondo adentro del anillo es BLANCO. No hay disco gris. El gris son piezas
sueltas apoyadas sobre ese blanco:

  · el ANILLO rojo, un aro con el hueco arriba y las puntas cortadas por una
    curva empinada (no un corte radial)
  · la OLA, la masa de abajo, con el borde de arriba ondulado: dos crestas
    (y~395 y y~399) y un valle en el medio (y~425)
  · la H, que se apoya sobre el blanco y no toca ninguna otra pieza
  · la M en blanco calada sobre la ola, con su contraforma central como
    triangulito oscuro suelto

Verificado contando componentes conexos del bitmap: el gris son tres islas.

NO se traza nada del mapa de bits. Se intento y no da: el original es una
captura de 500 px desenfocada y con artefactos de JPEG, y cualquier trazador
deja el borde dentado y rompe los vertices de la M. Todo lo de aca son
circunferencias exactas, curvas suaves por puntos medidos, y poligonos.

Medidas en pixeles de `public/marca/Captura de pantalla 2026-08-25 122846.png`.

Uso:  python3 scripts/marca.py
"""
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parent.parent

# El centro se mide con el borde INFERIOR del rojo, no con el bounding box:
# arriba el aro esta cortado y el bbox queda corrido 25 px hacia abajo.
CX, CY, REXT, RINT = 525.5, 520.5, 265.5, 184.0
X0, Y0 = 260, 176
ANCHO, ALTO = 531, 610

ROJO, CARBON, BLANCO = '#DA251B', '#454142', '#FFFFFF'

# --- anillo -----------------------------------------------------------------
# Las puntas: el aro exterior se corta y de ahi baja un filo empinado hasta
# el aro interior. Estos seis valores NO son a ojo: salen de un descenso por
# coordenadas contra el RENDER del SVG comparado con el original, pixel a
# pixel. Bajaron el error de forma de 0,70% a 0,56%.
#
# ⚠️ Se intento antes ajustarlos contra un modelo analitico del filo y salio
# PEOR (0,70% -> 4,03%): el modelo se despegaba de lo que el navegador
# dibuja de verdad. Si se vuelven a tocar, medir sobre el render.
ANG_PUNTA_EXT, ANG_PUNTA_INT = 124.86, 178.0
PUNTA_INT = (400.86, 310.57)        # arranque del filo
CTRL_FILO = (326.29, 405.43)        # control de la cuadratica

# --- ola --------------------------------------------------------------------
# Borde superior, medido columna por columna salteando las astas de la H.
OLA = [(346.9, 444.7), (375, 399), (405, 395), (420, 395), (495, 418),
       (525, 425), (555, 426), (645, 412), (675, 403), (706.6, 451.0)]
R_OLA = 194.0                        # radio con que cierra por abajo, bajo el aro

# --- H ----------------------------------------------------------------------
HX0, HX1, ASTA, CEJA0, CEJA1, PIE, TOPE = 431, 627, 52, 258, 295, 387, 176

# --- M ----------------------------------------------------------------------
# Patas abiertas; los dos contadores de abajo tienen vertice en y=512.
# El tope va plano en 412 porque arriba se funde con el blanco de la ola.
M = [(433, 412), (627, 412), (655, 628), (607, 628), (589, 512),
     (538, 628), (516, 628), (468, 512), (449, 628), (399, 628)]
# La contraforma central: isla oscura, medida x 491-565, y 418-521.
TRIANGULO = [(488, 414), (568, 414), (528, 530)]


def v(x, y):
    return x - X0, y - Y0


def polar(deg, r):
    t = np.deg2rad(deg)
    return v(CX + r * np.cos(t), CY - r * np.sin(t))


def esp(p):
    """Espeja un punto respecto del eje vertical de la marca."""
    return (2 * CX - p[0], p[1])


def anillo():
    pei, ped = polar(ANG_PUNTA_EXT, REXT), polar(180 - ANG_PUNTA_EXT, REXT)
    pii, pid = v(*PUNTA_INT), v(*esp(PUNTA_INT))
    ci, cd = v(*CTRL_FILO), v(*esp(CTRL_FILO))
    ii, id_ = polar(ANG_PUNTA_INT, RINT), polar(180 - ANG_PUNTA_INT, RINT)
    return (
        f'M {pii[0]:.1f} {pii[1]:.1f} '
        f'Q {ci[0]:.1f} {ci[1]:.1f} {ii[0]:.1f} {ii[1]:.1f} '        # filo izq
        f'A {RINT} {RINT} 0 1 0 {id_[0]:.1f} {id_[1]:.1f} '          # aro interior
        f'Q {cd[0]:.1f} {cd[1]:.1f} {pid[0]:.1f} {pid[1]:.1f} '      # filo der
        f'L {ped[0]:.1f} {ped[1]:.1f} '                              # corte punta der
        f'A {REXT} {REXT} 0 1 1 {pei[0]:.1f} {pei[1]:.1f} Z'         # aro exterior
    )


def suave(pts):
    """Catmull-Rom -> Bezier cubica. Curva suave que PASA por los puntos
    medidos, en vez de aproximarlos."""
    P = [pts[0]] + list(pts) + [pts[-1]]
    d = f'M {pts[0][0]:.1f} {pts[0][1]:.1f}'
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += (f' C {c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} '
              f'{p2[0]:.1f} {p2[1]:.1f}')
    return d


def ola():
    pts = [v(x, y) for x, y in OLA]
    ini = pts[0]
    return (suave(pts) +
            f' A {R_OLA} {R_OLA} 0 1 1 {ini[0]:.1f} {ini[1]:.1f} Z')


def hache():
    x0, x1 = HX0 - X0, HX1 - X0
    top, c0, c1, pie = TOPE - Y0, CEJA0 - Y0, CEJA1 - Y0, PIE - Y0
    return (f'M {x0} {top} H {x0+ASTA} V {c0} H {x1-ASTA} V {top} H {x1} V {pie} '
            f'H {x1-ASTA} V {c1} H {x0+ASTA} V {pie} H {x0} Z')


def pts(lista):
    return ' '.join(f'{a:.0f},{b:.0f}' for a, b in (v(x, y) for x, y in lista))


def armar(tinta_roja, tinta_gris, opacidad=None):
    """`opacidad` es para la version de una sola tinta: si el aro y el gris
    salen del mismo negro, el creciente se funde con la ola y se pierde la
    forma. Bajandole el tono al gris vuelven a leerse como dos piezas."""
    op = '' if opacidad is None else f' opacity="{opacidad}"'
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ANCHO} {ALTO}" '
        f'role="img" aria-label="Hormimonte">'
        # La ola va PRIMERO y se mete unos px bajo el aro. Dibujada despues,
        # le come una franja de rojo en toda la vuelta de abajo.
        f'<path d="{ola()}" fill="{tinta_gris}"{op}/>'
        f'<path d="{anillo()}" fill="{tinta_roja}"/>'
        f'<polygon points="{pts(M)}" fill="{BLANCO}"/>'
        f'<polygon points="{pts(TRIANGULO)}" fill="{tinta_gris}"{op}/>'
        f'<path d="{hache()}" fill="{tinta_gris}"{op}/>'
        f'</svg>'
    )


def main():
    salidas = {
        'isotipo.svg': armar(ROJO, CARBON),
        'isotipo-mono.svg': armar('currentColor', 'currentColor', '.72'),
    }
    for nombre, svg in salidas.items():
        destino = RAIZ / 'public/marca' / nombre
        destino.write_text(svg)
        print(f'{destino.relative_to(RAIZ)} — {len(svg)} bytes')

    cuerpo = (salidas['isotipo.svg']
              .replace('<svg xmlns="http://www.w3.org/2000/svg" ', '<svg ')
              .replace('aria-label="Hormimonte">',
                       'aria-label="Hormimonte" className={className}>'))
    comp = RAIZ / 'components/marca/isotipo.tsx'
    comp.parent.mkdir(exist_ok=True)
    comp.write_text(
        '// GENERADO POR scripts/marca.py — no editar a mano.\n'
        '// Para cambiar la marca se tocan las medidas del script y se corre\n'
        '// de nuevo: `python3 scripts/marca.py`.\n\n'
        'export function Isotipo({ className }: { className?: string }) {\n'
        f'  return (\n    {cuerpo}\n  );\n'
        '}\n')
    print(f'{comp.relative_to(RAIZ)}')


if __name__ == '__main__':
    main()
