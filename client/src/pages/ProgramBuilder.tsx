import { Loader2, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiJson, exerciseQuery } from "../api";
import ExerciseFilters from "../components/ExerciseFilters";
import ExerciseTable from "../components/ExerciseTable";
import GeneratePptxButton from "../components/GeneratePptxButton";
import ProgramExerciseList from "../components/ProgramExerciseList";
import { Exercise, ExerciseFilters as Filters, Facets, ProgramDetail, ProgramExercise } from "../types";

const emptyFilters: Filters = {
  search: "",
  category: "",
  body_region: "",
  equipment: "",
  difficulty: "",
  tags: ""
};

const today = new Date().toISOString().slice(0, 10);

type ProgramMeta = {
  client_name: string;
  program_name: string;
  program_level: string;
  program_date: string;
  notes: string;
};

const emptyMeta: ProgramMeta = {
  client_name: "",
  program_name: "",
  program_level: "",
  program_date: today,
  notes: ""
};

type Props = {
  programId: number | null;
  onSaved: (id: number) => void;
};

export default function ProgramBuilder({ programId, onSaved }: Props) {
  const [meta, setMeta] = useState<ProgramMeta>(emptyMeta);
  const [currentProgramId, setCurrentProgramId] = useState<number | null>(programId);
  const [selected, setSelected] = useState<ProgramExercise[]>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [facets, setFacets] = useState<Facets>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadLibrary = async () => {
    try {
      const payload = await apiGet<{ exercises: Exercise[]; facets: Facets }>(exerciseQuery(filters));
      setLibrary(payload.exercises);
      setFacets(payload.facets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load exercises.");
    }
  };

  useEffect(() => {
    void loadLibrary();
  }, [filters]);

  useEffect(() => {
    const loadProgram = async () => {
      if (!programId) return;
      setLoading(true);
      setError("");
      try {
        const program = await apiGet<ProgramDetail>(`/api/programs/${programId}`);
        setCurrentProgramId(program.id);
        setMeta({
          client_name: program.client_name,
          program_name: program.program_name,
          program_level: program.program_level || "",
          program_date: program.program_date || today,
          notes: program.notes || ""
        });
        setSelected(program.exercises.map((exercise, index) => ({
          ...exercise,
          exercise_id: exercise.exercise_id,
          order_index: index
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load program.");
      } finally {
        setLoading(false);
      }
    };
    void loadProgram();
  }, [programId]);

  const addExercise = (exercise: Exercise) => {
    if (selected.some((item) => item.exercise_id === exercise.id)) {
      setMessage(`${exercise.name} is already in this program.`);
      return;
    }

    setSelected((current) => [
      ...current,
      {
        ...exercise,
        exercise_id: exercise.id,
        order_index: current.length,
        custom_reps: exercise.default_reps || "",
        custom_sets: exercise.default_sets || "",
        custom_rest: exercise.default_rest || "",
        custom_notes: ""
      }
    ]);
    setMessage(`${exercise.name} added.`);
  };

  const updateSelected = (index: number, patch: Partial<ProgramExercise>) => {
    setSelected((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const moveSelected = (index: number, direction: -1 | 1) => {
    setSelected((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy.map((item, itemIndex) => ({ ...item, order_index: itemIndex }));
    });
  };

  const removeSelected = (index: number) => {
    setSelected((current) => current.filter((_item, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, order_index: itemIndex })));
  };

  const saveProgram = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...meta,
        exercises: selected.map((exercise, index) => ({
          exercise_id: exercise.exercise_id,
          order_index: index,
          custom_reps: exercise.custom_reps || "",
          custom_sets: exercise.custom_sets || "",
          custom_rest: exercise.custom_rest || "",
          custom_notes: exercise.custom_notes || ""
        }))
      };

      const saved = currentProgramId
        ? await apiJson<ProgramDetail>(`/api/programs/${currentProgramId}`, "PUT", payload)
        : await apiJson<ProgramDetail>("/api/programs", "POST", payload);

      setCurrentProgramId(saved.id);
      onSaved(saved.id);
      setMessage("Program saved.");
      return saved.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save program.";
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await saveProgram();
  };

  const ensureProgramSaved = async () => {
    if (selected.length === 0) {
      throw new Error("Cannot generate PowerPoint: this program has no exercises.");
    }
    return saveProgram();
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h2>Program Builder</h2>
          <span>{currentProgramId ? `Editing program #${currentProgramId}` : "New program"}</span>
        </div>
        {loading && <Loader2 className="spin" size={20} />}
      </header>

      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      <form className="content-panel program-meta" onSubmit={submit}>
        <label>
          <span>Client name</span>
          <input value={meta.client_name} onChange={(event) => setMeta({ ...meta, client_name: event.target.value })} required />
        </label>
        <label>
          <span>Program name</span>
          <input value={meta.program_name} onChange={(event) => setMeta({ ...meta, program_name: event.target.value })} required />
        </label>
        <label>
          <span>Level</span>
          <input value={meta.program_level} onChange={(event) => setMeta({ ...meta, program_level: event.target.value })} />
        </label>
        <label>
          <span>Date</span>
          <input type="date" value={meta.program_date} onChange={(event) => setMeta({ ...meta, program_date: event.target.value })} />
        </label>
        <label className="notes-field">
          <span>Notes</span>
          <textarea value={meta.notes} onChange={(event) => setMeta({ ...meta, notes: event.target.value })} />
        </label>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
          Save Program
        </button>
      </form>

      <div className="builder-grid">
        <section className="content-panel">
          <div className="panel-title">
            <h3>Exercise Selection</h3>
          </div>
          <ExerciseFilters filters={filters} facets={facets} onChange={setFilters} />
          <ExerciseTable exercises={library} mode="select" onAdd={addExercise} />
        </section>

        <section className="content-panel">
          <div className="panel-title">
            <h3>Selected Exercises</h3>
            <span>{selected.length}</span>
          </div>
          <ProgramExerciseList exercises={selected} onChange={updateSelected} onMove={moveSelected} onRemove={removeSelected} />
          <GeneratePptxButton disabled={selected.length === 0 || saving} ensureProgramSaved={ensureProgramSaved} />
        </section>
      </div>
    </div>
  );
}

