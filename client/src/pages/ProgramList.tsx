import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { apiGet, apiJson } from "../api";
import { ProgramSummary } from "../types";

type Props = {
  onEditProgram: (programId: number) => void;
  onNewProgram: () => void;
};

export default function ProgramList({ onEditProgram, onNewProgram }: Props) {
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [error, setError] = useState("");

  const loadPrograms = async () => {
    setError("");
    try {
      const payload = await apiGet<{ programs: ProgramSummary[] }>("/api/programs");
      setPrograms(payload.programs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load programs.");
    }
  };

  useEffect(() => {
    void loadPrograms();
  }, []);

  const deleteProgram = async (program: ProgramSummary) => {
    if (!window.confirm(`Delete ${program.program_name}?`)) return;
    try {
      await apiJson(`/api/programs/${program.id}`, "DELETE");
      await loadPrograms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete program.");
    }
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h2>Saved Programs</h2>
          <span>{programs.length} saved</span>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={loadPrograms}><RefreshCw size={17} /> Refresh</button>
          <button className="primary-button" onClick={onNewProgram}><Plus size={17} /> New Program</button>
        </div>
      </header>

      {error && <div className="notice error">{error}</div>}

      <section className="content-panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Client</th>
                <th>Level</th>
                <th>Date</th>
                <th>Exercises</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((program) => (
                <tr key={program.id}>
                  <td><strong>{program.program_name}</strong></td>
                  <td>{program.client_name}</td>
                  <td>{program.program_level || "-"}</td>
                  <td>{program.program_date || "-"}</td>
                  <td>{program.exercise_count}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-button" onClick={() => onEditProgram(program.id)} title="Edit program"><Edit3 size={16} /></button>
                      <button className="icon-button danger" onClick={() => deleteProgram(program)} title="Delete program"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {programs.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={6}>No saved programs.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

