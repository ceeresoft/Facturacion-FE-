import { resolverCodigoMunicipioDian } from "../src/services/xml/xmlHelpers.js";

const CASOS = [
  { ciudad: "001", depto: "05", esperado: "05001" },
  { ciudad: "05001", depto: "05", esperado: "05001" },
  { ciudad: "05001", depto: "", esperado: "05001" },
  { ciudad: "11001", depto: "11", esperado: "11001" },
  { ciudad: "001", depto: "11", esperado: "11001" },
];

let fallos = 0;

for (const caso of CASOS) {
  const resultado = resolverCodigoMunicipioDian(caso.ciudad, caso.depto);
  if (resultado !== caso.esperado) {
    fallos += 1;
    console.error(
      `FAIL: ciudad=${caso.ciudad} depto=${caso.depto} → ${resultado} (esperado ${caso.esperado})`
    );
  } else {
    console.log(`OK: ${caso.ciudad} + ${caso.depto} → ${resultado}`);
  }
}

if (fallos > 0) process.exit(1);
console.log(`\n${CASOS.length} casos OK`);
