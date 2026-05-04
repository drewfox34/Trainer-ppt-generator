import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import { Server } from "http";
import path from "path";
import { ZodError } from "zod";
import { outputRoot, mediaRoot, projectRoot } from "./paths";
import { initDatabase } from "./db";
import { exercisesRouter } from "./routes/exercises";
import { importRouter } from "./routes/import";
import { programsRouter } from "./routes/programs";
import { pptxRouter } from "./routes/pptx";
import { systemRouter } from "./routes/system";

dotenv.config({ path: path.join(projectRoot, ".env") });

export type StartServerOptions = {
  port?: number;
  host?: string;
  clientOrigin?: string;
};

export async function createApp(clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173") {
  await initDatabase();

  const app = express();

  app.use(clientOrigin === "*" ? cors() : cors({ origin: clientOrigin }));
  app.use(express.json({ limit: "10mb" }));

  app.use("/media", express.static(mediaRoot));
  app.use("/output", express.static(outputRoot, {
    setHeaders(res) {
      res.setHeader("Content-Disposition", "attachment");
    }
  }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/exercises", exercisesRouter);
  app.use("/api/import-exercises", importRouter);
  app.use("/api/programs", programsRouter);
  app.use("/api", pptxRouter);
  app.use("/api/system", systemRouter);

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.errors.map((issue) => issue.message).join(" ") });
      return;
    }

    const message = error instanceof Error ? error.message : "Unexpected server error.";
    if (/UNIQUE constraint failed: exercises\.exercise_code/i.test(message)) {
      res.status(409).json({ error: "Duplicate exercise code. Exercise codes must be unique." });
      return;
    }

    if (/FOREIGN KEY constraint failed/i.test(message)) {
      res.status(400).json({ error: "Invalid related record. Check the program and exercise IDs." });
      return;
    }

    const status = /not found/i.test(message) ? 404 : /invalid|missing|duplicate|empty|cannot/i.test(message) ? 400 : 500;
    res.status(status).json({ error: message });
  });

  return app;
}

export async function startServer(options: StartServerOptions = {}) {
  const port = options.port ?? Number(process.env.PORT || 4000);
  const host = options.host;
  const app = await createApp(options.clientOrigin);

  const server = await new Promise<Server>((resolve) => {
    const started = host
      ? app.listen(port, host, () => resolve(started))
      : app.listen(port, () => resolve(started));
  });

  const address = server.address();
  const resolvedPort = typeof address === "object" && address ? address.port : port;
  console.log(`Trainer PPT Generator API running at http://localhost:${resolvedPort}`);

  return { app, server, port: resolvedPort };
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
