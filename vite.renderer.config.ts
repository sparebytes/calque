import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: path.join(__dirname, "src/renderer"),
  build: {
    // `root` is src/renderer, so the forge vite plugin's relative outDir
    // (".vite/renderer/main_window") would resolve under it
    // (src/renderer/.vite/...) and never get packaged into the app bundle.
    // Pin it to the project-root path the plugin copies from.
    outDir: path.join(__dirname, ".vite/renderer/main_window"),
    emptyOutDir: true,
  },
});
