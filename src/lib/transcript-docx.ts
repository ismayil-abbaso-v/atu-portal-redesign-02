export type TranscriptCourseRow = {
  id: string;
  courseCode: string;
  courseName: string;
  credit: number | null;
  semesterScore: number | null;
  examScore: number | null;
  finalScore: number | null;
  letter: string;
  repeat: boolean;
};

export type TranscriptSemester = {
  key: string;
  academicYear: string;
  semester: 1 | 2;
  sortKey: number;
  rows: TranscriptCourseRow[];
};

export type TranscriptStudentInfo = {
  fullName: string;
  studentNumber: string;
  level: string;
  faculty: string;
  specialty: string;
  admissionYear: string;
  graduationYear: string;
  group: string;
};

export type TranscriptDocumentOptions = {
  universityName: string;
  cityLine?: string;
  student: TranscriptStudentInfo;
  semesters: TranscriptSemester[];
  generatedAt?: Date;
};

export type TranscriptSummary = {
  attemptedCredits: number;
  earnedCredits: number;
  average: number | null;
};

const ENCODER = new TextEncoder();
const BRAND = "65001D";
const TEXT = "251A1B";
const MUTED = "6F6662";
const BORDER = "DDD6D1";

export function scoreToLetter(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value >= 91) return "A";
  if (value >= 81) return "B";
  if (value >= 71) return "C";
  if (value >= 61) return "D";
  if (value >= 51) return "E";
  return "F";
}

export function transcriptSummary(rows: TranscriptCourseRow[]): TranscriptSummary {
  let attemptedCredits = 0;
  let earnedCredits = 0;
  let weightedTotal = 0;
  let weightedCredits = 0;
  const scores: number[] = [];

  for (const row of rows) {
    const credit = typeof row.credit === "number" && row.credit > 0 ? row.credit : null;
    const value = row.finalScore;

    if (credit !== null) {
      attemptedCredits += credit;
      if (value !== null && value >= 51) earnedCredits += credit;
      if (value !== null) {
        weightedTotal += value * credit;
        weightedCredits += credit;
      }
    }

    if (value !== null) scores.push(value);
  }

  return {
    attemptedCredits,
    earnedCredits,
    average: weightedCredits
      ? weightedTotal / weightedCredits
      : scores.length
        ? scores.reduce((sum, value) => sum + value, 0) / scores.length
        : null,
  };
}

export function cumulativeTranscriptSummary(semesters: TranscriptSemester[]) {
  return transcriptSummary(semesters.flatMap((semester) => semester.rows));
}

const formatNumber = (value: number | null, digits = 2) =>
  value === null || !Number.isFinite(value)
    ? "—"
    : Number.isInteger(value)
      ? String(value)
      : value.toFixed(digits).replace(/\.00$/, "");

const escapeXml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

type ParagraphOptions = {
  bold?: boolean;
  size?: number;
  color?: string;
  align?: "left" | "center" | "right";
  before?: number;
  after?: number;
  keep?: boolean;
};

function run(text: string, options: ParagraphOptions = {}) {
  return `<w:r><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="${options.size ?? 20}"/><w:szCs w:val="${options.size ?? 20}"/><w:color w:val="${options.color ?? TEXT}"/>${options.bold ? "<w:b/>" : ""}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function paragraph(text: string, options: ParagraphOptions = {}) {
  return `<w:p><w:pPr>${options.align ? `<w:jc w:val="${options.align}"/>` : ""}${options.keep ? "<w:keepNext/>" : ""}<w:spacing w:before="${options.before ?? 0}" w:after="${options.after ?? 0}"/></w:pPr>${run(text, options)}</w:p>`;
}

function tableCell(
  text: string,
  width: number,
  options: ParagraphOptions & { shade?: string; border?: boolean; margin?: number } = {},
) {
  const border = options.border === false ? "nil" : "single";
  const margin = options.margin ?? 85;
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${options.shade ? `<w:shd w:val="clear" w:fill="${options.shade}"/>` : ""}<w:tcBorders><w:top w:val="${border}" w:sz="3" w:color="${BORDER}"/><w:left w:val="${border}" w:sz="3" w:color="${BORDER}"/><w:bottom w:val="${border}" w:sz="3" w:color="${BORDER}"/><w:right w:val="${border}" w:sz="3" w:color="${BORDER}"/></w:tcBorders><w:tcMar><w:top w:w="${margin}" w:type="dxa"/><w:left w:w="${margin}" w:type="dxa"/><w:bottom w:w="${margin}" w:type="dxa"/><w:right w:w="${margin}" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${paragraph(text, { ...options, after: 0 })}</w:tc>`;
}

const tableRow = (cells: string[], header = false) =>
  `<w:tr>${header ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${cells.join("")}</w:tr>`;

function table(rows: string[], widths: number[], border = true) {
  const borderValue = border ? "single" : "nil";
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="${borderValue}" w:sz="3" w:color="${BORDER}"/><w:left w:val="${borderValue}" w:sz="3" w:color="${BORDER}"/><w:bottom w:val="${borderValue}" w:sz="3" w:color="${BORDER}"/><w:right w:val="${borderValue}" w:sz="3" w:color="${BORDER}"/><w:insideH w:val="${borderValue}" w:sz="3" w:color="E9E4E0"/><w:insideV w:val="${borderValue}" w:sz="3" w:color="E9E4E0"/></w:tblBorders></w:tblPr><w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>`;
}

function writeU16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 255;
  target[offset + 1] = (value >>> 8) & 255;
}

function writeU32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 255;
  target[offset + 1] = (value >>> 8) & 255;
  target[offset + 2] = (value >>> 16) & 255;
  target[offset + 3] = (value >>> 24) & 255;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function zip(entries: { name: string; content: string }[], now: Date) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const year = Math.max(1980, now.getFullYear());
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const date = ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const entry of entries) {
    const name = ENCODER.encode(entry.name);
    const data = ENCODER.encode(entry.content);
    const crc = crc32(data);
    const localHeader = new Uint8Array(30 + name.length);
    writeU32(localHeader, 0, 0x04034b50);
    writeU16(localHeader, 4, 20);
    writeU16(localHeader, 6, 0x0800);
    writeU16(localHeader, 8, 0);
    writeU16(localHeader, 10, time);
    writeU16(localHeader, 12, date);
    writeU32(localHeader, 14, crc);
    writeU32(localHeader, 18, data.length);
    writeU32(localHeader, 22, data.length);
    writeU16(localHeader, 26, name.length);
    localHeader.set(name, 30);
    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + name.length);
    writeU32(centralHeader, 0, 0x02014b50);
    writeU16(centralHeader, 4, 20);
    writeU16(centralHeader, 6, 20);
    writeU16(centralHeader, 8, 0x0800);
    writeU16(centralHeader, 10, 0);
    writeU16(centralHeader, 12, time);
    writeU16(centralHeader, 14, date);
    writeU32(centralHeader, 16, crc);
    writeU32(centralHeader, 20, data.length);
    writeU32(centralHeader, 24, data.length);
    writeU16(centralHeader, 28, name.length);
    writeU32(centralHeader, 42, offset);
    centralHeader.set(name, 46);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const local = concatBytes(localParts);
  const central = concatBytes(centralParts);
  const end = new Uint8Array(22);
  writeU32(end, 0, 0x06054b50);
  writeU16(end, 8, entries.length);
  writeU16(end, 10, entries.length);
  writeU32(end, 12, central.length);
  writeU32(end, 16, local.length);
  return concatBytes([local, central, end]);
}

function documentXml(options: TranscriptDocumentOptions) {
  const semesters = [...options.semesters].sort((a, b) => a.sortKey - b.sortKey);
  const student = options.student;
  const body: string[] = [];

  body.push(
    paragraph(options.universityName.toLocaleUpperCase("az-AZ"), {
      bold: true,
      size: 25,
      color: BRAND,
      align: "center",
      after: 35,
      keep: true,
    }),
    paragraph((options.cityLine ?? "GƏNCƏ / AZƏRBAYCAN").toLocaleUpperCase("az-AZ"), {
      bold: true,
      size: 19,
      align: "center",
      after: 15,
      keep: true,
    }),
    paragraph("BAKALAVRİAT TƏLƏBƏ TRANSKRİPTİ", {
      bold: true,
      size: 21,
      align: "center",
      after: 240,
    }),
  );

  const infoWidths = [1300, 3400, 1300, 3700];
  body.push(
    table(
      [
        tableRow([
          tableCell("Ad Soyad", infoWidths[0], { bold: true, size: 17, border: false }),
          tableCell(student.fullName || "—", infoWidths[1], { size: 17, border: false }),
          tableCell("Fakültə", infoWidths[2], { bold: true, size: 17, border: false }),
          tableCell(student.faculty || "—", infoWidths[3], { size: 17, border: false }),
        ]),
        tableRow([
          tableCell("Tələbə №", infoWidths[0], { bold: true, size: 17, border: false }),
          tableCell(student.studentNumber || "—", infoWidths[1], { size: 17, border: false }),
          tableCell("İxtisas", infoWidths[2], { bold: true, size: 17, border: false }),
          tableCell(student.specialty || "—", infoWidths[3], { size: 17, border: false }),
        ]),
        tableRow([
          tableCell("Səviyyə", infoWidths[0], { bold: true, size: 17, border: false }),
          tableCell(student.level || "B (BAKALAVRİAT)", infoWidths[1], { size: 17, border: false }),
          tableCell("Qəbul ili", infoWidths[2], { bold: true, size: 17, border: false }),
          tableCell(student.admissionYear || "—", infoWidths[3], { size: 17, border: false }),
        ]),
        tableRow([
          tableCell("Qrup", infoWidths[0], { bold: true, size: 17, border: false }),
          tableCell(student.group || "—", infoWidths[1], { size: 17, border: false }),
          tableCell("Məzuniyyət ili", infoWidths[2], { bold: true, size: 17, border: false }),
          tableCell(student.graduationYear || "—", infoWidths[3], { size: 17, border: false }),
        ]),
      ],
      infoWidths,
      false,
    ),
    paragraph("", { after: 70 }),
  );

  let cumulativeAttempted = 0;
  let cumulativeEarned = 0;
  const cumulativeRows: TranscriptCourseRow[] = [];
  const columnWidths = [1150, 4550, 1000, 1050, 900, 1050];

  for (const semester of semesters) {
    body.push(
      paragraph(`${semester.academicYear} · ${semester.semester === 1 ? "I" : "II"} semestr`, {
        bold: true,
        size: 19,
        color: BRAND,
        before: 130,
        after: 65,
        keep: true,
      }),
    );

    const rows = [
      tableRow(
        [
          tableCell("DƏRS KODU", columnWidths[0], { bold: true, size: 14, shade: BRAND, color: "FFFFFF", align: "center" }),
          tableCell("DƏRSİN ADI", columnWidths[1], { bold: true, size: 14, shade: BRAND, color: "FFFFFF", align: "center" }),
          tableCell("KREDİT", columnWidths[2], { bold: true, size: 14, shade: BRAND, color: "FFFFFF", align: "center" }),
          tableCell("QİYMƏT", columnWidths[3], { bold: true, size: 14, shade: BRAND, color: "FFFFFF", align: "center" }),
          tableCell("HƏRF", columnWidths[4], { bold: true, size: 14, shade: BRAND, color: "FFFFFF", align: "center" }),
          tableCell("TƏKRAR", columnWidths[5], { bold: true, size: 13, shade: BRAND, color: "FFFFFF", align: "center" }),
        ],
        true,
      ),
    ];

    for (const row of semester.rows) {
      rows.push(
        tableRow([
          tableCell(row.courseCode || "—", columnWidths[0], { size: 16, align: "center" }),
          tableCell(row.courseName || "—", columnWidths[1], { size: 16 }),
          tableCell(row.credit === null ? "—" : formatNumber(row.credit, 1), columnWidths[2], { size: 16, align: "center" }),
          tableCell(formatNumber(row.finalScore), columnWidths[3], { size: 16, align: "center" }),
          tableCell(row.letter || scoreToLetter(row.finalScore), columnWidths[4], { size: 16, align: "center" }),
          tableCell(row.repeat ? "*" : "", columnWidths[5], { size: 16, align: "center", color: row.repeat ? BRAND : TEXT }),
        ]),
      );
    }

    body.push(table(rows, columnWidths));

    const summary = transcriptSummary(semester.rows);
    cumulativeAttempted += summary.attemptedCredits;
    cumulativeEarned += summary.earnedCredits;
    cumulativeRows.push(...semester.rows);

    body.push(
      paragraph(
        `SQK: ${formatNumber(summary.earnedCredits, 1)}     TAK: ${formatNumber(cumulativeAttempted, 1)}     TQK: ${formatNumber(cumulativeEarned, 1)}          S-ÜOMG: ${formatNumber(summary.average)}     ÜOMG: ${formatNumber(transcriptSummary(cumulativeRows).average)}`,
        { bold: true, size: 14, color: BRAND, align: "right", before: 50, after: 75 },
      ),
    );
  }

  const overall = cumulativeTranscriptSummary(semesters);
  body.push(
    paragraph(`Tamamlanmış AKTS kredit toplamı: ${formatNumber(overall.attemptedCredits, 1)}`, {
      bold: true,
      size: 18,
      color: BRAND,
      align: "center",
      before: 140,
      after: 35,
    }),
    paragraph(`İxtisasda qazanılmış ümumi kredit: ${formatNumber(overall.earnedCredits, 1)}`, {
      bold: true,
      size: 18,
      color: BRAND,
      align: "center",
      after: 35,
    }),
    paragraph(`ÜOMG: ${formatNumber(overall.average)}`, {
      bold: true,
      size: 19,
      color: BRAND,
      align: "center",
      after: 200,
    }),
    paragraph("S-ÜOMG: Semestrlik ümumi orta müvəffəqiyyət göstəricisi", { size: 14, color: MUTED, after: 12 }),
    paragraph("ÜOMG: Ümumi orta müvəffəqiyyət göstəricisi", { size: 14, color: MUTED, after: 12 }),
    paragraph("SQK: Semestr ərzində qazanılan AKTS krediti", { size: 14, color: MUTED, after: 12 }),
    paragraph("TQK: Toplam qazanılan AKTS krediti", { size: 14, color: MUTED, after: 12 }),
    paragraph("TAK: Toplam alınan AKTS krediti", { size: 14, color: MUTED, after: 65 }),
    paragraph("• F qiymətli dərs təkrar edildikdən sonra transkriptdə göstərilir. Təkrar edilən dərsin əvvəlki dövrdəki qiyməti (*) simvolu ilə işarələnir.", { size: 14, color: MUTED, after: 45 }),
    paragraph("• Dərs kodu akademik sistemdə qeyd edilməyibsə, həmin xana “—” ilə göstərilir.", { size: 14, color: MUTED, after: 45 }),
  );

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="760" w:right="620" w:bottom="820" w:left="620" w:header="350" w:footer="350"/><w:footerReference w:type="default" r:id="rId2"/></w:sectPr></w:body></w:document>`;
}

export function createTranscriptDocx(options: TranscriptDocumentOptions) {
  const now = options.generatedAt ?? new Date();
  const iso = now.toISOString();
  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${run(`ATU Şəxsi Kabinet sistemi tərəfindən yaradılıb · ${now.toLocaleDateString("az-AZ")}`, { size: 12, color: "8A817D" })}</w:p></w:ftr>`;

  const entries = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    { name: "word/document.xml", content: documentXml(options) },
    {
      name: "word/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="${TEXT}"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
    },
    { name: "word/footer1.xml", content: footer },
    {
      name: "word/_rels/document.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`,
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>ATU Tələbə Transkripti</dc:title><dc:creator>${escapeXml(options.universityName)}</dc:creator><cp:lastModifiedBy>ATU Şəxsi Kabinet</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created></cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>ATU Şəxsi Kabinet</Application><Company>${escapeXml(options.universityName)}</Company></Properties>`,
    },
  ];

  return new Blob([zip(entries, now)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export function downloadTranscriptDocx(options: TranscriptDocumentOptions, name: string) {
  const url = URL.createObjectURL(createTranscriptDocx(options));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name.endsWith(".docx") ? name : `${name}.docx`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
