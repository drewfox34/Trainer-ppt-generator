import fs from "fs";
import multer from "multer";
import { Router } from "express";
import { uploadRoot } from "../paths";
import { importExercisesFromFile } from "../services/exerciseImportService";

export const importRouter = Router();

const upload = multer({ dest: uploadRoot });

importRouter.post("/", upload.single("file"), (req, res, next) => {
  const uploadedFile = req.file;
  try {
    const filePath = uploadedFile?.path || req.body.filePath;
    if (!filePath) {
      res.status(400).json({ error: "No import file was provided." });
      return;
    }

    const result = importExercisesFromFile(filePath, uploadedFile?.originalname);
    res.json(result);
  } catch (error) {
    next(error);
  } finally {
    if (uploadedFile?.path && fs.existsSync(uploadedFile.path)) {
      fs.unlinkSync(uploadedFile.path);
    }
  }
});

