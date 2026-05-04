import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { db, runTransaction } from "../db";
import { sanitizeStoredPath, validateMediaPaths } from "./mediaValidationService";

export const expectedImportColumns = [
  "exercise_code",
  "name",
  "category",
  "body_region",
  "equipment",
  "difficulty",
  "default_reps",
  "default_sets",
  "default_rest",
  "coaching_cues",
  "common_mistakes",
  "regression",
  "progression",
  "video_path",
  "thumbnail_path",
  "tags"
] as const;

type ImportRow = Record<(typeof expectedImportColumns)[number], string>;

function clean(value: unknown) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function getNextExerciseNumber() {
  const row = db
    .prepare("SELECT exercise_code FROM exercises WHERE exercise_code LIKE 'EX-%' ORDER BY exercise_code DESC LIMIT 1")
    .get() as { exercise_code?: string } | undefined;

  const match = row?.exercise_code?.match(/^EX-(\d+)$/);
  return match ? Number(match[1]) + 1 : 1;
}

function formatCode(n: number) {
  return `EX-${String(n).padStart(3, "0")}`;
}

function readRows(filePath: string, originalName?: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Import file was not found: ${filePath}`);
  }

  const extension = path.extname(originalName || filePath).toLowerCase();
  if (![".csv", ".xlsx", ".xls", ".ods"].includes(extension)) {
    throw new Error("Invalid spreadsheet type. Upload a CSV, XLS, XLSX, or ODS file.");
  }

  const workbook = xlsx.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Invalid spreadsheet: no worksheet was found.");
  }

  return xlsx.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
    defval: "",
    raw: false
  });
}

function validateColumns(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    throw new Error("Invalid spreadsheet: no exercise rows were found.");
  }

  const columns = Object.keys(rows[0] ?? {}).map((column) => column.trim());
  const missingRequired = ["name"].filter((column) => !columns.includes(column));
  if (missingRequired.length > 0) {
    throw new Error(`Invalid spreadsheet columns. Missing required column: ${missingRequired.join(", ")}`);
  }

  const unknownColumns = columns.filter((column) => !expectedImportColumns.includes(column as (typeof expectedImportColumns)[number]));
  if (unknownColumns.length > 0) {
    throw new Error(`Invalid spreadsheet columns. Unknown columns: ${unknownColumns.join(", ")}`);
  }
}

export function importExercisesFromFile(filePath: string, originalName?: string) {
  const rows = readRows(filePath, originalName);
  validateColumns(rows);

  let nextNumber = getNextExerciseNumber();
  const seenCodes = new Set<string>();
  const normalizedRows = rows.map((row, index) => {
    const normalized = Object.fromEntries(
      expectedImportColumns.map((column) => [column, clean(row[column])])
    ) as ImportRow;

    if (!normalized.name) {
      throw new Error(`Invalid spreadsheet: row ${index + 2} is missing a name.`);
    }

    if (!normalized.exercise_code) {
      normalized.exercise_code = formatCode(nextNumber++);
    }

    if (seenCodes.has(normalized.exercise_code)) {
      throw new Error(`Duplicate exercise code in import file: ${normalized.exercise_code}`);
    }
    seenCodes.add(normalized.exercise_code);

    normalized.video_path = sanitizeStoredPath(normalized.video_path);
    normalized.thumbnail_path = sanitizeStoredPath(normalized.thumbnail_path);

    return normalized;
  });

  const existingCodes = db
    .prepare(`SELECT exercise_code FROM exercises WHERE exercise_code IN (${normalizedRows.map(() => "?").join(",")})`)
    .all(...normalizedRows.map((row) => row.exercise_code)) as Array<{ exercise_code: string }>;

  if (existingCodes.length > 0) {
    throw new Error(`Duplicate exercise code already exists: ${existingCodes.map((row) => row.exercise_code).join(", ")}`);
  }

  const warnings = normalizedRows.flatMap((row) => validateMediaPaths(row).warnings);

  const insert = db.prepare(`
    INSERT INTO exercises (
      exercise_code, name, category, body_region, equipment, difficulty,
      default_reps, default_sets, default_rest, coaching_cues, common_mistakes,
      regression, progression, video_path, thumbnail_path, tags, updated_at
    )
    VALUES (
      @exercise_code, @name, @category, @body_region, @equipment, @difficulty,
      @default_reps, @default_sets, @default_rest, @coaching_cues, @common_mistakes,
      @regression, @progression, @video_path, @thumbnail_path, @tags, CURRENT_TIMESTAMP
    )
  `);

  runTransaction(() => {
    normalizedRows.forEach((row) => insert.run(row));
  });

  return {
    importedCount: normalizedRows.length,
    warnings
  };
}

