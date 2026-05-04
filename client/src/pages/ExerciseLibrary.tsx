import { FolderOpen, ImageIcon, Link, Loader2, Plus, Save, Upload, Video } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiGet, apiJson, autoLinkMedia, exerciseQuery, getMediaFiles, openManagedFolder, uploadExerciseImport } from "../api";
import ExerciseFilters from "../components/ExerciseFilters";
import ExerciseTable from "../components/ExerciseTable";
import { Exercise, ExerciseFilters as Filters, Facets } from "../types";

const emptyFilters: Filters = {
  search: "",
  category: "",
  body_region: "",
  equipment: "",
  difficulty: "",
  tags: ""
};

const emptyExercise: Omit<Exercise, "id"> = {
  exercise_code: "",
  name: "",
  category: "",
  body_region: "",
  equipment: "",
  difficulty: "",
  default_reps: "",
  default_sets: "",
  default_rest: "",
  coaching_cues: "",
  common_mistakes: "",
  regression: "",
  progression: "",
  video_path: "",
  thumbnail_path: "",
  tags: ""
};

const textFields: Array<[keyof Omit<Exercise, "id">, string]> = [
  ["exercise_code", "Code"],
  ["name", "Name"],
  ["category", "Category"],
  ["body_region", "Body region"],
  ["equipment", "Equipment"],
  ["difficulty", "Difficulty"],
  ["default_sets", "Default sets"],
  ["default_reps", "Default reps"],
  ["default_rest", "Default rest"],
  ["tags", "Tags"],
];

export default function ExerciseLibrary() {
  const [filters, setFilters] = useState(emptyFilters);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [facets, setFacets] = useState<Facets>();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [draft, setDraft] = useState<Omit<Exercise, "id">>(emptyExercise);
  const [mediaFiles, setMediaFiles] = useState<{ videos: string[]; thumbnails: string[] }>({ videos: [], thumbnails: [] });
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isEditing = selectedExercise !== null;
  const formTitle = useMemo(() => isEditing ? "Edit Exercise" : "Add Exercise", [isEditing]);

  const loadExercises = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet<{ exercises: Exercise[]; facets: Facets }>(exerciseQuery(filters));
      setExercises(payload.exercises);
      setFacets(payload.facets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load exercises.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExercises();
  }, [filters]);

  useEffect(() => {
    getMediaFiles().then(setMediaFiles).catch(() => {});
  }, []);

  const refreshMediaFiles = () => getMediaFiles().then(setMediaFiles).catch(() => {});

  const resetForm = () => {
    setSelectedExercise(null);
    setDraft(emptyExercise);
  };

  const editExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setDraft({
      ...emptyExercise,
      ...exercise
    });
  };

  const saveExercise = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      if (selectedExercise) {
        await apiJson(`/api/exercises/${selectedExercise.id}`, "PUT", draft);
        setMessage("Exercise updated.");
      } else {
        await apiJson("/api/exercises", "POST", draft);
        setMessage("Exercise added.");
      }
      resetForm();
      await loadExercises();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save exercise.");
    }
  };

  const deleteExercise = async (exercise: Exercise) => {
    if (!window.confirm(`Delete ${exercise.name}?`)) return;
    setError("");
    setMessage("");
    try {
      await apiJson(`/api/exercises/${exercise.id}`, "DELETE");
      setMessage("Exercise deleted.");
      await loadExercises();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete exercise.");
    }
  };

  const runAutoLink = async () => {
    setLinking(true);
    setError("");
    setMessage("");
    try {
      const result = await autoLinkMedia();
      setMessage(result.linked > 0 ? `Auto-linked ${result.linked} media path${result.linked === 1 ? "" : "s"}.` : "No new matches found. Check that video filenames start with the exercise code (e.g. EX-001_name.mp4).");
      await loadExercises();
      await refreshMediaFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-link failed.");
    } finally {
      setLinking(false);
    }
  };

  const importFile = async (file: File | null) => {
    if (!file) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await uploadExerciseImport(file);
      setMessage(`Imported ${result.importedCount} exercises.${result.warnings.length ? ` ${result.warnings.length} media warning(s).` : ""}`);
      await loadExercises();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h2>Exercise Library</h2>
          <span>{exercises.length} exercise{exercises.length === 1 ? "" : "s"}</span>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={() => void openManagedFolder("videos")}><Video size={17} /> Videos Folder</button>
          <button className="secondary-button" onClick={() => void openManagedFolder("thumbnails")}><ImageIcon size={17} /> Thumbnails Folder</button>
          <button className="secondary-button" onClick={() => void runAutoLink()} disabled={linking}>
            {linking ? <Loader2 size={17} className="spin" /> : <Link size={17} />} Auto-Link Media
          </button>
          <label className="secondary-button file-button">
            <Upload size={17} /> Import CSV / Excel
            <input type="file" accept=".csv,.xls,.xlsx,.ods" onChange={(event) => void importFile(event.target.files?.[0] || null)} />
          </label>
        </div>
      </header>

      <ExerciseFilters filters={filters} facets={facets} onChange={setFilters} />

      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      <div className="split-layout">
        <section className="content-panel wide-panel">
          <div className="panel-title">
            <h3>Exercises</h3>
            {loading && <Loader2 className="spin" size={18} />}
          </div>
          <ExerciseTable exercises={exercises} onEdit={editExercise} onDelete={deleteExercise} />
        </section>

        <aside className="content-panel edit-panel">
          <div className="panel-title">
            <h3>{formTitle}</h3>
            <div className="row-actions">
              <button className="icon-button" onClick={() => void openManagedFolder("storage")} title="Open app data folder"><FolderOpen size={16} /></button>
              <button className="icon-button primary" onClick={resetForm} title="New exercise"><Plus size={16} /></button>
            </div>
          </div>

          <form className="stack-form" onSubmit={saveExercise}>
            {textFields.map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  value={(draft[key] as string | null | undefined) || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                  required={key === "exercise_code" || key === "name"}
                />
              </label>
            ))}

            <label>
              <span>Video file</span>
              <select
                value={draft.video_path || ""}
                onChange={(e) => setDraft((cur) => ({ ...cur, video_path: e.target.value }))}
              >
                <option value="">— none —</option>
                {mediaFiles.videos.map(f => <option key={f} value={f}>{f.replace("media/videos/", "")}</option>)}
                {draft.video_path && !mediaFiles.videos.includes(draft.video_path) && (
                  <option value={draft.video_path}>{draft.video_path} (current)</option>
                )}
              </select>
            </label>

            <label>
              <span>Thumbnail file</span>
              <select
                value={draft.thumbnail_path || ""}
                onChange={(e) => setDraft((cur) => ({ ...cur, thumbnail_path: e.target.value }))}
              >
                <option value="">— none —</option>
                {mediaFiles.thumbnails.map(f => <option key={f} value={f}>{f.replace("media/thumbnails/", "")}</option>)}
                {draft.thumbnail_path && !mediaFiles.thumbnails.includes(draft.thumbnail_path) && (
                  <option value={draft.thumbnail_path}>{draft.thumbnail_path} (current)</option>
                )}
              </select>
            </label>

            <label>
              <span>Coaching cues</span>
              <textarea
                value={draft.coaching_cues || ""}
                onChange={(event) => setDraft((current) => ({ ...current, coaching_cues: event.target.value }))}
              />
            </label>
            <label>
              <span>Common mistakes</span>
              <textarea
                value={draft.common_mistakes || ""}
                onChange={(event) => setDraft((current) => ({ ...current, common_mistakes: event.target.value }))}
              />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit"><Save size={17} /> Save</button>
              <button className="secondary-button" type="button" onClick={resetForm}>Clear</button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
