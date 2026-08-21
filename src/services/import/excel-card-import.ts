import { readSheet } from 'read-excel-file/universal';
import writeExcelFile from 'write-excel-file/browser';

export interface ParsedCardRow {
  rowNumber: number;
  frontTitle: string;
  backAnswer: string;
  deckName: string;
  tagNames: string[];
  hint?: string;
  ipa?: string;
  examples: string[];
  errors: string[];
}

export class ExcelImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExcelImportError';
  }
}

type FieldKey = 'frontTitle' | 'backAnswer' | 'deckName' | 'tagNames' | 'hint' | 'ipa' | 'examples';

/** Recognized header spellings, normalized (lowercased, alphanumeric-only) — lets a variety of
 *  spreadsheet layouts ("Word", "Term", "Front Title", …) map onto the same card field without
 *  forcing the user to match an exact template. */
const HEADER_ALIASES: Record<string, FieldKey> = {
  front: 'frontTitle',
  fronttitle: 'frontTitle',
  word: 'frontTitle',
  term: 'frontTitle',
  question: 'frontTitle',
  back: 'backAnswer',
  backanswer: 'backAnswer',
  answer: 'backAnswer',
  definition: 'backAnswer',
  meaning: 'backAnswer',
  deck: 'deckName',
  deckname: 'deckName',
  category: 'deckName',
  tags: 'tagNames',
  tag: 'tagNames',
  hint: 'hint',
  ipa: 'ipa',
  pronunciation: 'ipa',
  examples: 'examples',
  example: 'examples',
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function splitList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Parses a user-selected .xlsx file's first sheet into card rows. Photos/videos aren't part of
 * this — a spreadsheet cell can't carry binary media, so imported cards are text-only and any
 * image/audio can be attached afterwards from the card editor.
 */
export async function parseCardsWorkbook(file: File): Promise<ParsedCardRow[]> {
  let rows: unknown[][];
  try {
    rows = (await readSheet(file, { trim: true })) as unknown[][];
  } catch {
    throw new ExcelImportError('This file could not be read as an Excel (.xlsx) workbook.');
  }

  if (rows.length === 0) {
    throw new ExcelImportError('The workbook has no rows.');
  }

  const [headerRow, ...dataRows] = rows;
  const columnFields = headerRow.map((header) => HEADER_ALIASES[normalizeHeader(cellToString(header))]);

  if (!columnFields.includes('frontTitle') || !columnFields.includes('backAnswer')) {
    throw new ExcelImportError(
      'Could not find "Front"/"Word" and "Back"/"Answer" columns. Download the template to see the expected format.',
    );
  }
  if (dataRows.length === 0) {
    throw new ExcelImportError('No data rows were found below the header row.');
  }

  return dataRows.map((row, index) => {
    const mapped: Partial<Record<FieldKey, string>> = {};
    columnFields.forEach((field, columnIndex) => {
      if (!field) return;
      const value = cellToString(row[columnIndex]);
      if (!value) return;
      mapped[field] = mapped[field] ? `${mapped[field]}, ${value}` : value;
    });

    const errors: string[] = [];
    const frontTitle = mapped.frontTitle ?? '';
    const backAnswer = mapped.backAnswer ?? '';
    const deckName = mapped.deckName ?? '';

    if (frontTitle.length < 2) errors.push('Front/Word must be at least 2 characters.');
    if (backAnswer.length < 1) errors.push('Back/Answer is required.');
    if (deckName.length < 1) errors.push('Deck is required.');

    return {
      rowNumber: index + 2,
      frontTitle,
      backAnswer,
      deckName,
      tagNames: mapped.tagNames ? splitList(mapped.tagNames) : [],
      hint: mapped.hint,
      ipa: mapped.ipa,
      examples: mapped.examples ? splitList(mapped.examples) : [],
      errors,
    };
  });
}

const TEMPLATE_HEADERS = ['Front', 'Back', 'Deck', 'Tags', 'Hint', 'IPA', 'Examples'];
const TEMPLATE_EXAMPLE_ROW = [
  'Ephemeral',
  'Lasting for a very short time.',
  'Vocabulary',
  'adjectives, advanced',
  'Think "temporary"',
  '/ɪˈfem(ə)rəl/',
  'The beauty of cherry blossoms is ephemeral.; Fame can be ephemeral.',
];

/** Downloads a starter .xlsx with the expected headers and one filled-in example row. */
export async function downloadImportTemplate(): Promise<void> {
  await writeExcelFile([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE_ROW]).toFile('card-import-template.xlsx');
}
