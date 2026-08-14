const MEMES = [
  { setup: "Yo a las 3am", punchline: "solo un commit más", emoji: "👨‍💻", tag: "dev-life" },
  { setup: "El código que escribí ayer", punchline: "mi yo de hoy intentando entenderlo", emoji: "🤯", tag: "legacy" },
  { setup: "Funciona en mi máquina", punchline: "dice todo dev que ha roto producción", emoji: "💥", tag: "producción" },
  { setup: "Agregar una dependencia", punchline: "para arreglar un bug: +400 MB", emoji: "📦", tag: "npm" },
  { setup: "QA reporta un bug raro", punchline: "yo: no puedo reproducirlo", emoji: "🐛", tag: "qa" },
  { setup: "El to-do de hoy", punchline: "más items que commits de la semana", emoji: "📝", tag: "productividad" },
  { setup: "Refactorizar: 2 horas", punchline: "revertir el refactor: 2 minutos", emoji: "🔄", tag: "refactor" },
  { setup: "git push --force", punchline: "y desapareció el trabajo de todo el equipo", emoji: "😱", tag: "git" },
  { setup: "Reunión de 10 minutos", punchline: "dura 45 y podía ser un email", emoji: "🎯", tag: "meetings" },
  { setup: "El código legacy", punchline: "no lo toques, funciona, dice mientras arde", emoji: "🔥", tag: "legacy" },
  { setup: "Documentación del proyecto", punchline: "se escribe al final... o nunca", emoji: "📚", tag: "docs" },
  { setup: "Solo debugueo un momento", punchline: "tres horas después", emoji: "🔍", tag: "debug" },
  { setup: "Frontend sin backend", punchline: "como una tostadora sin enchufe", emoji: "🍞", tag: "fullstack" },
  { setup: "Desplegar un viernes", punchline: "la ruleta rusa del desarrollo", emoji: "🎲", tag: "deploy" },
  { setup: "Stack Overflow", punchline: "la documentación real", emoji: "🙏", tag: "docs" },
  { setup: "Ya casi termino", punchline: "dijo el dev en enero", emoji: "🗓️", tag: "scope" },
  { setup: "El WiFi se cae", punchline: "justo antes del push final", emoji: "📡", tag: "maldición" },
  { setup: "Backup del backup", punchline: "de la copia de seguridad original", emoji: "💾", tag: "backup" },
  { setup: "El bug desapareció", punchline: "al reiniciar. no pregunten.", emoji: "🫥", tag: "misterio" },
  { setup: "Estimate: 1 día", punchline: "realidad: 1 sprint", emoji: "📐", tag: "estimaciones" },
];

const PALETTES = [
  { name: "Neon Noir", colors: ["#0f0c29", "#302b63", "#24243e"], dot: "#667eea", beam: "#764ba2" },
  { name: "Synth Pop", colors: ["#1a1a2e", "#16213e", "#0f3460"], dot: "#e94560", beam: "#533483" },
  { name: "Vapor Grape", colors: ["#2d1b4e", "#1a1b41", "#0f0c29"], dot: "#b388ff", beam: "#ff6ec7" },
  { name: "Sunset Comic", colors: ["#3d0c11", "#7a1f3d", "#2b0a1a"], dot: "#ff9f43", beam: "#f368e0" },
  { name: "Deep Ocean", colors: ["#0a1628", "#0d2137", "#1a3a5c"], dot: "#4a8ba6", beam: "#e8b86d" },
  { name: "Emerald Arcade", colors: ["#0b1f1a", "#12382c", "#0a2e2a"], dot: "#2ed573", beam: "#1e90ff" },
];

const ART_ADJECTIVES = ["Neon", "Retro", "Cosmic", "Chrome", "Void", "Hyper", "Pixel", "Feral", "Glitch", "Turbo"];
const ART_NOUNS = ["Meme", "Comic", "Cartoon", "Panel", "Frame", "Vibe", "Riff", "Stripe", "Joke", "Burst"];

function dailyHash() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  let h = ((seed >> 16) ^ seed) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return Math.abs(h);
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function formatLongDate(date) {
  const weekdays = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
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
    meme: MEMES[hash % MEMES.length],
    palette: PALETTES[hash % PALETTES.length],
    adjective: rand.pick(ART_ADJECTIVES),
    noun: rand.pick(ART_NOUNS),
    seed: hash,
  };
}

class HalftoneRenderer {
  constructor(seed, palette, width, height) {
    this.rand = new DeterministicPRNG(seed);
    this.palette = palette;
    this.width = width;
    this.height = height;
    this.ctx = new DrawContext();
    this.ctx.size = new Size(width, height);
    this.ctx.opaque = true;
    this.ctx.respectScreenScale = true;
  }
  render() {
    this.drawBackdrop();
    this.drawHalftoneDots();
    this.drawComicBeams();
    this.drawGlints();
    return this.ctx.getImage();
  }
  drawBackdrop() {
    try {
      const gradient = new Gradient();
      gradient.colors = this.palette.colors.map(hex => new Color(hex));
      gradient.locations = [0, 0.55, 1];
      this.ctx.drawLinearGradient(gradient, new Point(0, 0), new Point(0, this.height));
      this.ctx.setFillColor(new Color("#000000", 0.32));
      this.ctx.fillRect(new Rect(0, 0, this.width, this.height));
    } catch (e) {}
  }
  drawHalftoneDots() {
    try {
      const targetDots = this.width * this.height < 200000 ? 120 : 130;
      const step = Math.sqrt((this.width * this.height) / targetDots);
      const phase = this.rand.next() * Math.PI * 2;
      const frequency = 0.02 + this.rand.next() * 0.03;
      this.ctx.setFillColor(new Color(this.palette.dot, 0.5));
      for (let y = step / 2; y < this.height; y += step) {
        for (let x = step / 2; x < this.width; x += step) {
          const radius = 3 + Math.abs(Math.sin(x * frequency + y * frequency * 0.6 + phase)) * 5;
          this.ctx.fillEllipse(new Rect(x - radius, y - radius, radius * 2, radius * 2));
        }
      }
    } catch (e) {}
  }
  drawComicBeams() {
    try {
      const beamCount = 3 + this.rand.int(0, 2);
      for (let i = 0; i < beamCount; i++) {
        const startX = this.rand.range(0, this.width * 0.4);
        const startY = this.rand.range(0, this.height * 0.3);
        const endX = this.rand.range(this.width * 0.6, this.width);
        const endY = this.rand.range(this.height * 0.7, this.height);
        const beam = new Path();
        beam.move(new Point(startX, startY));
        beam.addLine(new Point(endX, endY));
        this.ctx.setStrokeColor(new Color(this.palette.beam, 0.16));
        this.ctx.setLineWidth(10 + this.rand.range(0, 14));
        this.ctx.addPath(beam);
        this.ctx.strokePath();
      }
    } catch (e) {}
  }
  drawGlints() {
    try {
      const glintCount = 10 + this.rand.int(0, 6);
      for (let i = 0; i < glintCount; i++) {
        const x = this.rand.range(0, this.width);
        const y = this.rand.range(0, this.height);
        const radius = 1 + this.rand.next() * 2.4;
        this.ctx.setFillColor(new Color("#ffffff", 0.12 + this.rand.next() * 0.35));
        this.ctx.fillEllipse(new Rect(x - radius, y - radius, radius * 2, radius * 2));
      }
    } catch (e) {}
  }
}

function addCenteredLabel(parent, text, font, color, shadowed) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.addSpacer(null);
  const label = row.addText(text);
  label.font = font;
  label.textColor = color;
  if (shadowed) {
    label.shadowColor = new Color("#000000", 0.85);
    label.shadowRadius = 2.5;
    label.shadowOffset = new Point(0, 1);
  }
  row.addSpacer(null);
  return label;
}

function addFooterChip(parent, text, font, color) {
  const label = parent.addText(text);
  label.font = font;
  label.textColor = color;
  return label;
}

function buildSmallWidget(widget, selection) {
  const root = widget.addStack();
  root.layoutVertically();
  root.setPadding(12, 12, 10, 12);
  root.addSpacer(null);
  addCenteredLabel(root, selection.meme.emoji, Font.systemFont(26), new Color("#ffffff"), false);
  root.addSpacer(4);
  addCenteredLabel(root, selection.meme.setup.toUpperCase(), Font.boldSystemFont(10), new Color("#ffffff", 0.92), true);
  root.addSpacer(2);
  addCenteredLabel(root, selection.meme.punchline, Font.boldSystemFont(13), new Color("#ffffff"), true);
  root.addSpacer(null);
  const tagRow = root.addStack();
  tagRow.layoutHorizontally();
  tagRow.addSpacer(null);
  addFooterChip(tagRow, `#${selection.meme.tag}`, Font.systemFont(9), new Color("#ffffff", 0.55));
  tagRow.addSpacer(null);
  root.addSpacer(2);
}

function buildMediumWidget(widget, selection) {
  const root = widget.addStack();
  root.layoutVertically();
  root.setPadding(14, 14, 12, 14);
  const titleRow = root.addStack();
  titleRow.layoutHorizontally();
  titleRow.addSpacer(null);
  const titleLabel = titleRow.addText(`${selection.adjective} ${selection.noun} #${dayOfYear(new Date())}`);
  titleLabel.font = Font.mediumSystemFont(10);
  titleLabel.textColor = new Color("#ffffff", 0.7);
  titleRow.addSpacer(null);
  root.addSpacer(8);
  const bodyRow = root.addStack();
  bodyRow.layoutHorizontally();
  bodyRow.addSpacer(null);
  const emojiLabel = bodyRow.addText(selection.meme.emoji);
  emojiLabel.font = Font.systemFont(34);
  bodyRow.addSpacer(12);
  const textColumn = bodyRow.addStack();
  textColumn.layoutVertically();
  const setupLabel = textColumn.addText(selection.meme.setup.toUpperCase());
  setupLabel.font = Font.boldSystemFont(10);
  setupLabel.textColor = new Color("#ffffff", 0.85);
  setupLabel.shadowColor = new Color("#000000", 0.85);
  setupLabel.shadowRadius = 2.5;
  setupLabel.shadowOffset = new Point(0, 1);
  textColumn.addSpacer(4);
  const punchlineLabel = textColumn.addText(selection.meme.punchline);
  punchlineLabel.font = Font.boldSystemFont(15);
  punchlineLabel.textColor = new Color("#ffffff");
  punchlineLabel.shadowColor = new Color("#000000", 0.85);
  punchlineLabel.shadowRadius = 2.5;
  punchlineLabel.shadowOffset = new Point(0, 1);
  bodyRow.addSpacer(null);
  root.addSpacer(null);
  const footerRow = root.addStack();
  footerRow.layoutHorizontally();
  footerRow.addSpacer(null);
  addFooterChip(footerRow, `#${selection.meme.tag}`, Font.systemFont(9), new Color("#ffffff", 0.55));
  footerRow.addSpacer(10);
  addFooterChip(footerRow, selection.palette.name, Font.systemFont(9), new Color("#ffffff", 0.55));
  footerRow.addSpacer(10);
  addFooterChip(footerRow, formatLongDate(new Date()), Font.systemFont(9), new Color("#ffffff", 0.55));
  footerRow.addSpacer(null);
}

function buildLargeWidget(widget, selection) {
  const root = widget.addStack();
  root.layoutVertically();
  root.setPadding(18, 18, 14, 18);
  root.addSpacer(null);
  const titleRow = root.addStack();
  titleRow.layoutHorizontally();
  titleRow.addSpacer(null);
  const sparkleSymbol = SFSymbol.named("sparkles");
  const sparkleImage = titleRow.addImage(sparkleSymbol.image);
  sparkleImage.imageSize = new Size(13, 13);
  titleRow.addSpacer(6);
  const titleLabel = titleRow.addText(`${selection.adjective} ${selection.noun} #${dayOfYear(new Date())}`);
  titleLabel.font = Font.mediumSystemFont(11);
  titleLabel.textColor = new Color("#ffffff", 0.75);
  titleRow.addSpacer(null);
  root.addSpacer(12);
  addCenteredLabel(root, selection.meme.emoji, Font.systemFont(46), new Color("#ffffff"), false);
  root.addSpacer(10);
  addCenteredLabel(root, selection.meme.setup.toUpperCase(), Font.boldSystemFont(15), new Color("#ffffff", 0.9), true);
  root.addSpacer(4);
  addCenteredLabel(root, selection.meme.punchline, Font.boldSystemFont(22), new Color("#ffffff"), true);
  root.addSpacer(null);
  const footerRow = root.addStack();
  footerRow.layoutHorizontally();
  footerRow.addSpacer(null);
  addFooterChip(footerRow, `#${selection.meme.tag}`, Font.systemFont(10), new Color("#ffffff", 0.55));
  footerRow.addSpacer(12);
  addFooterChip(footerRow, selection.palette.name, Font.systemFont(10), new Color("#ffffff", 0.55));
  footerRow.addSpacer(12);
  addFooterChip(footerRow, formatLongDate(new Date()), Font.systemFont(10), new Color("#ffffff", 0.55));
  footerRow.addSpacer(null);
  root.addSpacer(2);
}

async function buildWidget(selection) {
  const family = config.widgetFamily;
  const canvasSize = family === "small" ? { width: 320, height: 320 }
    : family === "medium" ? { width: 700, height: 320 }
    : { width: 900, height: 760 };
  const renderer = new HalftoneRenderer(selection.seed, selection.palette, canvasSize.width, canvasSize.height);
  const artwork = renderer.render();
  const widget = new ListWidget();
  widget.backgroundImage = artwork;
  widget.refreshAfterDate = new Date(Date.now() + 3600000);
  widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  if (family === "small") {
    buildSmallWidget(widget, selection);
  } else if (family === "medium") {
    buildMediumWidget(widget, selection);
  } else {
    buildLargeWidget(widget, selection);
  }
  return widget;
}

try {
  const selection = pickDailySelection();
  const widget = await buildWidget(selection);
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentLarge();
  }
} catch (error) {
  const errorWidget = new ListWidget();
  const background = new LinearGradient();
  background.colors = [new Color("#1a1a2e"), new Color("#0f0c29")];
  background.locations = [0, 1];
  errorWidget.backgroundGradient = background;
  errorWidget.addText("⚠️ Meme Error");
  errorWidget.addText("Tap to retry");
  errorWidget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  errorWidget.refreshAfterDate = new Date(Date.now() + 600000);
  Script.setWidget(errorWidget);
}
Script.complete();
