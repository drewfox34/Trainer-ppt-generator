import { FolderOpen, ImageIcon, PlaySquare, Presentation, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { getManagedPaths, ManagedFolder, openManagedFolder } from "../api";

const folders: Array<{ key: ManagedFolder; label: string; icon: typeof PlaySquare }> = [
  { key: "videos", label: "Videos", icon: PlaySquare },
  { key: "thumbnails", label: "Thumbnails", icon: ImageIcon },
  { key: "output", label: "Decks", icon: Presentation },
  { key: "storage", label: "App Data", icon: FolderOpen },
  { key: "templates", label: "Templates", icon: Settings }
];

export default function StorageShortcuts() {
  const [paths, setPaths] = useState<Record<ManagedFolder, string> | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getManagedPaths()
      .then((payload) => setPaths(payload.paths))
      .catch(() => setPaths(null));
  }, []);

  const openFolder = async (folder: ManagedFolder) => {
    setMessage("");
    try {
      const result = await openManagedFolder(folder);
      setMessage(`Opened ${result.opened}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open folder.");
    }
  };

  return (
    <section className="storage-shortcuts">
      <div className="storage-title">
        <FolderOpen size={16} />
        <span>Folders</span>
      </div>
      <div className="storage-grid">
        {folders.map((folder) => {
          const Icon = folder.icon;
          return (
            <button key={folder.key} onClick={() => void openFolder(folder.key)} title={paths?.[folder.key] || folder.label}>
              <Icon size={16} />
              {folder.label}
            </button>
          );
        })}
      </div>
      {message && <small>{message}</small>}
    </section>
  );
}
