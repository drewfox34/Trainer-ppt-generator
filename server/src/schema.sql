PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  body_region TEXT,
  equipment TEXT,
  difficulty TEXT,
  default_reps TEXT,
  default_sets TEXT,
  default_rest TEXT,
  coaching_cues TEXT,
  common_mistakes TEXT,
  regression TEXT,
  progression TEXT,
  video_path TEXT,
  thumbnail_path TEXT,
  tags TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  program_name TEXT NOT NULL,
  program_level TEXT,
  program_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS program_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  custom_reps TEXT,
  custom_sets TEXT,
  custom_rest TEXT,
  custom_notes TEXT,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_code ON exercises(exercise_code);
CREATE INDEX IF NOT EXISTS idx_program_exercises_program ON program_exercises(program_id, order_index);

