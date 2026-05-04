# Trainer PPT Generator

A local-first MVP for building custom exercise programs and exporting them as PowerPoint decks. The app uses a Node.js API, React frontend, SQLite database, local media folders, and PptxGenJS.

## What It Does

- Imports exercises from CSV, XLS, XLSX, or ODS files.
- Stores exercise records in SQLite.
- Stores only media file paths in the database.
- Lets a trainer add, edit, search, and filter exercises.
- Builds client programs with custom sets, reps, rest, notes, ordering, and removals.
- Generates a `.pptx` file with a title slide, overview slide, one exercise slide per selected exercise, and optional final notes.
- Supports thumbnail-link mode by default and embedded-video mode with fallback warnings.

## Install

From this folder:

```bash
npm install
```

## Run Locally

Start the backend and frontend together:

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:4000
```

## Package as a Mac App

This project includes an Electron wrapper so the trainer can launch the tool like a normal Mac app.

On a Mac, install dependencies and build the `.dmg`:

```bash
npm install
npm run desktop:dist:mac
```

The packaged installer is written to:

```text
release/
```

For an unsigned test build, macOS may show an unidentified developer warning. The client can usually right-click the app and choose **Open**. For a polished handoff, sign and notarize the app with an Apple Developer account.

The desktop app automatically starts the local API in the background and opens the React UI in an app window. The client does not need Terminal, Node.js, or npm.

## Import Exercises

Use the **Exercise Library** page and upload a CSV or spreadsheet file.

The sample file is:

```text
sample_data/exercises_sample.csv
```

Expected columns:

```text
exercise_code,name,category,body_region,equipment,difficulty,default_reps,default_sets,default_rest,coaching_cues,common_mistakes,regression,progression,video_path,thumbnail_path,tags
```

If `exercise_code` is blank, the importer generates codes like `EX-001`, `EX-002`, and so on. Exercise codes must be unique.

## Media Folders

Videos go here:

```text
media/videos/
```

Thumbnails go here:

```text
media/thumbnails/
```

In the desktop app, these folders are created under:

```text
~/Library/Application Support/Trainer PPT Generator/
```

The sidebar includes Finder shortcuts for:

```text
Videos
Thumbnails
Decks
Templates
App Data
```

The database stores relative paths such as:

```text
media/videos/EX-001_hip_flexor_stretch.mp4
media/thumbnails/EX-001_hip_flexor_stretch.png
```

Videos are not stored in Excel or SQLite. The importer and exercise API validate whether referenced files exist and return warnings when they are missing.

## Generate PowerPoints

Use the **Program Builder** page:

1. Enter client and program details.
2. Search/filter exercises.
3. Add exercises to the selected list.
4. Override reps, sets, rest, and notes as needed.
5. Reorder with the up/down controls.
6. Click **Generate PowerPoint**.

Generated files are saved to:

```text
output/
```

In the desktop app, generated decks are saved to:

```text
~/Library/Application Support/Trainer PPT Generator/output/
```

The UI shows the saved path and a download link after generation.

## Media Modes

### Thumbnail Links

This is the default mode. The generated deck places the thumbnail on the slide and adds a clickable **Watch Video** link. Decks stay smaller and are easier to share locally.

### Embedded Videos

Embedded mode attempts to add supported local video files directly into the PowerPoint with PptxGenJS. If embedding is unavailable or fails, the app falls back to linked thumbnail mode and returns a warning.

## PowerPoint Template Support

The MVP generates a clean 16:9 layout in code. The `templates/` folder is reserved for future branded templates, including:

```text
templates/Ex4L_Master_Template.pptx
```

The backend PowerPoint generator is isolated in:

```text
server/src/services/pptxGenerationService.ts
```

That is the main extension point for branded slide masters, logos, colors, and template-specific layouts.

## API Routes

```text
GET    /api/exercises
POST   /api/exercises
PUT    /api/exercises/:id
DELETE /api/exercises/:id

POST   /api/import-exercises

POST   /api/programs
GET    /api/programs
GET    /api/programs/:id
PUT    /api/programs/:id
DELETE /api/programs/:id

POST   /api/programs/:id/exercises
PUT    /api/programs/:id/exercises/:programExerciseId
DELETE /api/programs/:id/exercises/:programExerciseId

POST   /api/programs/:id/generate-pptx
```

## Build

```bash
npm run build
```

Start the compiled backend:

```bash
npm run start
```
