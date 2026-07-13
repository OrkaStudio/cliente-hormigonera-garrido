/**
 * Planta hormigonera simulada — servidor Modbus TCP.
 *
 * Reemplaza al mbslave: en vez de mover registros a mano, la planta CICLA sola
 * (reposo → dosificando → fin de ciclo) igual que la de Monte. Sirve para ensayar
 * el flujo completo: Node-RED tiene que detectar el fin de cada carga y guardarla.
 *
 *   node simulador/planta.js
 *
 * Variables de entorno:
 *   PORT=502     puerto Modbus (en Linux/WSL, <1024 necesita sudo)
 *   SESGO=0.019  sobredosificación sistemática de cemento (0 = balanza perfecta)
 *   CICLO=20     segundos que dura una carga completa
 *
 * OJO: el mapa de registros es el FICTICIO. Cuando llegue el de GENROD, se cambia
 * acá y en la función de Node-RED — y el resto del sistema no se entera.
 */

const ModbusRTU = require("modbus-serial");

const PUERTO = Number(process.env.PORT || 502);
const SESGO = Number(process.env.SESGO ?? 0.019);
const CICLO = Number(process.env.CICLO || 20) * 1000;

// Recetas: kg de cemento, litros de agua y kg de áridos por m³.
const RECETAS = [
  { id: 13, cemento: 230, agua: 155, aridos: 1950 },
  { id: 17, cemento: 260, agua: 158, aridos: 1940 },
  { id: 21, cemento: 284, agua: 160, aridos: 1930 },
  { id: 25, cemento: 320, agua: 162, aridos: 1920 },
  { id: 30, cemento: 350, agua: 165, aridos: 1900 },
];

const registros = new Uint16Array(40);

const ESTADO = { PARADO: 0, AUTOMATICO: 1, PAUSA: 2 };
const R = {
  RECETA: 0,
  M3: 1, // ×100
  CEMENTO_OBJ: 9,
  CEMENTO_REAL: 10,
  AGUA_OBJ: 11,
  AGUA_REAL: 12,
  ARIDOS_OBJ: 13,
  ARIDOS_REAL: 14,
  ADITIVO_OBJ: 15, // ×100
  ADITIVO_REAL: 16, // ×100
  BATCHES: 19,
  ESTADO: 20,
};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const ruido = (base, pct) => base * (1 + (Math.random() * 2 - 1) * pct);

let nroBatch = 0;

async function producirUnaCarga() {
  const receta = RECETAS[Math.floor(Math.random() * RECETAS.length)];
  const m3 = Math.round((6 + Math.random() * 2) * 10) / 10; // camión de 6 a 8 m³

  const objetivo = {
    cemento: Math.round(receta.cemento * m3),
    agua: Math.round(receta.agua * m3),
    aridos: Math.round(receta.aridos * m3),
    aditivo: Math.round(receta.cemento * m3 * 0.005 * 100) / 100,
  };

  // Lo que REALMENTE va a entrar. El cemento se pasa siempre (caída libre mal
  // afinada); el resto es ruido de balanza alrededor del objetivo.
  const real = {
    cemento: Math.round(objetivo.cemento * (1 + SESGO) * ruido(1, 0.003)),
    agua: Math.round(ruido(objetivo.agua, 0.01)),
    aridos: Math.round(ruido(objetivo.aridos, 0.005)),
    aditivo: Math.round(ruido(objetivo.aditivo, 0.02) * 100) / 100,
  };

  nroBatch++;

  // --- Arranca el ciclo: la receta y los objetivos ya están, los reales en cero.
  registros[R.RECETA] = receta.id;
  registros[R.M3] = Math.round(m3 * 100);
  registros[R.CEMENTO_OBJ] = objetivo.cemento;
  registros[R.AGUA_OBJ] = objetivo.agua;
  registros[R.ARIDOS_OBJ] = objetivo.aridos;
  registros[R.ADITIVO_OBJ] = Math.round(objetivo.aditivo * 100);
  registros[R.CEMENTO_REAL] = 0;
  registros[R.AGUA_REAL] = 0;
  registros[R.ARIDOS_REAL] = 0;
  registros[R.ADITIVO_REAL] = 0;
  registros[R.BATCHES] = 1;
  registros[R.ESTADO] = ESTADO.AUTOMATICO;

  console.log(
    `▶ batch ${nroBatch} · H${receta.id} · ${m3} m³ — dosificando…`,
  );

  // --- Dosificación: los pesos suben de a poco, como en la planta real.
  const pasos = 6;
  const pausa = (CICLO * 0.6) / pasos;
  for (let i = 1; i <= pasos; i++) {
    const f = i / pasos;
    registros[R.CEMENTO_REAL] = Math.round(real.cemento * f);
    registros[R.AGUA_REAL] = Math.round(real.agua * f);
    registros[R.ARIDOS_REAL] = Math.round(real.aridos * f);
    registros[R.ADITIVO_REAL] = Math.round(real.aditivo * f * 100);
    await dormir(pausa);
  }

  // --- Fin del ciclo: automático → parado. ESTE es el flanco que Node-RED espera.
  registros[R.BATCHES] = 0;
  registros[R.ESTADO] = ESTADO.PARADO;

  const desvio = real.cemento - objetivo.cemento;
  console.log(
    `■ batch ${nroBatch} terminado — cemento ${real.cemento} kg vs ${objetivo.cemento} kg de receta ` +
      `(${desvio >= 0 ? "+" : ""}${desvio} kg) · Node-RED debería guardarlo ahora`,
  );

  // El HMI deja los valores en pantalla un rato antes del próximo batch.
  await dormir(CICLO * 0.4);
}

const servidor = new ModbusRTU.ServerTCP(
  {
    getHoldingRegister: (addr, unitID, cb) => cb(null, registros[addr] || 0),
    getInputRegister: (addr, unitID, cb) => cb(null, registros[addr] || 0),
  },
  { host: "0.0.0.0", port: PUERTO, debug: false, unitID: 1 },
);

servidor.on("socketError", (e) => console.error("socket:", e.message));

console.log(`Planta simulada escuchando Modbus TCP en 0.0.0.0:${PUERTO} (Slave ID 1)`);
console.log(
  `Sesgo del cemento: +${(SESGO * 100).toFixed(1)}% · ciclo de ${CICLO / 1000} s por carga`,
);
console.log("Ctrl+C para parar la planta.\n");

(async () => {
  for (;;) {
    await producirUnaCarga();
  }
})();
