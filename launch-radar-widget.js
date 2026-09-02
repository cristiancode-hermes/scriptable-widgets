const CONFIG = {
  upcomingUrl: "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=list",
  siteUrl: "https://spacelaunchnow.me/",
  requestTimeout: 12,
  refreshMinutes: 20,
  cacheMinutes: 20,
  cacheFile: "launch-radar-cache.json",
  smallCount: 1,
  mediumCount: 4,
  largeCount: 8,
};

const C = {
  bgTop: new Color("#070b16"),
  bgBottom: new Color("#12182c"),
  surface: new Color("#ffffff", 0.06),
  card: new Color("#ffffff", 0.05),
  accent: new Color("#7dd3fc"),
  green: new Color("#34d399"),
  gold: new Color("#fbbf24"),
  orange: new Color("#fb923c"),
  red: new Color("#f87171"),
  purple: new Color("#c4b5fd"),
  text: new Color("#eef2ff"),
  dim: new Color("#94a3b8"),
  muted: new Color("#64748b"),
};

const PALETTES = [
  [["#070b16", "#12182c"], "#7dd3fc"],
  [["#0b1020", "#1a1430"], "#c4b5fd"],
  [["#081410", "#12241c"], "#34d399"],
  [["#140c10", "#24141c"], "#fb923c"],
  [["#0c1018", "#182030"], "#60a5fa"],
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

function truncateText(text, maxChars) {
  if (!text) return "—";
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + "…";
}

function splitVehicleMission(name) {
  if (!name) return { vehicle: "—", mission: "—" };
  const parts = String(name).split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { vehicle: parts[0], mission: parts.slice(1).join(" | ") };
  }
  return { vehicle: parts[0] || "—", mission: parts[0] || "—" };
}

function shortPlace(location) {
  if (!location) return "—";
  const parts = String(location).split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 2] + ", " + parts[parts.length - 1];
  if (parts.length === 2) return parts[1];
  return parts[0];
}

function launchPage(launch) {
  if (launch && launch.slug) return CONFIG.siteUrl + "launch/" + launch.slug + "/";
  return CONFIG.siteUrl;
}

function statusHex(abbrev) {
  const key = String(abbrev || "").toLowerCase();
  if (key === "go" || key === "success") return "#34d399";
  if (key === "tbc") return "#fbbf24";
  if (key === "tbd") return "#64748b";
  if (key === "hold") return "#fb923c";
  if (key === "failure" || key === "partial failure") return "#f87171";
  if (key === "in flight") return "#7dd3fc";
  return "#94a3b8";
}

function statusColor(abbrev) {
  return new Color(statusHex(abbrev));
}

function statusLabel(abbrev) {
  const key = String(abbrev || "").toLowerCase();
  if (key === "go") return "Go";
  if (key === "tbc") return "TBC";
  if (key === "tbd") return "TBD";
  if (key === "hold") return "Hold";
  if (key === "in flight") return "Vuelo";
  if (key === "success") return "OK";
  if (key === "failure") return "Fallo";
  return abbrev || "—";
}

function fmtCountdown(iso) {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return "—";
  const diffMs = target - Date.now();
  const future = diffMs >= 0;
  const absMin = Math.floor(Math.abs(diffMs) / 60000);
  const prefix = future ? "T-" : "T+";
  if (absMin < 1) return prefix + "0m";
  if (absMin < 60) return prefix + absMin + "m";
  const hours = Math.floor(absMin / 60);
  const minutes = absMin % 60;
  if (hours < 48) return prefix + hours + "h " + minutes + "m";
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return prefix + days + "d " + remHours + "h";
}

function fmtNetClock(iso) {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    const weekday = date.toLocaleDateString("es-ES", { weekday: "short" });
    const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return weekday + " " + time;
  } catch (e) {
    return "—";
  }
}

function isSameLocalDay(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function isWithinDays(iso, days) {
  const stamp = new Date(iso).getTime();
  if (Number.isNaN(stamp)) return false;
  const diff = stamp - Date.now();
  return diff >= -86400000 && diff <= days * 86400000;
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
    const parsed = JSON.parse(fm.readString(path));
    if (!parsed || !Array.isArray(parsed.launches)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeCache(data) {
  try {
    const fm = FileManager.local();
    fm.writeString(cachePath(), JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

function readStaleCache() {
  try {
    const fm = FileManager.local();
    const path = cachePath();
    if (!fm.fileExists(path)) return null;
    const parsed = JSON.parse(fm.readString(path));
    if (!parsed || !Array.isArray(parsed.launches)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function normalizeLaunch(row) {
  const name = row && row.name ? String(row.name) : "";
  const split = splitVehicleMission(name);
  const status = row && row.status ? row.status : {};
  return {
    id: row && row.id ? String(row.id) : name,
    slug: row && row.slug ? String(row.slug) : "",
    name,
    vehicle: split.vehicle,
    mission: row && row.mission ? String(row.mission) : split.mission,
    missionType: row && row.mission_type ? String(row.mission_type) : "—",
    lsp: row && row.lsp_name ? String(row.lsp_name) : "—",
    pad: row && row.pad ? String(row.pad) : "—",
    location: row && row.location ? String(row.location) : "—",
    net: row && row.net ? String(row.net) : "",
    statusAbbrev: status && status.abbrev ? String(status.abbrev) : "",
    statusName: status && status.name ? String(status.name) : "",
  };
}

function parseLaunches(payload) {
  const rows = payload && Array.isArray(payload.results) ? payload.results : [];
  return rows.map(normalizeLaunch).filter((item) => item.net);
}

async function fetchJSON(url) {
  try {
    const req = new Request(url);
    req.timeoutInterval = CONFIG.requestTimeout;
    req.headers = {
      "User-Agent": "Scriptable-LaunchRadar/1.0",
      Accept: "application/json",
    };
    return await req.loadJSON();
  } catch (e) {
    return null;
  }
}

async function loadFeed() {
  const freshCache = readCache();
  if (freshCache) {
    return {
      launches: freshCache.launches,
      fetchedAt: freshCache.fetchedAt || Date.now(),
      catalogCount: freshCache.catalogCount || freshCache.launches.length,
      fromCache: true,
    };
  }
  const payload = await fetchJSON(CONFIG.upcomingUrl);
  const launches = parseLaunches(payload);
  if (launches.length) {
    const fetchedAt = Date.now();
    const catalogCount = payload && typeof payload.count === "number" ? payload.count : launches.length;
    writeCache({ launches, fetchedAt, catalogCount });
    return { launches, fetchedAt, catalogCount, fromCache: false };
  }
  const stale = readStaleCache();
  if (stale && stale.launches && stale.launches.length) {
    return {
      launches: stale.launches,
      fetchedAt: stale.fetchedAt || Date.now(),
      catalogCount: stale.catalogCount || stale.launches.length,
      fromCache: true,
    };
  }
  return { launches: [], fetchedAt: Date.now(), catalogCount: 0, fromCache: false };
}

function pickNext(launches) {
  if (!launches.length) return null;
  const now = Date.now();
  const upcoming = launches.find((item) => {
    const stamp = new Date(item.net).getTime();
    return !Number.isNaN(stamp) && stamp >= now - 2 * 3600000;
  });
  return upcoming || launches[0];
}

function buildStats(launches, catalogCount) {
  const agencies = {};
  const types = {};
  let today = 0;
  let week = 0;
  let go = 0;
  let tbc = 0;
  for (const item of launches) {
    if (isSameLocalDay(item.net)) today += 1;
    if (isWithinDays(item.net, 7)) week += 1;
    const key = String(item.statusAbbrev || "").toLowerCase();
    if (key === "go") go += 1;
    if (key === "tbc") tbc += 1;
    agencies[item.lsp] = (agencies[item.lsp] || 0) + 1;
    types[item.missionType] = (types[item.missionType] || 0) + 1;
  }
  const agencyList = Object.keys(agencies)
    .map((name) => ({ name, count: agencies[name] }))
    .sort((a, b) => b.count - a.count);
  const typeList = Object.keys(types)
    .map((name) => ({ name, count: types[name] }))
    .sort((a, b) => b.count - a.count);
  return {
    listed: launches.length,
    catalogCount,
    today,
    week,
    go,
    tbc,
    agencyList,
    typeList,
    next: pickNext(launches),
  };
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
    const fallback = parent.addText("🚀");
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
  addSymbol(iconWrap, "airplane.departure", 13, accent);
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

function addEmptyCard(widget, message) {
  const card = widget.addStack();
  card.layoutVertically();
  card.backgroundColor = C.card;
  card.cornerRadius = 10;
  card.setPadding(10, 12, 10, 12);
  const label = card.addText(message);
  label.font = Font.systemFont(11);
  label.textColor = C.dim;
}

function addStatusBadge(parent, launch) {
  const badge = parent.addStack();
  badge.layoutHorizontally();
  badge.centerAlignContent();
  const color = statusColor(launch.statusAbbrev);
  badge.backgroundColor = new Color(statusHex(launch.statusAbbrev), 0.16);
  badge.cornerRadius = 5;
  badge.setPadding(2, 6, 2, 6);
  const label = badge.addText(statusLabel(launch.statusAbbrev));
  label.font = Font.boldSystemFont(8);
  label.textColor = color;
  return badge;
}

function addNextCard(widget, launch, options) {
  const compact = options && options.compact;
  const card = widget.addStack();
  card.layoutVertically();
  card.backgroundColor = C.card;
  card.cornerRadius = 12;
  card.setPadding(compact ? 8 : 10, 10, compact ? 8 : 10, 10);
  card.url = launchPage(launch);
  const top = card.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  const kicker = top.addText("PRÓXIMO");
  kicker.font = Font.boldSystemFont(8);
  kicker.textColor = C.accent;
  top.addSpacer(null);
  addStatusBadge(top, launch);
  card.addSpacer(compact ? 4 : 6);
  const vehicle = card.addText(truncateText(launch.vehicle, compact ? 22 : 36));
  vehicle.font = Font.boldSystemFont(compact ? 13 : 15);
  vehicle.textColor = C.text;
  card.addSpacer(2);
  const mission = card.addText(truncateText(launch.mission, compact ? 28 : 48));
  mission.font = Font.systemFont(compact ? 10 : 11);
  mission.textColor = C.dim;
  card.addSpacer(compact ? 4 : 6);
  const meta = card.addStack();
  meta.layoutHorizontally();
  meta.centerAlignContent();
  const count = meta.addText(fmtCountdown(launch.net));
  count.font = Font.boldSystemFont(compact ? 12 : 14);
  count.textColor = C.gold;
  meta.addSpacer(8);
  const when = meta.addText(fmtNetClock(launch.net));
  when.font = Font.mediumSystemFont(9);
  when.textColor = C.muted;
  if (!compact) {
    card.addSpacer(4);
    const where = card.addText(truncateText(launch.lsp + " · " + shortPlace(launch.location), 42));
    where.font = Font.systemFont(9);
    where.textColor = C.dim;
  }
}

function addLaunchRow(widget, launch, options) {
  const compact = options && options.compact;
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = C.surface;
  row.cornerRadius = 8;
  row.setPadding(compact ? 5 : 7, 8, compact ? 5 : 7, 8);
  row.url = launchPage(launch);
  const left = row.addStack();
  left.layoutVertically();
  const title = left.addText(truncateText(launch.vehicle, compact ? 18 : 26));
  title.font = Font.boldSystemFont(compact ? 10 : 11);
  title.textColor = C.text;
  left.addSpacer(1);
  const sub = left.addText(truncateText(launch.mission, compact ? 22 : 34));
  sub.font = Font.systemFont(8);
  sub.textColor = C.dim;
  row.addSpacer(null);
  const right = row.addStack();
  right.layoutVertically();
  const count = right.addText(fmtCountdown(launch.net));
  count.font = Font.boldSystemFont(compact ? 9 : 10);
  count.textColor = C.gold;
  right.addSpacer(2);
  addStatusBadge(right, launch);
}

function addAgencyChips(widget, agencyList) {
  const row = widget.addStack();
  row.layoutHorizontally();
  const slice = agencyList.slice(0, 4);
  for (let i = 0; i < slice.length; i++) {
    const chip = row.addStack();
    chip.layoutHorizontally();
    chip.centerAlignContent();
    chip.backgroundColor = C.surface;
    chip.cornerRadius = 6;
    chip.setPadding(3, 6, 3, 6);
    const name = chip.addText(truncateText(slice[i].name, 12));
    name.font = Font.mediumSystemFont(8);
    name.textColor = C.text;
    chip.addSpacer(4);
    const count = chip.addText(String(slice[i].count));
    count.font = Font.boldSystemFont(8);
    count.textColor = C.accent;
    if (i < slice.length - 1) row.addSpacer(5);
  }
}

function addFooter(widget, stats, fromCache) {
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const src = row.addText("Launch Library 2");
  src.font = Font.systemFont(8);
  src.textColor = C.muted;
  row.addSpacer(null);
  const extra = fromCache ? "caché · " : "";
  const catalog = stats.catalogCount ? extra + stats.catalogCount + " en catálogo" : extra + "sin catálogo";
  const label = row.addText(catalog);
  label.font = Font.systemFont(8);
  label.textColor = C.muted;
}

function buildSmallLayout(launches, stats, palette) {
  const widget = new ListWidget();
  applyBackground(widget, palette);
  widget.setPadding(12, 12, 10, 12);
  const head = widget.addStack();
  head.layoutHorizontally();
  head.centerAlignContent();
  addSymbol(head, "airplane.departure", 12, new Color(palette[1]));
  head.addSpacer(6);
  const title = head.addText("Radar");
  title.font = Font.boldSystemFont(12);
  title.textColor = C.text;
  head.addSpacer(null);
  const clock = head.addText(fmtUpdated(new Date()));
  clock.font = Font.systemFont(8);
  clock.textColor = C.muted;
  widget.addSpacer(8);
  if (!stats.next) {
    addEmptyCard(widget, "Sin lanzamientos próximos");
  } else {
    addNextCard(widget, stats.next, { compact: true });
  }
  widget.addSpacer(null);
  const foot = widget.addStack();
  foot.layoutHorizontally();
  const today = foot.addText("Hoy " + stats.today);
  today.font = Font.mediumSystemFont(9);
  today.textColor = C.accent;
  foot.addSpacer(null);
  const go = foot.addText("Go " + stats.go);
  go.font = Font.mediumSystemFont(9);
  go.textColor = C.green;
  widget.url = stats.next ? launchPage(stats.next) : CONFIG.siteUrl;
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function buildMediumLayout(launches, stats, palette, fromCache) {
  const widget = new ListWidget();
  applyBackground(widget, palette);
  widget.setPadding(14, 14, 12, 14);
  addHeader(widget, palette[1], "Radar de lanzamientos", "Próximos despegues · T-0 y estado");
  const chips = widget.addStack();
  chips.layoutHorizontally();
  addStatChip(chips, "Hoy", String(stats.today), C.accent);
  chips.addSpacer(6);
  addStatChip(chips, "7d", String(stats.week), C.text);
  chips.addSpacer(6);
  addStatChip(chips, "Go", String(stats.go), C.green);
  chips.addSpacer(6);
  addStatChip(chips, "TBC", String(stats.tbc), C.gold);
  widget.addSpacer(8);
  if (!launches.length) {
    addEmptyCard(widget, "Sin datos de Launch Library");
  } else {
    const next = stats.next;
    if (next) addNextCard(widget, next, { compact: true });
    widget.addSpacer(6);
    const rest = launches.filter((item) => !next || item.id !== next.id).slice(0, CONFIG.mediumCount);
    for (let i = 0; i < rest.length; i++) {
      addLaunchRow(widget, rest[i], { compact: true });
      if (i < rest.length - 1) widget.addSpacer(4);
    }
  }
  widget.addSpacer(null);
  addFooter(widget, stats, fromCache);
  widget.url = stats.next ? launchPage(stats.next) : CONFIG.siteUrl;
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function buildLargeLayout(launches, stats, palette, fromCache) {
  const widget = new ListWidget();
  applyBackground(widget, palette);
  widget.setPadding(16, 16, 14, 16);
  addHeader(widget, palette[1], "Radar de lanzamientos", "Ventana T-0 · agencias y misiones");
  const chips = widget.addStack();
  chips.layoutHorizontally();
  addStatChip(chips, "Hoy", String(stats.today), C.accent);
  chips.addSpacer(6);
  addStatChip(chips, "7d", String(stats.week), C.text);
  chips.addSpacer(6);
  addStatChip(chips, "Go", String(stats.go), C.green);
  chips.addSpacer(6);
  addStatChip(chips, "TBC", String(stats.tbc), C.gold);
  chips.addSpacer(6);
  addStatChip(chips, "Lista", String(stats.listed), C.purple);
  widget.addSpacer(10);
  if (!launches.length) {
    addEmptyCard(widget, "Sin datos de Launch Library");
  } else {
    if (stats.next) {
      addNextCard(widget, stats.next, { compact: false });
      widget.addSpacer(10);
    }
    if (stats.agencyList.length) {
      const agTitle = widget.addText("Agencias en la lista");
      agTitle.font = Font.mediumSystemFont(10);
      agTitle.textColor = C.dim;
      widget.addSpacer(6);
      addAgencyChips(widget, stats.agencyList);
      widget.addSpacer(10);
    }
    const listTitle = widget.addText("Siguientes ventanas");
    listTitle.font = Font.mediumSystemFont(10);
    listTitle.textColor = C.dim;
    widget.addSpacer(6);
    const rest = launches.filter((item) => !stats.next || item.id !== stats.next.id).slice(0, CONFIG.largeCount);
    if (!rest.length) {
      addEmptyCard(widget, "Solo hay un lanzamiento en el feed");
    } else {
      for (let i = 0; i < rest.length; i++) {
        addLaunchRow(widget, rest[i], { compact: false });
        if (i < rest.length - 1) widget.addSpacer(5);
      }
    }
  }
  widget.addSpacer(null);
  addFooter(widget, stats, fromCache);
  widget.url = stats.next ? launchPage(stats.next) : CONFIG.siteUrl;
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function createErrorWidget(message) {
  const widget = new ListWidget();
  const bg = new LinearGradient();
  bg.colors = [new Color("#12182c"), new Color("#070b16")];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
  widget.setPadding(14, 14, 14, 14);
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const icon = row.addText("⚠️");
  icon.font = Font.systemFont(16);
  row.addSpacer(6);
  const title = row.addText("Radar de lanzamientos");
  title.font = Font.boldSystemFont(13);
  title.textColor = C.text;
  widget.addSpacer(6);
  const body = widget.addText(message || "Sin datos de Launch Library");
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
  const stats = buildStats(feed.launches, feed.catalogCount);
  const family = config.widgetFamily;
  if (family === "small") return buildSmallLayout(feed.launches, stats, palette);
  if (family === "medium") return buildMediumLayout(feed.launches, stats, palette, feed.fromCache);
  return buildLargeLayout(feed.launches, stats, palette, feed.fromCache);
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
