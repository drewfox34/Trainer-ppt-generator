import fs from "fs";
import path from "path";
import PptxGenJS from "pptxgenjs";
import { db } from "../db";
import { outputRoot, resolveProjectPath, storageRoot } from "../paths";
import { Program, ProgramExerciseWithExercise } from "../types";
import { fileExistsFromProjectPath, toLinkTarget, validateMediaPaths } from "./mediaValidationService";

export type PptxMode = "linked" | "embedded";

function getLogoPath(): string | null {
  // Bundled production path (server/dist/ex4l-logo.png next to bundle.cjs)
  const distPath = path.join(__dirname, "ex4l-logo.png");
  if (fs.existsSync(distPath)) return distPath;
  // Dev path (server/src/assets/ex4l-logo.png relative to service file)
  const srcPath = path.join(__dirname, "..", "assets", "ex4l-logo.png");
  if (fs.existsSync(srcPath)) return srcPath;
  return null;
}

const SLIDE_WIDTH = 13.333;
const SLIDE_HEIGHT = 7.5;
const MEDIA_SIZE = 7.5;
const PANEL_X = 7.5;
const PANEL_W = SLIDE_WIDTH - PANEL_X;

function sanitizeFileName(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "program";
}

function paragraphLines(value: string | null | undefined) {
  return (value || "")
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatSets(value: string | null | undefined) {
  const normalized = (value || "").trim();
  if (!normalized) return "Sets TBD";
  if (/set/i.test(normalized)) return normalized;
  if (/^\d+$/.test(normalized)) return `${normalized} ${normalized === "1" ? "set" : "sets"}`;
  return normalized;
}

function formatRest(value: string | null | undefined) {
  const normalized = (value || "").trim();
  if (!normalized || /^(0|none|no rest)$/i.test(normalized)) return "No Rest";
  if (/rest/i.test(normalized)) return normalized;
  return `${normalized} Rest`;
}

function getProgram(programId: number) {
  const program = db.prepare("SELECT * FROM programs WHERE id = ?").get(programId) as Program | undefined;
  if (!program) {
    throw new Error("Program not found.");
  }

  const exercises = db.prepare(`
    SELECT
      pe.id,
      pe.program_id,
      pe.exercise_id,
      pe.order_index,
      pe.custom_reps,
      pe.custom_sets,
      pe.custom_rest,
      pe.custom_notes,
      e.exercise_code,
      e.name,
      e.category,
      e.body_region,
      e.equipment,
      e.difficulty,
      e.default_reps,
      e.default_sets,
      e.default_rest,
      e.coaching_cues,
      e.common_mistakes,
      e.regression,
      e.progression,
      e.video_path,
      e.thumbnail_path,
      e.tags,
      e.created_at,
      e.updated_at
    FROM program_exercises pe
    JOIN exercises e ON e.id = pe.exercise_id
    WHERE pe.program_id = ?
    ORDER BY pe.order_index ASC, pe.id ASC
  `).all(programId) as ProgramExerciseWithExercise[];

  return { program, exercises };
}

function addFooter(slide: PptxGenJS.Slide, program: Program, exerciseNumber?: string) {
  slide.addShape("line", {
    x: PANEL_X + 0.22,
    y: 7.18,
    w: PANEL_W - 0.55,
    h: 0,
    line: { color: "ECEFF2", width: 0.7 }
  });

  slide.addText(`${program.client_name} | ${program.program_name}`, {
    x: PANEL_X + 0.25,
    y: 7.25,
    w: 4.45,
    h: 0.18,
    fontSize: 6.8,
    color: "8A949E",
    margin: 0
  });

  if (exerciseNumber) {
    slide.addText(exerciseNumber, {
      x: 12.33,
      y: 7.25,
      w: 0.75,
      h: 0.18,
      fontSize: 6.8,
      color: "8A949E",
      align: "right",
      margin: 0
    });
  }
}

function addSectionHeader(slide: PptxGenJS.Slide, label: string, x: number, y: number, w: number) {
  slide.addText(label.toUpperCase(), {
    x,
    y,
    w,
    h: 0.18,
    fontSize: 7,
    bold: true,
    color: "6B7A55",
    margin: 0,
    breakLine: false,
    fit: "shrink"
  });
}

function addBulletBlock(slide: PptxGenJS.Slide, label: string, lines: string[], x: number, y: number, w: number, h: number) {
  addSectionHeader(slide, label, x, y, w);
  if (lines.length === 0) {
    slide.addText("Not specified", {
      x,
      y: y + 0.28,
      w,
      h,
      fontSize: 10,
      italic: true,
      color: "93A1AF",
      margin: 0
    });
    return;
  }

  slide.addText(
    lines.slice(0, 5).map((line) => ({ text: line, options: { bullet: { type: "bullet" } } })),
    {
      x,
      y: y + 0.28,
      w,
      h,
      fontSize: 10,
      color: "263238",
      breakLine: false,
      fit: "shrink",
      margin: 0.02
    }
  );
}

function addLinkedMedia(slide: PptxGenJS.Slide, exercise: ProgramExerciseWithExercise, warnings: string[]) {
  const thumbPath = exercise.thumbnail_path && fileExistsFromProjectPath(exercise.thumbnail_path)
    ? resolveProjectPath(exercise.thumbnail_path)
    : null;
  const hasLocalThumbnail = Boolean(thumbPath && !/^https?:\/\//i.test(thumbPath));
  const videoLink = exercise.video_path ? toLinkTarget(exercise.video_path) : "";

  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: MEDIA_SIZE,
    h: SLIDE_HEIGHT,
    line: { color: "E1E6EA", transparency: 100 },
    fill: { color: "F4F6F8" }
  });

  if (hasLocalThumbnail && thumbPath) {
    slide.addImage({
      path: thumbPath,
      x: 0,
      y: 0,
      w: MEDIA_SIZE,
      h: SLIDE_HEIGHT,
      hyperlink: videoLink ? { url: videoLink } : undefined,
      sizing: { type: "cover", x: 0, y: 0, w: MEDIA_SIZE, h: SLIDE_HEIGHT }
    });
  } else {
    // plain branded placeholder — no content needed, logo watermark is on right panel
  }

  if (!exercise.thumbnail_path) {
    warnings.push(`${exercise.exercise_code}: no thumbnail path was provided.`);
  }

  if (exercise.thumbnail_path && !fileExistsFromProjectPath(exercise.thumbnail_path)) {
    warnings.push(`${exercise.exercise_code}: thumbnail file was missing, so a placeholder was used.`);
  }

  if (videoLink) {
    slide.addText("Watch Video", {
      x: hasLocalThumbnail ? 0.32 : 2.25,
      y: hasLocalThumbnail ? 7.05 : 4.02,
      w: hasLocalThumbnail ? 1.35 : 3,
      h: 0.26,
      fontSize: hasLocalThumbnail ? 7 : 12,
      bold: true,
      color: "FFFFFF",
      align: "center",
      margin: 0.05,
      hyperlink: { url: videoLink },
      fill: { color: "111111", transparency: hasLocalThumbnail ? 26 : 0 },
      line: { color: "111111", transparency: hasLocalThumbnail ? 100 : 0 },
      radius: 0.08
    } as PptxGenJS.TextPropsOptions);
  } else {
    warnings.push(`${exercise.exercise_code}: no video path was provided.`);
  }
}

function addEmbeddedMedia(slide: PptxGenJS.Slide, exercise: ProgramExerciseWithExercise, warnings: string[]) {
  const resolvedVideo = exercise.video_path ? resolveProjectPath(exercise.video_path) : null;
  const canEmbed = resolvedVideo
    && !/^https?:\/\//i.test(resolvedVideo)
    && fs.existsSync(resolvedVideo)
    && [".mp4", ".m4v", ".mov"].includes(path.extname(resolvedVideo).toLowerCase());

  if (!canEmbed) {
    warnings.push(`${exercise.exercise_code}: embedded video was unavailable, so linked thumbnail mode was used for this slide.`);
    addLinkedMedia(slide, exercise, warnings);
    return;
  }

  try {
    const poster = exercise.thumbnail_path && fileExistsFromProjectPath(exercise.thumbnail_path)
      ? resolveProjectPath(exercise.thumbnail_path)
      : undefined;
    slide.addMedia({
      type: "video",
      path: resolvedVideo,
      x: 0,
      y: 0,
      w: MEDIA_SIZE,
      h: SLIDE_HEIGHT,
      poster
    } as PptxGenJS.MediaProps);
  } catch (error) {
    warnings.push(`${exercise.exercise_code}: embedded video failed (${error instanceof Error ? error.message : "unknown error"}), so linked thumbnail mode was used.`);
    addLinkedMedia(slide, exercise, warnings);
  }
}

function addExerciseSlide(
  pptx: PptxGenJS,
  program: Program,
  exercise: ProgramExerciseWithExercise,
  index: number,
  total: number,
  mode: PptxMode,
  warnings: string[]
) {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

  const exerciseNumber = `${index + 1} of ${total}`;

  slide.addShape("rect", {
    x: PANEL_X,
    y: 0,
    w: PANEL_W,
    h: SLIDE_HEIGHT,
    fill: { color: "FFFFFF" },
    line: { color: "FFFFFF", transparency: 100 }
  });

  const logoPath = getLogoPath();
  if (logoPath) {
    slide.addImage({
      path: logoPath,
      x: PANEL_X,
      y: 0,
      w: PANEL_W,
      h: SLIDE_HEIGHT,
      transparency: 88,
      sizing: { type: "contain", x: PANEL_X, y: 0, w: PANEL_W, h: SLIDE_HEIGHT }
    });
  }

  const mediaWarnings = validateMediaPaths(exercise).warnings;
  warnings.push(...mediaWarnings);

  if (mode === "embedded") {
    addEmbeddedMedia(slide, exercise, warnings);
  } else {
    addLinkedMedia(slide, exercise, warnings);
  }

  slide.addText(exercise.name, {
    x: PANEL_X + 0.22,
    y: 0.34,
    w: PANEL_W - 0.34,
    h: 1.58,
    fontFace: "Aptos Display",
    fontSize: 44,
    bold: false,
    color: "111111",
    margin: 0,
    fit: "shrink",
    breakLine: false,
    valign: "top"
  });
  const reps = exercise.custom_reps || exercise.default_reps || "TBD";
  const sets = formatSets(exercise.custom_sets || exercise.default_sets);
  const rest = formatRest(exercise.custom_rest || exercise.default_rest);
  const detailRows: Array<[string, number, number]> = [
    [reps, 2.62, 4.93],
    [sets, 4.08, 3.72],
    [rest, 5.54, 5.05]
  ];

  detailRows.forEach(([value, y, w]) => {
    slide.addText(value, {
      x: PANEL_X + 0.47,
      y,
      w,
      h: 0.72,
      fontFace: "Aptos",
      fontSize: 36,
      bold: false,
      color: "111111",
      align: "left",
      margin: 0,
      fit: "shrink",
      breakLine: false
    });
  });

  const customNotes = paragraphLines(exercise.custom_notes);
  if (customNotes.length > 0 || exercise.exercise_code) {
    const noteText = customNotes.length > 0 ? customNotes.join(" | ") : exercise.exercise_code;
    slide.addText(noteText, {
      x: PANEL_X + 0.47,
      y: 6.63,
      w: PANEL_W - 0.84,
      h: 0.24,
      fontSize: 8,
      color: "9AA3AA",
      margin: 0,
      fit: "shrink"
    });
  }

  addFooter(slide, program, exerciseNumber);
}

function addTitleSlide(pptx: PptxGenJS, program: Program) {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  const titleText = [program.program_name, program.program_level, program.program_date]
    .filter((value) => value && String(value).trim())
    .join(" ");
  slide.addText(titleText || "Exercise Program", {
    x: 2.15,
    y: 5.89,
    w: 9.03,
    h: 0.71,
    fontFace: "Aptos",
    fontSize: 36,
    bold: false,
    color: "111111",
    align: "center",
    margin: 0,
    fit: "shrink"
  });
}

function addOverviewSlide(pptx: PptxGenJS, program: Program, exercises: ProgramExerciseWithExercise[]) {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  slide.addText("Program Overview", {
    x: 0.55,
    y: 0.45,
    w: 7,
    h: 0.45,
    fontSize: 25,
    bold: true,
    color: "17242C",
    margin: 0
  });
  slide.addShape("line", { x: 0.55, y: 1.06, w: 12.15, h: 0, line: { color: "DDE5EA", width: 1 } });
  slide.addText(`Total exercises: ${exercises.length}`, {
    x: 0.7,
    y: 1.55,
    w: 3,
    h: 0.35,
    fontSize: 15,
    bold: true,
    color: "1F6F78",
    margin: 0
  });
  slide.addText(
    exercises.map((exercise, index) => `${index + 1}. ${exercise.name}`).join("\n"),
    {
      x: 0.7,
      y: 2.12,
      w: 6.2,
      h: 4.5,
      fontSize: 12,
      color: "25323A",
      breakLine: false,
      fit: "shrink",
      margin: 0
    }
  );
  slide.addShape("roundRect", {
    x: 7.35,
    y: 1.55,
    w: 5.05,
    h: 4.9,
    rectRadius: 0.08,
    fill: { color: "F7FAFC" },
    line: { color: "D8E1E8" }
  });
  slide.addText("Trainer Notes", {
    x: 7.7,
    y: 1.9,
    w: 4.2,
    h: 0.28,
    fontSize: 13,
    bold: true,
    color: "274C4F",
    margin: 0
  });
  slide.addText(program.notes || "No additional notes.", {
    x: 7.7,
    y: 2.38,
    w: 4.25,
    h: 3.45,
    fontSize: 12,
    color: "25323A",
    fit: "shrink",
    valign: "top",
    margin: 0
  });
  addFooter(slide, program);
}

function addFinalNotesSlide(pptx: PptxGenJS, program: Program) {
  if (!program.notes) return;
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  slide.addText("Final Notes", {
    x: 0.65,
    y: 0.6,
    w: 6,
    h: 0.5,
    fontSize: 26,
    bold: true,
    color: "17242C",
    margin: 0
  });
  slide.addText(program.notes, {
    x: 0.75,
    y: 1.45,
    w: 11.4,
    h: 4.8,
    fontSize: 16,
    color: "25323A",
    fit: "shrink",
    valign: "top",
    margin: 0
  });
  addFooter(slide, program);
}

async function buildDeck(programId: number, mode: PptxMode) {
  const { program, exercises } = getProgram(programId);
  if (exercises.length === 0) {
    throw new Error("Cannot generate PowerPoint: this program has no exercises.");
  }

  const warnings: string[] = [];
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Trainer PPT Generator";
  pptx.company = "Local-first trainer app";
  pptx.subject = program.program_name;
  pptx.title = `${program.program_name} - ${program.client_name}`;
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos"
  };

  addTitleSlide(pptx, program);
  addOverviewSlide(pptx, program, exercises);
  exercises.forEach((exercise, index) => addExerciseSlide(pptx, program, exercise, index, exercises.length, mode, warnings));
  addFinalNotesSlide(pptx, program);

  const dateStamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `${sanitizeFileName(program.client_name)} - ${sanitizeFileName(program.program_name)} - ${dateStamp}.pptx`;
  const absolutePath = path.join(outputRoot, fileName);
  await pptx.writeFile({ fileName: absolutePath });

  return {
    absolutePath,
    relativePath: path.relative(storageRoot, absolutePath).replace(/\\/g, "/"),
    fileName,
    warnings
  };
}

export async function generateProgramPptx(programId: number, mode: PptxMode = "linked") {
  try {
    return await buildDeck(programId, mode);
  } catch (error) {
    if (mode === "embedded") {
      const fallback = await buildDeck(programId, "linked");
      fallback.warnings.unshift(`Embedded video generation failed (${error instanceof Error ? error.message : "unknown error"}). Deck was generated in linked thumbnail mode.`);
      return fallback;
    }
    throw error;
  }
}
