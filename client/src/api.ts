import { ExerciseFilters } from "./types";

export const API_BASE = window.trainerConfig?.apiBaseUrl || import.meta.env.VITE_API_URL || "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload as T;
}

export async function apiGet<T>(path: string) {
  const response = await fetch(apiUrl(path));
  return parseResponse<T>(response);
}

export async function apiJson<T>(path: string, method: "POST" | "PUT" | "DELETE", body?: unknown) {
  const response = await fetch(apiUrl(path), {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return parseResponse<T>(response);
}

export function exerciseQuery(filters: ExerciseFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim());
  });
  return params.toString() ? `/api/exercises?${params.toString()}` : "/api/exercises";
}

export async function uploadExerciseImport(file: File) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(apiUrl("/api/import-exercises"), {
    method: "POST",
    body
  });
  return parseResponse<{ importedCount: number; warnings: string[] }>(response);
}

export function downloadUrl(path: string) {
  return apiUrl(path);
}

export type ManagedFolder = "storage" | "videos" | "thumbnails" | "output" | "templates";

export async function openManagedFolder(folder: ManagedFolder) {
  return apiJson<{ opened: ManagedFolder; path: string }>("/api/system/open-folder", "POST", { folder });
}

export async function getManagedPaths() {
  return apiGet<{ paths: Record<ManagedFolder, string> }>("/api/system/paths");
}

export async function getMediaFiles() {
  return apiGet<{ videos: string[]; thumbnails: string[] }>("/api/system/media-files");
}

export async function autoLinkMedia() {
  return apiJson<{ linked: number }>("/api/exercises/auto-link-media", "POST");
}
