/**
 * Test script: generates a synthetic student PDF and parses it with pdfParser.js
 * Run: node backend/scripts/testParser.js  (from project root)
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStudentPDF } from '../utils/pdfParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Build a realistic class list PDF based on Image 1 ─────────────────────────
const pdfDoc = await PDFDocument.create();
const font = await pdfDoc.embedFont(StandardFonts.Courier);
const page = pdfDoc.addPage([620, 720]);

const rows = [
  'S No   Sem ID        Registration Id   Students Name              Section',
  '----   ------        ---------------   -------------              -------',
  '1      R23-SID-001   2311CS010001      A DEEKSHITHA               Alpha',
  '2      R23-SID-002   2311CS010006      AARYA PEDDAGAMMALLA        Alpha',
  '3      R23-SID-003   2311CS010007      ABBURI HARSHITHA           Alpha',
  '4      R23-SID-004   2311CS010010      ADDU HANUPRIYA             Alpha',
  '5      R23-SID-005   2311CS010013      AFIYAAFREEN                Alpha',
  '6      R23-SID-006   2311CS010015      AILA ANKITHA               Alpha',
  '7      R23-SID-007   2311CS010018      AKULA AVINASH              Alpha',
  '8      R23-SID-008   2311CS010025      ALLURU GAYATHRI KUMARI     Alpha',
];

let y = 670;
for (const row of rows) {
  page.drawText(row, { x: 30, y, size: 10, font });
  y -= 22;
}

const pdfBytes = await pdfDoc.save();
const pdfPath = path.join(__dirname, '..', 'test_students.pdf');
fs.writeFileSync(pdfPath, pdfBytes);
console.log('✅ Test PDF generated at:', pdfPath);

// ── Parse the generated PDF ───────────────────────────────────────────────────
const buf = fs.readFileSync(pdfPath);
const students = await parseStudentPDF(buf);

console.log(`\n📋 Parsed ${students.length} students:\n`);
students.forEach((s, i) => {
  console.log(`  ${String(i + 1).padStart(2)}. [${s.rollNo}] ${s.studentName.padEnd(32)} | ${s.section} | SemID: ${s.semesterId}`);
});

if (students.length === 0) {
  console.warn('\n⚠️  No students parsed! Check the roll number regex in pdfParser.js');
} else {
  console.log('\n✅ Parser working correctly!');
}
