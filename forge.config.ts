import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { VitePlugin } from "@electron-forge/plugin-vite";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: "Calque",
    icon: "assets/icon",
  },
  makers: [new MakerZIP({}, ["darwin", "linux", "win32"]), new MakerDeb({})],
  plugins: [
    new VitePlugin({
      build: [
        { entry: "src/main.ts", config: "vite.main.config.ts", target: "main" },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
  ],
};

export default config;
