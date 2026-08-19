/**
 * Node-RED de bolsillo: hace exactamente lo mismo que el flujo (leer 30 registros,
 * detectar el fin de ciclo, postear la carga), pero en 60 líneas y por consola.
 *
 *   node simulador/verificar.js            # lee y guarda en Supabase
 *   node simulador/verificar.js --solo-leer  # solo muestra los registros, no guarda
 *
 * Para qué sirve: si algo no anda, esto te dice DE QUÉ LADO está el problema.
 *   - Si esto lee bien y Node-RED no → el problema es el flujo de Node-RED.
 *   - Si esto tampoco lee → el problema es la red / el HMI / la IP / el puerto.
 * En la planta es la primera herramienta que corrés.
 */

const ModbusRTU = require("modbus-serial");

const HOST = process.env.HMI_HOST || "127.0.0.1";
const PUERTO = Number(process.env.HMI_PORT || 502);
const SUPABASE = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const KEY = process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const soloLeer = process.argv.includes("--solo-leer");

const cliente = new ModbusRTU();
let estadoPrevio = null;
let nro = 9000;

async function guardar(carga) {
  const r = await fetch(`${SUPABASE}/rest/v1/cargas`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(carga),
  });
  if (!r.ok) throw new Error(`${r.status} — ${await r.text()}`);
}

async function ciclo() {
  const { data } = await cliente.readHoldingRegisters(0, 30);

  const estado = data[20];
  const previo = estadoPrevio;
  estadoPrevio = estado;

  if (soloLeer) {
    console.log(
      `estado=${estado} · receta=H${data[0]} · m³=${data[1] / 100} · ` +
        `cemento ${data[10]}/${data[9]} kg · agua ${data[12]}/${data[11]} l`,
    );
    return;
  }

  // El flanco: automático (1) → parado (0). Una fila por carga, no una por lectura.
  if (previo !== 1 || estado !== 0) return;

  const fin = new Date();
  const carga = {
    batch_nro: ++nro,
    receta: "H" + data[0],
    m3: data[1] / 100,
    fecha_hora_inicio: new Date(fin.getTime() - 5 * 60 * 1000).toISOString(),
    fecha_hora_fin: fin.toISOString(),
    cemento_objetivo: data[9],
    cemento_real: data[10],
    agua_objetivo: data[11],
    agua_real: data[12],
    aridos_objetivo: data[13],
    aridos_real: data[14],
    aditivos_objetivo: data[15] / 100,
    aditivos_real: data[16] / 100,
    operador: "Ramón",
  };

  await guardar(carga);
  const desvio = carga.cemento_real - carga.cemento_objetivo;
  console.log(
    `✔ carga ${carga.batch_nro} guardada — ${carga.receta} · ${carga.m3} m³ · ` +
      `cemento ${desvio >= 0 ? "+" : ""}${desvio} kg`,
  );
}

(async () => {
  await cliente.connectTCP(HOST, { port: PUERTO });
  cliente.setID(1);
  cliente.setTimeout(1000);
  console.log(`Leyendo ${HOST}:${PUERTO} (Slave ID 1) cada 2 s${soloLeer ? " — modo solo lectura" : ""}\n`);
  setInterval(() => ciclo().catch((e) => console.error("✖", e.message)), 2000);
})();
