import { Download, FileVideo, FolderOpen, Link2, Loader2 } from "lucide-react";
import { useState } from "react";
import { apiJson, downloadUrl, openManagedFolder } from "../api";

type Props = {
  disabled?: boolean;
  ensureProgramSaved: () => Promise<number>;
};

type GenerateResult = {
  filePath: string;
  downloadUrl: string;
  warnings: string[];
};

export default function GeneratePptxButton({ disabled, ensureProgramSaved }: Props) {
  const [mode, setMode] = useState<"linked" | "embedded">("linked");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState("");

  const generate = async () => {
    setIsGenerating(true);
    setError("");
    setResult(null);

    try {
      const programId = await ensureProgramSaved();
      const payload = await apiJson<GenerateResult>(`/api/programs/${programId}/generate-pptx`, "POST", { mode });
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed PowerPoint generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="generate-panel">
      <div className="mode-toggle">
        <button className={mode === "linked" ? "active" : ""} onClick={() => setMode("linked")}>
          <Link2 size={16} /> Thumbnail links
        </button>
        <button className={mode === "embedded" ? "active" : ""} onClick={() => setMode("embedded")}>
          <FileVideo size={16} /> Embed videos
        </button>
      </div>

      <button className="primary-button generate-button" onClick={generate} disabled={disabled || isGenerating}>
        {isGenerating ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
        Generate PowerPoint
      </button>

      {result && (
        <div className="result-box success">
          <strong>{result.filePath}</strong>
          <div className="result-actions">
            <a href={downloadUrl(result.downloadUrl)} target="_blank" rel="noreferrer">Download .pptx</a>
            <button className="secondary-button" onClick={() => void openManagedFolder("output")}>
              <FolderOpen size={16} /> Open Decks Folder
            </button>
          </div>
          {result.warnings.length > 0 && (
            <details open>
              <summary>{result.warnings.length} warning{result.warnings.length === 1 ? "" : "s"}</summary>
              <ul>
                {result.warnings.slice(0, 8).map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      {error && <div className="result-box error">{error}</div>}
    </section>
  );
}
