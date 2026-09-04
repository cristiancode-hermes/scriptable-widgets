const WIDGET_CONFIG = {
  name: 'Tipo Cinetico',
  refreshMinutes: 45,
};

const PALETTES = [
  { name: 'Neon Magenta', bg: ['#0b0612', '#1a0a24'], ink: '#f5f3ff', accent: '#e879f9', trail: '#a855f7' },
  { name: 'Cian Volt', bg: ['#041016', '#0a2430'], ink: '#ecfeff', accent: '#22d3ee', trail: '#0891b2' },
  { name: 'Ambar Corte', bg: ['#140c06', '#27180a'], ink: '#fffbeb', accent: '#fbbf24', trail: '#f59e0b' },
  { name: 'Jade Pulso', bg: ['#06140e', '#0c2618'], ink: '#ecfdf5', accent: '#34d399', trail: '#10b981' },
  { name: 'Rojo Cartel', bg: ['#140608', '#261014'], ink: '#fff1f2', accent: '#fb7185', trail: '#e11d48' },
  { name: 'Violeta Eje', bg: ['#0c0818', '#1a1230'], ink: '#f5f3ff', accent: '#a78bfa', trail: '#7c3aed' },
  { name: 'Hielo Norte', bg: ['#080e16', '#121c2a'], ink: '#f8fafc', accent: '#93c5fd', trail: '#38bdf8' },
  { name: 'Cobre Forja', bg: ['#160a06', '#27140c'], ink: '#fff7ed', accent: '#fb923c', trail: '#ea580c' },
  { name: 'Lima Vector', bg: ['#0a1406', '#16240c'], ink: '#f7fee7', accent: '#a3e635', trail: '#65a30d' },
  { name: 'Petroleo', bg: ['#061210', '#0c221c'], ink: '#f0fdfa', accent: '#2dd4bf', trail: '#0f766e' },
];

const LAYOUTS = [
  { id: 'echo', label: 'Eco', symbol: 'waveform' },
  { id: 'stack', label: 'Pila', symbol: 'text.justify' },
  { id: 'slash', label: 'Corte', symbol: 'italic' },
  { id: 'split', label: 'Eje', symbol: 'textformat' },
];

const WORDS = [
  'FLUJO', 'PULSO', 'VECTOR', 'RITMO', 'FASE', 'NOVA', 'ECOS', 'TRAZO',
  'ONDA', 'FOCO', 'VOLTA', 'CIELO', 'AURORA', 'GLIFO', 'SENAL', 'PRISMA',
  'ORBITA', 'LUMEN', 'EJE', 'FULGOR', 'DERIVA', 'HALO', 'ZENIT', 'POLAR',
  'NUCLEO', 'FORJA', 'ALBA', 'VUELO', 'CICLO', 'SIGNO', 'NORTE', 'SURCO',
  'PISTA', 'MARCA', 'LINFA', 'VIGIA', 'PULSAR', 'TRAZA', 'SOLAR', 'NODO',
];

const ADJECTIVES = ['Cinetica', 'Brutal', 'Solar', 'Nocturna', 'Liquida', 'Mineral', 'Encendida', 'Vectorial', 'Aurora', 'Oscura'];
const NOUNS = ['cartel', 'deriva', 'pulso', 'traza', 'orbita', 'glifo', 'fase', 'eco'];
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const TIPS = [
  'El cartel cambia a medianoche',
  'Cada glifo nace de un bloque 5x7',
  'La paleta rota con el dia',
  'Toca para previsualizar en grande',
];

const GLYPHS = {
  A: [[1, 0, 3, 1], [0, 1, 1, 6], [4, 1, 1, 6], [1, 3, 3, 1]],
  B: [[0, 0, 1, 7], [1, 0, 3, 1], [4, 1, 1, 2], [1, 3, 3, 1], [4, 4, 1, 2], [1, 6, 3, 1]],
  C: [[1, 0, 3, 1], [0, 1, 1, 5], [1, 6, 3, 1], [4, 1, 1, 1], [4, 5, 1, 1]],
  D: [[0, 0, 1, 7], [1, 0, 3, 1], [4, 1, 1, 5], [1, 6, 3, 1]],
  E: [[0, 0, 1, 7], [1, 0, 4, 1], [1, 3, 3, 1], [1, 6, 4, 1]],
  F: [[0, 0, 1, 7], [1, 0, 4, 1], [1, 3, 3, 1]],
  G: [[1, 0, 3, 1], [0, 1, 1, 5], [1, 6, 3, 1], [4, 3, 1, 3], [3, 3, 1, 1]],
  H: [[0, 0, 1, 7], [4, 0, 1, 7], [1, 3, 3, 1]],
  I: [[1, 0, 3, 1], [2, 1, 1, 5], [1, 6, 3, 1]],
  L: [[0, 0, 1, 7], [1, 6, 4, 1]],
  M: [[0, 0, 1, 7], [4, 0, 1, 7], [1, 1, 1, 2], [3, 1, 1, 2], [2, 3, 1, 2]],
  N: [[0, 0, 1, 7], [4, 0, 1, 7], [1, 2, 1, 2], [2, 3, 1, 2], [3, 4, 1, 2]],
  O: [[1, 0, 3, 1], [0, 1, 1, 5], [4, 1, 1, 5], [1, 6, 3, 1]],
  P: [[0, 0, 1, 7], [1, 0, 3, 1], [4, 1, 1, 2], [1, 3, 3, 1]],
  R: [[0, 0, 1, 7], [1, 0, 3, 1], [4, 1, 1, 2], [1, 3, 3, 1], [3, 4, 1, 1], [4, 5, 1, 2]],
  S: [[1, 0, 4, 1], [0, 1, 1, 2], [1, 3, 3, 1], [4, 4, 1, 2], [0, 6, 4, 1]],
  T: [[0, 0, 5, 1], [2, 1, 1, 6]],
  U: [[0, 0, 1, 6], [4, 0, 1, 6], [1, 6, 3, 1]],
  V: [[0, 0, 1, 5], [4, 0, 1, 5], [1, 5, 1, 1], [3, 5, 1, 1], [2, 6, 1, 1]],
  Y: [[0, 0, 1, 2], [4, 0, 1, 2], [1, 2, 1, 1], [3, 2, 1, 1], [2, 3, 1, 4]],
  Z: [[0, 0, 5, 1], [3, 1, 1, 2], [2, 3, 1, 1], [1, 4, 1, 2], [0, 6, 5, 1]],
};

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
  const rand = new DeterministicPRNG(hash);
  return {
    palette: PALETTES[hash % PALETTES.length],
    layout: LAYOUTS[hash % LAYOUTS.length],
    word: WORDS[hash % WORDS.length],
    seed: hash,
    title: `${rand.pick(ADJECTIVES)} ${rand.pick(NOUNS)}`,
    tip: TIPS[hash % TIPS.length],
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

class TypePosterRenderer {
  constructor(width, height, palette, layout, word, seed) {
    this.w = width;
    this.h = height;
    this.pal = palette;
    this.layout = layout;
    this.word = word;
    this.rand = new DeterministicPRNG(seed ^ Math.floor(width * 17 + height * 11));
    this.ctx = new DrawContext();
    this.ctx.size = new Size(width, height);
    this.ctx.opaque = true;
    this.ctx.respectScreenScale = true;
  }

  echoCount() {
    return this.w * this.h < 120000 ? 2 : 3;
  }

  drawBackdrop() {
    try {
      const gradient = new LinearGradient();
      gradient.colors = [new Color(this.pal.bg[0]), new Color(this.pal.bg[1])];
      gradient.locations = [0, 1];
      this.ctx.drawLinearGradient(gradient, new Point(0, 0), new Point(0, this.h));
    } catch {
    }
    try {
      this.ctx.setFillColor(new Color('#000000', 0.18));
      this.ctx.fillRect(new Rect(0, 0, this.w, this.h));
    } catch {
    }
    try {
      this.ctx.setFillColor(new Color(this.pal.accent, 0.85));
      this.ctx.fillRect(new Rect(0, 0, Math.max(6, this.w * 0.018), this.h));
    } catch {
    }
  }

  drawGrid() {
    const vCount = this.w < 400 ? 3 : this.w < 750 ? 4 : 5;
    const hCount = this.h < 300 ? 3 : 4;
    const color = new Color('#ffffff', 0.055);
    for (let i = 1; i <= vCount; i++) {
      const x = (this.w / (vCount + 1)) * i;
      try {
        this.ctx.setStrokeColor(color);
        this.ctx.setLineWidth(1);
        const path = new Path();
        path.move(new Point(x, 0));
        path.addLine(new Point(x, this.h));
        this.ctx.addPath(path);
        this.ctx.strokePath();
      } catch {
      }
    }
    for (let i = 1; i <= hCount; i++) {
      const y = (this.h / (hCount + 1)) * i;
      try {
        this.ctx.setStrokeColor(color);
        this.ctx.setLineWidth(1);
        const path = new Path();
        path.move(new Point(0, y));
        path.addLine(new Point(this.w, y));
        this.ctx.addPath(path);
        this.ctx.strokePath();
      } catch {
      }
    }
  }

  drawSpeedLines() {
    const count = this.w < 400 ? 3 : 5;
    for (let i = 0; i < count; i++) {
      const y = this.h * this.rand.range(0.12, 0.88);
      const x0 = this.w * this.rand.range(-0.05, 0.25);
      const x1 = this.w * this.rand.range(0.55, 1.08);
      try {
        this.ctx.setStrokeColor(new Color(this.pal.trail, this.rand.range(0.08, 0.18)));
        this.ctx.setLineWidth(this.rand.range(3, 9));
        const path = new Path();
        path.move(new Point(x0, y));
        path.addLine(new Point(x1, y + this.rand.range(-8, 8)));
        this.ctx.addPath(path);
        this.ctx.strokePath();
      } catch {
      }
    }
  }

  drawMarks() {
    const arm = Math.max(8, Math.min(this.w, this.h) * 0.035);
    const thick = Math.max(2, arm * 0.18);
    const inset = 10;
    const corners = [
      [inset, inset, 1, 1],
      [this.w - inset, inset, -1, 1],
      [inset, this.h - inset, 1, -1],
      [this.w - inset, this.h - inset, -1, -1],
    ];
    for (const [x, y, sx, sy] of corners) {
      try {
        this.ctx.setFillColor(new Color(this.pal.accent, 0.55));
        this.ctx.fillRect(new Rect(sx > 0 ? x : x - arm, sy > 0 ? y : y - thick, arm, thick));
        this.ctx.fillRect(new Rect(sx > 0 ? x : x - thick, sy > 0 ? y : y - arm, thick, arm));
      } catch {
      }
    }
  }

  drawGlyph(ch, x, y, unit, color, alpha) {
    const cells = GLYPHS[ch];
    if (!cells) return;
    for (const cell of cells) {
      try {
        this.ctx.setFillColor(new Color(color, alpha));
        this.ctx.fillRect(new Rect(
          x + cell[0] * unit,
          y + cell[1] * unit,
          cell[2] * unit,
          cell[3] * unit
        ));
      } catch {
      }
    }
  }

  drawWordAt(word, originX, originY, unit, color, alpha, dx, dy) {
    for (let i = 0; i < word.length; i++) {
      const gx = originX + i * 6 * unit + i * dx;
      const gy = originY + i * dy;
      this.drawGlyph(word[i], gx, gy, unit, color, alpha);
    }
  }

  measure(letterCount, extraX, extraY) {
    const cols = letterCount * 6 + extraX;
    const rows = 7 + extraY;
    return Math.min(this.w / Math.max(cols, 8), this.h / Math.max(rows, 9)) * 0.86;
  }

  drawLetters() {
    const word = this.word;
    const echoes = this.echoCount();
    const id = this.layout.id;
    if (id === 'stack') {
      this.drawStacked(word, echoes);
      return;
    }
    if (id === 'slash') {
      this.drawSlashed(word, echoes);
      return;
    }
    if (id === 'split' && word.length >= 5) {
      this.drawSplit(word, echoes);
      return;
    }
    this.drawEcho(word, echoes);
  }

  drawEcho(word, echoes) {
    const unit = this.measure(word.length, 4, 6);
    const wordW = word.length * 6 * unit;
    const wordH = 7 * unit;
    const originX = (this.w - wordW) * 0.5;
    const originY = (this.h - wordH) * 0.46;
    const step = unit * 0.55;
    for (let e = 0; e < echoes; e++) {
      const t = e / Math.max(echoes - 1, 1);
      const color = e === echoes - 1 ? this.pal.ink : this.pal.trail;
      const alpha = e === echoes - 1 ? 0.96 : 0.16 + t * 0.28;
      this.drawWordAt(word, originX + (echoes - 1 - e) * step, originY - (echoes - 1 - e) * step * 0.35, unit, color, alpha, 0, 0);
    }
    this.drawBaseline(originX, originY + wordH + unit * 0.6, wordW);
  }

  drawStacked(word, echoes) {
    const unit = this.measure(8, 2, word.length * 8);
    const colW = 5 * unit;
    const blockH = word.length * 8 * unit;
    const originX = (this.w - colW) * 0.5;
    const originY = Math.max(12, (this.h - blockH) * 0.42);
    const step = unit * 0.4;
    for (let e = 0; e < echoes; e++) {
      const color = e === echoes - 1 ? this.pal.ink : this.pal.trail;
      const alpha = e === echoes - 1 ? 0.96 : 0.18;
      for (let i = 0; i < word.length; i++) {
        this.drawGlyph(
          word[i],
          originX + (echoes - 1 - e) * step,
          originY + i * 8 * unit - (echoes - 1 - e) * step * 0.3,
          unit,
          color,
          alpha
        );
      }
    }
  }

  drawSlashed(word, echoes) {
    const dy = this.h * 0.045;
    const unit = this.measure(word.length, 6, 10);
    const wordW = word.length * 6 * unit + (word.length - 1) * dy * 0.4;
    const wordH = 7 * unit + (word.length - 1) * dy;
    const originX = (this.w - wordW) * 0.42;
    const originY = Math.max(16, (this.h - wordH) * 0.38);
    const step = unit * 0.5;
    for (let e = 0; e < echoes; e++) {
      const color = e === echoes - 1 ? this.pal.ink : this.pal.accent;
      const alpha = e === echoes - 1 ? 0.96 : 0.2;
      this.drawWordAt(
        word,
        originX + (echoes - 1 - e) * step,
        originY - (echoes - 1 - e) * step * 0.25,
        unit,
        color,
        alpha,
        dy * 0.35,
        dy
      );
    }
  }

  drawSplit(word, echoes) {
    const mid = Math.ceil(word.length / 2);
    const top = word.slice(0, mid);
    const bottom = word.slice(mid);
    const longest = Math.max(top.length, bottom.length);
    const unit = this.measure(longest, 4, 18);
    const topW = top.length * 6 * unit;
    const botW = bottom.length * 6 * unit;
    const originY = this.h * 0.28;
    const gap = unit * 3.2;
    const step = unit * 0.45;
    for (let e = 0; e < echoes; e++) {
      const color = e === echoes - 1 ? this.pal.ink : this.pal.trail;
      const alpha = e === echoes - 1 ? 0.96 : 0.2;
      const ox = (echoes - 1 - e) * step;
      const oy = -(echoes - 1 - e) * step * 0.3;
      this.drawWordAt(top, (this.w - topW) * 0.5 + ox, originY + oy, unit, color, alpha, 0, 0);
      this.drawWordAt(bottom, (this.w - botW) * 0.5 + ox, originY + 7 * unit + gap + oy, unit, color, alpha, 0, 0);
    }
    this.drawBaseline((this.w - Math.max(topW, botW)) * 0.5, originY + 7 * unit + gap * 0.45, Math.max(topW, botW));
  }

  drawBaseline(x, y, width) {
    try {
      this.ctx.setFillColor(new Color(this.pal.accent, 0.7));
      this.ctx.fillRect(new Rect(x, y, width, Math.max(2, this.h * 0.008)));
    } catch {
    }
  }

  drawSparks() {
    const count = this.w * this.h < 120000 ? 6 : 9;
    for (let i = 0; i < count; i++) {
      const cx = this.rand.range(this.w * 0.08, this.w * 0.92);
      const cy = this.rand.range(this.h * 0.08, this.h * 0.92);
      const r = this.rand.range(0.6, 2.1);
      try {
        this.ctx.setFillColor(new Color('#ffffff', this.rand.range(0.16, 0.5)));
        this.ctx.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      } catch {
      }
    }
  }

  render() {
    this.drawBackdrop();
    this.drawGrid();
    this.drawSpeedLines();
    this.drawMarks();
    this.drawLetters();
    this.drawSparks();
    return this.ctx.getImage();
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
  addSymbol(header, selection.layout.symbol, compact ? 12 : 16, new Color(selection.palette.accent));
  header.addSpacer(6);
  const title = header.addText(WIDGET_CONFIG.name);
  title.font = Font.boldSystemFont(compact ? 11 : 14);
  title.textColor = new Color('#f4f4f5');
  header.addSpacer(null);
  const badge = header.addStack();
  badge.backgroundColor = new Color(selection.palette.accent, 0.16);
  badge.cornerRadius = 6;
  badge.setPadding(3, 7, 3, 7);
  const badgeLabel = badge.addText(selection.layout.label);
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
    const hint = footer.addText(`${selection.word} · ${selection.title}`);
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

function renderArt(family, selection) {
  const canvas = canvasForFamily(family);
  const art = new TypePosterRenderer(
    canvas.w,
    canvas.h,
    selection.palette,
    selection.layout,
    selection.word,
    selection.seed
  ).render();
  return { art, canvas };
}

function buildSmall(widget, selection) {
  widget.setPadding(10, 10, 10, 10);
  buildHeader(widget, selection, true);
  widget.addSpacer(6);
  const packed = renderArt('small', selection);
  embedArt(widget, packed.art, packed.canvas.imageH);
  widget.addSpacer(6);
  addCenteredText(widget, selection.word, Font.boldSystemFont(12), new Color(selection.palette.ink, 0.92));
}

function buildMedium(widget, selection) {
  widget.setPadding(12, 14, 10, 14);
  buildHeader(widget, selection, false);
  widget.addSpacer(8);
  const packed = renderArt('medium', selection);
  embedArt(widget, packed.art, packed.canvas.imageH);
  widget.addSpacer(8);
  buildFooter(widget, selection, false);
}

function buildLarge(widget, selection) {
  widget.setPadding(14, 16, 12, 16);
  buildHeader(widget, selection, false);
  widget.addSpacer(10);
  const packed = renderArt('large', selection);
  embedArt(widget, packed.art, packed.canvas.imageH);
  widget.addSpacer(10);
  buildFooter(widget, selection, true);
  widget.addSpacer(6);
  addCenteredText(widget, selection.tip, Font.systemFont(9), new Color('#ffffff', 0.32));
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
  errBg.colors = [new Color('#0b0612'), new Color('#1a0a24')];
  errBg.locations = [0, 1];
  errWidget.backgroundGradient = errBg;
  errWidget.setPadding(14, 14, 14, 14);
  const title = errWidget.addText('Tipo Cinetico');
  title.font = Font.boldSystemFont(14);
  title.textColor = new Color('#f4f4f5');
  errWidget.addSpacer(6);
  const body = errWidget.addText('No se pudo dibujar el cartel. Toca para reintentar.');
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
