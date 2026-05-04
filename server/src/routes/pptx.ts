import { Router } from "express";
import { z } from "zod";
import { generateProgramPptx } from "../services/pptxGenerationService";

export const pptxRouter = Router();

const generateInput = z.object({
  mode: z.enum(["linked", "embedded"]).default("linked")
});

pptxRouter.post("/programs/:id/generate-pptx", async (req, res, next) => {
  try {
    const input = generateInput.parse(req.body || {});
    const result = await generateProgramPptx(Number(req.params.id), input.mode);
    res.json({
      filePath: result.relativePath,
      downloadUrl: `/output/${encodeURIComponent(result.fileName)}`,
      warnings: result.warnings
    });
  } catch (error) {
    next(error);
  }
});

