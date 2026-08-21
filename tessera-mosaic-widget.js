const WIDGET_CONFIG = {
  name: 'Tessera Mosaic',
  refreshMinutes: 45,
};

const PALETTES = [
  { name: 'Obsidiana', bg: ['#0b0b12', '#16162a'], tiles: ['#6366f1', '#22d3ee', '#a78bfa', '#f472b6'], accent: '#c4b5fd' },
  { name: 'Cobalto', bg: ['#061018', '#0c1f30'], tiles: ['#38bdf8', '#818cf8', '#2dd4bf', '#60a5fa'], accent: '#7dd3fc' },
  { name: 'Ambar', bg: ['#140c06', '#24160a'], tiles: ['#f59e0b', '#ef4444', '#fbbf24', '#fb923c'], accent: '#fcd34d' },
  { name: 'Jade', bg: ['#06140e', '#0c2418'], tiles: ['#34d399', '#10b981', '#2dd4bf', '#a3e635'], accent: '#6ee7b7' },
  { name: 'Magenta', bg: ['#160814', '#26101f'], tiles: ['#e879f9', '#f472b6', '#a855f7', '#fb7185'], accent: '#f0abfc' },
  { name: 'Hielo', bg: ['#0a1018', '#121c2a'], tiles: ['#93c5fd', '#67e8f9', '#a5b4fc', '#e0f2fe'], accent: '#bae6fd' },
  { name: 'Cobre', bg: ['#160a06', '#26140c'], tiles: ['#f97316', '#ea580c', '#eab308', '#fb7185'], accent: '#fdba74' },
  { name: 'Violeta', bg: ['#100816', '#1c1028'], tiles: ['#8b5cf6', '#c084fc', '#818cf8', '#e879f9'], accent: '#ddd6fe' },
  { name: 'Petroleo', bg: ['#061210', '#0c221c'], tiles: ['#14b8a6', '#06b6d4', '#22c55e', '#38bdf8'], accent: '#5eead4' },
  { name: 'Carbon', bg: ['#0a0a0c', '#16161a'], tiles: ['#94a3b8', '#64748b', '#38bdf8', '#a78bfa'], accent: '#cbd5e1' },
];

const MODES = [
  { id: 'grid', label: 'Malla', symbol: 'square.grid.3x3.fill' },
  { id: 'brick', label: 'Ladrillo', symbol: 'rectangle.grid.2x2.fill' },
  { id: 'honey', label: 'Panal', symbol: 'hexagon.fill' },
  { id: 'crystal', label: 'Cristal', symbol: 'diamond.fill' },
];

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function dailyHash() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  let h = ((seed >> 16) ^ seed) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return Math.abs(h);
}

class DeterministicPRNG {
  constructor(seed) {
    this.s = seed >>> 0;
  }
  next() {
    this.s = (Math.imul(this.s, 1103515245) + 12345) | 0;
    return (this.s >>> 16) / 0x8000;
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

function pickDailySelection() {
  const hash = dailyHash();
  return {
    palette: PALETTES[hash % PALETTES.length],
    mode: MODES[hash % MODES.length],
    seed: hash,
  };
}

function formatShortDate() {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function addCenteredText(parent, text, font, color) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.addSpacer(null);
  const label = row.addText(text);
  label.font = font;
  label.textColor = color;
  row.addSpacer(null);
  return label;
}

function addSymbol(parent, name, size, tint) {
  try {
    const symbol = SFSymbol.named(name);
    symbol.applyFont(Font.systemFont(size));
    const image = parent.addImage(symbol.image);
    image.tintColor = tint;
    image.imageSize = new Size(size, size);
    return image;
  } catch {
    return null;
  }
}

class TesseraRenderer {
  constructor(width, height, palette, mode, seed) {
    this.w = width;
    this.h = height;
    this.pal = palette;
    this.mode = mode;
    this.rand = new DeterministicPRNG(seed);
    this.ctx = new DrawContext();
    this.ctx.size = new Size(width, height);
    this.ctx.opaque = true;
    this.ctx.respectScreenScale = true;
  }

  render() {
    this.drawBackdrop();
    if (this.mode.id === 'brick') {
      this.drawBrickTiles();
    } else if (this.mode.id === 'honey') {
      this.drawHoneycomb();
    } else if (this.mode.id === 'crystal') {
      this.drawCrystals();
    } else {
      this.drawGridTiles();
    }
    this.drawVertexSparks();
    this.drawAccentOrbs();
    return this.ctx.getImage();
  }

  drawBackdrop() {
    const gradient = new Gradient();
    gradient.colors = [new Color(this.pal.bg[0]), new Color(this.pal.bg[1])];
    gradient.locations = [0, 1];
    this.ctx.drawLinearGradient(gradient, new Point(0, 0), new Point(0, this.h));
    try {
      this.ctx.setFillColor(new Color('#000000', 0.18));
      this.ctx.fillRect(new Rect(0, 0, this.w, this.h));
    } catch {
    }
  }

  tileTarget() {
    const area = this.w * this.h;
    if (area < 120000) return 64;
    if (area < 250000) return 88;
    return 108;
  }

  hexTarget() {
    const area = this.w * this.h;
    if (area < 120000) return 28;
    if (area < 250000) return 40;
    return 48;
  }

  drawGridTiles() {
    const target = this.tileTarget();
    const gap = Math.max(2, Math.round(Math.min(this.w, this.h) * 0.012));
    const cell = Math.sqrt((this.w * this.h) / target);
    const cols = Math.max(3, Math.ceil(this.w / cell));
    const rows = Math.max(3, Math.ceil(this.h / cell));
    const tw = this.w / cols;
    const th = this.h / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const color = this.rand.pick(this.pal.tiles);
        const alpha = this.rand.range(0.35, 0.82);
        try {
          this.ctx.setFillColor(new Color(color, alpha));
          this.ctx.fillRect(new Rect(
            col * tw + gap,
            row * th + gap,
            Math.max(2, tw - gap * 2),
            Math.max(2, th - gap * 2)
          ));
        } catch {
        }
      }
    }
  }

  drawBrickTiles() {
    const target = this.tileTarget();
    const gap = Math.max(2, Math.round(Math.min(this.w, this.h) * 0.01));
    const cell = Math.sqrt((this.w * this.h) / target);
    const rows = Math.max(3, Math.ceil(this.h / cell));
    const th = this.h / rows;
    const tw = cell * 1.35;
    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * (tw * 0.5);
      const cols = Math.max(3, Math.ceil((this.w + offset) / tw) + 1);
      for (let col = 0; col < cols; col++) {
        const color = this.rand.pick(this.pal.tiles);
        const alpha = this.rand.range(0.32, 0.8);
        try {
          this.ctx.setFillColor(new Color(color, alpha));
          this.ctx.fillRect(new Rect(
            col * tw - offset + gap,
            row * th + gap,
            Math.max(2, tw - gap * 2),
            Math.max(2, th - gap * 2)
          ));
        } catch {
        }
      }
    }
  }

  strokePolygon(points, color, alpha, width) {
    try {
      const path = new Path();
      path.move(points[0]);
      for (let i = 1; i < points.length; i++) {
        path.addLine(points[i]);
      }
      path.addLine(points[0]);
      this.ctx.setStrokeColor(new Color(color, alpha));
      this.ctx.setLineWidth(width);
      this.ctx.addPath(path);
      this.ctx.strokePath();
    } catch {
    }
  }

  drawHoneycomb() {
    const target = this.hexTarget();
    const r = Math.sqrt((this.w * this.h) / (target * 2.7));
    const dx = r * 1.75;
    const dy = r * 1.52;
    const rows = Math.ceil(this.h / dy) + 1;
    const cols = Math.ceil(this.w / dx) + 1;
    for (let row = 0; row < rows; row++) {
      const xOff = (row % 2) * (dx * 0.5);
      for (let col = 0; col < cols; col++) {
        const cx = xOff + col * dx;
        const cy = row * dy + r * 0.2;
        if (cx < -r || cy < -r || cx > this.w + r || cy > this.h + r) continue;
        const color = this.rand.pick(this.pal.tiles);
        const points = [];
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + i * (Math.PI / 3);
          points.push(new Point(cx + r * 0.92 * Math.cos(a), cy + r * 0.92 * Math.sin(a)));
        }
        this.strokePolygon(points, color, this.rand.range(0.45, 0.9), this.rand.range(1.1, 2.2));
        const core = Math.max(1.4, r * 0.18);
        try {
          this.ctx.setFillColor(new Color(color, this.rand.range(0.28, 0.7)));
          this.ctx.fillEllipse(new Rect(cx - core, cy - core, core * 2, core * 2));
        } catch {
        }
      }
    }
  }

  drawCrystals() {
    const target = this.hexTarget();
    const step = Math.sqrt((this.w * this.h) / target);
    const rows = Math.ceil(this.h / step) + 1;
    const cols = Math.ceil(this.w / step) + 1;
    for (let row = 0; row < rows; row++) {
      const xOff = (row % 2) * (step * 0.5);
      for (let col = 0; col < cols; col++) {
        const cx = xOff + col * step + step * 0.15;
        const cy = row * step * 0.86 + step * 0.2;
        if (cx < 0 || cy < 0 || cx > this.w || cy > this.h) continue;
        const r = step * this.rand.range(0.28, 0.46);
        const color = this.rand.pick(this.pal.tiles);
        const diamond = [
          new Point(cx, cy - r),
          new Point(cx + r * 0.72, cy),
          new Point(cx, cy + r),
          new Point(cx - r * 0.72, cy),
        ];
        this.strokePolygon(diamond, color, this.rand.range(0.5, 0.95), this.rand.range(1.0, 2.0));
        const core = Math.max(1.2, r * 0.22);
        try {
          this.ctx.setFillColor(new Color(color, this.rand.range(0.3, 0.75)));
          this.ctx.fillEllipse(new Rect(cx - core, cy - core, core * 2, core * 2));
        } catch {
        }
      }
    }
  }

  drawVertexSparks() {
    const count = this.w * this.h < 120000 ? 8 : 12;
    for (let i = 0; i < count; i++) {
      const cx = this.rand.range(this.w * 0.05, this.w * 0.95);
      const cy = this.rand.range(this.h * 0.05, this.h * 0.95);
      const r = this.rand.range(0.6, 2.2);
      try {
        this.ctx.setFillColor(new Color('#ffffff', this.rand.range(0.18, 0.55)));
        this.ctx.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      } catch {
      }
    }
  }

  drawAccentOrbs() {
    const count = this.rand.int(2, 4);
    for (let i = 0; i < count; i++) {
      const cx = this.rand.range(this.w * 0.12, this.w * 0.88);
      const cy = this.rand.range(this.h * 0.12, this.h * 0.88);
      const r = this.rand.range(Math.min(this.w, this.h) * 0.04, Math.min(this.w, this.h) * 0.11);
      try {
        this.ctx.setFillColor(new Color(this.rand.pick(this.pal.tiles), this.rand.range(0.06, 0.14)));
        this.ctx.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      } catch {
      }
    }
  }
}

function canvasForFamily(family) {
  if (family === 'small') return { w: 320, h: 280, imageH: 118 };
  if (family === 'medium') return { w: 700, h: 260, imageH: 112 };
  return { w: 900, h: 380, imageH: 210 };
}

function buildHeader(widget, selection, compact) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  addSymbol(header, selection.mode.symbol, compact ? 12 : 16, new Color(selection.palette.accent));
  header.addSpacer(6);
  const title = header.addText(WIDGET_CONFIG.name);
  title.font = Font.boldSystemFont(compact ? 11 : 14);
  title.textColor = new Color('#f4f4f5');
  header.addSpacer(null);
  const badge = header.addStack();
  badge.backgroundColor = new Color(selection.palette.accent, 0.16);
  badge.cornerRadius = 6;
  badge.setPadding(3, 7, 3, 7);
  const badgeLabel = badge.addText(selection.mode.label);
  badgeLabel.font = Font.mediumSystemFont(compact ? 8 : 10);
  badgeLabel.textColor = new Color(selection.palette.accent);
}

function buildFooter(widget, selection, showHint) {
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const pal = footer.addText(selection.palette.name);
  pal.font = Font.mediumSystemFont(9);
  pal.textColor = new Color(selection.palette.accent, 0.85);
  footer.addSpacer(null);
  const dateLabel = footer.addText(formatShortDate());
  dateLabel.font = Font.systemFont(8);
  dateLabel.textColor = new Color('#ffffff', 0.45);
  if (showHint) {
    footer.addSpacer(8);
    const hint = footer.addText(`${selection.mode.label} · seed ${String(selection.seed).slice(-4)}`);
    hint.font = Font.monospacedSystemFont(8);
    hint.textColor = new Color('#ffffff', 0.32);
  }
}

function embedArt(widget, image, height) {
  const imgStack = widget.addStack();
  imgStack.addImage(image);
  imgStack.size = new Size(0, height);
  imgStack.addSpacer(null);
}

function buildSmall(widget, selection) {
  widget.setPadding(10, 10, 10, 10);
  buildHeader(widget, selection, true);
  widget.addSpacer(6);
  const canvas = canvasForFamily('small');
  const art = new TesseraRenderer(canvas.w, canvas.h, selection.palette, selection.mode, selection.seed).render();
  embedArt(widget, art, canvas.imageH);
  widget.addSpacer(6);
  addCenteredText(widget, selection.palette.name, Font.mediumSystemFont(9), new Color(selection.palette.accent, 0.8));
}

function buildMedium(widget, selection) {
  widget.setPadding(12, 14, 10, 14);
  buildHeader(widget, selection, false);
  widget.addSpacer(8);
  const canvas = canvasForFamily('medium');
  const art = new TesseraRenderer(canvas.w, canvas.h, selection.palette, selection.mode, selection.seed).render();
  embedArt(widget, art, canvas.imageH);
  widget.addSpacer(8);
  buildFooter(widget, selection, false);
}

function buildLarge(widget, selection) {
  widget.setPadding(14, 16, 12, 16);
  buildHeader(widget, selection, false);
  widget.addSpacer(10);
  const canvas = canvasForFamily('large');
  const art = new TesseraRenderer(canvas.w, canvas.h, selection.palette, selection.mode, selection.seed).render();
  embedArt(widget, art, canvas.imageH);
  widget.addSpacer(10);
  buildFooter(widget, selection, true);
  widget.addSpacer(6);
  addCenteredText(
    widget,
    'Teselacion diaria · el mosaico cambia a medianoche',
    Font.systemFont(9),
    new Color('#ffffff', 0.32)
  );
}

function applyBackground(widget, palette) {
  const bg = new LinearGradient();
  bg.colors = [new Color(palette.bg[0]), new Color(palette.bg[1])];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
}

function createErrorWidget() {
  const errWidget = new ListWidget();
  const errBg = new LinearGradient();
  errBg.colors = [new Color('#0b0b12'), new Color('#16162a')];
  errBg.locations = [0, 1];
  errWidget.backgroundGradient = errBg;
  errWidget.setPadding(14, 14, 14, 14);
  const title = errWidget.addText('Tessera Mosaic');
  title.font = Font.boldSystemFont(14);
  title.textColor = new Color('#f4f4f5');
  errWidget.addSpacer(6);
  const body = errWidget.addText('No se pudo dibujar el mosaico. Toca para reintentar.');
  body.font = Font.systemFont(11);
  body.textColor = new Color('#a1a1aa');
  errWidget.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
  errWidget.refreshAfterDate = new Date(Date.now() + 600000);
  return errWidget;
}

async function buildWidget() {
  try {
    const selection = pickDailySelection();
    const widget = new ListWidget();
    applyBackground(widget, selection.palette);
    widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
    const family = config.widgetFamily;
    if (family === 'small') {
      buildSmall(widget, selection);
    } else if (family === 'medium') {
      buildMedium(widget, selection);
    } else {
      buildLarge(widget, selection);
    }
    widget.refreshAfterDate = new Date(Date.now() + WIDGET_CONFIG.refreshMinutes * 60000);
    if (config.runsInWidget) {
      Script.setWidget(widget);
    } else {
      await widget.presentLarge();
    }
  } catch {
    const errWidget = createErrorWidget();
    Script.setWidget(errWidget);
  }
  Script.complete();
}

await buildWidget();
