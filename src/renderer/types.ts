export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageSettings {
  scale: number; // 1.0 = 100%
  opacity: number; // 0..1
  hueOffset: number; // 0..360
  invert: boolean;
  brightness: number; // 1.0 = 100%
  saturation: number; // 1.0 = 100%
  x: number; // px
  y: number; // px
}

export interface ImageEntry {
  id: string;
  name: string;
  dataUrl: string;
  settings: ImageSettings;
}

export const defaultSettings = (): ImageSettings => ({
  scale: 1.0,
  opacity: 0.5,
  hueOffset: 0,
  invert: false,
  brightness: 1.0,
  saturation: 1.0,
  x: 0,
  y: 0,
});

export interface ElectronAPI {
  platform: string;
  closeWindow: () => void;
  minimizeWindow: () => void;
  toggleMaximize: () => void;
  getWindowPosition: () => [number, number];
  setWindowPosition: (x: number, y: number) => void;
  openFileDialog: () => Promise<{ name: string; dataUrl: string }[]>;
  updateInteractiveRects: (rects: Rect[]) => void;
  setForceInteractive: (value: boolean) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
