import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { resolveProjectPath, toProjectRelativePath } from "../paths";

function isExternalPath(filePath: string) {
  return /^https?:\/\//i.test(filePath) || /^file:\/\//i.test(filePath);
}

export function sanitizeStoredPath(filePath: string | null | undefined) {
  if (!filePath) return "";
  return toProjectRelativePath(filePath);
}

export function fileExistsFromProjectPath(filePath: string | null | undefined) {
  if (!filePath) return false;
  if (/^https?:\/\//i.test(filePath)) return true;

  const resolved = resolveProjectPath(filePath);
  if (!resolved || isExternalPath(resolved)) return true;

  return fs.existsSync(resolved);
}

export function toLinkTarget(filePath: string | null | undefined) {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath) || /^file:\/\//i.test(filePath)) return filePath;

  const resolved = resolveProjectPath(filePath);
  return resolved ? pathToFileURL(path.resolve(resolved)).href : filePath;
}

export function validateMediaPaths(input: {
  exercise_code?: string | null;
  video_path?: string | null;
  thumbnail_path?: string | null;
}) {
  const warnings: string[] = [];
  const videoExists = fileExistsFromProjectPath(input.video_path);
  const thumbnailExists = fileExistsFromProjectPath(input.thumbnail_path);

  if (input.video_path && !videoExists) {
    warnings.push(`Missing video file for ${input.exercise_code || "exercise"}: ${input.video_path}`);
  }

  if (input.thumbnail_path && !thumbnailExists) {
    warnings.push(`Missing thumbnail file for ${input.exercise_code || "exercise"}: ${input.thumbnail_path}`);
  }

  return { videoExists, thumbnailExists, warnings };
}

export function normalizeExerciseMediaPaths<T extends { video_path?: string | null; thumbnail_path?: string | null }>(exercise: T) {
  return {
    ...exercise,
    video_path: sanitizeStoredPath(exercise.video_path),
    thumbnail_path: sanitizeStoredPath(exercise.thumbnail_path)
  };
}

