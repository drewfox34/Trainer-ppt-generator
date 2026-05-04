import { Dumbbell, ListChecks, Library, Plus } from "lucide-react";
import { useState } from "react";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import ProgramBuilder from "./pages/ProgramBuilder";
import ProgramList from "./pages/ProgramList";
import StorageShortcuts from "./components/StorageShortcuts";

type Tab = "builder" | "library" | "programs";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("builder");
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  const [builderKey, setBuilderKey] = useState(0);

  const startNewProgram = () => {
    setEditingProgramId(null);
    setBuilderKey((value) => value + 1);
    setActiveTab("builder");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Dumbbell size={20} /></div>
          <div>
            <h1>Trainer PPT</h1>
            <span>Local program builder</span>
          </div>
        </div>

        <nav className="nav-stack">
          <button className={activeTab === "builder" ? "active" : ""} onClick={() => setActiveTab("builder")}>
            <ListChecks size={18} /> Program Builder
          </button>
          <button className={activeTab === "library" ? "active" : ""} onClick={() => setActiveTab("library")}>
            <Library size={18} /> Exercise Library
          </button>
          <button className={activeTab === "programs" ? "active" : ""} onClick={() => setActiveTab("programs")}>
            <Dumbbell size={18} /> Saved Programs
          </button>
        </nav>

        <button className="new-program-button" onClick={startNewProgram}>
          <Plus size={18} /> New Program
        </button>

        <StorageShortcuts />
      </aside>

      <main className="workspace">
        {activeTab === "builder" && (
          <ProgramBuilder
            key={`${builderKey}-${editingProgramId ?? "new"}`}
            programId={editingProgramId}
            onSaved={(id) => setEditingProgramId(id)}
          />
        )}
        {activeTab === "library" && <ExerciseLibrary />}
        {activeTab === "programs" && (
          <ProgramList
            onEditProgram={(id) => {
              setEditingProgramId(id);
              setActiveTab("builder");
            }}
            onNewProgram={startNewProgram}
          />
        )}
      </main>
    </div>
  );
}
