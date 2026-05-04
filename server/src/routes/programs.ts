import { Router } from "express";
import { z } from "zod";
import { db, runTransaction } from "../db";

export const programsRouter = Router();

const programInput = z.object({
  client_name: z.string().trim().min(1, "Client name is required."),
  program_name: z.string().trim().min(1, "Program name is required."),
  program_level: z.string().optional().nullable(),
  program_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  exercises: z.array(z.object({
    exercise_id: z.number(),
    order_index: z.number().optional(),
    custom_reps: z.string().optional().nullable(),
    custom_sets: z.string().optional().nullable(),
    custom_rest: z.string().optional().nullable(),
    custom_notes: z.string().optional().nullable()
  })).optional()
});

const programExerciseInput = z.object({
  exercise_id: z.number(),
  order_index: z.number().optional(),
  custom_reps: z.string().optional().nullable(),
  custom_sets: z.string().optional().nullable(),
  custom_rest: z.string().optional().nullable(),
  custom_notes: z.string().optional().nullable()
});

const programExerciseUpdateInput = programExerciseInput.partial().extend({
  exercise_id: z.number().optional()
});

type ProgramPayload = {
  id: number;
  client_name: string;
  program_name: string;
  program_level?: string | null;
  program_date?: string | null;
  notes?: string | null;
  created_at: string;
  exercises: unknown[];
};

function getProgramPayload(programId: number): ProgramPayload | null {
  const program = db.prepare("SELECT * FROM programs WHERE id = ?").get(programId) as Omit<ProgramPayload, "exercises"> | undefined;
  if (!program) return null;

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
      e.video_path,
      e.thumbnail_path,
      e.tags
    FROM program_exercises pe
    JOIN exercises e ON e.id = pe.exercise_id
    WHERE pe.program_id = ?
    ORDER BY pe.order_index ASC, pe.id ASC
  `).all(programId);

  return { ...program, exercises };
}

function nextOrderIndex(programId: number) {
  const row = db.prepare("SELECT COALESCE(MAX(order_index), -1) + 1 AS nextIndex FROM program_exercises WHERE program_id = ?").get(programId) as { nextIndex: number };
  return row.nextIndex;
}

programsRouter.get("/", (_req, res) => {
  const rows = db.prepare(`
    SELECT p.*, COUNT(pe.id) AS exercise_count
    FROM programs p
    LEFT JOIN program_exercises pe ON pe.program_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();

  res.json({ programs: rows });
});

programsRouter.post("/", (req, res, next) => {
  try {
    const input = programInput.parse(req.body);
    const createdId = runTransaction(() => {
      const result = db.prepare(`
        INSERT INTO programs (client_name, program_name, program_level, program_date, notes)
        VALUES (@client_name, @program_name, @program_level, @program_date, @notes)
      `).run(input);

      const programId = Number(result.lastInsertRowid);
      const insertExercise = db.prepare(`
        INSERT INTO program_exercises (
          program_id, exercise_id, order_index, custom_reps, custom_sets, custom_rest, custom_notes
        )
        VALUES (
          @program_id, @exercise_id, @order_index, @custom_reps, @custom_sets, @custom_rest, @custom_notes
        )
      `);

      input.exercises?.forEach((exercise, index) => {
        insertExercise.run({
          program_id: programId,
          exercise_id: exercise.exercise_id,
          order_index: exercise.order_index ?? index,
          custom_reps: exercise.custom_reps || null,
          custom_sets: exercise.custom_sets || null,
          custom_rest: exercise.custom_rest || null,
          custom_notes: exercise.custom_notes || null
        });
      });

      return programId;
    });

    res.status(201).json(getProgramPayload(createdId));
  } catch (error) {
    next(error);
  }
});

programsRouter.get("/:id", (req, res) => {
  const payload = getProgramPayload(Number(req.params.id));
  if (!payload) {
    res.status(404).json({ error: "Program not found." });
    return;
  }

  res.json(payload);
});

programsRouter.put("/:id", (req, res, next) => {
  try {
    const input = programInput.partial().parse(req.body);
    const current = getProgramPayload(Number(req.params.id));
    if (!current) {
      res.status(404).json({ error: "Program not found." });
      return;
    }

    runTransaction(() => {
      db.prepare(`
        UPDATE programs SET
          client_name = COALESCE(@client_name, client_name),
          program_name = COALESCE(@program_name, program_name),
          program_level = @program_level,
          program_date = @program_date,
          notes = @notes
        WHERE id = @id
      `).run({
        id: Number(req.params.id),
        client_name: input.client_name ?? current.client_name,
        program_name: input.program_name ?? current.program_name,
        program_level: input.program_level ?? current.program_level ?? null,
        program_date: input.program_date ?? current.program_date ?? null,
        notes: input.notes ?? current.notes ?? null
      });

      if (input.exercises) {
        db.prepare("DELETE FROM program_exercises WHERE program_id = ?").run(Number(req.params.id));
        const insertExercise = db.prepare(`
          INSERT INTO program_exercises (
            program_id, exercise_id, order_index, custom_reps, custom_sets, custom_rest, custom_notes
          )
          VALUES (
            @program_id, @exercise_id, @order_index, @custom_reps, @custom_sets, @custom_rest, @custom_notes
          )
        `);

        input.exercises.forEach((exercise, index) => {
          insertExercise.run({
            program_id: Number(req.params.id),
            exercise_id: exercise.exercise_id,
            order_index: exercise.order_index ?? index,
            custom_reps: exercise.custom_reps || null,
            custom_sets: exercise.custom_sets || null,
            custom_rest: exercise.custom_rest || null,
            custom_notes: exercise.custom_notes || null
          });
        });
      }
    });

    res.json(getProgramPayload(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

programsRouter.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM programs WHERE id = ?").run(Number(req.params.id));
  if (result.changes === 0) {
    res.status(404).json({ error: "Program not found." });
    return;
  }
  res.status(204).send();
});

programsRouter.post("/:id/exercises", (req, res, next) => {
  try {
    const input = programExerciseInput.parse(req.body);
    const programId = Number(req.params.id);
    const result = db.prepare(`
      INSERT INTO program_exercises (
        program_id, exercise_id, order_index, custom_reps, custom_sets, custom_rest, custom_notes
      )
      VALUES (
        @program_id, @exercise_id, @order_index, @custom_reps, @custom_sets, @custom_rest, @custom_notes
      )
    `).run({
      program_id: programId,
      exercise_id: input.exercise_id,
      order_index: input.order_index ?? nextOrderIndex(programId),
      custom_reps: input.custom_reps || null,
      custom_sets: input.custom_sets || null,
      custom_rest: input.custom_rest || null,
      custom_notes: input.custom_notes || null
    });

    res.status(201).json({ id: result.lastInsertRowid, ...input });
  } catch (error) {
    next(error);
  }
});

programsRouter.put("/:id/exercises/:programExerciseId", (req, res, next) => {
  try {
    const input = programExerciseUpdateInput.parse(req.body);
    const current = db
      .prepare("SELECT * FROM program_exercises WHERE id = ? AND program_id = ?")
      .get(Number(req.params.programExerciseId), Number(req.params.id));

    if (!current) {
      res.status(404).json({ error: "Program exercise not found." });
      return;
    }

    db.prepare(`
      UPDATE program_exercises SET
        exercise_id = COALESCE(@exercise_id, exercise_id),
        order_index = COALESCE(@order_index, order_index),
        custom_reps = @custom_reps,
        custom_sets = @custom_sets,
        custom_rest = @custom_rest,
        custom_notes = @custom_notes
      WHERE id = @id AND program_id = @program_id
    `).run({
      ...current as object,
      ...input,
      id: Number(req.params.programExerciseId),
      program_id: Number(req.params.id),
      custom_reps: input.custom_reps ?? (current as { custom_reps?: string | null }).custom_reps,
      custom_sets: input.custom_sets ?? (current as { custom_sets?: string | null }).custom_sets,
      custom_rest: input.custom_rest ?? (current as { custom_rest?: string | null }).custom_rest,
      custom_notes: input.custom_notes ?? (current as { custom_notes?: string | null }).custom_notes
    });

    res.json(getProgramPayload(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
});

programsRouter.delete("/:id/exercises/:programExerciseId", (req, res) => {
  const result = db
    .prepare("DELETE FROM program_exercises WHERE id = ? AND program_id = ?")
    .run(Number(req.params.programExerciseId), Number(req.params.id));

  if (result.changes === 0) {
    res.status(404).json({ error: "Program exercise not found." });
    return;
  }

  res.status(204).send();
});
