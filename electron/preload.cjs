const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("trainerConfig", {
  apiBaseUrl: process.env.TRAINER_API_URL || ""
});

