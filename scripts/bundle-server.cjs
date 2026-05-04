const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const serverSrc = path.join(root, "server", "src");
const serverDist = path.join(root, "server", "dist");

async function build() {
  fs.mkdirSync(serverDist, { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(serverSrc, "index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: path.join(serverDist, "bundle.cjs"),
  });

  fs.copyFileSync(
    path.join(serverSrc, "schema.sql"),
    path.join(serverDist, "schema.sql")
  );

  // wasm must sit next to the bundle so electron-builder can unpack it
  fs.copyFileSync(
    path.join(root, "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
    path.join(serverDist, "sql-wasm.wasm")
  );

  console.log("Server bundled → server/dist/bundle.cjs");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
