const WIDGET_CONFIG = {
  name: 'Vitraux Voronoi',
  refreshMinutes: 45,
};

const PALETTES = [
  { name: 'Rubi Catedral', bg: ['#12060a', '#1c0a12'], glass: ['#ef4444', '#f59e0b', '#fbbf24', '#fb7185'], accent: '#fcd34d', lead: '#1a0a0c' },
  { name: 'Zafiro Nave', bg: ['#060a16', '#0c1428'], glass: ['#3b82f6', '#6366f1', '#22d3ee', '#818cf8'], accent: '#93c5fd', lead: '#080c18' },
  { name: 'Esmeralda', bg: ['#06140c', '#0c2418'], glass: ['#34d399', '#10b981', '#2dd4bf', '#a3e635'], accent: '#6ee7b7', lead: '#06140c' },
  { name: 'Amatista', bg: ['#120814', '#1c1024'], glass: ['#a855f7', '#c084fc', '#e879f9', '#818cf8'], accent: '#e9d5ff', lead: '#100814' },
  { name: 'Ambar Gotico', bg: ['#140c06', '#24180a'], glass: ['#f59e0b', '#fbbf24', '#ef4444', '#fb923c'], accent: '#fde68a', lead: '#1a1006' },
  { name: 'Vitrea Luna', bg: ['#0a1018', '#121c2a'], glass: ['#93c5fd', '#67e8f9', '#c4b5fd', '#e0f2fe'], accent: '#bae6fd', lead: '#0a1018' },
  { name: 'Cobre Altar', bg: ['#160a06', '#26140c'], glass: ['#f97316', '#ea580c', '#eab308', '#fb7185'], accent: '#fdba74', lead: '#140806' },
  { name: 'Petroleo', bg: ['#061210', '#0c221c'], glass: ['#14b8a6', '#06b6d4', '#22c55e', '#38bdf8'], accent: '#5eead4', lead: '#061210' },
  { name: 'Roseton', bg: ['#160814', '#26101f'], glass: ['#e879f9', '#f472b6', '#fb7185', '#fbbf24'], accent: '#f9a8d4', lead: '#140810' },
  { name: 'Nocturno', bg: ['#08080e', '#12121c'], glass: ['#64748b', '#38bdf8', '#a78bfa', '#94a3b8'], accent: '#cbd5e1', lead: '#08080e' },
];

const LAYOUTS = [
  { id: 'scatter', label: 'Nave', symbol: 'square.grid.3x3.fill' },
  { id: 'rose', label: 'Roseton', symbol: 'sun.max.fill' },
  { id: 'lancet', label: 'Lancet', symbol: 'triangle.fill' },
  { id: 'cluster', label: 'Capilla', symbol: 'hexagon.fill' },
];

const ADJECTIVES = ['Gotica', 'Solar', 'Nocturna', 'Antigua', 'Liquida', 'Mineral', 'Encendida', 'Vitrea', 'Aurora', 'Oscura'];
const NOUNS = ['vidriera', 'rosa', 'nave', 'capilla', 'luz', 'cristal', 'oriel', 'triforio'];
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const TIPS = [
  'El vitraux cambia a medianoche',
  'Cada panel nace de un diagrama de Voronoi',
  'La paleta rota con el dia',
  'Toca para previsualizar en grande',
];

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

function canvasRect(width, height, pad) {
  return [
    { x: pad, y: pad },
    { x: width - pad, y: pad },
    { x: width - pad, y: height - pad },
    { x: pad, y: height - pad },
  ];
}

function clipAgainstSite(poly, site, other) {
  if (!poly || poly.length < 3) return [];
  const mx = (site.x + other.x) * 0.5;
  const my = (site.y + other.y) * 0.5;
  const dx = other.x - site.x;
  const dy = other.y - site.y;
  const insideOf = (p) => (p.x - mx) * dx + (p.y - my) * dy <= 1e-6;
  const hit = (p1, p2) => {
    const f1 = (p1.x - mx) * dx + (p1.y - my) * dy;
    const f2 = (p2.x - mx) * dx + (p2.y - my) * dy;
    const den = f1 - f2;
    const t = Math.abs(den) < 1e-9 ? 0.5 : f1 / den;
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
  };
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const start = poly[i];
    const end = poly[(i + 1) % poly.length];
    const startIn = insideOf(start);
    const endIn = insideOf(end);
    if (endIn) {
      if (!startIn) out.push(hit(start, end));
      out.push(end);
    } else if (startIn) {
      out.push(hit(start, end));
    }
  }
  return out;
}

function clipKeepLeft(poly, a, b) {
  if (!poly || poly.length < 3) return [];
  const insideOf = (p) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-6;
  const hit = (p1, p2) => {
    const x1 = p1.x;
    const y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;
    const x3 = a.x;
    const y3 = a.y;
    const x4 = b.x;
    const y4 = b.y;
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-9) return p2;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  };
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const start = poly[i];
    const end = poly[(i + 1) % poly.length];
    const startIn = insideOf(start);
    const endIn = insideOf(end);
    if (endIn) {
      if (!startIn) out.push(hit(start, end));
      out.push(end);
    } else if (startIn) {
      out.push(hit(start, end));
    }
  }
  return out;
}

function clipToRegularPolygon(poly, cx, cy, radius, sides) {
  let current = poly;
  for (let i = 0; i < sides; i++) {
    const a1 = -Math.PI / 2 - (i / sides) * Math.PI * 2;
    const a2 = -Math.PI / 2 - ((i + 1) / sides) * Math.PI * 2;
    const p1 = { x: cx + Math.cos(a1) * radius, y: cy + Math.sin(a1) * radius };
    const p2 = { x: cx + Math.cos(a2) * radius, y: cy + Math.sin(a2) * radius };
    current = clipKeepLeft(current, p1, p2);
    if (current.length < 3) return [];
  }
  return current;
}

function clipToLancet(poly, width, height, pad) {
  const top = { x: width * 0.5, y: pad };
  const left = { x: pad + width * 0.08, y: height - pad };
  const right = { x: width - pad - width * 0.08, y: height - pad };
  let current = clipKeepLeft(poly, top, right);
  current = clipKeepLeft(current, right, left);
  current = clipKeepLeft(current, left, top);
  return current;
}

function polygonCentroid(points) {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  const n = points.length || 1;
  return { x: x / n, y: y / n };
}

class VitrauxRenderer {
  constructor(width, height, palette, layout, seed) {
    this.w = width;
    this.h = height;
    this.pal = palette;
    this.layout = layout;
    this.rand = new DeterministicPRNG(seed ^ Math.floor(width * 13 + height * 7));
    this.ctx = new DrawContext();
    this.ctx.size = new Size(width, height);
    this.ctx.opaque = true;
    this.ctx.respectScreenScale = true;
  }

  siteTarget() {
    const area = this.w * this.h;
    if (area < 120000) return 8;
    if (area < 250000) return 12;
    return 16;
  }

  sampleScatter() {
    const pad = Math.min(this.w, this.h) * 0.08;
    return {
      x: this.rand.range(pad, this.w - pad),
      y: this.rand.range(pad, this.h - pad),
    };
  }

  placeSites() {
    if (this.layout.id === 'rose') return this.placeRoseSites();
    if (this.layout.id === 'lancet') return this.placeLancetSites();
    if (this.layout.id === 'cluster') return this.placeClusterSites();
    return this.placeJitteredSites();
  }

  placeJitteredSites() {
    const count = this.siteTarget();
    const sites = [];
    const minDist = Math.min(this.w, this.h) / Math.sqrt(count * 2.4);
    let attempts = 0;
    while (sites.length < count && attempts < count * 50) {
      attempts += 1;
      const point = this.sampleScatter();
      const far = sites.every((s) => {
        const dx = s.x - point.x;
        const dy = s.y - point.y;
        return dx * dx + dy * dy >= minDist * minDist;
      });
      if (far) sites.push(point);
    }
    while (sites.length < Math.max(5, Math.min(count, 8))) {
      sites.push(this.sampleScatter());
    }
    return sites;
  }

  placeRoseSites() {
    const sites = [];
    const cx = this.w * 0.5;
    const cy = this.h * 0.5;
    sites.push({ x: cx + this.rand.range(-3, 3), y: cy + this.rand.range(-3, 3) });
    const area = this.w * this.h;
    const rings = area < 120000 ? [6] : area < 250000 ? [8] : [6, 8];
    const maxR = Math.min(this.w, this.h) * 0.42;
    for (let i = 0; i < rings.length; i++) {
      const n = rings[i];
      const r = maxR * ((i + 1) / rings.length);
      const rot = this.rand.range(0, Math.PI * 2);
      for (let k = 0; k < n; k++) {
        const jitter = this.rand.range(-0.06, 0.06);
        const angle = rot + (k / n) * Math.PI * 2;
        const rr = r * (1 + jitter);
        sites.push({ x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr });
      }
    }
    return sites;
  }

  placeLancetSites() {
    const count = this.siteTarget();
    const sites = [];
    const pad = Math.min(this.w, this.h) * 0.08;
    const top = { x: this.w * 0.5, y: pad + 6 };
    const left = { x: pad + this.w * 0.1, y: this.h - pad - 4 };
    const right = { x: this.w - pad - this.w * 0.1, y: this.h - pad - 4 };
    const inside = (p) => {
      const s1 = (right.x - top.x) * (p.y - top.y) - (right.y - top.y) * (p.x - top.x);
      const s2 = (left.x - right.x) * (p.y - right.y) - (left.y - right.y) * (p.x - right.x);
      const s3 = (top.x - left.x) * (p.y - left.y) - (top.y - left.y) * (p.x - left.x);
      return s1 >= 0 && s2 >= 0 && s3 >= 0;
    };
    const minDist = Math.min(this.w, this.h) / Math.sqrt(count * 2.1);
    for (let i = 0; i < count * 60 && sites.length < count; i++) {
      const t = this.rand.range(0.12, 0.92);
      const span = 0.18 + t * 0.62;
      const point = {
        x: this.w * 0.5 + this.rand.range(-span, span) * this.w * 0.42,
        y: pad + t * (this.h - pad * 2),
      };
      if (!inside(point)) continue;
      const far = sites.every((s) => {
        const dx = s.x - point.x;
        const dy = s.y - point.y;
        return dx * dx + dy * dy >= minDist * minDist;
      });
      if (far) sites.push(point);
    }
    while (sites.length < 5) {
      const t = 0.45 + sites.length * 0.08;
      sites.push({
        x: this.w * 0.5 + (sites.length % 2 === 0 ? -18 : 18),
        y: pad + t * (this.h - pad * 2),
      });
    }
    return sites;
  }

  placeClusterSites() {
    const count = this.siteTarget();
    const clusters = this.rand.int(2, 3);
    const centers = [];
    for (let i = 0; i < clusters; i++) {
      centers.push({
        x: this.rand.range(this.w * 0.22, this.w * 0.78),
        y: this.rand.range(this.h * 0.22, this.h * 0.78),
      });
    }
    const sites = [];
    const spread = Math.min(this.w, this.h) * 0.18;
    for (let i = 0; i < count; i++) {
      const c = centers[i % centers.length];
      sites.push({
        x: Math.min(this.w - 8, Math.max(8, c.x + this.rand.range(-spread, spread))),
        y: Math.min(this.h - 8, Math.max(8, c.y + this.rand.range(-spread, spread))),
      });
    }
    return sites;
  }

  cellPolygon(site, sites, bounds) {
    let poly = bounds.map((p) => ({ x: p.x, y: p.y }));
    for (const other of sites) {
      if (other === site) continue;
      poly = clipAgainstSite(poly, site, other);
      if (poly.length < 3) return [];
    }
    const pad = Math.min(this.w, this.h) * 0.04;
    if (this.layout.id === 'rose') {
      const radius = Math.min(this.w, this.h) * 0.46;
      poly = clipToRegularPolygon(poly, this.w * 0.5, this.h * 0.5, radius, 16);
    } else if (this.layout.id === 'lancet') {
      poly = clipToLancet(poly, this.w, this.h, pad);
    }
    return poly;
  }

  drawBackdrop() {
    const gradient = new Gradient();
    gradient.colors = [new Color(this.pal.bg[0]), new Color(this.pal.bg[1])];
    gradient.locations = [0, 1];
    this.ctx.drawLinearGradient(gradient, new Point(0, 0), new Point(0, this.h));
    try {
      this.ctx.setFillColor(new Color('#000000', 0.22));
      this.ctx.fillRect(new Rect(0, 0, this.w, this.h));
    } catch {
    }
  }

  drawLightBloom() {
    const count = this.rand.int(2, 4);
    for (let i = 0; i < count; i++) {
      const cx = this.rand.range(this.w * 0.15, this.w * 0.85);
      const cy = this.rand.range(this.h * 0.08, this.h * 0.45);
      const r = this.rand.range(Math.min(this.w, this.h) * 0.08, Math.min(this.w, this.h) * 0.2);
      try {
        this.ctx.setFillColor(new Color(this.rand.pick(this.pal.glass), this.rand.range(0.05, 0.12)));
        this.ctx.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      } catch {
      }
    }
  }

  drawBeams() {
    const origin = { x: this.w * this.rand.range(0.35, 0.65), y: -this.h * 0.05 };
    const count = this.rand.int(3, 5);
    for (let i = 0; i < count; i++) {
      const tx = this.w * this.rand.range(0.05, 0.95);
      const ty = this.h * this.rand.range(0.55, 1.05);
      try {
        this.ctx.setStrokeColor(new Color(this.pal.accent, this.rand.range(0.05, 0.12)));
        this.ctx.setLineWidth(this.rand.range(6, 16));
        const path = new Path();
        path.move(new Point(origin.x, origin.y));
        path.addLine(new Point(tx, ty));
        this.ctx.addPath(path);
        this.ctx.strokePath();
      } catch {
      }
    }
  }

  drawPane(points, fillColor, alpha) {
    if (!points || points.length < 3) return;
    const fill = new Color(fillColor, alpha);
    const lead = new Color(this.pal.lead, 0.92);
    try {
      const filled = new Path();
      filled.move(new Point(points[0].x, points[0].y));
      for (let i = 1; i < points.length; i++) {
        filled.addLine(new Point(points[i].x, points[i].y));
      }
      filled.closeSubpath();
      this.ctx.addPath(filled);
      this.ctx.setFillColor(fill);
      this.ctx.fillPath();
    } catch {
    }
    try {
      const outline = new Path();
      outline.move(new Point(points[0].x, points[0].y));
      for (let i = 1; i < points.length; i++) {
        outline.addLine(new Point(points[i].x, points[i].y));
      }
      outline.closeSubpath();
      this.ctx.addPath(outline);
      this.ctx.setStrokeColor(lead);
      this.ctx.setLineWidth(Math.max(2.2, Math.min(this.w, this.h) * 0.012));
      this.ctx.strokePath();
    } catch {
    }
  }

  drawPanes(sites) {
    const pad = 2;
    const bounds = canvasRect(this.w, this.h, pad);
    for (const site of sites) {
      const poly = this.cellPolygon(site, sites, bounds);
      if (poly.length < 3) continue;
      const color = this.rand.pick(this.pal.glass);
      const alpha = this.rand.range(0.42, 0.86);
      this.drawPane(poly, color, alpha);
      const c = polygonCentroid(poly);
      const glintR = this.rand.range(1.2, 3.4);
      try {
        this.ctx.setFillColor(new Color('#ffffff', this.rand.range(0.12, 0.38)));
        this.ctx.fillEllipse(new Rect(c.x - glintR, c.y - glintR, glintR * 2, glintR * 2));
      } catch {
      }
    }
  }

  drawOuterLead() {
    try {
      this.ctx.setStrokeColor(new Color(this.pal.lead, 0.95));
      this.ctx.setLineWidth(Math.max(3, Math.min(this.w, this.h) * 0.018));
      const path = new Path();
      if (this.layout.id === 'rose') {
        const cx = this.w * 0.5;
        const cy = this.h * 0.5;
        const r = Math.min(this.w, this.h) * 0.46;
        const sides = 16;
        for (let i = 0; i <= sides; i++) {
          const angle = -Math.PI / 2 - (i / sides) * Math.PI * 2;
          const pt = new Point(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
          if (i === 0) path.move(pt);
          else path.addLine(pt);
        }
      } else if (this.layout.id === 'lancet') {
        const pad = Math.min(this.w, this.h) * 0.04;
        path.move(new Point(this.w * 0.5, pad));
        path.addLine(new Point(this.w - pad - this.w * 0.08, this.h - pad));
        path.addLine(new Point(pad + this.w * 0.08, this.h - pad));
        path.closeSubpath();
      } else {
        const inset = 3;
        path.move(new Point(inset, inset));
        path.addLine(new Point(this.w - inset, inset));
        path.addLine(new Point(this.w - inset, this.h - inset));
        path.addLine(new Point(inset, this.h - inset));
        path.closeSubpath();
      }
      this.ctx.addPath(path);
      this.ctx.strokePath();
    } catch {
    }
  }

  drawSparks() {
    const count = this.w * this.h < 120000 ? 6 : 10;
    for (let i = 0; i < count; i++) {
      const cx = this.rand.range(this.w * 0.06, this.w * 0.94);
      const cy = this.rand.range(this.h * 0.06, this.h * 0.94);
      const r = this.rand.range(0.5, 1.8);
      try {
        this.ctx.setFillColor(new Color('#ffffff', this.rand.range(0.16, 0.5)));
        this.ctx.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2));
      } catch {
      }
    }
  }

  render() {
    this.drawBackdrop();
    this.drawLightBloom();
    this.drawBeams();
    const sites = this.placeSites();
    this.drawPanes(sites);
    this.drawOuterLead();
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
    const hint = footer.addText(`${selection.layout.label} · ${selection.title}`);
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
  const art = new VitrauxRenderer(
    canvas.w,
    canvas.h,
    selection.palette,
    selection.layout,
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
  addCenteredText(widget, selection.palette.name, Font.mediumSystemFont(9), new Color(selection.palette.accent, 0.8));
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
  errBg.colors = [new Color('#12060a'), new Color('#1c0a12')];
  errBg.locations = [0, 1];
  errWidget.backgroundGradient = errBg;
  errWidget.setPadding(14, 14, 14, 14);
  const title = errWidget.addText('Vitraux Voronoi');
  title.font = Font.boldSystemFont(14);
  title.textColor = new Color('#f4f4f5');
  errWidget.addSpacer(6);
  const body = errWidget.addText('No se pudo dibujar la vidriera. Toca para reintentar.');
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
