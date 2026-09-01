import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, "../Sql");
const sourcePath = path.join(sqlDir, "sqlcripts.sql");

const dirs = {
  alters: path.join(sqlDir, "alters"),
  creates: path.join(sqlDir, "creates"),
  updates: path.join(sqlDir, "updates"),
  installs: path.join(sqlDir, "installs"),
};

for (const dir of Object.values(dirs)) {
  fs.mkdirSync(dir, { recursive: true });
}

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

function viewObjectName(body) {
  const match = body.match(/CREATE VIEW\s+(?:\[dbo\]\.|dbo\.)?\[([^\]]+)\]/i);
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

function viewLabel(section) {
  return section.title.replace(/\*\*\*.*$/, "").trim();
}

function fileHeader(relativePath, description) {
  return `/*
  ${relativePath}
  ${description}

  Generado desde Sql/sqlcripts.sql
  Regenerar todo:  node scripts/generateInstalarOActualizarSql.js
*/

SET NOCOUNT ON;
GO

`;
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

function wrapViewCreateOrAlter(body) {
  const sql = cleanObjectBody(body).replace(/^CREATE VIEW/m, "CREATE OR ALTER VIEW");
  return `${sql}\nGO\n`;
}

function wrapViewCreateOnly(body) {
  return `${cleanObjectBody(body)}\nGO\n`;
}

function wrapViewDropAndCreate(name, body) {
  const sql = cleanObjectBody(body);
  const escaped = name.replace(/'/g, "''");
  return `
IF OBJECT_ID(N'dbo.[${escaped}]', N'V') IS NOT NULL
  DROP VIEW [dbo].[${name}];
GO
${sql}
GO
`;
}

function buildViewsSection(views, mode) {
  return views
    .map((v) => {
      const label = viewLabel(v);
      const name = viewObjectName(v.body);
      let sql;
      if (mode === "createOrAlter") {
        sql = wrapViewCreateOrAlter(v.body);
      } else if (mode === "createOnly") {
        sql = wrapViewCreateOnly(v.body);
      } else {
        sql = wrapViewDropAndCreate(name, v.body);
      }
      return `
------------------------------------------------------------------------------
-- VISTA: ${label}
------------------------------------------------------------------------------
${sql}`;
    })
    .join("\n");
}

const altersColumnasBody = `
PRINT N'=== ALTER TABLE: columnas Facturacion-FE ===';
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

IF COL_LENGTH('dbo.[Tipo de Documento]', 'codigoDian') IS NULL
BEGIN
  ALTER TABLE dbo.[Tipo de Documento] ADD codigoDian INT NULL;
  PRINT N'Columna [Tipo de Documento].codigoDian creada.';
END
ELSE
  PRINT N'Columna [Tipo de Documento].codigoDian ya existe.';
GO
`;

const updatesCatalogosBody = `
PRINT N'=== UPDATE / INSERT: catalogos Facturacion-FE ===';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.[Tipo Empresa] WHERE [Id Tipo Empresa] = 5)
BEGIN
  SET IDENTITY_INSERT dbo.[Tipo Empresa] ON;
  INSERT INTO dbo.[Tipo Empresa] (
    [Id Tipo Empresa],
    [Código Tipo Empresa],
    [Tipo Empresa],
    [Descripción Tipo Empresa],
    [Orden Tipo Empresa],
    [Id Estado]
  )
  VALUES (5, 1, N'Juridica', NULL, 1, 1);
  SET IDENTITY_INSERT dbo.[Tipo Empresa] OFF;
  PRINT N'Registro Tipo Empresa Id=5 (Juridica) insertado.';
END
ELSE
  PRINT N'Registro Tipo Empresa Id=5 ya existe — omitido.';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.[Tipo Empresa] WHERE [Id Tipo Empresa] = 6)
BEGIN
  SET IDENTITY_INSERT dbo.[Tipo Empresa] ON;
  INSERT INTO dbo.[Tipo Empresa] (
    [Id Tipo Empresa],
    [Código Tipo Empresa],
    [Tipo Empresa],
    [Descripción Tipo Empresa],
    [Orden Tipo Empresa],
    [Id Estado]
  )
  VALUES (6, 2, N'Natural', NULL, 1, 1);
  SET IDENTITY_INSERT dbo.[Tipo Empresa] OFF;
  PRINT N'Registro Tipo Empresa Id=6 (Natural) insertado.';
END
ELSE
  PRINT N'Registro Tipo Empresa Id=6 ya existe — omitido.';
GO

UPDATE dbo.[Tipo de Documento] SET codigoDian = NULL WHERE [Id Tipo de Documento] = 1;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 13   WHERE [Id Tipo de Documento] = 2;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 22   WHERE [Id Tipo de Documento] = 3;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 41   WHERE [Id Tipo de Documento] = 4;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 11   WHERE [Id Tipo de Documento] = 5;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 12   WHERE [Id Tipo de Documento] = 6;
UPDATE dbo.[Tipo de Documento] SET codigoDian = NULL WHERE [Id Tipo de Documento] = 7;
UPDATE dbo.[Tipo de Documento] SET codigoDian = NULL WHERE [Id Tipo de Documento] = 8;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 31   WHERE [Id Tipo de Documento] = 9;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 31   WHERE [Id Tipo de Documento] = 10;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 13   WHERE [Id Tipo de Documento] = 11;
GO

PRINT N'Codigos DIAN actualizados en [Tipo de Documento].';
GO
`;

const footer = `
PRINT N'';
PRINT N'=== Facturacion-FE: script completado ===';
GO
`;

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

const skippedViews = sections.filter(
  (s) => s.title.includes("NO EXISTE") && !/^CREATE VIEW/m.test(s.body)
);

const createsTablas = `${fileHeader(
  "creates/tablas.sql",
  "CREATE TABLE — solo tablas propias de Facturacion-FE (IF NOT EXISTS)."
)}
PRINT N'=== CREATE TABLE: tablas Facturacion-FE ===';
GO
${tables.map((t) => wrapTable(t.name, t.body)).join("\n")}
${footer}`;

const createsVistas = `${fileHeader(
  "creates/vistas.sql",
  "CREATE VIEW puro — usar solo si las vistas NO existen (SQL Server 2008+)."
)}
PRINT N'=== CREATE VIEW: vistas Facturacion-FE ===';
GO
${buildViewsSection(views, "createOnly")}
${footer}`;

const altersColumnas = `${fileHeader(
  "alters/columnas.sql",
  "ALTER TABLE — columnas requeridas por Facturacion-FE en tablas existentes."
)}${altersColumnasBody}${footer}`;

const altersVistasDropCreate = `${fileHeader(
  "alters/vistas-drop-create.sql",
  "DROP VIEW + CREATE VIEW — actualizar vistas en SQL Server sin CREATE OR ALTER."
)}
PRINT N'=== ALTER VISTAS: DROP + CREATE ===';
GO
${buildViewsSection(views, "dropCreate")}
${footer}`;

const altersVistasCreateOrAlter = `${fileHeader(
  "alters/vistas-create-or-alter.sql",
  "CREATE OR ALTER VIEW — SQL Server 2016 SP1+."
)}
PRINT N'=== ALTER VISTAS: CREATE OR ALTER ===';
GO
${buildViewsSection(views, "createOrAlter")}
${footer}`;

const updatesCatalogos = `${fileHeader(
  "updates/catalogos.sql",
  "INSERT / UPDATE de datos de catalogo (Tipo Empresa, codigos DIAN)."
)}${updatesCatalogosBody}${footer}`;

function composeInstall(relativePath, description, parts) {
  const body = parts.join("\n\n");
  return `${fileHeader(relativePath, description)}${body}${footer}`;
}

const instalarOActualizar = composeInstall(
  "installs/instalar-o-actualizar.sql",
  "Instalacion idempotente completa — SQL Server 2016 SP1+ (CREATE OR ALTER VIEW).",
  [
    altersColumnasBody,
    "PRINT N'';\nGO",
    "PRINT N'--- creates/tablas.sql ---';\nGO",
    tables.map((t) => wrapTable(t.name, t.body)).join("\n"),
    "PRINT N'';\nGO",
    "PRINT N'--- alters/vistas-create-or-alter.sql ---';\nGO",
    buildViewsSection(views, "createOrAlter"),
    "PRINT N'';\nGO",
    "PRINT N'--- updates/catalogos.sql ---';\nGO",
    updatesCatalogosBody,
  ]
);

const instalarSoloCreates = composeInstall(
  "installs/instalar-solo-creates.sql",
  "Solo CREATE — BD nueva sin objetos FE. Orden: alters → tablas → vistas → updates.",
  [
    altersColumnasBody,
    "PRINT N'';\nGO",
    "PRINT N'--- creates/tablas.sql ---';\nGO",
    tables.map((t) => wrapTable(t.name, t.body)).join("\n"),
    "PRINT N'';\nGO",
    "PRINT N'--- creates/vistas.sql ---';\nGO",
    buildViewsSection(views, "createOnly"),
    "PRINT N'';\nGO",
    "PRINT N'--- updates/catalogos.sql ---';\nGO",
    updatesCatalogosBody,
  ]
);

const actualizarSoloAlters = composeInstall(
  "installs/actualizar-solo-alters.sql",
  "BD existente — SQL Server 2008+ (ALTER columnas + DROP/CREATE vistas).",
  [
    altersColumnasBody,
    "PRINT N'';\nGO",
    "PRINT N'--- creates/tablas.sql ---';\nGO",
    tables.map((t) => wrapTable(t.name, t.body)).join("\n"),
    "PRINT N'';\nGO",
    "PRINT N'--- alters/vistas-drop-create.sql ---';\nGO",
    buildViewsSection(views, "dropCreate"),
    "PRINT N'';\nGO",
    "PRINT N'--- updates/catalogos.sql ---';\nGO",
    updatesCatalogosBody,
  ]
);

const partFiles = [
  [path.join(dirs.alters, "columnas.sql"), altersColumnas],
  [path.join(dirs.alters, "vistas-drop-create.sql"), altersVistasDropCreate],
  [path.join(dirs.alters, "vistas-create-or-alter.sql"), altersVistasCreateOrAlter],
  [path.join(dirs.creates, "tablas.sql"), createsTablas],
  [path.join(dirs.creates, "vistas.sql"), createsVistas],
  [path.join(dirs.updates, "catalogos.sql"), updatesCatalogos],
  [path.join(dirs.installs, "instalar-o-actualizar.sql"), instalarOActualizar],
  [path.join(dirs.installs, "instalar-solo-creates.sql"), instalarSoloCreates],
  [path.join(dirs.installs, "actualizar-solo-alters.sql"), actualizarSoloAlters],
];

for (const [outputPath, content] of partFiles) {
  fs.writeFileSync(outputPath, content, "utf8");
  console.log(`Escrito: ${outputPath}`);
}

const legacyRootFiles = [
  path.join(sqlDir, "instalar-o-actualizar.sql"),
  path.join(sqlDir, "instalar-solo-creates.sql"),
  path.join(sqlDir, "actualizar-solo-alters.sql"),
];

for (const legacy of legacyRootFiles) {
  if (fs.existsSync(legacy)) {
    fs.unlinkSync(legacy);
    console.log(`Eliminado (movido a installs/): ${legacy}`);
  }
}

console.log(`  Tablas: ${tables.length}`);
console.log(`  Vistas: ${views.length}`);
if (skippedViews.length) {
  console.log(
    `  Vistas omitidas (no en sqlcripts): ${skippedViews.map((s) => viewLabel(s)).join(", ")}`
  );
}
