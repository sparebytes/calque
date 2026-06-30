# Calque

A transparent, always-on-top overlay for comparing your UI implementation against a design mockup. Drop a mockup on top of your running app, dial in the opacity, and see how well your version matches.

Inspired by the [Pixel Perfect Pro](https://addons.mozilla.org/en-US/firefox/addon/pixel-perfect-pro/) browser extension, but as a standalone desktop window so it works over _any_ app, not just the browser.

## The name

**Calque** (from the French _papier calque_) means **tracing paper** — a sheet you lay over a drawing to trace or check it against. In linguistics a "calque" is also a loan-translation, a word copied piece-by-piece from another language.

## Features

- **Open multiple mockups** and switch between them from a side panel — each image keeps its own settings.
- **Per-image controls**, each with a slider and an exact number field:
  - **Scale** (default 100%)
  - **Opacity** (default 50%)
  - **Hue** offset
  - **X / Y offset** for positioning
- **Match display scale** — divides the image by your display's device-pixel-ratio so a Retina screenshot (captured at 2×) shows at its real on-screen size. On by default.
- **Reposition image** mode — drag the overlay around the screen.
- **Click-through** — everywhere except the title bar and settings panel, mouse clicks pass through to the app underneath, so you can keep working while the overlay floats on top.
- **Collapsible panel** that can be docked to the **left or right** (the image offset compensates so it doesn't jump).
- **Always-on-top**, floats over fullscreen apps and follows across spaces.

## Requirements

- **macOS.** This has only been tested on macOS. The transparency, click-through, and always-on-top behavior all lean on platform-specific window handling, so Windows/Linux are unsupported and almost certainly broken.
- Node + [pnpm](https://pnpm.io/).

## Running it

```bash
pnpm install
pnpm start
```

When no image is loaded you get a plain window with an **Open file** button. Once you add an image it becomes the transparent floating overlay.

## Building

```bash
pnpm build      # → distributable in out/make/
# or
pnpm package    # → Calque.app in out/
```

The app is unsigned, so the first launch needs right-click → **Open** (or _System Settings → Privacy & Security → Open Anyway_) to get past Gatekeeper.

## How it works (the short version)

A frameless, transparent `BrowserWindow` renders the image with CSS (`transform` for scale/position, `opacity`, `hue-rotate`). Click-through is handled by the main process polling the cursor position and toggling `setIgnoreMouseEvents` based on interactive regions the renderer reports — everything outside the title bar and panel passes clicks through to whatever is below.

## AI Use

This project is fully vibe coded.
