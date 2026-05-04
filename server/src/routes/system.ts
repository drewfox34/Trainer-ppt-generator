import fs from "fs";
import path from "path";
import { Router } from "express";
import { z } from "zod";
import { getManagedFolderPaths, openManagedFolder } from "../services/folderService";
import { videosRoot, thumbnailsRoot } from "../paths";

export const systemRouter = Router();

const folderInput = z.object({
  folder: z.enum(["storage", "videos", "thumbnails", "output", "templates"])
});

systemRouter.get("/paths", (_req, res) => {
  res.json({ paths: getManagedFolderPaths() });
});

systemRouter.get("/media-files", (_req, res) => {
  function list(dir: string, prefix: string) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => /\.(mp4|mov|avi|png|jpg|jpeg|gif|webp)$/i.test(f))
      .sort()
      .map(f => `${prefix}/${f}`);
  }
  res.json({
    videos: list(videosRoot, "media/videos"),
    thumbnails: list(thumbnailsRoot, "media/thumbnails"),
  });
});

systemRouter.post("/open-folder", (req, res, next) => {
  try {
    const input = folderInput.parse(req.body);
    const path = openManagedFolder(input.folder);
    res.json({ opened: input.folder, path });
  } catch (error) {
    next(error);
  }
});

