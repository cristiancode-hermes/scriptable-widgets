const PALETTES = [
  { name: 'Crimson Tide', colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'] },
  { name: 'Neon Nights', colors: ['#A855F7', '#EC4899', '#F43F5E', '#FDE047', '#22D3EE'] },
  { name: 'Solar Flare', colors: ['#06B6D4', '#10B981', '#F59E0B', '#F97316', '#EF4444'] },
  { name: 'Cosmic Diva', colors: ['#6366F1', '#8B5CF6', '#D946EF', '#F472B6', '#34D399'] },
  { name: 'Deep Ocean', colors: ['#22D3EE', '#3B82F6', '#8B5CF6', '#A855F7', '#EC4899'] },
  { name: 'Emerald Veil', colors: ['#34D399', '#059669', '#047857', '#FBBF24', '#F59E0B'] },
  { name: 'Volcanic', colors: ['#F97316', '#EF4444', '#EC4899', '#A855F7', '#6366F1'] },
  { name: 'Amber Drift', colors: ['#FBBF24', '#F59E0B', '#D97706', '#EF4444', '#EC4899'] },
];

class NebulaDriftWidget {
  constructor() {
    this.family = config.widgetFamily || 'medium';
    this.now = new Date();
    this.seed = this.dateSeed();
    this.palette = PALETTES[this.seed % PALETTES.length];
    this.rand = this.prng(this.seed);
  }

  dateSeed() {
    return this.now.getFullYear() * 10000 + (this.now.getMonth() + 1) * 100 + this.now.getDate();
  }

  prng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1103515245) + 12345) | 0;
      return (s >>> 16) / 0x8000;
    };
  }

  get dims() {
    const map = { small: { w: 155, h: 155 }, medium: { w: 329, h: 155 }, large: { w: 329, h: 345 } };
    return map[this.family] || map.medium;
  }

  formatDate() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = this.now.getDate();
    const month = months[this.now.getMonth()];
    const year = this.now.getFullYear();
    return `${month} ${day} · ${year}`;
  }

  pickColor(alpha = 1) {
    const c = this.palette.colors[Math.floor(this.rand() * this.palette.colors.length)];
    return new Color(c, alpha);
  }

  async render() {
    const widget = new ListWidget();
    const bg = new LinearGradient();
    bg.colors = [new Color('#08080f'), new Color('#0d0d1a')];
    bg.locations = [0, 1];
    widget.backgroundGradient = bg;

    const canvas = new DrawContext();
    canvas.size = new Size(this.dims.w, this.dims.h);
    canvas.opaque = false;
    canvas.respectScreenScale = true;

    this.drawBackground(canvas);
    this.drawNebulaBlobs(canvas);
    this.drawWaveForms(canvas);
    this.drawStars(canvas);
    this.drawAccents(canvas);

    const imgStack = widget.addStack();
    imgStack.addImage(canvas.getImage());

    widget.addSpacer(6);

    const infoStack = widget.addStack();
    infoStack.layoutHorizontally();
    infoStack.addSpacer();

    const dateLabel = infoStack.addText(this.formatDate());
    dateLabel.font = Font.monospacedSystemFont(11, 7);
    dateLabel.textColor = new Color('ffffff', 0.45);
    infoStack.addSpacer();

    return widget;
  }

  drawBackground(ctx) {
    const { w, h } = this.dims;
    const bgGrad = new Gradient();
    bgGrad.colors = [new Color('08080f'), new Color('111122')];
    bgGrad.locations = [0, 1];
    ctx.drawLinearGradient(bgGrad, new Point(0, 0), new Point(w, h));
  }

  drawNebulaBlobs(ctx) {
    const { w, h } = this.dims;
    const count = 3 + Math.floor(this.rand() * 3);
    for (let i = 0; i < count; i++) {
      const cx = this.rand() * w;
      const cy = this.rand() * h;
      const rx = (25 + this.rand() * 50);
      const ry = (25 + this.rand() * 50);
      const c = this.pickColor(0.08 + this.rand() * 0.07);
      ctx.setFillColor(c);
      ctx.fillEllipse(new Rect(cx - rx, cy - ry, rx * 2, ry * 2));
    }
  }

  drawWaveForms(ctx) {
    const { w, h } = this.dims;
    const count = 2 + Math.floor(this.rand() * 2);
    for (let i = 0; i < count; i++) {
      const baseY = h * (0.15 + this.rand() * 0.65);
      const amp = 8 + this.rand() * 22;
      const freq = 0.012 + this.rand() * 0.035;
      const phase = this.rand() * Math.PI * 2;
      const strokeColor = this.pickColor(0.5 + this.rand() * 0.3);
      ctx.setStrokeColor(strokeColor);
      ctx.setLineWidth(1.2 + this.rand() * 1.0);

      const path = new Path();
      path.move(new Point(0, baseY));
      for (let x = 0; x <= w; x += 2) {
        const y = baseY
          + Math.sin(x * freq + phase) * amp
          + Math.sin(x * freq * 0.7 + phase * 1.3) * amp * 0.4;
        path.addLine(new Point(x, y));
      }
      ctx.addPath(path);
      ctx.strokePath();
    }
  }

  drawStars(ctx) {
    const { w, h } = this.dims;
    const count = 15 + Math.floor(this.rand() * 25);
    for (let i = 0; i < count; i++) {
      const sx = this.rand() * w;
      const sy = this.rand() * h;
      const sr = 0.4 + this.rand() * 1.6;
      const alpha = 0.2 + this.rand() * 0.8;
      ctx.setFillColor(new Color('ffffff', alpha));
      ctx.fillEllipse(new Rect(sx - sr, sy - sr, sr * 2, sr * 2));
    }
  }

  drawAccents(ctx) {
    const { w, h } = this.dims;
    const count = 2 + Math.floor(this.rand() * 3);
    for (let i = 0; i < count; i++) {
      const sx = this.rand() * w;
      const sy = this.rand() * h;
      const halfSize = 8 + this.rand() * 20;
      ctx.setFillColor(this.pickColor(0.06 + this.rand() * 0.08));
      if (this.rand() > 0.5) {
        ctx.fillEllipse(new Rect(sx - halfSize, sy - halfSize, halfSize * 2, halfSize * 2));
      } else {
        ctx.fillRect(new Rect(sx - halfSize, sy - halfSize, halfSize * 2, halfSize * 2));
      }
    }
  }
}

const widget = await new NebulaDriftWidget().render();
Script.setWidget(widget);
Script.complete();
