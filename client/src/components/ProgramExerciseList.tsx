import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { ProgramExercise } from "../types";

type Props = {
  exercises: ProgramExercise[];
  onChange: (index: number, patch: Partial<ProgramExercise>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
};

export default function ProgramExerciseList({ exercises, onChange, onMove, onRemove }: Props) {
  return (
    <div className="program-exercise-list">
      {exercises.map((exercise, index) => (
        <section className="program-exercise-row" key={`${exercise.exercise_id}-${index}`}>
          <div className="exercise-order">{index + 1}</div>
          <div className="exercise-row-main">
            <div className="exercise-row-title">
              <strong>{exercise.name}</strong>
              <span>{exercise.exercise_code}</span>
            </div>
            <div className="override-grid">
              <label>
                <span>Reps / duration</span>
                <input
                  value={exercise.custom_reps ?? ""}
                  placeholder={exercise.default_reps || "TBD"}
                  onChange={(event) => onChange(index, { custom_reps: event.target.value })}
                />
              </label>
              <label>
                <span>Sets</span>
                <input
                  value={exercise.custom_sets ?? ""}
                  placeholder={exercise.default_sets || "TBD"}
                  onChange={(event) => onChange(index, { custom_sets: event.target.value })}
                />
              </label>
              <label>
                <span>Rest</span>
                <input
                  value={exercise.custom_rest ?? ""}
                  placeholder={exercise.default_rest || "TBD"}
                  onChange={(event) => onChange(index, { custom_rest: event.target.value })}
                />
              </label>
              <label className="notes-override">
                <span>Client notes</span>
                <input
                  value={exercise.custom_notes ?? ""}
                  placeholder="Optional"
                  onChange={(event) => onChange(index, { custom_notes: event.target.value })}
                />
              </label>
            </div>
          </div>
          <div className="row-actions vertical">
            <button className="icon-button" onClick={() => onMove(index, -1)} disabled={index === 0} title="Move up">
              <ArrowUp size={16} />
            </button>
            <button className="icon-button" onClick={() => onMove(index, 1)} disabled={index === exercises.length - 1} title="Move down">
              <ArrowDown size={16} />
            </button>
            <button className="icon-button danger" onClick={() => onRemove(index)} title="Remove exercise">
              <Trash2 size={16} />
            </button>
          </div>
        </section>
      ))}

      {exercises.length === 0 && <div className="builder-empty">No exercises selected.</div>}
    </div>
  );
}

