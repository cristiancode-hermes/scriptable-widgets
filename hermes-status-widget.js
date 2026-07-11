// Variables
const API_URL = "https://status.proyectos.cristiancode.dev/api/snapshot";
const BG_DARK = new Color("#0a0a0f");
const BG_SURFACE = new Color("#14141e");
const BG_SURFACE2 = new Color("#1c1c2a");
const ACCENT = new Color("#ffac02");
const ACCENT_DIM = new Color("#b87a00");
const GREEN = new Color("#22c55e");
const RED = new Color("#ef4444");
const BLUE = new Color("#3b82f6");
const YELLOW = new Color("#eab308");
const TEXT = new Color("#e2e2ea");
const TEXT_DIM = new Color("#8888a0");
const TEXT_MUTED = new Color("#55556a");
const BORDER = new Color("#ffffff", 0.06);

async function fetchData() {
  const req = new Request(API_URL);
  req.timeoutInterval = 8;
  return await req.loadJSON();
}

function fmtUptime(secs) {
  if (!secs) return "\u2014";
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  if (h > 48) return Math.floor(h/24) + "d " + (h%24) + "h";
  if (h > 0) return h + "h " + m + "m";
  return m + "m";
}

function statusDot(w, color) {
  const dot = w.addText("\u25CF");
  dot.font = Font.boldSystemFont(10);
  dot.textColor = color;
  return dot;
}

function addRow(w, label, value, valueColor) {
  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.addSpacer(4);
  const lbl = row.addText(label);
  lbl.font = Font.mediumSystemFont(10);
  lbl.textColor = TEXT_DIM;
  row.addSpacer(null);
  if (value !== undefined && value !== null) {
    const val = row.addText(String(value));
    val.font = Font.boldSystemFont(12);
    val.textColor = valueColor || TEXT;
  }
  row.addSpacer(4);
}

function addDivider(w) {
  const d = w.addStack();
  d.layoutHorizontally();
  d.addSpacer(4);
  const line = d.addText("\u2500".repeat(30));
  line.font = Font.regularSystemFont(6);
  line.textColor = BORDER;
  d.addSpacer(4);
}

function bar(w, label, pct, color) {
  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.addSpacer(4);
  const lbl = row.addText(label);
  lbl.font = Font.mediumSystemFont(9);
  lbl.textColor = TEXT_DIM;
  row.addSpacer(4);
  const barBg = row.addStack();
  barBg.layoutHorizontally();
  barBg.size = new Size(0, 6);
  barBg.cornerRadius = 3;
  barBg.backgroundColor = BG_SURFACE2;
  const barFill = barBg.addStack();
  barFill.size = new Size(0, 6);
  barFill.cornerRadius = 3;
  barFill.backgroundColor = color;
  barFill.addText(" ".repeat(Math.max(1, Math.floor(pct / 10))));
  barBg.addSpacer(1);
  const pctLbl = row.addText(Math.round(pct) + "%");
  pctLbl.font = Font.boldSystemFont(9);
  pctLbl.textColor = TEXT;
  row.addSpacer(4);
}

function buildSmall(data) {
  const w = new ListWidget();
  w.backgroundColor = BG_DARK;
  const top = w.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  top.addSpacer(4);
  const title = top.addText("\u26A1 Status");
  title.font = Font.boldSystemFont(11);
  title.textColor = ACCENT;
  top.addSpacer(null);
  const gw = data.gateway || {};
  statusDot(top, gw.state === "running" ? GREEN : RED);
  top.addSpacer(4);
  w.addSpacer(6);
  addRow(w, "Sessions", (data.sessions || []).length, ACCENT);
  w.addSpacer(2);
  addRow(w, "Agents", ((data.agent_tree || {}).roots || []).length, BLUE);
  w.addSpacer(2);
  const socats = data.socats || {};
  addRow(w, "Socats", socats.all_up !== false ? "OK" : "DOWN", socats.all_up !== false ? GREEN : RED);
  w.addSpacer(2);
  const sys = data.system || {};
  addRow(w, "Load", sys.load_1m != null ? String(sys.load_1m) : "\u2014", TEXT);
  w.addSpacer(null);
  const dt = data.datetime ? new Date(data.datetime) : new Date();
  const ts = w.addText(formatTime(dt));
  ts.font = Font.regularSystemFont(8);
  ts.textColor = TEXT_MUTED;
  ts.centerAlignText();
  return w;
}

function buildMedium(data) {
  const w = new ListWidget();
  w.backgroundColor = BG_DARK;
  const top = w.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  top.addSpacer(8);
  const title = top.addText("\u26A1 Hermes Status");
  title.font = Font.boldSystemFont(14);
  title.textColor = ACCENT;
  top.addSpacer(null);
  const gw = data.gateway || {};
  statusDot(top, gw.state === "running" ? GREEN : RED);
  const gwLabel = top.addText(" " + (gw.state || "?"));
  gwLabel.font = Font.mediumSystemFont(10);
  gwLabel.textColor = TEXT_DIM;
  top.addSpacer(8);
  w.addSpacer(4);
  addDivider(w);
  w.addSpacer(4);
  const cols = w.addStack();
  cols.layoutHorizontally();
  const left = cols.addStack();
  left.layoutVertically();
  addRow(left, "Sessions", (data.sessions || []).length, ACCENT);
  left.addSpacer(2);
  addRow(left, "Agents", ((data.agent_tree || {}).roots || []).length, BLUE);
  left.addSpacer(2);
  addRow(left, "Processes", (data.processes || []).length, TEXT);
  cols.addSpacer(8);
  const right = cols.addStack();
  right.layoutVertically();
  const socats = data.socats || {};
  addRow(right, "Socats", socats.all_up !== false ? "OK" : "DOWN", socats.all_up !== false ? GREEN : RED);
  right.addSpacer(2);
  const sys = data.system || {};
  addRow(right, "Load", sys.load_1m != null ? String(sys.load_1m) : "\u2014", TEXT);
  right.addSpacer(2);
  addRow(right, "Workers", (data.workers || []).length, TEXT);
  w.addSpacer(4);
  addDivider(w);
  w.addSpacer(4);
  const mem = sys.memory || {};
  if (mem.total_kb && mem.available_kb) {
    bar(w, "MEM", (1 - mem.available_kb / mem.total_kb) * 100, (1 - mem.available_kb / mem.total_kb) > 0.8 ? RED : GREEN);
  }
  w.addSpacer(4);
  const platforms = (data.gateway || {}).platforms || {};
  if (Object.keys(platforms).length > 0) {
    const platRow = w.addStack();
    platRow.layoutHorizontally();
    platRow.addSpacer(8);
    Object.entries(platforms).forEach(function(pair) {
      const name = pair[0], p = pair[1];
      const ok = p.state === "connected";
      const chip = platRow.addStack();
      chip.layoutHorizontally();
      chip.centerAlignContent();
      chip.backgroundColor = BG_SURFACE2;
      chip.cornerRadius = 4;
      chip.addSpacer(4);
      const d = statusDot(chip, ok ? GREEN : RED);
      d.font = Font.boldSystemFont(7);
      const lbl = chip.addText(" " + name);
      lbl.font = Font.mediumSystemFont(8);
      lbl.textColor = TEXT_DIM;
      chip.addSpacer(4);
      platRow.addSpacer(4);
    });
    platRow.addSpacer(8);
  }
  w.addSpacer(null);
  const dt = data.datetime ? new Date(data.datetime) : new Date();
  const ts = w.addText(formatTime(dt));
  ts.font = Font.regularSystemFont(8);
  ts.textColor = TEXT_MUTED;
  ts.centerAlignText();
  return w;
}

function buildLarge(data) {
  const w = new ListWidget();
  w.backgroundColor = BG_DARK;
  w.setPadding(12, 12, 8, 12);
  const top = w.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  const title = top.addText("\u26A1 Hermes Dashboard");
  title.font = Font.boldSystemFont(15);
  title.textColor = ACCENT;
  top.addSpacer(null);
  const gw = data.gateway || {};
  statusDot(top, gw.state === "running" ? GREEN : RED);
  top.addSpacer(4);
  w.addSpacer(6);
  addDivider(w);
  w.addSpacer(6);
  const kwic = w.addStack();
  kwic.layoutHorizontally();
  kwic.addSpacer(4);
  const sessions = data.sessions || [];
  const roots = (data.agent_tree || {}).roots || [];
  const procs = data.processes || [];
  const workers = data.workers || [];
  const socats = data.socats || {};
  const allUp = socats.all_up !== false;
  const sys = data.system || {};
  const cronFiles = data.cron_files || {};
  const metrics = [
    ["Sessions", sessions.length, ACCENT],
    ["Agents", roots.length, BLUE],
    ["Procs", procs.length, TEXT],
    ["Workers", workers.length, TEXT_DIM],
    ["Socats", allUp ? "OK" : "DOWN", allUp ? GREEN : RED],
    ["Cron", Object.keys(cronFiles).length, YELLOW],
  ];
  metrics.forEach(function(item, i) {
    const lbl = item[0], val = item[1], color = item[2];
    const m = kwic.addStack();
    m.layoutVertically();
    m.centerAlignContent();
    m.backgroundColor = BG_SURFACE;
    m.cornerRadius = 6;
    m.setPadding(6, 8, 6, 8);
    const v = m.addText(String(val));
    v.font = Font.boldSystemFont(16);
    v.textColor = color;
    v.centerAlignText();
    const l = m.addText(lbl);
    l.font = Font.mediumSystemFont(8);
    l.textColor = TEXT_MUTED;
    l.centerAlignText();
    if (i < metrics.length - 1) kwic.addSpacer(4);
  });
  kwic.addSpacer(4);
  w.addSpacer(8);
  const sysRow = w.addStack();
  sysRow.layoutHorizontally();
  sysRow.addSpacer(4);
  if (sys.load_1m != null) addRow(sysRow, "Load", String(sys.load_1m) + " / " + String(sys.load_5m || "?") + " / " + String(sys.load_15m || "?"), TEXT);
  sysRow.addSpacer(null);
  const mem = sys.memory || {};
  if (mem.total_kb && mem.available_kb) {
    const pct = Math.round((1 - mem.available_kb / mem.total_kb) * 100);
    addRow(sysRow, "MEM", pct + "%", pct > 80 ? RED : GREEN);
  }
  sysRow.addSpacer(4);
  w.addSpacer(2);
  const uptimeRow = w.addStack();
  uptimeRow.layoutHorizontally();
  uptimeRow.addSpacer(4);
  addRow(uptimeRow, "Uptime", fmtUptime(sys.uptime_seconds), TEXT);
  uptimeRow.addSpacer(null);
  addRow(uptimeRow, "Procs", String(sys.process_count || "?"), TEXT);
  uptimeRow.addSpacer(4);
  w.addSpacer(2);
  if (mem.total_kb && mem.available_kb) {
    bar(w, "MEM", (1 - mem.available_kb / mem.total_kb) * 100, (1 - mem.available_kb / mem.total_kb) > 0.8 ? RED : GREEN);
  }
  w.addSpacer(6);
  addDivider(w);
  w.addSpacer(6);
  if (sessions.length > 0) {
    const sessTitle = w.addText("Recent Sessions");
    sessTitle.font = Font.boldSystemFont(10);
    sessTitle.textColor = TEXT_MUTED;
    sessions.slice(0, 4).forEach(function(s, i) {
      const row = w.addStack();
      row.layoutHorizontally();
      row.addSpacer(4);
      const dot = row.addText("\u25CF");
      dot.font = Font.boldSystemFont(6);
      dot.textColor = GREEN;
      row.addSpacer(4);
      const stitle = row.addText(String(s.title || (s.id ? s.id.slice(0, 20) : "") || "Session").slice(0, 28));
      stitle.font = Font.mediumSystemFont(9);
      stitle.textColor = TEXT;
      stitle.lineLimit = 1;
      row.addSpacer(null);
      const src = row.addText(String(s.source || "?"));
      src.font = Font.regularSystemFont(8);
      src.textColor = TEXT_DIM;
      row.addSpacer(4);
      if (i < sessions.length - 1 && i < 3) w.addSpacer(1);
    });
  }
  const platforms = (data.gateway || {}).platforms || {};
  if (Object.keys(platforms).length > 0) {
    w.addSpacer(4);
    const platTitle = w.addText("Platforms");
    platTitle.font = Font.boldSystemFont(10);
    platTitle.textColor = TEXT_MUTED;
    const platRow = w.addStack();
    platRow.layoutHorizontally();
    platRow.addSpacer(4);
    Object.entries(platforms).forEach(function(pair) {
      const name = pair[0], p = pair[1];
      const ok = p.state === "connected";
      const chip = platRow.addStack();
      chip.layoutHorizontally();
      chip.centerAlignContent();
      chip.backgroundColor = BG_SURFACE2;
      chip.cornerRadius = 4;
      chip.setPadding(3, 6, 3, 6);
      statusDot(chip, ok ? GREEN : RED);
      const lbl = chip.addText(" " + name);
      lbl.font = Font.mediumSystemFont(9);
      lbl.textColor = ok ? TEXT : RED;
      platRow.addSpacer(4);
    });
    platRow.addSpacer(4);
  }
  w.addSpacer(null);
  const dt = data.datetime ? new Date(data.datetime) : new Date();
  const ts = w.addText(formatTime(dt));
  ts.font = Font.regularSystemFont(8);
  ts.textColor = TEXT_MUTED;
  ts.centerAlignText();
  return w;
}

function formatTime(d) {
  const pad = function(n) { return String(n).padStart(2, "0"); };
  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

// Main
try {
  const data = await fetchData();
  const size = config.widgetFamily || "medium";
  var widget;
  if (size === "small") widget = buildSmall(data);
  else if (size === "medium") widget = buildMedium(data);
  else widget = buildLarge(data);
  if (config.runsInWidget) {
    widget.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);
  }
  Script.setWidget(widget);
} catch (e) {
  const w = new ListWidget();
  w.backgroundColor = BG_DARK;
  w.setPadding(12, 12, 12, 12);
  const errTitle = w.addText("\u26A0\uFE0F Error");
  errTitle.font = Font.boldSystemFont(13);
  errTitle.textColor = RED;
  errTitle.centerAlignText();
  w.addSpacer(4);
  const errMsg = w.addText(e.message || "Connection failed");
  errMsg.font = Font.mediumSystemFont(10);
  errMsg.textColor = TEXT_DIM;
  errMsg.centerAlignText();
  w.addSpacer(4);
  const retry = w.addText("Tap to retry");
  retry.font = Font.regularSystemFont(9);
  retry.textColor = TEXT_MUTED;
  retry.centerAlignText();
  if (config.runsInWidget) {
    w.addSpacer(4);
    const refresh = w.addText("Refreshes every 5 min");
    refresh.font = Font.regularSystemFont(8);
    refresh.textColor = TEXT_MUTED;
    refresh.centerAlignText();
  }
  Script.setWidget(w);
}

Script.complete();
