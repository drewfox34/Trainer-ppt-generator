import fs from "fs";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { validateMediaPaths } from "../services/mediaValidationService";
import { videosRoot, thumbnailsRoot } from "../paths";

export const exercisesRouter = Router();

const exerciseInput = z.object({
  exercise_code: z.string().trim().min(1, "Exercise code is required."),
  name: z.string().trim().min(1, "Exercise name is required."),
  category: z.string().optional().nullable(),
  body_region: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
  difficulty: z.string().optional().nullable(),
  default_reps: z.string().optional().nullable(),
  default_sets: z.string().optional().nullable(),
  default_rest: z.string().optional().nullable(),
  coaching_cues: z.string().optional().nullable(),
  common_mistakes: z.string().optional().nullable(),
  regression: z.string().optional().nullable(),
  progression: z.string().optional().nullable(),
  video_path: z.string().optional().nullable(),
  thumbnail_path: z.string().optional().nullable(),
  tags: z.string().optional().nullable()
});

function mediaDecorate<T extends { video_path?: string | null; thumbnail_path?: string | null; exercise_code?: string | null }>(row: T) {
  const media = validateMediaPaths(row);
  return {
    ...row,
    video_exists: media.videoExists,
    thumbnail_exists: media.thumbnailExists,
    media_warnings: media.warnings
  };
}

exercisesRouter.get("/", (req, res) => {
  const filters = {
    search: String(req.query.search || "").trim(),
    category: String(req.query.category || "").trim(),
    body_region: String(req.query.body_region || "").trim(),
    equipment: String(req.query.equipment || "").trim(),
    difficulty: String(req.query.difficulty || "").trim(),
    tags: String(req.query.tags || "").trim()
  };

  const where: string[] = [];
  const params: string[] = [];

  if (filters.search) {
    where.push("(name LIKE ? OR exercise_code LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  ["category", "body_region", "equipment", "difficulty"].forEach((key) => {
    const value = filters[key as keyof typeof filters];
    if (value) {
      where.push(`${key} = ?`);
      params.push(value);
    }
  });

  if (filters.tags) {
    where.push("tags LIKE ?");
    params.push(`%${filters.tags}%`);
  }

  const rows = db
    .prepare(`SELECT * FROM exercises ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY name COLLATE NOCASE ASC`)
    .all(...params) as Array<{ video_path?: string | null; thumbnail_path?: string | null; exercise_code?: string | null }>;

  const facets = {
    category: db.prepare("SELECT DISTINCT category AS value FROM exercises WHERE COALESCE(category, '') <> '' ORDER BY category").all(),
    body_region: db.prepare("SELECT DISTINCT body_region AS value FROM exercises WHERE COALESCE(body_region, '') <> '' ORDER BY body_region").all(),
    equipment: db.prepare("SELECT DISTINCT equipment AS value FROM exercises WHERE COALESCE(equipment, '') <> '' ORDER BY equipment").all(),
    difficulty: db.prepare("SELECT DISTINCT difficulty AS value FROM exercises WHERE COALESCE(difficulty, '') <> '' ORDER BY difficulty").all()
  };

  res.json({
    exercises: rows.map((row) => mediaDecorate(row)),
    facets
  });
});

exercisesRouter.post("/", (req, res, next) => {
  try {
    const input = exerciseInput.parse(req.body);
    const result = db.prepare(`
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
    `).run(input);

    const created = db.prepare("SELECT * FROM exercises WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(mediaDecorate(created as typeof input & { id: number }));
  } catch (error) {
    next(error);
  }
});

exercisesRouter.put("/:id", (req, res, next) => {
  try {
    const input = exerciseInput.parse(req.body);
    const result = db.prepare(`
      UPDATE exercises SET
        exercise_code = @exercise_code,
        name = @name,
        category = @category,
        body_region = @body_region,
        equipment = @equipment,
        difficulty = @difficulty,
        default_reps = @default_reps,
        default_sets = @default_sets,
        default_rest = @default_rest,
        coaching_cues = @coaching_cues,
        common_mistakes = @common_mistakes,
        regression = @regression,
        progression = @progression,
        video_path = @video_path,
        thumbnail_path = @thumbnail_path,
        tags = @tags,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({ ...input, id: Number(req.params.id) });

    if (result.changes === 0) {
      res.status(404).json({ error: "Exercise not found." });
      return;
    }

    const updated = db.prepare("SELECT * FROM exercises WHERE id = ?").get(req.params.id);
    res.json(mediaDecorate(updated as typeof input & { id: number }));
  } catch (error) {
    next(error);
  }
});

exercisesRouter.post("/auto-link-media", (_req, res) => {
  function listDir(dir: string) {
    if (!fs.existsSync(dir)) return [] as string[];
    return fs.readdirSync(dir);
  }

  const videoFiles   = listDir(videosRoot);
  const thumbFiles   = listDir(thumbnailsRoot);
  const exercises    = db.prepare("SELECT id, exercise_code, video_path, thumbnail_path FROM exercises").all() as Array<{
    id: number; exercise_code: string; video_path: string | null; thumbnail_path: string | null;
  }>;

  let linked = 0;

  for (const ex of exercises) {
    const code = ex.exercise_code.trim();
    if (!code) continue;
    const prefix = code.toLowerCase();

    if (!ex.video_path) {
      const match = videoFiles.find(f => f.toLowerCase().startsWith(prefix + "_") || f.toLowerCase().startsWith(prefix + "."));
      if (match) {
        db.prepare("UPDATE exercises SET video_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(`media/videos/${match}`, ex.id);
        linked++;
      }
    }

    if (!ex.thumbnail_path) {
      const match = thumbFiles.find(f => f.toLowerCase().startsWith(prefix + "_") || f.toLowerCase().startsWith(prefix + "."));
      if (match) {
        db.prepare("UPDATE exercises SET thumbnail_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(`media/thumbnails/${match}`, ex.id);
        linked++;
      }
    }
  }

  res.json({ linked });
});

exercisesRouter.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM exercises WHERE id = ?").run(Number(req.params.id));
  if (result.changes === 0) {
    res.status(404).json({ error: "Exercise not found." });
    return;
  }
  res.status(204).send();
});
