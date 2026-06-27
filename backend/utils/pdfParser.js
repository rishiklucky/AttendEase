/**
 * pdfParser.js
 *
 * Parses a student list PDF buffer and extracts student records.
 *
 * Supports roll number formats:
 *   - 22MCA001   (year + branch + serial)   ← most common
 *   - 21BCA0011  (year + branch + 4-digit serial)
 *   - MCA22001   (branch + year + serial)
 *
 * Columns expected (order may vary per institution):
 *   S.No | Roll Number | Student Name | [Section]
 *
 * Section defaults to 'Alpha' if not found.
 *
 * Uses: pdfjs-dist/legacy (works reliably in Node.js without DOM)
 */

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Buffer} pdfBuffer
 * @returns {Promise<Array<{semesterId: string, rollNo: string, studentName: string, section: string}>>}
 */
export const parseStudentPDF = async (pdfBuffer) => {
  // ── Extract text lines from all PDF pages ─────────────────────────────────
  const lines = await extractLines(pdfBuffer);

  // ── Parse each line for student data ─────────────────────────────────────
  const students = [];
  const seen = new Set();

  for (const line of lines) {
    const record = parseStudentLine(line);
    if (!record) continue;
    if (seen.has(record.rollNo)) continue;
    seen.add(record.rollNo);
    students.push(record);
  }

  return students;
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF text extraction using pdfjs-dist legacy build
// ─────────────────────────────────────────────────────────────────────────────

async function extractLines(buffer) {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data });

  // Suppress the font-url warning — we don't need fonts for text extraction
  loadingTask.onUnsupportedFeature = () => {};

  const pdf = await loadingTask.promise;
  const allLines = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Group text items by Y coordinate (rounded to 1 decimal)
    const rows = {};
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      // item.transform[5] is the Y coordinate in PDF space
      const y = (item.transform[5] || 0).toFixed(1);
      if (!rows[y]) rows[y] = [];
      rows[y].push({ x: item.transform[4], text: item.str });
    }

    // Sort rows by Y (descending — PDF Y=0 is bottom) then tokens by X (left→right)
    const sortedYs = Object.keys(rows).sort((a, b) => parseFloat(b) - parseFloat(a));

    for (const y of sortedYs) {
      const lineText = rows[y]
        .sort((a, b) => a.x - b.x)
        .map((t) => t.text)
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (lineText) allLines.push(lineText);
    }
  }

  return allLines;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Roll number regex patterns tried in order.
 *
 * Pattern 1:  2311CS010001 / 22MCA001  → \d{2,4}[A-Z]{2,8}\d{2,8}
 * Pattern 2:  MCA22001                 → [A-Z]{2,8}\d{4,8}
 */
const ROLL_PATTERNS = [
  /\b(\d{2,4}[A-Z]{2,8}\d{2,8})\b/,
  /\b([A-Z]{2,8}\d{4,8})\b/,
];

/**
 * Section keywords.
 */
const SECTION_RE = /\b(Alpha|Beta|Gamma|Delta|Theta|Omega)\b/i;

/**
 * Lines that are headers/footers — skip them.
 */
const SKIP_RE = [
  /s\.?\s*no/i,
  /roll\s*no/i,
  /student\s*name/i,
  /registration\s*id/i,
  /sem\s*id/i,
  /semester/i,
  /section/i,
  /sl\.?\s*no/i,
  /^page\s+\d/i,
  /^[-=*]+$/, // separator lines like ----
  /^\d+\s*$/, // lone page numbers
];

function shouldSkip(line) {
  return SKIP_RE.some((re) => re.test(line.trim()));
}

function parseStudentLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 6) return null;
  if (shouldSkip(trimmed)) return null;

  // ── 1. Try exact match for table row format: S.No | Sem ID | Registration ID | Name | Section ──
  // Example: "1 R23-SID-001 2311CS010001 A DEEKSHITHA Alpha"
  const exactMatch = trimmed.match(
    /^(\d+)\s+([A-Z0-9-]+)\s+(\d{2,4}[A-Z]{2,4}\d{4,8})\s+(.+?)\s+(Alpha|Beta|Gamma|Delta|Theta|Omega|All)$/i
  );

  if (exactMatch) {
    const [, , semesterId, rollNo, namePart, sectionWord] = exactMatch;
    
    // Clean up student name
    const studentName = namePart
      .replace(/[^A-Za-z .'\-]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .toUpperCase();

    // Section title-cased
    const section = sectionWord.charAt(0).toUpperCase() + sectionWord.slice(1).toLowerCase();

    if (studentName.length >= 2) {
      return {
        semesterId: semesterId.toUpperCase(),
        rollNo: rollNo.toUpperCase(),
        studentName,
        section,
      };
    }
  }

  // ── 2. Fallback to heuristic parsing if the row structure differs ─────────
  let rollNo = null;
  let rollIdx = -1;
  let rollLen = 0;

  for (const pattern of ROLL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && /[A-Za-z]/.test(match[1]) && /\d/.test(match[1])) {
      rollNo = match[1].toUpperCase();
      rollIdx = trimmed.indexOf(match[1]);
      rollLen = match[1].length;
      break;
    }
  }

  if (!rollNo) return null;

  const beforeRoll = trimmed.slice(0, rollIdx).trim();
  const afterRoll  = trimmed.slice(rollIdx + rollLen).trim();

  // Detect section
  let section = 'Alpha';
  const secMatch = trimmed.match(SECTION_RE);
  if (secMatch) {
    const s = secMatch[1];
    section = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  // Extract student name
  let namePart = afterRoll
    .replace(SECTION_RE, '')
    .replace(/^[\d.\-\s,]+/, '')
    .replace(/[\d.\-\s,]+$/, '')
    .replace(/[^A-Za-z .'\-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toUpperCase();

  if (!namePart || namePart.length < 2) return null;

  // Extract semester ID
  const semMatch = beforeRoll.match(/\b([A-Z]{2,8}[-]?\d{1,2}[-]?\d?)\b/i);
  const semesterId = semMatch
    ? semMatch[1].toUpperCase().replace(/\s+/g, '-')
    : guessFromRoll(rollNo);

  return {
    semesterId,
    rollNo,
    studentName: namePart,
    section,
  };
}

/** Guess a semester ID from the roll number */
function guessFromRoll(rollNo) {
  const m = rollNo.match(/[A-Z]+/);
  return m ? m[0] : 'UNKNOWN';
}

