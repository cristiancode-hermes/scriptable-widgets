const CONFIG = { name: 'Generative Landscape', refreshMinutes: 60, starCountSmall: 12, starCountLarge: 40, mountainLayers: 5, treeLimit: 18 };

const PALETTES = [
  { name: 'Sunset Blaze', sky: ['#1a0a2e', '#2d1b69', '#e74c3c', '#f39c12', '#f1c40f'], mountain: ['#0d0d1a', '#1a1a2e', '#2d1b3d'], sun: '#ff6b35', tree: '#0a0a15' },
  { name: 'Ocean Dusk', sky: ['#0a1628', '#0d2137', '#1a3a5c', '#2d5a7b', '#4a8ba6'], mountain: ['#080f1a', '#0f1a2d', '#1a2d40'], sun: '#e8b86d', tree: '#050d15' },
  { name: 'Desert Night', sky: ['#0d0d1a', '#1a1030', '#2d1a40', '#4a2d5c', '#6b4073'], mountain: ['#0f0d1a', '#1a1630', '#2d1f40'], sun: '#d4a373', tree: '#0a0815' },
  { name: 'Arctic Aurora', sky: ['#050d1a', '#0a1a2d', '#1a3a40', '#2d5c50', '#4a8a6b'], mountain: ['#080f15', '#101a2d', '#1a2d30'], sun: '#b8d4e8', tree: '#040a10' },
  { name: 'Volcanic Glow', sky: ['#0d0505', '#1a0d0a', '#2d1410', '#4a2015', '#6b3018'], mountain: ['#0a0808', '#151010', '#201815'], sun: '#ff4500', tree: '#080505' },
  { name: 'Twilight Sapphire', sky: ['#080818', '#101830', '#18284a', '#203865', '#2d4a80'], mountain: ['#060610', '#0c0c20', '#121230'], sun: '#80b8e8', tree: '#030310' },
  { name: 'Amber Harvest', sky: ['#1a1008', '#2d1a0d', '#4a2d14', '#6b4020', '#8a552d'], mountain: ['#120c08', '#1d140a', '#2d1a0d'], sun: '#ffa040', tree: '#0a0605' },
  { name: 'Cosmic Dawn', sky: ['#050515', '#0a0a2d', '#151845', '#20285c', '#2d3873'], mountain: ['#030310', '#080820', '#0d0d30'], sun: '#b080e8', tree: '#020210' },
  { name: 'Emerald Ridge', sky: ['#0a1a0d', '#0d2d14', '#1a4020', '#2d5c2d', '#407840'], mountain: ['#051005', '#0a1a0d', '#102d15'], sun: '#80e8a0', tree: '#030805' },
  { name: 'Crimson Storm', sky: ['#1a0505', '#2d0a0a', '#401010', '#5c1818', '#732020'], mountain: ['#100505', '#1d0808', '#2d0d0d'], sun: '#ff6060', tree: '#080303' },
  { name: 'Misty Lavender', sky: ['#121020', '#1e1835', '#2d204a', '#3d2860', '#4d3075'], mountain: ['#0c0a18', '#181030', '#201840'], sun: '#d4a0f0', tree: '#080510' },
  { name: 'Golden Meadow', sky: ['#1a1810', '#2d2818', '#4a3d20', '#6b5528', '#8a7035'], mountain: ['#141008', '#1d180d', '#282010'], sun: '#f0c040', tree: '#0a0805' },
];

const FONTS = {
  smallLabel: Font.systemFont(8), mediumLabel: Font.systemFont(10), titleLabel: Font.boldSystemFont(11),
  largeTitle: Font.boldSystemFont(14), largeSub: Font.systemFont(10),
};

const TEXT_COLORS = {
  primary: new Color('#f0f0f0', 0.9), muted: new Color('#f0f0f0', 0.5), accent: new Color('#ffd700', 0.8),
};

class DeterministicPRNG {
  constructor(seed) { this.s = seed >>> 0; }
  next() { this.s = (Math.imul(this.s, 1103515245) + 12345) | 0; return (this.s >>> 16) / 0x8000; }
  range(min, max) { return min + this.next() * (max - min); }
  int(min, max) { return Math.floor(this.range(min, max + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
}

function dateSeed() {
  const n = new Date();
  return n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate();
}

function makeGradient(colors, locations) {
  const g = new Gradient();
  g.colors = colors.map(c => new Color(c, 1));
  g.locations = locations;
  return g;
}

class LandscapeRenderer {
  constructor(seed, palette, width, height) {
    this.rand = new DeterministicPRNG(seed);
    this.pal = palette;
    this.w = width;
    this.h = height;
    this.ctx = new DrawContext();
    this.ctx.size = new Size(width, height);
    this.ctx.opaque = true;
    this.ctx.respectScreenScale = true;
  }

  drawSky() {
    const colCount = this.pal.sky.length;
    const locs = colCount === 5 ? [0, 0.15, 0.35, 0.6, 1] : colCount === 3 ? [0, 0.5, 1] : [0, 0.3, 0.6, 1];
    const grad = makeGradient(this.pal.sky, locs);
    this.ctx.drawLinearGradient(grad, new Point(0, 0), new Point(0, this.h));
  }

  drawStars(count) {
    for (let i = 0; i < count; i++) {
      const x = this.rand.range(0, this.w);
      const y = this.rand.range(0, this.h * 0.5);
      const r = this.rand.range(0.4, 2.0);
      const alpha = this.rand.range(0.2, 0.9);
      try {
        this.ctx.setFillColor(new Color('#ffffff', alpha));
        this.ctx.fillEllipse(new Rect(x - r, y - r, r * 2, r * 2));
      } catch (e) {}
    }
  }

  drawSun() {
    const sunRadius = this.rand.range(this.w * 0.06, this.w * 0.12);
    const cx = this.rand.range(this.w * 0.15, this.w * 0.85);
    const cy = this.rand.range(this.h * 0.08, this.h * 0.35);
    const glowLayers = 4;
    for (let i = glowLayers; i >= 0; i--) {
      const r = sunRadius * (1 + i * 0.3);
      const alpha = 0.04 + i * 0.02;
      try {
        this.ctx.setFillColor(new Color(this.pal.sun, alpha));
        this.ctx.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      } catch (e) {}
    }
    try {
      this.ctx.setFillColor(new Color(this.pal.sun, 0.9));
      this.ctx.fillEllipse(new Rect(cx - sunRadius, cy - sunRadius, sunRadius * 2, sunRadius * 2));
    } catch (e) {}
    this.sunInfo = { cx, cy };
  }

  drawMoon() {
    const moonRadius = this.rand.range(this.w * 0.04, this.w * 0.08);
    const cx = this.rand.range(this.w * 0.6, this.w * 0.9);
    const cy = this.rand.range(this.h * 0.06, this.h * 0.25);
    for (let i = 3; i >= 0; i--) {
      const r = moonRadius * (1 + i * 0.25);
      try {
        this.ctx.setFillColor(new Color('#e8e0d0', 0.03 + i * 0.015));
        this.ctx.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      } catch (e) {}
    }
    try {
      this.ctx.setFillColor(new Color('#e8e0d0', 0.85));
      this.ctx.fillEllipse(new Rect(cx - moonRadius, cy - moonRadius, moonRadius * 2, moonRadius * 2));
    } catch (e) {}
    const craterCount = this.rand.int(2, 5);
    for (let i = 0; i < craterCount; i++) {
      const ox = this.rand.range(-moonRadius * 0.5, moonRadius * 0.5);
      const oy = this.rand.range(-moonRadius * 0.5, moonRadius * 0.5);
      const cr = this.rand.range(1.0, moonRadius * 0.25);
      try {
        this.ctx.setFillColor(new Color('#c8c0b0', 0.25));
        this.ctx.fillEllipse(new Rect(cx + ox - cr, cy + oy - cr, cr * 2, cr * 2));
      } catch (e) {}
    }
    this.moonInfo = { cx, cy };
  }

  drawMountainLayer(offsetY, baseColor, maxHeight, peakCount) {
    const pts = [];
    const step = this.w / (peakCount * 3);
    pts.push(new Point(0, this.h));
    for (let i = 0; i <= peakCount * 3; i++) {
      const x = i * step;
      const h = this.rand.range(maxHeight * 0.3, maxHeight);
      const y = this.h - offsetY - h;
      pts.push(new Point(x, y));
    }
    pts.push(new Point(this.w, this.h));

    const path = new Path();
    path.move(pts[0]);
    for (let i = 1; i < pts.length; i++) {
      if (i % 3 === 0) {
        const prev = pts[i - 1];
        const mid = pts[i];
        path.addQuadCurve(new Point(mid.x, mid.y), new Point((prev.x + mid.x) / 2, prev.y));
      } else {
        path.addLine(pts[i]);
      }
    }
    path.closeSubpath();

    try {
      this.ctx.setFillColor(new Color(baseColor, 0.9));
      this.ctx.addPath(path);
      this.ctx.fillPath();
    } catch (e) {}
  }

  drawMountains() {
    const layers = CONFIG.mountainLayers;
    for (let i = 0; i < layers; i++) {
      const color = this.pal.mountain[this.rand.int(0, this.pal.mountain.length - 1)];
      const offsetY = this.rand.range(this.h * 0.02, this.h * 0.08) + i * this.h * 0.04;
      const maxH = this.rand.range(this.h * 0.1, this.h * 0.35) - i * this.h * 0.04;
      const peaks = this.rand.int(3, 8);
      this.drawMountainLayer(offsetY, color, maxH, peaks);
    }
  }

  drawTrees() {
    const treeCount = this.rand.int(4, CONFIG.treeLimit);
    const treeColor = new Color(this.pal.tree, 0.85);
    for (let i = 0; i < treeCount; i++) {
      const x = this.rand.range(0, this.w);
      const baseY = this.h - this.rand.range(5, 25);
      const trunkH = this.rand.range(4, 12);
      const crownR = this.rand.range(3, 8);
      try {
        this.ctx.setFillColor(treeColor);
        this.ctx.fillRect(new Rect(x - 1.5, baseY - trunkH, 3, trunkH));
        this.ctx.fillEllipse(new Rect(x - crownR, baseY - trunkH - crownR * 0.8, crownR * 2, crownR * 2));
      } catch (e) {}
    }
  }

  drawGround() {
    const groundH = this.rand.range(this.h * 0.02, this.h * 0.08);
    const baseH = this.h - groundH;
    const path = new Path();
    path.move(new Point(0, baseH));
    for (let x = 0; x <= this.w; x += 8) {
      const y = baseH + Math.sin(x * 0.05 + this.rand.next() * 6.28) * groundH * 0.3;
      path.addLine(new Point(x, y));
    }
    path.addLine(new Point(this.w, this.h));
    path.addLine(new Point(0, this.h));
    path.closeSubpath();
    try {
      this.ctx.setFillColor(new Color(this.pal.tree, 0.6));
      this.ctx.addPath(path);
      this.ctx.fillPath();
    } catch (e) {}
  }

  render() {
    const isNight = this.rand.next() > 0.5;
    this.drawSky();
    const starCount = this.rand.int(CONFIG.starCountSmall, CONFIG.starCountLarge);
    this.drawStars(starCount);
    if (isNight) {
      this.drawMoon();
    } else {
      this.drawSun();
    }
    this.drawMountains();
    this.drawTrees();
    this.drawGround();
    return this.ctx.getImage();
  }
}

function buildGradient(paletteEntry) {
  const g = new LinearGradient();
  g.colors = paletteEntry.sky.slice(0, 3).map(c => new Color(c));
  g.locations = [0, 0.5, 1];
  return g;
}

function addFooter(widget, paletteName, isNight) {
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.addSpacer(null);
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayLabel = footer.addText(`${dayNames[today.getDay()]} ${today.getDate()}/${today.getMonth() + 1}`);
  dayLabel.font = FONTS.smallLabel;
  dayLabel.textColor = TEXT_COLORS.muted;
  footer.addSpacer(4);
  const icon = footer.addText(isNight ? '\u{1F319}' : '\u{2600}\u{FE0F}');
  icon.font = Font.systemFont(7);
  footer.addSpacer(null);
}

async function renderSmall(palette, seed, palName, isNight) {
  const w = new ListWidget();
  w.backgroundGradient = buildGradient(palette);

  const canvas = new LandscapeRenderer(seed, palette, 300, 200);
  const img = canvas.render();
  const imgStack = w.addStack();
  imgStack.addImage(img);
  imgStack.size = new Size(0, 130);
  imgStack.addSpacer(null);

  const bottomRow = w.addStack();
  bottomRow.layoutHorizontally();
  bottomRow.bottomAlignContent();
  bottomRow.addSpacer(null);
  const title = bottomRow.addText(palName);
  title.font = FONTS.mediumLabel;
  title.textColor = TEXT_COLORS.primary;
  bottomRow.addSpacer(null);

  w.addSpacer(2);
  addFooter(w, palName, isNight);
  w.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  w.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
  return w;
}

async function renderMedium(palette, seed, palName, isNight) {
  const w = new ListWidget();
  w.backgroundGradient = buildGradient(palette);

  const canvas = new LandscapeRenderer(seed, palette, 600, 260);
  const img = canvas.render();
  const imgStack = w.addStack();
  imgStack.addImage(img);
  imgStack.size = new Size(0, 120);
  imgStack.addSpacer(null);

  const infoRow = w.addStack();
  infoRow.layoutHorizontally();
  infoRow.centerAlignContent();
  infoRow.setPadding(6, 10, 4, 10);
  const nameLabel = infoRow.addText(`\u{1F3DE}\u{FE0F} ${palName}`);
  nameLabel.font = FONTS.titleLabel;
  nameLabel.textColor = TEXT_COLORS.primary;
  infoRow.addSpacer(null);
  const timeLabel = infoRow.addText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  timeLabel.font = FONTS.mediumLabel;
  timeLabel.textColor = TEXT_COLORS.muted;

  addFooter(w, palName, isNight);
  w.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  w.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
  return w;
}

async function renderLarge(palette, seed, palName, isNight) {
  const w = new ListWidget();
  w.backgroundGradient = buildGradient(palette);

  const canvas = new LandscapeRenderer(seed, palette, 900, 380);
  const img = canvas.render();
  const imgStack = w.addStack();
  imgStack.addImage(img);
  imgStack.size = new Size(0, 220);
  imgStack.addSpacer(null);

  const metaRow = w.addStack();
  metaRow.layoutHorizontally();
  metaRow.centerAlignContent();
  metaRow.setPadding(8, 12, 4, 12);
  const title = metaRow.addText(`\u{1F3DE}\u{FE0F} ${palName} Landscape`);
  title.font = FONTS.largeTitle;
  title.textColor = TEXT_COLORS.primary;
  metaRow.addSpacer(null);
  const desc = metaRow.addText(`Day ${Math.floor(seed / 10000) - 2020}.${String(seed % 10000).slice(0, 2)}`);
  desc.font = FONTS.largeSub;
  desc.textColor = TEXT_COLORS.muted;

  const detailRow = w.addStack();
  detailRow.layoutHorizontally();
  detailRow.centerAlignContent();
  detailRow.setPadding(2, 12, 6, 12);

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const detailLabel = detailRow.addText(`\u{23F0} ${timeStr}  \u{2601}\u{FE0F} ${isNight ? 'Night' : 'Day'}  \u{1F3F3}\u{FE0F} ${palette.sky.length} hues`);
  detailLabel.font = FONTS.mediumLabel;
  detailLabel.textColor = TEXT_COLORS.muted;

  const tipRow = w.addStack();
  tipRow.layoutHorizontally();
  tipRow.setPadding(0, 12, 4, 12);
  const tips = ['Tap to refresh', 'Each day is unique', 'Swipe for more', 'Dark mode always', 'Pure generative art', 'No API needed'];
  const tip = tips[Math.abs(seed) % tips.length];
  const tipLabel = tipRow.addText(`\u{2728} ${tip}`);
  tipLabel.font = FONTS.mediumLabel;
  tipLabel.textColor = TEXT_COLORS.accent;

  w.addSpacer(4);
  const navRow = w.addStack();
  navRow.layoutHorizontally();
  navRow.addSpacer(null);
  const navLabel = navRow.addText('Tap to re-open');
  navLabel.font = FONTS.smallLabel;
  navLabel.textColor = TEXT_COLORS.muted;
  navRow.addSpacer(null);

  w.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  w.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
  return w;
}

async function runAsWidget() {
  const seed = dateSeed();
  const rand = new DeterministicPRNG(seed);
  const palette = rand.pick(PALETTES);
  const isNight = rand.next() > 0.5;
  const palName = palette.name;

  let widget;
  const family = config.widgetFamily;

  if (family === 'small') {
    widget = await renderSmall(palette, seed, palName, isNight);
  } else if (family === 'medium') {
    widget = await renderMedium(palette, seed, palName, isNight);
  } else {
    widget = await renderLarge(palette, seed, palName, isNight);
  }

  Script.setWidget(widget);
  Script.complete();
}

async function runAsUtility() {
  const seed = dateSeed();
  const rand = new DeterministicPRNG(seed);
  const palette = rand.pick(PALETTES);
  const isNight = rand.next() > 0.5;
  const palName = palette.name;

  const canvas = new LandscapeRenderer(seed, palette, 700, 400);
  const img = canvas.render();
  const preview = new ListWidget();
  preview.backgroundGradient = buildGradient(palette);
  preview.addImage(img);
  const title = preview.addText('');
  const gap = preview.addStack();
  gap.addSpacer(4);
  const nameText = preview.addText(`\u{1F3DE}\u{FE0F} ${palName} - ${isNight ? 'Moonlit' : 'Sunlit'}`);
  nameText.font = Font.boldSystemFont(12);
  nameText.textColor = TEXT_COLORS.primary;
  nameText.centerAlignText();
  const hintText = preview.addText('Preview - Add as widget on home screen');
  hintText.font = Font.systemFont(9);
  hintText.textColor = TEXT_COLORS.muted;
  hintText.centerAlignText();
  preview.addSpacer(4);

  await preview.presentMedium();
}

try {
  if (config.runsInWidget) {
    await runAsWidget();
  } else {
    await runAsUtility();
  }
} catch (e) {
  if (config.runsInWidget) {
    const errWidget = new ListWidget();
    const bg = new LinearGradient();
    bg.colors = [new Color('#1a0a2e'), new Color('#0d0d1a')];
    bg.locations = [0, 1];
    errWidget.backgroundGradient = bg;
    errWidget.addText('\u{26A0}\u{FE0F} Landscape Error');
    errWidget.addText('Tap to retry');
    const info = errWidget.addText('');
    info.textColor = new Color('#ffffff', 0.3);
    info.font = Font.systemFont(8);
    errWidget.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
    errWidget.refreshAfterDate = new Date(Date.now() + 600000);
    Script.setWidget(errWidget);
    Script.complete();
  } else {
    const alert = new Alert();
    alert.title = '\u{26A0}\u{FE0F} Error';
    alert.message = e?.message || 'Unexpected error generating landscape.';
    alert.addCancelAction('Close');
    await alert.present();
  }
}
