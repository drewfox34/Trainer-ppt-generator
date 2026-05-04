import { AlertCircle, CheckCircle2, Edit3, ImageIcon, Plus, Trash2, Video } from "lucide-react";
import { Exercise } from "../types";

type Props = {
  exercises: Exercise[];
  mode?: "manage" | "select";
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
  onAdd?: (exercise: Exercise) => void;
};

function MediaFlag({ exists, icon }: { exists?: boolean; icon: "video" | "image" }) {
  const Icon = icon === "video" ? Video : ImageIcon;
  return (
    <span className={exists ? "media-flag ok" : "media-flag missing"}>
      <Icon size={15} />
      {exists ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
    </span>
  );
}

export default function ExerciseTable({ exercises, mode = "manage", onEdit, onDelete, onAdd }: Props) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Category</th>
            <th>Region</th>
            <th>Equipment</th>
            <th>Difficulty</th>
            <th>Tags</th>
            <th>Media</th>
            <th className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {exercises.map((exercise) => (
            <tr key={exercise.id}>
              <td className="code-cell">{exercise.exercise_code}</td>
              <td>
                <strong>{exercise.name}</strong>
                <small>{exercise.default_sets || "Sets TBD"} x {exercise.default_reps || "reps TBD"}</small>
              </td>
              <td>{exercise.category || "-"}</td>
              <td>{exercise.body_region || "-"}</td>
              <td>{exercise.equipment || "-"}</td>
              <td>{exercise.difficulty || "-"}</td>
              <td className="tag-cell">{exercise.tags || "-"}</td>
              <td>
                <div className="media-stack">
                  <MediaFlag exists={exercise.video_exists} icon="video" />
                  <MediaFlag exists={exercise.thumbnail_exists} icon="image" />
                </div>
              </td>
              <td>
                <div className="row-actions">
                  {mode === "select" ? (
                    <button className="icon-button primary" onClick={() => onAdd?.(exercise)} title="Add exercise">
                      <Plus size={16} />
                    </button>
                  ) : (
                    <>
                      <button className="icon-button" onClick={() => onEdit?.(exercise)} title="Edit exercise">
                        <Edit3 size={16} />
                      </button>
                      <button className="icon-button danger" onClick={() => onDelete?.(exercise)} title="Delete exercise">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {exercises.length === 0 && (
            <tr>
              <td colSpan={9} className="empty-cell">No exercises found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

