import {
  CODIGO_DIAN_NIT,
  resolverDocumentoSinDigito,
  resolverDigitoVerificacionNit,
} from "../src/utils/nitDigitoVerificacion.js";

const CASOS = [
  {
    nombre: "NIT con guión 900063460-1",
    tipo: CODIGO_DIAN_NIT,
    completo: "900063460-1",
    vista: "90006346",
    dvBd: "1",
    esperadoBase: "900063460",
    esperadoDv: "1",
  },
  {
    nombre: "NIT sin guión ni DV en BD",
    tipo: CODIGO_DIAN_NIT,
    completo: "900063460",
    vista: "90006346",
    dvBd: "",
    esperadoBase: "900063460",
    esperadoDv: "1",
  },
  {
    nombre: "NIT concatenado con DV en columna",
    tipo: CODIGO_DIAN_NIT,
    completo: "716681147",
    vista: "71668114",
    dvBd: "7",
    esperadoBase: "71668114",
    esperadoDv: "7",
  },
  {
    nombre: "NIT solo dígitos sin DV",
    tipo: CODIGO_DIAN_NIT,
    completo: "71668114",
    vista: "71668114",
    dvBd: "",
    esperadoBase: "71668114",
    esperadoDv: "7",
  },
  {
    nombre: "Cédula sin DV",
    tipo: 13,
    completo: "1234567890",
    vista: "1234567890",
    dvBd: "",
    esperadoBase: "1234567890",
    esperadoDv: "",
  },
  {
    nombre: "Cédula con guión final",
    tipo: 13,
    completo: "1234567890-",
    vista: "",
    dvBd: "",
    esperadoBase: "1234567890",
    esperadoDv: "",
  },
];

let fallos = 0;

for (const caso of CASOS) {
  const base = resolverDocumentoSinDigito(
    caso.tipo,
    caso.completo,
    caso.vista,
    caso.dvBd
  );
  const dv = resolverDigitoVerificacionNit(
    caso.tipo,
    caso.completo,
    caso.vista,
    caso.dvBd
  );

  const okBase = base === caso.esperadoBase;
  const okDv = dv === caso.esperadoDv;

  if (!okBase || !okDv) {
    fallos += 1;
    console.error(`FAIL: ${caso.nombre}`);
    console.error(`  base: ${base} (esperado ${caso.esperadoBase})`);
    console.error(`  dv:   ${dv} (esperado ${caso.esperadoDv})`);
  } else {
    console.log(`OK: ${caso.nombre}`);
  }
}

if (fallos > 0) {
  process.exit(1);
}

console.log(`\n${CASOS.length} casos OK`);
