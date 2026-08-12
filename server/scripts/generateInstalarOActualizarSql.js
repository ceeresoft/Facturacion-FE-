import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(__dirname, "../Sql/sqlcripts.sql");
const outputPath = path.join(__dirname, "../Sql/instalar-o-actualizar.sql");

const source = fs.readFileSync(sourcePath, "utf8");

function parseSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^-- (\d+)\) (.+)$/);
    if (headerMatch && i > 0 && /^-{5,}$/.test(lines[i - 1])) {
      if (current) {
        current.body = current.bodyLines.join("\n").trim();
        sections.push(current);
      }
      current = {
        number: Number(headerMatch[1]),
        title: headerMatch[2].trim(),
        bodyLines: [],
      };
      continue;
    }
    if (current) {
      if (/^-{5,}$/.test(line) && current.bodyLines.length === 0) {
        continue;
      }
      current.bodyLines.push(line);
    }
  }
  if (current) {
    current.body = current.bodyLines.join("\n").trim();
    sections.push(current);
  }
  return sections;
}

function tableObjectName(body) {
  const match = body.match(/CREATE TABLE \[dbo\]\.\[(.+?)\]/);
  return match ? match[1] : null;
}

function cleanObjectBody(body) {
  return body
    .split("\n")
    .filter((line) => !/^-{5,}$/.test(line))
    .filter((line) => line.trim().toUpperCase() !== "GO")
    .join("\n")
    .trim();
}

function wrapTable(name, body) {
  const sql = cleanObjectBody(body);
  const indented = sql
    .split("\n")
    .map((line) => (line.length ? `  ${line}` : line))
    .join("\n");
  return `
------------------------------------------------------------------------------
-- TABLA: ${name}
------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.[${name.replace(/'/g, "''")}]', N'U') IS NULL
BEGIN
${indented}
END
ELSE
  PRINT N'Tabla [${name}] ya existe — omitida.';
GO
`;
}

function wrapView(body) {
  const sql = cleanObjectBody(body).replace(/^CREATE VIEW/m, "CREATE OR ALTER VIEW");
  return `${sql}\nGO\n`;
}

const sections = parseSections(source);
const tables = [];
const views = [];

for (const section of sections) {
  if (/^CREATE TABLE/m.test(section.body)) {
    const name = tableObjectName(section.body);
    if (name) tables.push({ name, body: section.body });
  } else if (/^CREATE VIEW/m.test(section.body)) {
    views.push(section);
  }
}

const header = `/*
  instalar-o-actualizar.sql
  Instalacion / actualizacion idempotente para Facturacion-FE.

  Uso en SSMS sobre la BD del cliente (ej. CeereSio):
    - BD NUEVA: crea tablas que falten y crea/actualiza vistas.
    - BD con Face PHP viejo: omite tablas existentes; actualiza vistas con CREATE OR ALTER.

  Requiere SQL Server 2016 SP1+ (CREATE OR ALTER VIEW).

  Origen: generado desde Sql/sqlcripts.sql
  Regenerar: node scripts/generateInstalarOActualizarSql.js
*/

SET NOCOUNT ON;
GO

PRINT N'=== Facturacion-FE: columnas requeridas ===';
GO

IF COL_LENGTH('dbo.Factura', 'EstadoFacturaElectronica') IS NULL
BEGIN
  ALTER TABLE dbo.Factura ADD EstadoFacturaElectronica INT NULL;
  PRINT N'Columna Factura.EstadoFacturaElectronica creada.';
END
ELSE
  PRINT N'Columna Factura.EstadoFacturaElectronica ya existe.';
GO

IF COL_LENGTH('dbo.[Nota Crédito]', 'EstadoFace') IS NULL
BEGIN
  ALTER TABLE dbo.[Nota Crédito] ADD EstadoFace INT NULL;
  PRINT N'Columna [Nota Crédito].EstadoFace creada.';
END
ELSE
  PRINT N'Columna [Nota Crédito].EstadoFace ya existe.';
GO

PRINT N'';
PRINT N'=== Facturacion-FE: TABLAS (CREATE si no existen) ===';
GO
`;

const tablesSection = tables.map((t) => wrapTable(t.name, t.body)).join("\n");

const viewsHeader = `
PRINT N'';
PRINT N'=== Facturacion-FE: VISTAS (CREATE OR ALTER) ===';
GO
`;

const viewsSection = views
  .map((v) => {
    const label = v.title.replace(/\*\*\*.*$/, "").trim();
    return `
------------------------------------------------------------------------------
-- VISTA: ${label}
------------------------------------------------------------------------------
${wrapView(v.body)}`;
  })
  .join("\n");

const footer = `
PRINT N'';
PRINT N'=== Facturacion-FE: instalacion/actualizacion completada ===';
GO
`;

const output = header + tablesSection + viewsHeader + viewsSection + footer;
fs.writeFileSync(outputPath, output, "utf8");
console.log(`Escrito: ${outputPath}`);
console.log(`  Tablas: ${tables.length}`);
console.log(`  Vistas: ${views.length}`);
