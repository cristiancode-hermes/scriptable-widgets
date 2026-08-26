const CONFIG = {
  allDayUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
  significantWeekUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson",
  mapUrl: "https://earthquake.usgs.gov/earthquakes/map/",
  requestTimeout: 12,
  refreshMinutes: 15,
  cacheMinutes: 15,
  cacheFile: "seismic-pulse-cache.json",
  smallCount: 2,
  mediumCount: 5,
  largeCount: 8,
  listMinMag: 2.5,
};

const C = {
  bgTop: new Color("#100c14"),
  bgBottom: new Color("#1a1424"),
  surface: new Color("#ffffff", 0.06),
  card: new Color("#ffffff", 0.045),
  accent: new Color("#64d2ff"),
  green: new Color("#30d158"),
  gold: new Color("#ffd60a"),
  orange: new Color("#ff9f0a"),
  red: new Color("#ff453a"),
  purple: new Color("#bf5af2"),
  text: new Color("#eef0f8"),
  dim: new Color("#9aa3b8"),
  muted: new Color("#5e6780"),
};

const PALETTES = [
  [["#100c14", "#1a1424"], "#64d2ff"],
  [["#0d1117", "#161b22"], "#58a6ff"],
  [["#140f12", "#24181c"], "#ff9f0a"],
  [["#0f1410", "#18241c"], "#30d158"],
  [["#12101c", "#1c1830"], "#bf5af2"],
];

function dailyHash() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  let h = ((seed >> 16) ^ seed) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return Math.abs(h);
}

function fmtUpdated(date) {
  try {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

function fmtRelative(ms) {
  if (!ms) return "—";
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 0) return "ahora";
  if (diff < 60) return "ahora";
  if (diff < 3600) return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  if (diff < 172800) return "1d";
  return Math.floor(diff / 86400) + "d";
}

function fmtMag(mag) {
  if (mag == null || Number.isNaN(mag)) return "—";
  return mag.toFixed(1);
}

function fmtDepth(km) {
  if (km == null || Number.isNaN(km)) return "—";
  if (km < 10) return km.toFixed(1) + " km";
  return Math.round(km) + " km";
}

function truncateText(text, maxChars) {
  if (!text) return "—";
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + "…";
}

function shortPlace(place) {
  if (!place) return "Zona desconocida";
  const ofSplit = place.split(" of ");
  if (ofSplit.length > 1) return ofSplit[ofSplit.length - 1].trim();
  return place;
}

function magColor(mag) {
  if (mag == null || Number.isNaN(mag)) return C.muted;
  if (mag >= 6) return C.red;
  if (mag >= 5) return C.orange;
  if (mag >= 4) return C.gold;
  if (mag >= 3) return C.accent;
  return C.green;
}

function magLabel(mag) {
  if (mag == null || Number.isNaN(mag)) return "n/d";
  if (mag >= 6) return "fuerte";
  if (mag >= 5) return "notable";
  if (mag >= 4) return "moderado";
  if (mag >= 3) return "ligero";
  return "micro";
}

function cachePath() {
  const fm = FileManager.local();
  return fm.joinPath(fm.documentsDirectory(), CONFIG.cacheFile);
}

function readCache() {
  try {
    const fm = FileManager.local();
    const path = cachePath();
    if (!fm.fileExists(path)) return null;
    const ageMin = (Date.now() - fm.modificationDate(path).getTime()) / 60000;
    if (ageMin > CONFIG.cacheMinutes) return null;
    return JSON.parse(fm.readString(path));
  } catch (e) {
    return null;
  }
}

function writeCache(payload) {
  try {
    const fm = FileManager.local();
    fm.writeString(cachePath(), JSON.stringify(payload));
    return true;
  } catch (e) {
    return false;
  }
}

async function fetchJSON(url) {
  try {
    const req = new Request(url);
    req.timeoutInterval = CONFIG.requestTimeout;
    return await req.loadJSON();
  } catch (e) {
    return null;
  }
}

function normalizeEvent(feature) {
  try {
    if (!feature || typeof feature !== "object") return null;
    const props = feature.properties && typeof feature.properties === "object" ? feature.properties : {};
    const coords =
      feature.geometry && Array.isArray(feature.geometry.coordinates)
        ? feature.geometry.coordinates
        : [];
    const mag = typeof props.mag === "number" && !Number.isNaN(props.mag) ? props.mag : null;
    return {
      id: feature.id || props.code || String(props.time || Date.now()),
      mag,
      place: typeof props.place === "string" && props.place ? props.place : "Zona desconocida",
      time: typeof props.time === "number" ? props.time : 0,
      url: typeof props.url === "string" && props.url ? props.url : CONFIG.mapUrl,
      felt: typeof props.felt === "number" ? props.felt : 0,
      tsunami: props.tsunami === 1,
      alert: typeof props.alert === "string" ? props.alert : null,
      type: typeof props.type === "string" ? props.type : "earthquake",
      magType: typeof props.magType === "string" ? props.magType : "m",
      lon: typeof coords[0] === "number" ? coords[0] : null,
      lat: typeof coords[1] === "number" ? coords[1] : null,
      depth: typeof coords[2] === "number" ? coords[2] : null,
    };
  } catch (e) {
    return null;
  }
}

function parseCollection(payload) {
  try {
    if (!payload || typeof payload !== "object") return [];
    const raw = Array.isArray(payload.features) ? payload.features : [];
    return raw.map(normalizeEvent).filter((item) => item && item.type === "earthquake");
  } catch (e) {
    return [];
  }
}

function buildStats(dayEvents, significantEvents) {
  const mags = dayEvents.map((e) => e.mag).filter((m) => m != null);
  const strongest = dayEvents.slice().sort((a, b) => (b.mag || -99) - (a.mag || -99))[0] || null;
  const latest = dayEvents.slice().sort((a, b) => (b.time || 0) - (a.time || 0))[0] || null;
  const buckets = [
    { key: "<3", min: -Infinity, max: 3, count: 0 },
    { key: "3+", min: 3, max: 4, count: 0 },
    { key: "4+", min: 4, max: 5, count: 0 },
    { key: "5+", min: 5, max: 6, count: 0 },
    { key: "6+", min: 6, max: Infinity, count: 0 },
  ];
  for (const mag of mags) {
    const bucket = buckets.find((b) => mag >= b.min && mag < b.max);
    if (bucket) bucket.count += 1;
  }
  return {
    total: dayEvents.length,
    felt: dayEvents.filter((e) => e.felt > 0).length,
    tsunami: dayEvents.filter((e) => e.tsunami).length,
    over45: dayEvents.filter((e) => e.mag != null && e.mag >= 4.5).length,
    maxMag: mags.length ? Math.max(...mags) : null,
    avgMag: mags.length ? mags.reduce((sum, mag) => sum + mag, 0) / mags.length : null,
    strongest,
    latest,
    buckets,
    significant: Array.isArray(significantEvents) ? significantEvents : [],
  };
}

function rankedList(events, limit) {
  return events
    .filter((e) => e.mag == null || e.mag >= CONFIG.listMinMag)
    .slice()
    .sort((a, b) => {
      const magDelta = (b.mag || -99) - (a.mag || -99);
      if (magDelta !== 0) return magDelta;
      return (b.time || 0) - (a.time || 0);
    })
    .slice(0, limit);
}

async function loadFeed() {
  const cached = readCache();
  if (cached && Array.isArray(cached.dayEvents)) {
    return {
      dayEvents: cached.dayEvents,
      significantEvents: cached.significantEvents || [],
      fetchedAt: cached.fetchedAt || Date.now(),
      fromCache: true,
    };
  }
  const [dayPayload, weekPayload] = await Promise.all([
    fetchJSON(CONFIG.allDayUrl),
    fetchJSON(CONFIG.significantWeekUrl),
  ]);
  const dayEvents = parseCollection(dayPayload);
  const significantEvents = parseCollection(weekPayload);
  const fetchedAt = Date.now();
  if (dayEvents.length || significantEvents.length) {
    writeCache({ dayEvents, significantEvents, fetchedAt });
  }
  return { dayEvents, significantEvents, fetchedAt, fromCache: false };
}

function applyBackground(widget, palette) {
  const bg = new LinearGradient();
  bg.colors = [new Color(palette[0][0]), new Color(palette[0][1])];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
}

function addSymbol(parent, name, size, color) {
  try {
    const symbol = SFSymbol.named(name);
    symbol.applyFont(Font.systemFont(size));
    const image = parent.addImage(symbol.image);
    image.tintColor = color;
    image.imageSize = new Size(size, size);
    return image;
  } catch (e) {
    const fallback = parent.addText("●");
    fallback.font = Font.systemFont(size);
    fallback.textColor = color;
    return fallback;
  }
}

function addHeader(widget, accentHex, title, subtitle) {
  const accent = new Color(accentHex);
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const iconWrap = row.addStack();
  iconWrap.layoutHorizontally();
  iconWrap.centerAlignContent();
  iconWrap.backgroundColor = new Color(accentHex, 0.18);
  iconWrap.cornerRadius = 7;
  iconWrap.setPadding(4, 6, 4, 6);
  addSymbol(iconWrap, "waveform.path.ecg", 13, accent);

  row.addSpacer(8);
  const titles = row.addStack();
  titles.layoutVertically();
  const main = titles.addText(title);
  main.font = Font.boldSystemFont(13);
  main.textColor = C.text;
  if (subtitle) {
    titles.addSpacer(1);
    const sub = titles.addText(subtitle);
    sub.font = Font.systemFont(9);
    sub.textColor = C.dim;
  }
  row.addSpacer(null);
  const clock = row.addText(fmtUpdated(new Date()));
  clock.font = Font.mediumSystemFont(9);
  clock.textColor = C.muted;
  widget.addSpacer(8);
}

function addStatChip(parent, label, value, color) {
  const chip = parent.addStack();
  chip.layoutVertically();
  chip.backgroundColor = C.surface;
  chip.cornerRadius = 8;
  chip.setPadding(6, 8, 6, 8);
  const l = chip.addText(label);
  l.font = Font.systemFont(8);
  l.textColor = C.muted;
  chip.addSpacer(2);
  const v = chip.addText(value);
  v.font = Font.boldSystemFont(12);
  v.textColor = color || C.text;
  return chip;
}

function addQuakeRow(parent, quake, options) {
  const compact = options && options.compact;
  const showDepth = options && options.showDepth;
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = C.card;
  row.cornerRadius = 9;
  row.setPadding(compact ? 5 : 7, 8, compact ? 5 : 7, 8);
  row.url = quake.url;

  const badge = row.addStack();
  badge.layoutHorizontally();
  badge.centerAlignContent();
  badge.backgroundColor = magColor(quake.mag);
  badge.cornerRadius = 6;
  badge.setPadding(2, 6, 2, 6);
  const magText = badge.addText(fmtMag(quake.mag));
  magText.font = Font.boldSystemFont(compact ? 10 : 11);
  magText.textColor = new Color("#101014");

  row.addSpacer(8);
  const info = row.addStack();
  info.layoutVertically();
  const place = info.addText(truncateText(shortPlace(quake.place), compact ? 22 : 36));
  place.font = Font.mediumSystemFont(compact ? 10 : 11);
  place.textColor = C.text;
  info.addSpacer(2);
  const metaParts = [fmtRelative(quake.time), magLabel(quake.mag)];
  if (showDepth && quake.depth != null) metaParts.push(fmtDepth(quake.depth));
  if (quake.felt > 0) metaParts.push(quake.felt + " felt");
  if (quake.tsunami) metaParts.push("tsunami");
  const meta = info.addText(metaParts.join(" · "));
  meta.font = Font.systemFont(8);
  meta.textColor = C.muted;

  row.addSpacer(null);
  if (quake.alert) {
    const alertChip = row.addStack();
    alertChip.backgroundColor = new Color("#ff453a", 0.18);
    alertChip.cornerRadius = 5;
    alertChip.setPadding(2, 5, 2, 5);
    const alertText = alertChip.addText(quake.alert);
    alertText.font = Font.boldSystemFont(8);
    alertText.textColor = C.red;
  }
  return row;
}

function addEmptyCard(parent, message) {
  const card = parent.addStack();
  card.layoutVertically();
  card.backgroundColor = C.surface;
  card.cornerRadius = 10;
  card.setPadding(10, 10, 10, 10);
  const title = card.addText("Sin sismos listables");
  title.font = Font.mediumSystemFont(11);
  title.textColor = C.text;
  card.addSpacer(3);
  const body = card.addText(message);
  body.font = Font.systemFont(9);
  body.textColor = C.dim;
}

function addHistogram(parent, buckets) {
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const row = parent.addStack();
  row.layoutHorizontally();
  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i];
    const col = row.addStack();
    col.layoutVertically();
    col.backgroundColor = C.surface;
    col.cornerRadius = 8;
    col.setPadding(6, 6, 6, 6);
    const label = col.addText(bucket.key);
    label.font = Font.boldSystemFont(9);
    label.textColor = C.dim;
    col.addSpacer(4);
    const track = col.addStack();
    track.layoutHorizontally();
    track.backgroundColor = new Color("#ffffff", 0.06);
    track.cornerRadius = 3;
    track.size = new Size(0, 6);
    const fill = track.addStack();
    fill.backgroundColor = magColor(bucket.min === -Infinity ? 1 : bucket.min);
    fill.cornerRadius = 3;
    fill.size = new Size(0, 6);
    fill.addSpacer((bucket.count / maxCount) * 100);
    track.addSpacer(null);
    col.addSpacer(4);
    const count = col.addText(String(bucket.count));
    count.font = Font.boldSystemFont(11);
    count.textColor = C.text;
    if (i < buckets.length - 1) row.addSpacer(5);
  }
}

function addFooter(widget, stats, fromCache) {
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const source = row.addText(fromCache ? "USGS · caché" : "USGS · vivo");
  source.font = Font.systemFont(8);
  source.textColor = C.muted;
  row.addSpacer(null);
  const extra = row.addText(stats.total + " eventos");
  extra.font = Font.systemFont(8);
  extra.textColor = C.muted;
}

function buildSmallLayout(dayEvents, stats, palette) {
  const widget = new ListWidget();
  applyBackground(widget, palette);
  widget.setPadding(12, 12, 12, 12);
  widget.url = stats.strongest ? stats.strongest.url : CONFIG.mapUrl;
  addHeader(widget, palette[1], "Sismos 24h", stats.total + " eventos");

  const hero = widget.addStack();
  hero.layoutHorizontally();
  hero.centerAlignContent();
  const magBlock = hero.addStack();
  magBlock.layoutVertically();
  const magLabelText = magBlock.addText("Máx");
  magLabelText.font = Font.systemFont(8);
  magLabelText.textColor = C.muted;
  magBlock.addSpacer(2);
  const magValue = magBlock.addText(fmtMag(stats.maxMag));
  magValue.font = Font.boldSystemFont(28);
  magValue.textColor = magColor(stats.maxMag);
  hero.addSpacer(null);
  const side = hero.addStack();
  side.layoutVertically();
  addStatChip(side, "Sentidos", String(stats.felt), C.accent);
  side.addSpacer(6);
  addStatChip(side, "M≥4.5", String(stats.over45), stats.over45 > 0 ? C.orange : C.text);

  widget.addSpacer(8);
  const list = rankedList(dayEvents, CONFIG.smallCount);
  if (!list.length) {
    addEmptyCard(widget, "No hay sismos ≥ 2.5 en 24h");
  } else {
    for (let i = 0; i < list.length; i++) {
      addQuakeRow(widget, list[i], { compact: true });
      if (i < list.length - 1) widget.addSpacer(5);
    }
  }
  widget.addSpacer(null);
  addFooter(widget, stats, false);
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function buildMediumLayout(dayEvents, stats, palette, fromCache) {
  const widget = new ListWidget();
  applyBackground(widget, palette);
  widget.setPadding(14, 14, 12, 14);
  addHeader(widget, palette[1], "Pulso sísmico", "Últimas 24 horas · USGS");

  const chips = widget.addStack();
  chips.layoutHorizontally();
  addStatChip(chips, "Eventos", String(stats.total), C.text);
  chips.addSpacer(6);
  addStatChip(chips, "Máx", fmtMag(stats.maxMag), magColor(stats.maxMag));
  chips.addSpacer(6);
  addStatChip(chips, "Sentidos", String(stats.felt), C.accent);
  chips.addSpacer(6);
  addStatChip(chips, "Tsunami", String(stats.tsunami), stats.tsunami > 0 ? C.red : C.text);

  widget.addSpacer(8);
  const list = rankedList(dayEvents, CONFIG.mediumCount);
  if (!list.length) {
    addEmptyCard(widget, "La API no devolvió sismos ≥ 2.5");
  } else {
    for (let i = 0; i < list.length; i++) {
      addQuakeRow(widget, list[i], { compact: false, showDepth: true });
      if (i < list.length - 1) widget.addSpacer(5);
    }
  }
  widget.addSpacer(null);
  addFooter(widget, stats, fromCache);
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function buildLargeLayout(dayEvents, stats, palette, fromCache) {
  const widget = new ListWidget();
  applyBackground(widget, palette);
  widget.setPadding(16, 16, 14, 16);
  addHeader(widget, palette[1], "Pulso sísmico USGS", "24h globales · magnitud y alertas");

  const chips = widget.addStack();
  chips.layoutHorizontally();
  addStatChip(chips, "24h", String(stats.total), C.text);
  chips.addSpacer(6);
  addStatChip(chips, "Máx", fmtMag(stats.maxMag), magColor(stats.maxMag));
  chips.addSpacer(6);
  addStatChip(chips, "Media", stats.avgMag == null ? "—" : stats.avgMag.toFixed(1), C.accent);
  chips.addSpacer(6);
  addStatChip(chips, "Sentidos", String(stats.felt), C.green);
  chips.addSpacer(6);
  addStatChip(chips, "M≥4.5", String(stats.over45), stats.over45 > 0 ? C.orange : C.text);
  chips.addSpacer(6);
  addStatChip(chips, "Tsunami", String(stats.tsunami), stats.tsunami > 0 ? C.red : C.muted);

  widget.addSpacer(10);
  const histTitle = widget.addText("Distribución por magnitud");
  histTitle.font = Font.mediumSystemFont(10);
  histTitle.textColor = C.dim;
  widget.addSpacer(6);
  addHistogram(widget, stats.buckets);

  widget.addSpacer(10);
  const listTitle = widget.addText("Más potentes");
  listTitle.font = Font.mediumSystemFont(10);
  listTitle.textColor = C.dim;
  widget.addSpacer(6);
  const list = rankedList(dayEvents, CONFIG.largeCount);
  if (!list.length) {
    addEmptyCard(widget, "Sin sismos ≥ 2.5 en el feed de 24h");
  } else {
    for (let i = 0; i < list.length; i++) {
      addQuakeRow(widget, list[i], { compact: false, showDepth: true });
      if (i < list.length - 1) widget.addSpacer(5);
    }
  }

  if (stats.significant.length) {
    widget.addSpacer(10);
    const sigTitle = widget.addText("Significativos 7d · " + stats.significant.length);
    sigTitle.font = Font.mediumSystemFont(10);
    sigTitle.textColor = C.orange;
    widget.addSpacer(6);
    const sigSlice = rankedList(stats.significant, 3);
    for (let i = 0; i < sigSlice.length; i++) {
      addQuakeRow(widget, sigSlice[i], { compact: true, showDepth: true });
      if (i < sigSlice.length - 1) widget.addSpacer(5);
    }
  }

  widget.addSpacer(null);
  addFooter(widget, stats, fromCache);
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function createErrorWidget(message) {
  const widget = new ListWidget();
  const bg = new LinearGradient();
  bg.colors = [new Color("#1a1424"), new Color("#100c14")];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
  widget.setPadding(14, 14, 14, 14);
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const icon = row.addText("⚠️");
  icon.font = Font.systemFont(16);
  row.addSpacer(6);
  const title = row.addText("Pulso sísmico");
  title.font = Font.boldSystemFont(13);
  title.textColor = C.text;
  widget.addSpacer(6);
  const body = widget.addText(message || "Sin datos USGS");
  body.font = Font.systemFont(11);
  body.textColor = C.dim;
  widget.addSpacer(4);
  const hint = widget.addText("Toca para reintentar");
  hint.font = Font.systemFont(10);
  hint.textColor = C.muted;
  widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + 600000);
  return widget;
}

async function createWidget() {
  const palette = PALETTES[dailyHash() % PALETTES.length];
  const feed = await loadFeed();
  const stats = buildStats(feed.dayEvents, feed.significantEvents);
  const family = config.widgetFamily;
  if (family === "small") return buildSmallLayout(feed.dayEvents, stats, palette);
  if (family === "medium") return buildMediumLayout(feed.dayEvents, stats, palette, feed.fromCache);
  return buildLargeLayout(feed.dayEvents, stats, palette, feed.fromCache);
}

async function run() {
  try {
    const widget = await createWidget();
    if (config.runsInWidget) {
      Script.setWidget(widget);
    } else {
      Script.setWidget(widget);
      try {
        await widget.presentLarge();
      } catch (presentError) {}
    }
  } catch (e) {
    const errWidget = createErrorWidget(e && e.message ? e.message : "Error inesperado");
    Script.setWidget(errWidget);
    if (!config.runsInWidget) {
      try {
        await errWidget.presentMedium();
      } catch (presentError) {}
    }
  }
  Script.complete();
}

await run();
