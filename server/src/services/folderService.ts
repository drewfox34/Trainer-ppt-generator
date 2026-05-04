import { spawn } from "child_process";
import fs from "fs";
import { managedFolders, ManagedFolderKey } from "../paths";

export function getManagedFolderPaths() {
  Object.values(managedFolders).forEach((folder) => fs.mkdirSync(folder, { recursive: true }));
  return managedFolders;
}

export function openManagedFolder(folderKey: ManagedFolderKey) {
  const target = managedFolders[folderKey];
  if (!target) {
    throw new Error("Unknown folder.");
  }

  fs.mkdirSync(target, { recursive: true });

  const command = process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "explorer"
      : "xdg-open";

  const child = spawn(command, [target], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();

  return target;
}

