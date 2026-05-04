import fs from "fs";
import path from "path";

function resolveProjectRoot() {
  if (process.env.PROJECT_ROOT) {
    return path.resolve(process.env.PROJECT_ROOT);
  }

  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "server", "src")) && fs.existsSync(path.join(cwd, "client"))) {
    return cwd;
  }

  if (path.basename(cwd).toLowerCase() === "server") {
    return path.resolve(cwd, "..");
  }

  return path.resolve(__dirname, "../../..");
}

export const projectRoot = resolveProjectRoot();
export const storageRoot = process.env.TRAINER_DATA_DIR
  ? path.resolve(process.env.TRAINER_DATA_DIR)
  : projectRoot;
export const mediaRoot = path.join(storageRoot, "media");
export const outputRoot = path.join(storageRoot, "output");
export const templatesRoot = path.join(storageRoot, "templates");
export const uploadRoot = path.join(storageRoot, "tmp_uploads");
export const videosRoot = path.join(mediaRoot, "videos");
export const thumbnailsRoot = path.join(mediaRoot, "thumbnails");

export function ensureProjectDirectories() {
  [
    storageRoot,
    path.join(storageRoot, "server", "data"),
    videosRoot,
    thumbnailsRoot,
    outputRoot,
    templatesRoot,
    uploadRoot
  ].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
}

export function toProjectRelativePath(filePath: string) {
  const normalized = filePath.replace(/\\/g, "/").trim();
  if (!normalized) return "";

  if (/^https?:\/\//i.test(normalized) || /^file:\/\//i.test(normalized)) {
    return normalized;
  }

  const absolute = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(storageRoot, normalized);

  return path.relative(storageRoot, absolute).replace(/\\/g, "/");
}

export function resolveProjectPath(relativeOrAbsolute: string | null | undefined) {
  if (!relativeOrAbsolute) return null;
  if (/^https?:\/\//i.test(relativeOrAbsolute) || /^file:\/\//i.test(relativeOrAbsolute)) {
    return relativeOrAbsolute;
  }
  return path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.resolve(storageRoot, relativeOrAbsolute);
}

export const managedFolders = {
  storage: storageRoot,
  videos: videosRoot,
  thumbnails: thumbnailsRoot,
  output: outputRoot,
  templates: templatesRoot
} as const;

export type ManagedFolderKey = keyof typeof managedFolders;
