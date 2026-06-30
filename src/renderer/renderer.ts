export {};

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

declare global {
  interface Window {
    electronAPI: {
      platform: string;
      closeWindow: () => void;
      minimizeWindow: () => void;
      toggleMaximize: () => void;
      getWindowPosition: () => [number, number];
      setWindowPosition: (x: number, y: number) => void;
      openFileDialog: () => Promise<{ name: string; dataUrl: string }[]>;
      updateInteractiveRects: (rects: Rect[]) => void;
      setForceInteractive: (value: boolean) => void;
    };
  }
}

interface ImageSettings {
  scale: number; // 1.0 = 100%
  opacity: number; // 0..1
  hueOffset: number; // 0..360
  x: number; // px
  y: number; // px
}

interface ImageEntry {
  id: string;
  name: string;
  dataUrl: string;
  settings: ImageSettings;
}

const defaultSettings = (): ImageSettings => ({
  scale: 1.0,
  opacity: 0.5,
  hueOffset: 0,
  x: 0,
  y: 0,
});

// ── State ──────────────────────────────────────────
const images: ImageEntry[] = [];
let selectedId: string | null = null;
let panelCollapsed = false;
let panelSide: "left" | "right" = "left";
let isMoveMode = false;
// Divide rendered scale by the display's device-pixel-ratio so that screenshots
// captured at e.g. 2x (Retina) display at their on-screen size. On by default.
let matchDisplayScale = true;

// titlebar drag
let isTitlebarDragging = false;
let tbMouseX = 0;
let tbMouseY = 0;
let tbWinX = 0;
let tbWinY = 0;

// image reposition drag
let isDraggingImage = false;
let imgStartX = 0;
let imgStartY = 0;
let imgStartOffsetX = 0;
let imgStartOffsetY = 0;

// ── DOM refs ───────────────────────────────────────
const titlebar = document.getElementById("titlebar") as HTMLElement;
const titlebarLeft = document.getElementById("titlebarLeft") as HTMLElement;
const titlebarRight = document.getElementById("titlebarRight") as HTMLElement;
const titlebarTitle = document.getElementById("titlebarTitle") as HTMLElement;
const windowControls = document.getElementById("windowControls") as HTMLElement;
const panel = document.getElementById("panel") as HTMLElement;
const panelToggle = document.getElementById("panelToggle") as HTMLButtonElement;
const imageList = document.getElementById("imageList") as HTMLElement;
const overlayImage = document.getElementById("overlayImage") as HTMLImageElement;
const overlayArea = document.getElementById("overlayArea") as HTMLElement;
const btnMove = document.getElementById("btnMove") as HTMLButtonElement;
const btnPanelSide = document.getElementById("btnPanelSide") as HTMLButtonElement;
const displayScaleCheck = document.getElementById("displayScale") as HTMLInputElement;
const displayScaleHint = document.getElementById("displayScaleHint") as HTMLElement;

// Invisible drag handle for repositioning the overlay image (move mode).
const dragHandle = document.createElement("div");
dragHandle.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;cursor:move;display:none;z-index:2;";
overlayArea.appendChild(dragHandle);

// ── Interactive-region reporting (drives click-through in main) ──
function reportInteractiveRects() {
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-interactive]"));
  const rects: Rect[] = [];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      rects.push({ x: r.x, y: r.y, width: r.width, height: r.height });
    }
  }
  window.electronAPI.updateInteractiveRects(rects);
}

window.addEventListener("resize", reportInteractiveRects);

// ── Window controls ────────────────────────────────
document.getElementById("btnClose")!.addEventListener("click", () => window.electronAPI.closeWindow());
document.getElementById("btnMinimize")!.addEventListener("click", () => window.electronAPI.minimizeWindow());
document.getElementById("btnMaximize")!.addEventListener("click", () => window.electronAPI.toggleMaximize());

// On macOS, render the window controls as traffic lights at the top-left;
// elsewhere keep them as text buttons on the right.
const isMac = window.electronAPI.platform === "darwin";
if (isMac) {
  document.body.classList.add("mac");
  titlebarLeft.insertBefore(windowControls, titlebarLeft.firstChild);
} else {
  titlebarRight.appendChild(windowControls);
}

// ── Titlebar drag (manual: works on transparent windows cross-platform) ──
titlebar.addEventListener("mousedown", e => {
  if ((e.target as Element).closest("button")) return;
  isTitlebarDragging = true;
  tbMouseX = e.screenX;
  tbMouseY = e.screenY;
  const pos = window.electronAPI.getWindowPosition();
  tbWinX = pos[0];
  tbWinY = pos[1];
  window.electronAPI.setForceInteractive(true);
  e.preventDefault();
});

// ── Panel collapse + side ──────────────────────────
// Width the panel occupies when expanded (matches .panel in CSS).
const PANEL_WIDTH = panel.getBoundingClientRect().width || 230;

// Space occupied to the LEFT of the overlay area for a given panel state. The
// image's X offset is relative to the overlay area's left edge, so this is how
// much the image visually shifts when the layout changes.
function leftOccupied(side: "left" | "right", collapsed: boolean): number {
  return side === "left" && !collapsed ? PANEL_WIDTH : 0;
}

// Shift every image's X so it stays put on screen when the overlay area moves.
function compensateX(oldLeft: number, newLeft: number) {
  const delta = oldLeft - newLeft;
  if (delta === 0) return;
  for (const img of images) img.settings.x += delta;
  const sel = getSelected();
  if (sel) {
    syncControls();
    applyImageStyle(sel.settings);
  }
}

function updatePanelToggleArrow() {
  // Arrow points the way the panel will move: collapse pushes it toward its own
  // edge; expand pulls it back toward the center.
  const left = panelSide === "left";
  const collapseGlyph = left ? "&#8249;" : "&#8250;"; // ‹ : ›
  const expandGlyph = left ? "&#8250;" : "&#8249;";
  panelToggle.innerHTML = panelCollapsed ? expandGlyph : collapseGlyph;
  panelToggle.title = panelCollapsed ? "Expand panel" : "Collapse panel";
}

function togglePanel() {
  const oldLeft = leftOccupied(panelSide, panelCollapsed);
  panelCollapsed = !panelCollapsed;
  const newLeft = leftOccupied(panelSide, panelCollapsed);
  panel.classList.toggle("collapsed", panelCollapsed);
  compensateX(oldLeft, newLeft);
  updatePanelToggleArrow();
  reportInteractiveRects();
}
panelToggle.addEventListener("click", togglePanel);

function applyPanelSide() {
  document.body.classList.toggle("panel-right", panelSide === "right");
  // Keep the collapse button on the same side as the panel. On the left it sits
  // just before the title so the macOS traffic lights stay leftmost.
  if (panelSide === "left") {
    titlebarLeft.insertBefore(panelToggle, titlebarTitle);
  } else {
    titlebarRight.insertBefore(panelToggle, titlebarRight.firstChild);
  }
  btnPanelSide.innerHTML = panelSide === "left" ? "Move panel to right ⇥" : "⇤Move panel to left";
  updatePanelToggleArrow();
  reportInteractiveRects();
}

btnPanelSide.addEventListener("click", () => {
  const oldLeft = leftOccupied(panelSide, panelCollapsed);
  panelSide = panelSide === "left" ? "right" : "left";
  const newLeft = leftOccupied(panelSide, panelCollapsed);
  applyPanelSide();
  compensateX(oldLeft, newLeft);
});

// ── Image management ───────────────────────────────
function addImageEntry(name: string, dataUrl: string) {
  const entry: ImageEntry = {
    id: crypto.randomUUID(),
    name,
    dataUrl,
    settings: defaultSettings(),
  };
  images.push(entry);
  selectImage(entry.id);
  renderImageList();
  updateEmptyState();
}

function removeImage(id: string) {
  const idx = images.findIndex(img => img.id === id);
  if (idx === -1) return;
  images.splice(idx, 1);
  if (selectedId === id) {
    selectedId = images.length > 0 ? images[Math.min(idx, images.length - 1)].id : null;
  }
  renderImageList();
  syncControls();
  applyOverlay();
  updateEmptyState();
}

function selectImage(id: string) {
  selectedId = id;
  renderImageList();
  syncControls();
  applyOverlay();
}

function getSelected(): ImageEntry | undefined {
  return images.find(img => img.id === selectedId);
}

// ── Empty state ────────────────────────────────────
// When no image is loaded, hide the panel, show the drop box, and capture all
// mouse events (so the window isn't click-through and drag-and-drop works).
function updateEmptyState() {
  const empty = images.length === 0;
  document.body.classList.toggle("empty", empty);
  window.electronAPI.setForceInteractive(empty);
  reportInteractiveRects();
}

// ── Adding images ──────────────────────────────────
async function openFilesViaDialog() {
  const files = await window.electronAPI.openFileDialog();
  for (const f of files) addImageEntry(f.name, f.dataUrl);
}

document.getElementById("btnOpenFile")!.addEventListener("click", openFilesViaDialog);
document.getElementById("btnOpenFileEmpty")!.addEventListener("click", openFilesViaDialog);

// ── Render image list ──────────────────────────────
function renderImageList() {
  imageList.innerHTML = "";
  for (const img of images) {
    const item = document.createElement("div");
    item.className = "image-item" + (img.id === selectedId ? " active" : "");

    const thumb = document.createElement("img");
    thumb.className = "image-thumb";
    thumb.src = img.dataUrl;
    thumb.alt = "";

    const name = document.createElement("span");
    name.className = "image-name";
    name.textContent = img.name;
    name.title = img.name;

    const del = document.createElement("button");
    del.className = "image-delete";
    del.innerHTML = "&#10005;";
    del.title = "Remove";
    del.addEventListener("click", e => {
      e.stopPropagation();
      removeImage(img.id);
    });

    item.append(thumb, name, del);
    item.addEventListener("click", () => selectImage(img.id));
    imageList.appendChild(item);
  }
}

// ── Settings controls (slider <-> number, two-way) ─
interface Control {
  key: keyof Pick<ImageSettings, "scale" | "opacity" | "hueOffset" | "x" | "y">;
  slider: HTMLInputElement;
  number: HTMLInputElement;
  factor: number; // display = stored * factor
}

const controls: Control[] = [
  { key: "scale", slider: byId("scale"), number: byId("scaleNum"), factor: 100 },
  { key: "opacity", slider: byId("opacity"), number: byId("opacityNum"), factor: 100 },
  { key: "hueOffset", slider: byId("hue"), number: byId("hueNum"), factor: 1 },
  { key: "x", slider: byId("x"), number: byId("xNum"), factor: 1 },
  { key: "y", slider: byId("y"), number: byId("yNum"), factor: 1 },
];

function byId(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

for (const c of controls) {
  c.slider.addEventListener("input", () => {
    const img = getSelected();
    if (!img) return;
    const display = Number(c.slider.value);
    img.settings[c.key] = display / c.factor;
    c.number.value = String(display);
    applyImageStyle(img.settings);
  });
  c.number.addEventListener("input", () => {
    const img = getSelected();
    if (!img) return;
    const display = Number(c.number.value);
    if (Number.isNaN(display)) return;
    img.settings[c.key] = display / c.factor;
    c.slider.value = String(display); // slider clamps to its own range
    applyImageStyle(img.settings);
  });
}

function syncControls() {
  const img = getSelected();
  for (const c of controls) {
    const display = img ? Math.round(img.settings[c.key] * c.factor) : Number(c.slider.defaultValue);
    c.slider.value = String(display);
    c.number.value = String(display);
  }
}

// ── Apply overlay image ────────────────────────────
function applyOverlay() {
  const img = getSelected();
  if (!img) {
    overlayImage.classList.remove("visible");
    overlayImage.src = "";
    return;
  }
  overlayImage.src = img.dataUrl;
  overlayImage.classList.add("visible");
  applyImageStyle(img.settings);
}

function applyImageStyle(s: ImageSettings) {
  // Read DPR at apply time so moving the window between monitors stays correct.
  const dprDivisor = matchDisplayScale ? window.devicePixelRatio || 1 : 1;
  const renderScale = s.scale / dprDivisor;
  overlayImage.style.transform = `translate(${s.x}px, ${s.y}px) scale(${renderScale})`;
  overlayImage.style.opacity = String(s.opacity);
  overlayImage.style.filter = `hue-rotate(${s.hueOffset}deg)`;
}

function updateDisplayScaleHint() {
  const dpr = window.devicePixelRatio || 1;
  displayScaleHint.textContent = dpr !== 1 ? `÷${dpr} (${dpr}x display)` : "1x display";
}

displayScaleCheck.addEventListener("change", () => {
  matchDisplayScale = displayScaleCheck.checked;
  const img = getSelected();
  if (img) applyImageStyle(img.settings);
});

// ── Reposition image (move mode toggle) ────────────
function setMoveMode(on: boolean) {
  isMoveMode = on;
  dragHandle.style.display = on ? "block" : "none";
  btnMove.classList.toggle("active", on);
  btnMove.textContent = on ? "Done repositioning" : "Reposition image";
  if (on) {
    overlayArea.setAttribute("data-interactive", "true");
  } else {
    overlayArea.removeAttribute("data-interactive");
  }
  reportInteractiveRects();
}

btnMove.addEventListener("click", () => setMoveMode(!isMoveMode));

dragHandle.addEventListener("mousedown", e => {
  const img = getSelected();
  if (!img) return;
  isDraggingImage = true;
  imgStartX = e.clientX;
  imgStartY = e.clientY;
  imgStartOffsetX = img.settings.x;
  imgStartOffsetY = img.settings.y;
  window.electronAPI.setForceInteractive(true);
  e.preventDefault();
});

// ── Global mouse move/up (titlebar + image drag) ───
document.addEventListener("mousemove", e => {
  if (isTitlebarDragging) {
    window.electronAPI.setWindowPosition(tbWinX + (e.screenX - tbMouseX), tbWinY + (e.screenY - tbMouseY));
    return;
  }
  if (isDraggingImage) {
    const img = getSelected();
    if (!img) return;
    img.settings.x = imgStartOffsetX + (e.clientX - imgStartX);
    img.settings.y = imgStartOffsetY + (e.clientY - imgStartY);
    applyImageStyle(img.settings);
    // keep X/Y controls in sync while dragging
    const cx = controls.find(c => c.key === "x")!;
    const cy = controls.find(c => c.key === "y")!;
    cx.slider.value = String(Math.round(img.settings.x));
    cx.number.value = String(Math.round(img.settings.x));
    cy.slider.value = String(Math.round(img.settings.y));
    cy.number.value = String(Math.round(img.settings.y));
  }
});

document.addEventListener("mouseup", () => {
  if (isTitlebarDragging || isDraggingImage) {
    // Restore the baseline: empty state keeps full capture, otherwise resume
    // the cursor-poll click-through.
    window.electronAPI.setForceInteractive(images.length === 0);
  }
  isTitlebarDragging = false;
  isDraggingImage = false;
});

// ── Init ───────────────────────────────────────────
updateDisplayScaleHint();
applyPanelSide();
syncControls();
applyOverlay();
updateEmptyState();
