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
  video_exists?: boolean;
  thumbnail_exists?: boolean;
  media_warnings?: string[];
};

export type ExerciseFilters = {
  search: string;
  category: string;
  body_region: string;
  equipment: string;
  difficulty: string;
  tags: string;
};

export type Facets = Record<"category" | "body_region" | "equipment" | "difficulty", Array<{ value: string }>>;

export type ProgramSummary = {
  id: number;
  client_name: string;
  program_name: string;
  program_level?: string | null;
  program_date?: string | null;
  notes?: string | null;
  created_at: string;
  exercise_count: number;
};

export type ProgramExercise = Exercise & {
  id?: number;
  program_id?: number;
  program_exercise_id?: number;
  exercise_id: number;
  order_index: number;
  custom_reps?: string | null;
  custom_sets?: string | null;
  custom_rest?: string | null;
  custom_notes?: string | null;
};

export type ProgramDetail = {
  id: number;
  client_name: string;
  program_name: string;
  program_level?: string | null;
  program_date?: string | null;
  notes?: string | null;
  created_at: string;
  exercises: ProgramExercise[];
};

