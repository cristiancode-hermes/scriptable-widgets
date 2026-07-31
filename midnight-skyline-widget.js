const PALETTES = [
  { sky: ["#0b1026", "#1b2140", "#33295c"], tower: "#232946", window: "#ffd166", glow: "#8fa3ff", moon: "#eef1ff" },
  { sky: ["#0a0f1e", "#141b30", "#20263f"], tower: "#1f2430", window: "#ffb703", glow: "#00e5ff", moon: "#f6f1d5" },
  { sky: ["#120b24", "#221543", "#33205c"], tower: "#241b35", window: "#f72585", glow: "#4cc9f0", moon: "#f0e6ff" },
  { sky: ["#061a16", "#0e2a21", "#1b3a2b"], tower: "#10281f", window: "#9ef01a", glow: "#00b4d8", moon: "#eafff0" },
  { sky: ["#1c0f1c", "#2c1524", "#3d1f30"], tower: "#2b1523", window: "#ffd166", glow: "#ff6b6b", moon: "#ffe8e8" },
  { sky: ["#081226", "#0f1d3a", "#1a2b52"], tower: "#16233b", window: "#caf0f8", glow: "#90e0ef", moon: "#eaf6ff" },
  { sky: ["#1e1230", "#2e1a44", "#3f2458"], tower: "#2e1f3d", window: "#ff9e00", glow: "#ff5e7e", moon: "#ffedd5" },
  { sky: ["#081410", "#0f2017", "#1a3024"], tower: "#1c2b21", window: "#d9ed92", glow: "#80ed99", moon: "#e8ffe8" },
];

class MidnightSkylineWidget {
  constructor() {
    this.family = config.widgetFamily || "medium";
    this.now = new Date();
    this.seed = this.dateSeed();
    this.palette = PALETTES[this.seed % PALETTES.length];
    this.rand = this.prng(this.seed);
    this.shapes = 0;
    this.shapeBudget = { small: 150, medium: 175, large: 200 }[this.family] || 175;
  }

  dateSeed() {
    return this.now.getFullYear() * 10000 + (this.now.getMonth() + 1) * 100 + this.now.getDate();
  }

  prng(seed) {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1103515245) + 12345) | 0;
      return (state >>> 16) / 0x8000;
    };
  }

  get dims() {
    const map = { small: { w: 155, h: 140 }, medium: { w: 329, h: 150 }, large: { w: 329, h: 300 } };
    return map[this.family] || map.medium;
  }

  spend() {
    this.shapes += 1;
    return this.shapes >= this.shapeBudget;
  }

  footerText() {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    if (this.family === "small") {
      return `${String(this.now.getDate()).padStart(2, "0")}.${String(this.now.getMonth() + 1).padStart(2, "0")}`;
    }
    const day = this.now.getDate();
    const month = months[this.now.getMonth()];
    const year = this.now.getFullYear();
    const code = String(this.seed % 10000).padStart(4, "0");
    return `${day} ${month} ${year} · SKYLINE #${code}`;
  }

  drawBackground(ctx) {
    const grad = new Gradient();
    grad.colors = this.palette.sky.map(hex => new Color(hex));
    grad.locations = [0, 0.55, 1];
    ctx.drawLinearGradient(grad, new Point(0, 0), new Point(0, this.dims.h));
  }

  drawStars(ctx) {
    const { w, h } = this.dims;
    const count = this.family === "small" ? 18 : 28;
    for (let i = 0; i < count; i++) {
      const x = this.rand() * w;
      const y = this.rand() * h * 0.72;
      const radius = 0.4 + this.rand() * 1.5;
      ctx.setFillColor(new Color("#ffffff", 0.12 + this.rand() * 0.6));
      ctx.fillEllipse(new Rect(x, y, radius * 2, radius * 2));
      if (this.spend()) return;
    }
  }

  drawMoon(ctx) {
    const { w, h } = this.dims;
    const radius = this.family === "small" ? 9 + this.rand() * 4 : 13 + this.rand() * 6;
    const x = w * (0.62 + this.rand() * 0.24);
    const y = h * (0.14 + this.rand() * 0.16);
    const haloLayers = [[3.4, 0.1], [2.5, 0.07], [1.7, 0.05]];
    for (const [multiplier, alpha] of haloLayers) {
      const haloRadius = radius * multiplier;
      ctx.setFillColor(new Color(this.palette.glow, alpha));
      ctx.fillEllipse(new Rect(x - haloRadius, y - haloRadius, haloRadius * 2, haloRadius * 2));
      if (this.spend()) return;
    }
    ctx.setFillColor(new Color(this.palette.moon, 0.95));
    ctx.fillEllipse(new Rect(x - radius, y - radius, radius * 2, radius * 2));
    if (this.spend()) return;
    const craterCount = 3 + Math.floor(this.rand() * 3);
    for (let i = 0; i < craterCount; i++) {
      const craterRadius = radius * (0.12 + this.rand() * 0.22);
      const craterX = x + (this.rand() - 0.5) * radius * 1.1;
      const craterY = y + (this.rand() - 0.5) * radius * 1.1;
      ctx.setFillColor(new Color("#0b1026", 0.1 + this.rand() * 0.08));
      ctx.fillEllipse(new Rect(craterX - craterRadius, craterY - craterRadius, craterRadius * 2, craterRadius * 2));
      if (this.spend()) return;
    }
    if (this.rand() < 0.35) {
      const planetRadius = 1.6 + this.rand() * 1.4;
      const planetX = w * (0.1 + this.rand() * 0.22);
      const planetY = h * (0.18 + this.rand() * 0.3);
      ctx.setFillColor(new Color(this.palette.glow, 0.5));
      ctx.fillEllipse(new Rect(planetX - planetRadius * 3, planetY - planetRadius * 3, planetRadius * 6, planetRadius * 6));
      ctx.setFillColor(new Color("#ffffff", 0.9));
      ctx.fillEllipse(new Rect(planetX - planetRadius, planetY - planetRadius, planetRadius * 2, planetRadius * 2));
    }
  }

  drawWindows(ctx, buildingX, buildingTop, buildingWidth, buildingHeight) {
    const strideY = this.family === "large" ? 7 : 6;
    const strideX = 5;
    const marginX = 2.5;
    const maxRows = Math.min(Math.floor((buildingHeight * 0.7) / strideY), 11);
    const cols = Math.max(1, Math.floor((buildingWidth - marginX * 2) / strideX));
    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < cols; col++) {
        if (this.rand() > 0.3) continue;
        const windowX = buildingX + marginX + col * strideX + (strideX - 2.4) / 2;
        const windowY = buildingTop + 4 + row * strideY;
        ctx.setFillColor(new Color(this.palette.window, 0.25 + this.rand() * 0.6));
        ctx.fillRect(new Rect(windowX, windowY, 2.4, 3.2));
        if (this.spend()) return;
      }
    }
  }

  drawAntenna(ctx, buildingX, buildingTop, buildingWidth) {
    const antennaX = buildingX + buildingWidth / 2;
    const antennaLength = 6 + this.rand() * 10;
    ctx.setStrokeColor(new Color("#ffffff", 0.55));
    ctx.setLineWidth(1);
    const path = new Path();
    path.move(new Point(antennaX, buildingTop));
    path.addLine(new Point(antennaX, buildingTop - antennaLength));
    ctx.addPath(path);
    ctx.strokePath();
    this.shapes += 1;
    ctx.setFillColor(new Color("#ff5e7e", 0.95));
    ctx.fillEllipse(new Rect(antennaX - 1.2, buildingTop - antennaLength - 1.2, 2.4, 2.4));
    this.shapes += 1;
  }

  drawSkyline(ctx) {
    const { w, h } = this.dims;
    const baseline = h * 0.82;
    let x = -2;
    while (x < w + 2) {
      const buildingWidth = 12 + this.rand() * 16;
      const heightRatio = 0.22 + this.rand() * 0.5;
      let buildingHeight = baseline * heightRatio;
      if (this.rand() < 0.14) buildingHeight *= 1.35;
      const clampedWidth = Math.min(buildingWidth, w + 2 - x);
      if (clampedWidth < 6) break;
      const buildingTop = baseline - buildingHeight;

      ctx.setFillColor(new Color(this.palette.tower, this.rand() < 0.3 ? 0.75 : 0.95));
      ctx.fillRect(new Rect(x, buildingTop, clampedWidth, buildingHeight + 2));
      if (this.spend()) return;

      ctx.setFillColor(new Color(this.palette.window, 0.18));
      ctx.fillRect(new Rect(x, buildingTop, clampedWidth, 1.5));
      if (this.spend()) return;

      this.drawWindows(ctx, x, buildingTop, clampedWidth, buildingHeight);
      if (this.rand() < 0.22 && buildingHeight > 24) {
        this.drawAntenna(ctx, x, buildingTop, clampedWidth);
      }

      x += clampedWidth + 1 + this.rand() * 2;
    }
  }

  drawFog(ctx) {
    const { w, h } = this.dims;
    const layers = this.family === "small" ? 2 : 3;
    for (let i = 0; i < layers; i++) {
      const fogX = this.rand() * w;
      const fogY = h * (0.74 + this.rand() * 0.1);
      const fogRadiusX = 28 + this.rand() * 45;
      const fogRadiusY = 4 + this.rand() * 5;
      ctx.setFillColor(new Color(this.palette.glow, 0.05 + this.rand() * 0.05));
      ctx.fillEllipse(new Rect(fogX - fogRadiusX, fogY - fogRadiusY, fogRadiusX * 2, fogRadiusY * 2));
      if (this.spend()) return;
    }
  }

  async render() {
    const widget = new ListWidget();
    widget.backgroundColor = new Color(this.palette.sky[0]);
    widget.setPadding(0, 0, 0, 0);

    if (this.family === "large") {
      const header = widget.addStack();
      header.layoutHorizontally();
      header.centerAlignContent();
      header.setPadding(2, 16, 0, 16);
      const symbol = SFSymbol.named("moon.stars.fill");
      symbol.applyFont(SFFont.systemFont(13));
      const icon = header.addImage(symbol.image);
      icon.tintColor = new Color(this.palette.glow);
      header.addSpacer(6);
      const title = header.addText("Midnight Skyline");
      title.font = Font.mediumSystemFont(13);
      title.textColor = new Color("#ffffff", 0.92);
      header.addSpacer();
      widget.addSpacer(4);
    }

    const canvas = new DrawContext();
    canvas.size = new Size(this.dims.w, this.dims.h);
    canvas.opaque = false;
    canvas.respectScreenScale = true;

    this.drawBackground(canvas);
    this.drawStars(canvas);
    this.drawMoon(canvas);
    this.drawSkyline(canvas);
    this.drawFog(canvas);

    const artStack = widget.addStack();
    artStack.addImage(canvas.getImage());

    widget.addSpacer(4);

    const footer = widget.addStack();
    footer.layoutHorizontally();
    footer.centerAlignContent();
    footer.setPadding(0, 16, 2, 16);
    footer.addSpacer();
    const dateLabel = footer.addText(this.footerText());
    dateLabel.font = Font.monospacedSystemFont(this.family === "small" ? 8 : 10, 7);
    dateLabel.textColor = new Color("#ffffff", 0.5);
    footer.addSpacer();

    widget.refreshAfterDate = new Date(Date.now() + 3600000);
    return widget;
  }
}

try {
  const skyline = new MidnightSkylineWidget();
  const widget = await skyline.render();
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentMedium();
  }
} catch (e) {
  const errorWidget = new ListWidget();
  const bg = new LinearGradient();
  bg.colors = [new Color("#0b1026"), new Color("#1a1f3d")];
  bg.locations = [0, 1];
  errorWidget.backgroundGradient = bg;
  const errorTitle = errorWidget.addText("Skyline Error");
  errorTitle.font = Font.boldSystemFont(16);
  errorTitle.textColor = new Color("#ffffff");
  errorWidget.addText("Tap to retry");
  errorWidget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  errorWidget.refreshAfterDate = new Date(Date.now() + 600000);
  if (config.runsInWidget) Script.setWidget(errorWidget);
}
Script.complete();
