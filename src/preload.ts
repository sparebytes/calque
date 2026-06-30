import { contextBridge, ipcRenderer } from "electron";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  closeWindow: () => ipcRenderer.send("close-window"),
  minimizeWindow: () => ipcRenderer.send("minimize-window"),
  toggleMaximize: () => ipcRenderer.send("toggle-maximize"),
  getWindowPosition: (): [number, number] =>
    ipcRenderer.sendSync("get-window-position"),
  setWindowPosition: (x: number, y: number) =>
    ipcRenderer.send("set-window-position", x, y),
  openFileDialog: (): Promise<{ name: string; dataUrl: string }[]> =>
    ipcRenderer.invoke("open-file-dialog"),
  updateInteractiveRects: (rects: Rect[]) =>
    ipcRenderer.send("update-interactive-rects", rects),
  setForceInteractive: (value: boolean) =>
    ipcRenderer.send("set-force-interactive", value),
});
