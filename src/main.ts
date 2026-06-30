import { app, BrowserWindow, dialog, ipcMain, screen } from "electron";
import fs from "fs";
import path from "path";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

let mainWindow: BrowserWindow | null = null;

// Interactive regions (window-relative px) reported by the renderer. The cursor
// is click-through everywhere EXCEPT inside one of these rectangles.
let interactiveRects: Rect[] = [];
// While true (e.g. during an active drag) the window always captures the mouse.
let forceInteractive = false;
let currentlyIgnoring = false;
let pollTimer: NodeJS.Timeout | null = null;

function setIgnore(ignore: boolean) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (ignore === currentlyIgnoring) return;
  currentlyIgnoring = ignore;
  if (ignore) {
    // forward:true keeps mouse-move events flowing while clicking through.
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    // Fully re-enable mouse capture (no lingering forward mode, which can
    // otherwise break file drag-and-drop on macOS).
    mainWindow.setIgnoreMouseEvents(false);
  }
}

// Poll the cursor and toggle click-through. This is the only reliable way to do
// per-region click-through on Linux, where setIgnoreMouseEvents' `forward`
// option (used by the renderer-driven approach) is not supported.
function pollCursor() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (forceInteractive) {
    setIgnore(false);
    return;
  }

  const pt = screen.getCursorScreenPoint();
  const b = mainWindow.getContentBounds();
  const x = pt.x - b.x;
  const y = pt.y - b.y;

  let over = false;
  if (x >= 0 && y >= 0 && x <= b.width && y <= b.height) {
    for (const r of interactiveRects) {
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
        over = true;
        break;
      }
    }
  }
  setIgnore(!over);
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const winW = Math.round(width * 0.5);
  const winH = Math.round(height * 0.5);

  mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x: Math.round((width - winW) / 2),
    y: Math.round((height - winH) / 2),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    resizable: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.setAlwaysOnTop(true, "screen-saver");
  // macOS: let the overlay float above fullscreen apps and follow across spaces,
  // so it can sit on top of the app/browser being compared.
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  pollTimer = setInterval(pollCursor, 40);

  mainWindow.on("closed", () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

// ── Click-through region management ────────────────
ipcMain.on("update-interactive-rects", (_event, rects: Rect[]) => {
  interactiveRects = Array.isArray(rects) ? rects : [];
});

ipcMain.on("set-force-interactive", (_event, value: boolean) => {
  forceInteractive = !!value;
});

// ── Window controls ────────────────────────────────
ipcMain.on("close-window", () => {
  mainWindow?.close();
});

ipcMain.on("minimize-window", () => {
  mainWindow?.minimize();
});

ipcMain.on("toggle-maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

ipcMain.on("get-window-position", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  event.returnValue = win?.getPosition() ?? [0, 0];
});

ipcMain.on("set-window-position", (event, x: number, y: number) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.setPosition(Math.round(x), Math.round(y));
});

// ── File open dialog ───────────────────────────────
ipcMain.handle("open-file-dialog", async () => {
  if (!mainWindow) return [];
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"] }],
  });
  if (canceled) return [];
  return filePaths.map((p) => ({
    name: path.basename(p),
    dataUrl: `data:image/${path.extname(p).slice(1).replace("jpg", "jpeg")};base64,${fs.readFileSync(p).toString("base64")}`,
  }));
});
