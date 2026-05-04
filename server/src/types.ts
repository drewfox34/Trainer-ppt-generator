export type Exercise = {
  id: number;
  exercise_code: string;
  name: string;
  category?: string | null;
  body_region?: string | null;
  equipment?: string | null;
  difficulty?: string | null;
  default_reps?: string | null;
  default_sets?: string | null;
  default_rest?: string | null;
  coaching_cues?: string | null;
  common_mistakes?: string | null;
  regression?: string | null;
  progression?: string | null;
  video_path?: string | null;
  thumbnail_path?: string | null;
  tags?: string | null;
  created_at: string;
  updated_at: string;
};

export type Program = {
  id: number;
  client_name: string;
  program_name: string;
  program_level?: string | null;
  program_date?: string | null;
  notes?: string | null;
  created_at: string;
};

export type ProgramExercise = {
  id: number;
  program_id: number;
  exercise_id: number;
  order_index: number;
  custom_reps?: string | null;
  custom_sets?: string | null;
  custom_rest?: string | null;
  custom_notes?: string | null;
};

export type ProgramExerciseWithExercise = ProgramExercise & Exercise;

export type MediaValidation = {
  videoExists: boolean;
  thumbnailExists: boolean;
  warnings: string[];
};

