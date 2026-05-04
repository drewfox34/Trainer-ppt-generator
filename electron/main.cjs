const path = require("path");
const { app, BrowserWindow, dialog } = require("electron");

let apiServer;

function appRoot() {
  return app.isPackaged ? path.join(process.resourcesPath, "app.asar") : path.resolve(__dirname, "..");
}

function sqlJsWasmDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar.unpacked", "server", "dist");
  }
  return path.join(appRoot(), "node_modules", "sql.js", "dist");
}

async function startLocalApi() {
  process.env.TRAINER_DATA_DIR = app.getPath("userData");
  process.env.SQLJS_WASM_DIR = sqlJsWasmDir();
  process.env.CLIENT_ORIGIN = "*";

  const serverModule = require(path.join(appRoot(), "server", "dist", "bundle.cjs"));
  const started = await serverModule.startServer({
    port: 0,
    host: "127.0.0.1",
    clientOrigin: "*"
  });

  apiServer = started.server;
  return `http://127.0.0.1:${started.port}`;
}

async function createWindow() {
  const apiBaseUrl = await startLocalApi();
  process.env.TRAINER_API_URL = apiBaseUrl;

  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1040,
    minHeight: 720,
    title: "Trainer PPT Generator",
    backgroundColor: "#eef2f5",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.ELECTRON_DEV_URL;
  if (devUrl) {
    await win.loadURL(devUrl);
  } else {
    await win.loadFile(path.join(appRoot(), "client", "dist", "index.html"));
  }
}

app.whenReady().then(createWindow).catch((error) => {
  dialog.showErrorBox("Trainer PPT Generator failed to start", error instanceof Error ? error.message : String(error));
  app.quit();
});

app.on("window-all-closed", () => {
  if (apiServer) {
    apiServer.close();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch((error) => {
      dialog.showErrorBox("Trainer PPT Generator failed to start", error instanceof Error ? error.message : String(error));
    });
  }
});

