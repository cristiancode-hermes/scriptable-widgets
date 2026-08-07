const WIDGET_CONFIG = {
  name: 'Prism Wave',
  refreshMinutes: 45,
  dateFont: Font.systemFont(9),
  accentAlpha: 0.85,
  waveAlpha: 0.6,
  particleAlpha: 0.5,
};
const PALETTES = [
  { name: 'Aurora', bg: ['#0a0a1a', '#0d0d2b'], accent: '#00d4ff', waves: ['#00d4ff', '#7c3aed', '#f472b6', '#34d399'] },
  { name: 'Ember', bg: ['#0f0808', '#1a0a0a'], accent: '#ff6b35', waves: ['#ff6b35', '#e74c3c', '#f1c40f', '#e67e22'] },
  { name: 'Neon', bg: ['#0a0015', '#15002a'], accent: '#a855f7', waves: ['#a855f7', '#ec4899', '#f43f5e', '#22d3ee'] },
  { name: 'Ocean', bg: ['#041420', '#0a1f30'], accent: '#06b6d4', waves: ['#06b6d4', '#0891b2', '#2dd4bf', '#818cf8'] },
  { name: 'Bloom', bg: ['#1a0a14', '#2a1020'], accent: '#f472b6', waves: ['#f472b6', '#a78bfa', '#fb923c', '#e879f9'] },
  { name: 'Jade', bg: ['#06140e', '#0a1f15'], accent: '#34d399', waves: ['#34d399', '#10b981', '#06b6d4', '#8b5cf6'] },
  { name: 'Solar', bg: ['#1a1408', '#2a2008'], accent: '#fbbf24', waves: ['#fbbf24', '#f59e0b', '#ef4444', '#a78bfa'] },
  { name: 'Frost', bg: ['#0a0e1a', '#101828'], accent: '#93c5fd', waves: ['#93c5fd', '#818cf8', '#a5b4fc', '#67e8f9'] },
  { name: 'Crimson', bg: ['#1a0808', '#280a0a'], accent: '#f43f5e', waves: ['#f43f5e', '#e11d48', '#fb923c', '#38bdf8'] },
  { name: 'DeepSpace', bg: ['#050510', '#0a0a20'], accent: '#c084fc', waves: ['#c084fc', '#818cf8', '#22d3ee', '#f472b6'] },
  { name: 'Tropic', bg: ['#0a1210', '#0f1f18'], accent: '#2dd4bf', waves: ['#2dd4bf', '#f97316', '#06b6d4', '#a855f7'] },
  { name: 'Inferno', bg: ['#140a04', '#241004'], accent: '#f97316', waves: ['#f97316', '#dc2626', '#eab308', '#fb923c'] },
];

function dailySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function createRng(seed) {
  let s = seed >>> 0;
  return {
    next() {
      s = (Math.imul(s, 1103515245) + 12345) | 0;
      return (s >>> 16) / 0x8000;
    },
    range(min, max) {
      return min + this.next() * (max - min);
    },
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    pick(arr) {
      return arr[this.int(0, arr.length - 1)];
    },
  };
}

class PrismWaveRenderer {
  constructor(w, h, palette) {
    this.w = w;
    this.h = h;
    this.pal = palette;
    this.seed = dailySeed();
    this.rng = createRng(this.seed);
    this.ctx = new DrawContext();
    this.ctx.size = new Size(w, h);
    this.ctx.opaque = false;
    this.ctx.respectScreenScale = true;
  }

  render() {
    this.drawBackground();
    this.drawNebulaBlobs();
    this.drawWaves();
    this.drawParticles();
    this.drawAccents();
    return this.ctx.getImage();
  }

  drawBackground() {
    const g = new Gradient();
    g.colors = [
      new Color(this.pal.bg[0]),
      new Color(this.pal.bg[1]),
    ];
    g.locations = [0, 1];
    this.ctx.drawLinearGradient(g, new Point(0, 0), new Point(0, this.h));
  }

  drawNebulaBlobs() {
    const count = this.rng.int(3, 6);
    for (let i = 0; i < count; i++) {
      const cx = this.rng.range(this.w * 0.15, this.w * 0.85);
      const cy = this.rng.range(this.h * 0.1, this.h * 0.9);
      const rx = this.rng.range(this.w * 0.12, this.w * 0.3);
      const ry = this.rng.range(this.h * 0.1, this.h * 0.25);
      const color = this.rng.pick(this.pal.waves);
      this.ctx.setFillColor(new Color(color, this.rng.range(0.04, 0.1)));
      this.ctx.fillEllipse(new Rect(cx - rx, cy - ry, rx * 2, ry * 2));
    }
  }

  drawWaves() {
    const count = this.rng.int(3, 5);
    for (let i = 0; i < count; i++) {
      const color = this.pal.waves[i % this.pal.waves.length];
      const alpha = WIDGET_CONFIG.waveAlpha * (0.6 + this.rng.next() * 0.4);
      const amp = this.rng.range(8, 24);
      const freq = this.rng.range(0.008, 0.025);
      const phase = this.rng.range(0, Math.PI * 2);
      const yBase = this.h * (0.2 + (i / (count - 1 || 1)) * 0.6);
      const harmonicAmp = this.rng.next() * 0.4;
      const harmonicFreq = freq * (1.3 + this.rng.next() * 0.7);

      this.ctx.setStrokeColor(new Color(color, alpha));
      this.ctx.setLineWidth(this.rng.range(0.8, 2.5));
      const path = new Path();
      let started = false;
      for (let x = 0; x <= this.w; x += 1.5) {
        const y = yBase + Math.sin(x * freq + phase) * amp
          + Math.sin(x * harmonicFreq + phase * 1.7) * amp * harmonicAmp;
        if (!started) {
          path.move(new Point(x, y));
          started = true;
        } else {
          path.addLine(new Point(x, y));
        }
      }
      this.ctx.addPath(path);
      this.ctx.strokePath();

      const glowColor = new Color(color, alpha * 0.3);
      this.ctx.setStrokeColor(glowColor);
      this.ctx.setLineWidth(this.rng.range(2, 4));
      const glowPath = new Path();
      let gStarted = false;
      for (let x = 0; x <= this.w; x += 2) {
        const y = yBase + Math.sin(x * freq + phase) * amp
          + Math.sin(x * harmonicFreq + phase * 1.7) * amp * harmonicAmp;
        if (!gStarted) {
          glowPath.move(new Point(x, y));
          gStarted = true;
        } else {
          glowPath.addLine(new Point(x, y));
        }
      }
      this.ctx.addPath(glowPath);
      this.ctx.strokePath();
    }
  }

  drawParticles() {
    const count = this.rng.int(12, 30);
    for (let i = 0; i < count; i++) {
      const cx = this.rng.range(0, this.w);
      const cy = this.rng.range(0, this.h);
      const r = this.rng.range(1, 4.5);
      const color = this.rng.pick(this.pal.waves);
      this.ctx.setFillColor(new Color(color, this.rng.range(0.15, 0.6)));
      this.ctx.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
    }
  }

  drawAccents() {
    const count = this.rng.int(2, 5);
    for (let i = 0; i < count; i++) {
      const cx = this.rng.range(this.w * 0.1, this.w * 0.9);
      const cy = this.rng.range(this.h * 0.1, this.h * 0.9);
      const half = this.rng.range(4, 18);
      const color = this.rng.pick(this.pal.waves);
      const alpha = this.rng.range(0.06, 0.14);
      this.ctx.setFillColor(new Color(color, alpha));
      if (this.rng.next() > 0.5) {
        this.ctx.fillEllipse(new Rect(cx - half, cy - half, half * 2, half * 2));
      } else {
        this.ctx.save();
        this.ctx.setFillColor(new Color(color, alpha));
        const p = new Path();
        p.move(new Point(cx, cy - half));
        p.addLine(new Point(cx + half, cy));
        p.addLine(new Point(cx, cy + half));
        p.addLine(new Point(cx - half, cy));
        p.close();
        this.ctx.addPath(p);
        this.ctx.fillPath();
        this.ctx.restore();
      }
    }
  }
}

function addDateLabel(parent, palette) {
  const d = new Date();
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const label = parent.addText(`${dayNames[d.getDay()]} ${d.getDate()} de ${monthNames[d.getMonth()]}`);
  label.font = WIDGET_CONFIG.dateFont;
  label.textColor = new Color(palette.accent, 0.5);
  label.centerAlignText();
}

function formatTitle() {
  const d = new Date();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

async function buildWidget() {
  try {
    const widget = new ListWidget();
    const palette = PALETTES[dailySeed() % PALETTES.length];

    const bg = new LinearGradient();
    bg.colors = [new Color(palette.bg[0]), new Color(palette.bg[1])];
    bg.locations = [0, 1];
    widget.backgroundGradient = bg;

    widget.setPadding(0, 0, 0, 0);

    const family = config.widgetFamily;

    if (family === 'small') {
      const renderer = new PrismWaveRenderer(140, 140, palette);
      const art = renderer.render();
      const imgStack = widget.addStack();
      imgStack.addImage(art);
      imgStack.size = new Size(140, 140);
    } else if (family === 'medium') {
      const renderer = new PrismWaveRenderer(300, 140, palette);
      const art = renderer.render();
      const imgStack = widget.addStack();
      imgStack.addImage(art);
      imgStack.size = new Size(300, 140);

      const overlay = widget.addStack();
      overlay.layoutHorizontally();
      overlay.addSpacer(null);
      const titleStack = overlay.addStack();
      titleStack.layoutVertically();
      titleStack.setPadding(0, 0, 4, 10);
      titleStack.bottomAlignContent();
      const titles = [
        formatTitle(),
        palette.name,
      ];
      for (const t of titles) {
        const l = titleStack.addText(t);
        l.font = Font.boldSystemFont(9);
        l.textColor = new Color(palette.accent, 0.6);
        l.rightAlignText();
      }
      overlay.addSpacer(null);
    } else {
      const renderer = new PrismWaveRenderer(340, 140, palette);
      const art = renderer.render();
      const imgStack = widget.addStack();
      imgStack.addImage(art);
      imgStack.size = new Size(340, 140);

      const content = widget.addStack();
      content.layoutHorizontally();
      content.setPadding(6, 14, 8, 14);
      content.addSpacer(null);

      const infoCol = content.addStack();
      infoCol.layoutVertically();
      infoCol.centerAlignContent();

      const seedLabel = infoCol.addText(`#${dailySeed().toString().slice(-4)}`);
      seedLabel.font = Font.boldMonospacedSystemFont(11);
      seedLabel.textColor = new Color(palette.accent, 0.8);
      seedLabel.centerAlignText();

      const nameLabel = infoCol.addText(palette.name);
      nameLabel.font = Font.regularSystemFont(10);
      nameLabel.textColor = new Color(palette.accent, 0.5);
      nameLabel.centerAlignText();

      infoCol.addSpacer(4);

      const waveNames = ['Alfa', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
      const waveIndex = dailySeed() % waveNames.length;
      const idLabel = infoCol.addText(`${waveNames[waveIndex]} · ${palette.waves.length} capas`);
      idLabel.font = Font.regularSystemFont(9);
      idLabel.textColor = new Color(palette.accent, 0.35);
      idLabel.centerAlignText();

      content.addSpacer(null);
    }

    widget.refreshAfterDate = new Date(Date.now() + WIDGET_CONFIG.refreshMinutes * 60000);

    if (config.runsInWidget) {
      Script.setWidget(widget);
    } else {
      await widget.presentLarge();
    }
  } catch (e) {
    const errWidget = new ListWidget();
    const errBg = new LinearGradient();
    errBg.colors = [new Color('#0a0a1a'), new Color('#0d0d2b')];
    errBg.locations = [0, 1];
    errWidget.backgroundGradient = errBg;
    errWidget.addText('⚠️ Error');
    errWidget.addText('Tap para reintentar');
    errWidget.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
    errWidget.refreshAfterDate = new Date(Date.now() + 600000);
    Script.setWidget(errWidget);
  }
  Script.complete();
}

await buildWidget();
