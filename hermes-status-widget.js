// Variables used by Scriptable.
// These must be at the very top of the file; do not edit.
// icon-color: orange; icon-glyph: bolt;

// =============================================================================
// ⚡ HERMES STATUS WIDGET  —  Scriptable Widget para iOS / iPadOS
// =============================================================================
// Dashboard de estado del ecosistema Hermes + estado de los cron jobs diarios
// de proyectos full-stack (Diseñador, Default, Tester).
//
// ✅ Permisos iOS requeridos:
//   • Red → Datos móviles/WiFi (para consultar el API de estado)
//
// 📐 Configuración como widget:
//   1. Añadir widget → Elegir Scriptable → Seleccionar este script
//   2. Sin parámetros necesarios
//   3. Elegir tamaño: Small, Medium o Large
//   4. Se refresca automáticamente cada 5 minutos
//
// 📦 Secciones por tamaño:
//   Small  → Cron jobs (3 dots) + gateway status + sessions/agents
//   Medium → Cron jobs compacto + métricas + memoria + plataformas
//   Large  → Cron jobs detallado + métricas + sesiones + plataformas
//
// 🌐 API: https://status.proyectos.cristiancode.dev/api/snapshot
// =============================================================================

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ──────────────────────────────────────────────────────────────────────────────

const API_URL = "https://status.proyectos.cristiancode.dev/api/snapshot";

// IDs de los cron jobs de proyectos full-stack diarios
const CRON_JOB_IDS = {
  "a9bdc671b2d0": { label: "🎨 Designer",   subtitle: "design-specs-builder" },
  "7f1fcd8d8461": { label: "⚡ Default",    subtitle: "hermes-daily-builder" },
  "431fa662c3ff": { label: "🧪 Tester",     subtitle: "qa-tester-deployer"   },
};

const API_TIMEOUT = 10;     // segundos
const REFRESH_MINUTES = 5;  // minutos entre refrescos

// ──────────────────────────────────────────────────────────────────────────────
// PALETA DE COLORES
// ──────────────────────────────────────────────────────────────────────────────

const C = {
  bg:        new Color("#0a0a0f"),
  surface:   new Color("#14141e"),
  surface2:  new Color("#1c1c2a"),
  border:    new Color("#ffffff", 0.06),
  accent:    new Color("#ffac02"),
  accentDim: new Color("#b87a00"),
  green:     new Color("#22c55e"),
  greenDim:  new Color("#22c55e", 0.15),
  red:       new Color("#ef4444"),
  redDim:    new Color("#ef4444", 0.15),
  blue:      new Color("#3b82f6"),
  blueDim:   new Color("#3b82f6", 0.15),
  yellow:    new Color("#eab308"),
  yellowDim: new Color("#eab308", 0.15),
  text:      new Color("#e2e2ea"),
  textDim:   new Color("#8888a0"),
  textMuted: new Color("#55556a"),
  textUltra: new Color("#3a3a4a"),
  purple:    new Color("#a78bfa"),
  purpleDim: new Color("#a78bfa", 0.15),
};

// ──────────────────────────────────────────────────────────────────────────────
// FETCH: DATOS DEL API
// ──────────────────────────────────────────────────────────────────────────────

async function fetchStatusData() {
  const req = new Request(API_URL);
  req.timeoutInterval = API_TIMEOUT;
  return await req.loadJSON();
}

// ──────────────────────────────────────────────────────────────────────────────
// LÓGICA DE CRON JOBS
// ──────────────────────────────────────────────────────────────────────────────

function isTodayISO(isoString, timezoneOffset) {
  // Compara si una fecha ISO pertenece al día de HOY
  // timezoneOffset: "+02:00" para Madrid (opcional, extraído del string)
  if (!isoString) return false;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getDate() === now.getDate()
        && d.getMonth() === now.getMonth()
        && d.getFullYear() === now.getFullYear();
  } catch {
    return false;
  }
}

function determineJobStatus(job) {
  // Retorna: "done" (✅), "failed" (❌), "pending" (⏰), "paused" (⏸️)
  if (!job) return "pending";
  if (job.paused_at) return "paused";
  if (job.state === "paused") return "paused";
  if (job.last_status === "error") return "failed";
  if (job.last_status === "ok") {
    // Verificar si la última ejecución fue hoy
    if (isTodayISO(job.last_run_at)) return "done";
    return "pending"; // Última ejecución OK pero no hoy → pendiente de hoy
  }
  return "pending";
}

function getJobStatusProps(status) {
  switch (status) {
    case "done":    return { sym: "✅", color: C.green,  bgColor: C.greenDim,  label: "Completado" };
    case "failed":  return { sym: "❌", color: C.red,    bgColor: C.redDim,    label: "Falló" };
    case "paused":  return { sym: "⏸️", color: C.yellow, bgColor: C.yellowDim, label: "Pausado" };
    default:        return { sym: "⏰", color: C.textDim, bgColor: C.surface2,  label: "Pendiente" };
  }
}

function extractCronJobs(data) {
  const jobs = (data.cron_files || {}).jobs || [];
  const result = [];
  for (const [jobId, info] of Object.entries(CRON_JOB_IDS)) {
    const job = jobs.find(j => j.id === jobId);
    const status = determineJobStatus(job);
    const props = getJobStatusProps(status);
    result.push({
      id: jobId,
      label: info.label,
      subtitle: info.subtitle,
      status,
      props,
      lastRunAt: job?.last_run_at || null,
      nextRunAt: job?.next_run_at || null,
      lastError: job?.last_error || null,
      deliveryError: job?.last_delivery_error || null,
      profile: job?.profile || null,
    });
  }
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// UTILIDADES DE FORMATO
// ──────────────────────────────────────────────────────────────────────────────

function fmtTime(d) {
  const pad = n => String(n).padStart(2, "0");
  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

function fmtTimeShort(d) {
  const pad = n => String(n).padStart(2, "0");
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function fmtUptime(secs) {
  if (!secs) return "\u2014";
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  if (h > 48) return Math.floor(h/24) + "d " + (h%24) + "h";
  if (h > 0) return h + "h " + m + "m";
  return m + "m";
}

function fmtLastRun(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.slice(0, 10);
    const now = new Date();
    const isToday = d.getDate() === now.getDate()
      && d.getMonth() === now.getMonth()
      && d.getFullYear() === now.getFullYear();
    if (isToday) return "Hoy " + fmtTimeShort(d);
    const day = String(d.getDate()).padStart(2, "0");
    const mon = String(d.getMonth()+1).padStart(2, "0");
    return `${day}/${mon} ${fmtTimeShort(d)}`;
  } catch {
    return "?";
  }
}

function shorten(str, maxLen) {
  if (!str) return "";
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + "…";
}

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENTES DEL WIDGET
// ──────────────────────────────────────────────────────────────────────────────

function addStatusDot(stack, color) {
  const dot = stack.addText("\u25CF");
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
  lbl.textColor = C.textDim;
  row.addSpacer(null);
  if (value !== undefined && value !== null) {
    const val = row.addText(String(value));
    val.font = Font.boldSystemFont(12);
    val.textColor = valueColor || C.text;
  }
  row.addSpacer(4);
}

function addDivider(w) {
  const d = w.addStack();
  d.layoutHorizontally();
  d.addSpacer(4);
  const line = d.addText("\u2500".repeat(40));
  line.font = Font.regularSystemFont(6);
  line.textColor = C.border;
  d.addSpacer(4);
}

function addBar(w, label, pct, color) {
  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.addSpacer(4);
  const lbl = row.addText(label);
  lbl.font = Font.mediumSystemFont(9);
  lbl.textColor = C.textDim;
  row.addSpacer(4);
  const barBg = row.addStack();
  barBg.layoutHorizontally();
  barBg.size = new Size(0, 6);
  barBg.cornerRadius = 3;
  barBg.backgroundColor = C.surface2;
  const barFill = barBg.addStack();
  barFill.size = new Size(0, 6);
  barFill.cornerRadius = 3;
  barFill.backgroundColor = color;
  barFill.addText(" ".repeat(Math.max(1, Math.floor(pct / 10))));
  barBg.addSpacer(1);
  const pctLbl = row.addText(Math.round(pct) + "%");
  pctLbl.font = Font.boldSystemFont(9);
  pctLbl.textColor = C.text;
  row.addSpacer(4);
}

function addChipRow(parent, items) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.addSpacer(4);
  items.forEach((item, i) => {
    const chip = row.addStack();
    chip.layoutHorizontally();
    chip.centerAlignContent();
    chip.backgroundColor = item.bgColor || C.surface2;
    chip.cornerRadius = 4;
    chip.addSpacer(4);
    const d = chip.addText(item.text || "\u25CF");
    d.font = Font.systemFont(item.fontSize || 7);
    d.textColor = item.color || C.textDim;
    chip.addSpacer(4);
    if (i < items.length - 1) row.addSpacer(4);
  });
  row.addSpacer(4);
}

// ──────────────────────────────────────────────────────────────────────────────
// SECCIÓN: CRON JOBS (compartida por todos los tamaños)
// ──────────────────────────────────────────────────────────────────────────────

function buildCronRow(cronJobs) {
  // Retorna un widget Stack con los 3 cron jobs en fila
  // Se usa dentro del widget principal
  const outer = cronJobs; // Ya recibimos el array

  // Nota: Esta función construye filas para ser añadidas al widget.
  // Se llama desde cada build* y añade directamente las stacks al widget.
}

function addCronJobCard(parent, job) {
  // Añade una tarjeta individual de cron job al widget
  const card = parent.addStack();
  card.layoutHorizontally();
  card.centerAlignContent();
  card.backgroundColor = C.surface;
  card.cornerRadius = 8;
  card.setPadding(6, 8, 6, 8);

  // Indicador (emoji)
  const indicator = card.addText(job.props.sym);
  indicator.font = Font.systemFont(14);
  card.addSpacer(6);

  // Info
  const info = card.addStack();
  info.layoutVertically();

  const titleRow = info.addStack();
  titleRow.layoutHorizontally();
  titleRow.centerAlignContent();
  const title = titleRow.addText(job.label);
  title.font = Font.boldSystemFont(11);
  title.textColor = C.text;
  titleRow.addSpacer(4);

  // Subtítulo + hora
  const subRow = info.addStack();
  subRow.layoutHorizontally();
  subRow.centerAlignContent();
  const sub = subRow.addText(fmtLastRun(job.lastRunAt));
  sub.font = Font.systemFont(8);
  sub.textColor = C.textDim;
  subRow.addSpacer(4);
  if (job.profile) {
    const badge = subRow.addText(job.profile);
    badge.font = Font.systemFont(7);
    badge.textColor = C.textUltra;
  }

  card.addSpacer(null);

  // Estado
  const statusLabel = card.addText(job.props.label);
  statusLabel.font = Font.mediumSystemFont(8);
  statusLabel.textColor = job.props.color;

  return card;
}

// ──────────────────────────────────────────────────────────────────────────────
// BUILD: SMALL
// ──────────────────────────────────────────────────────────────────────────────

function buildSmall(data) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;

  const cronJobs = extractCronJobs(data);

  // ── Cabecera: Título + Gateway ──
  const top = w.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  top.addSpacer(4);
  const title = top.addText("\u26A1 Status");
  title.font = Font.boldSystemFont(11);
  title.textColor = C.accent;
  top.addSpacer(null);
  const gw = data.gateway || {};
  addStatusDot(top, gw.state === "running" ? C.green : C.red);
  top.addSpacer(4);

  w.addSpacer(6);

  // ── Cron Jobs compacto ──
  const cronRow = w.addStack();
  cronRow.layoutHorizontally();
  cronRow.addSpacer(4);
  cronJobs.forEach((job, i) => {
    const chip = cronRow.addStack();
    chip.layoutHorizontally();
    chip.centerAlignContent();
    chip.backgroundColor = job.props.bgColor;
    chip.cornerRadius = 6;
    chip.setPadding(4, 6, 4, 6);
    const sym = chip.addText(job.props.sym);
    sym.font = Font.systemFont(11);
    chip.addSpacer(4);
    const label = chip.addText(job.label.split(" ")[1]); // nombre corto
    label.font = Font.mediumSystemFont(8);
    label.textColor = job.props.color;
    if (i < cronJobs.length - 1) cronRow.addSpacer(3);
  });
  cronRow.addSpacer(4);

  w.addSpacer(6);

  // ── Métricas ──
  addRow(w, "Sessions", (data.sessions || []).length, C.accent);
  w.addSpacer(2);
  addRow(w, "Agents", ((data.agent_tree || {}).roots || []).length, C.blue);
  w.addSpacer(2);
  const socats = data.socats || {};
  addRow(w, "Socats", socats.all_up !== false ? "OK" : "DOWN", socats.all_up !== false ? C.green : C.red);
  w.addSpacer(2);
  const sys = data.system || {};
  addRow(w, "Load", sys.load_1m != null ? String(sys.load_1m) : "\u2014", C.text);

  w.addSpacer(null);

  // ── Timestamp ──
  const dt = data.datetime ? new Date(data.datetime) : new Date();
  const ts = w.addText(fmtTime(dt));
  ts.font = Font.regularSystemFont(8);
  ts.textColor = C.textMuted;
  ts.centerAlignText();

  return w;
}

// ──────────────────────────────────────────────────────────────────────────────
// BUILD: MEDIUM
// ──────────────────────────────────────────────────────────────────────────────

function buildMedium(data) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;

  const cronJobs = extractCronJobs(data);

  // ── Cabecera ──
  const top = w.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  top.addSpacer(8);
  const title = top.addText("\u26A1 Hermes Status");
  title.font = Font.boldSystemFont(14);
  title.textColor = C.accent;
  top.addSpacer(null);
  const gw = data.gateway || {};
  addStatusDot(top, gw.state === "running" ? C.green : C.red);
  const gwLabel = top.addText(" " + (gw.state || "?"));
  gwLabel.font = Font.mediumSystemFont(10);
  gwLabel.textColor = C.textDim;
  top.addSpacer(8);

  w.addSpacer(4);
  addDivider(w);
  w.addSpacer(4);

  // ── Cron Jobs destacado ──
  const cronHeader = w.addStack();
  cronHeader.layoutHorizontally();
  cronHeader.addSpacer(8);
  const chTitle = cronHeader.addText("📋 Proyectos del día");
  chTitle.font = Font.boldSystemFont(11);
  chTitle.textColor = C.textDim;
  cronHeader.addSpacer();
  const doneCount = cronJobs.filter(j => j.status === "done").length;
  const pendingCount = cronJobs.filter(j => j.status === "pending").length;
  const failedCount = cronJobs.filter(j => j.status === "failed").length;
  const chCount = cronHeader.addText(`✅${doneCount} ⏰${pendingCount} ❌${failedCount}`);
  chCount.font = Font.systemFont(9);
  chCount.textColor = C.textMuted;
  cronHeader.addSpacer(8);
  w.addSpacer(2);

  // Tarjetas de cron jobs
  cronJobs.forEach((job, i) => {
    addCronJobCard(w, job);
    if (i < cronJobs.length - 1) w.addSpacer(3);
  });

  w.addSpacer(6);
  addDivider(w);
  w.addSpacer(4);

  // ── Métricas en 2 columnas ──
  const cols = w.addStack();
  cols.layoutHorizontally();
  const left = cols.addStack();
  left.layoutVertically();
  addRow(left, "Sessions", (data.sessions || []).length, C.accent);
  left.addSpacer(2);
  addRow(left, "Agents", ((data.agent_tree || {}).roots || []).length, C.blue);
  left.addSpacer(2);
  addRow(left, "Processes", (data.processes || []).length, C.text);
  cols.addSpacer(8);
  const right = cols.addStack();
  right.layoutVertically();
  const socats = data.socats || {};
  addRow(right, "Socats", socats.all_up !== false ? "OK" : "DOWN", socats.all_up !== false ? C.green : C.red);
  right.addSpacer(2);
  const sys = data.system || {};
  addRow(right, "Load", sys.load_1m != null ? String(sys.load_1m) : "\u2014", C.text);
  right.addSpacer(2);
  addRow(right, "Workers", (data.workers || []).length, C.text);

  w.addSpacer(4);
  addDivider(w);
  w.addSpacer(4);

  // ── Memoria ──
  const mem = sys.memory || {};
  if (mem.total_kb && mem.available_kb) {
    const memPct = (1 - mem.available_kb / mem.total_kb) * 100;
    addBar(w, "MEM", memPct, memPct > 80 ? C.red : C.green);
  }

  w.addSpacer(4);

  // ── Plataformas ──
  const platforms = (data.gateway || {}).platforms || {};
  if (Object.keys(platforms).length > 0) {
    const platRow = w.addStack();
    platRow.layoutHorizontally();
    platRow.addSpacer(8);
    Object.entries(platforms).forEach(([name, p]) => {
      const ok = p.state === "connected";
      const chip = platRow.addStack();
      chip.layoutHorizontally();
      chip.centerAlignContent();
      chip.backgroundColor = C.surface2;
      chip.cornerRadius = 4;
      chip.addSpacer(4);
      const d = addStatusDot(chip, ok ? C.green : C.red);
      d.font = Font.boldSystemFont(7);
      const lbl = chip.addText(" " + name);
      lbl.font = Font.mediumSystemFont(8);
      lbl.textColor = C.textDim;
      chip.addSpacer(4);
      platRow.addSpacer(4);
    });
    platRow.addSpacer(8);
  }

  w.addSpacer(null);

  // ── Timestamp ──
  const dt = data.datetime ? new Date(data.datetime) : new Date();
  const ts = w.addText(fmtTime(dt));
  ts.font = Font.regularSystemFont(8);
  ts.textColor = C.textMuted;
  ts.centerAlignText();

  return w;
}

// ──────────────────────────────────────────────────────────────────────────────
// BUILD: LARGE
// ──────────────────────────────────────────────────────────────────────────────

function buildLarge(data) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(12, 12, 8, 12);

  const cronJobs = extractCronJobs(data);

  // ════════════════════════════════════════════════════════════
  // CABECERA
  // ════════════════════════════════════════════════════════════
  const top = w.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  const title = top.addText("\u26A1 Hermes Dashboard");
  title.font = Font.boldSystemFont(15);
  title.textColor = C.accent;
  top.addSpacer(null);
  const gw = data.gateway || {};
  addStatusDot(top, gw.state === "running" ? C.green : C.red);
  top.addSpacer(4);

  w.addSpacer(6);
  addDivider(w);
  w.addSpacer(6);

  // ════════════════════════════════════════════════════════════
  // SECCIÓN: PROYECTOS FULL-STACK (CRON JOBS)
  // ════════════════════════════════════════════════════════════
  const cronSection = w.addStack();
  cronSection.layoutHorizontally();
  cronSection.addSpacer(4);

  // Título de sección
  const secTitle = w.addStack();
  secTitle.layoutHorizontally();
  secTitle.addSpacer(4);
  const secIcon = secTitle.addText("📋");
  secIcon.font = Font.systemFont(12);
  secTitle.addSpacer(6);
  const secLabel = secTitle.addText("Proyectos Full-Stack del Día");
  secLabel.font = Font.boldSystemFont(12);
  secLabel.textColor = C.text;
  secTitle.addSpacer();
  const allDone = cronJobs.every(j => j.status === "done");
  const secBadge = secTitle.addText(allDone ? "✅ Todo OK" : "⏳ En progreso");
  secBadge.font = Font.boldSystemFont(9);
  secBadge.textColor = allDone ? C.green : C.yellow;
  secTitle.addSpacer(4);

  w.addSpacer(6);

  // Tarjetas de cron jobs (una por fila, con más detalle)
  cronJobs.forEach((job, i) => {
    const card = w.addStack();
    card.layoutHorizontally();
    card.centerAlignContent();
    card.backgroundColor = C.surface;
    card.cornerRadius = 10;
    card.setPadding(8, 10, 8, 10);

    // Barra de estado izquierda
    const bar = card.addStack();
    bar.size = new Size(4, 32);
    bar.cornerRadius = 2;
    bar.backgroundColor = job.props.color;

    card.addSpacer(10);

    // Indicador grande
    const indicator = card.addText(job.props.sym);
    indicator.font = Font.systemFont(22);
    card.addSpacer(8);

    // Info principal
    const info = card.addStack();
    info.layoutVertically();

    const labelRow = info.addStack();
    labelRow.layoutHorizontally();
    labelRow.centerAlignContent();
    const jobLabel = labelRow.addText(job.label);
    jobLabel.font = Font.boldSystemFont(13);
    jobLabel.textColor = C.text;
    labelRow.addSpacer(6);

    // Badge de perfil (si existe)
    if (job.profile) {
      const profileBadge = labelRow.addStack();
      profileBadge.layoutHorizontally();
      profileBadge.centerAlignContent();
      profileBadge.backgroundColor = C.surface2;
      profileBadge.cornerRadius = 3;
      profileBadge.setPadding(1, 4, 1, 4);
      const pLabel = profileBadge.addText(job.profile);
      pLabel.font = Font.systemFont(7);
      pLabel.textColor = C.textMuted;
    }

    card.addSpacer(4);

    // Info adicional
    const metaRow = info.addStack();
    metaRow.layoutHorizontally();
    metaRow.centerAlignContent();

    const runTime = metaRow.addText(fmtLastRun(job.lastRunAt));
    runTime.font = Font.systemFont(9);
    runTime.textColor = C.textDim;

    metaRow.addSpacer(6);

    // Estado con color
    const statusBadge = metaRow.addStack();
    statusBadge.layoutHorizontally();
    statusBadge.centerAlignContent();
    statusBadge.backgroundColor = job.props.bgColor;
    statusBadge.cornerRadius = 4;
    statusBadge.setPadding(1, 5, 1, 5);
    const sLabel = statusBadge.addText(job.props.label);
    sLabel.font = Font.boldSystemFont(8);
    sLabel.textColor = job.props.color;

    // Si falló, mostrar error
    if (job.status === "failed" && job.lastError) {
      card.addSpacer(4);
      const errBadge = card.addStack();
      errBadge.layoutHorizontally();
      errBadge.centerAlignContent();
      errBadge.backgroundColor = C.redDim;
      errBadge.cornerRadius = 3;
      errBadge.setPadding(1, 4, 1, 4);
      const eLabel = errBadge.addText(shorten(job.lastError, 25));
      eLabel.font = Font.systemFont(7);
      eLabel.textColor = C.red;
    }

    card.addSpacer(4);

    if (i < cronJobs.length - 1) w.addSpacer(4);
  });

  w.addSpacer(8);
  addDivider(w);
  w.addSpacer(6);

  // ════════════════════════════════════════════════════════════
  // KPI METRICS (métricas rápidas)
  // ════════════════════════════════════════════════════════════
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

  const metrics = [
    ["Sessions", sessions.length, C.accent],
    ["Agents", roots.length, C.blue],
    ["Procs", procs.length, C.text],
    ["Workers", workers.length, C.textDim],
    ["Socats", allUp ? "OK" : "DOWN", allUp ? C.green : C.red],
  ];
  metrics.forEach((item, i) => {
    const [lbl, val, color] = item;
    const m = kwic.addStack();
    m.layoutVertically();
    m.centerAlignContent();
    m.backgroundColor = C.surface;
    m.cornerRadius = 6;
    m.setPadding(6, 8, 6, 8);
    const v = m.addText(String(val));
    v.font = Font.boldSystemFont(16);
    v.textColor = color;
    v.centerAlignText();
    const l = m.addText(lbl);
    l.font = Font.mediumSystemFont(8);
    l.textColor = C.textMuted;
    l.centerAlignText();
    if (i < metrics.length - 1) kwic.addSpacer(4);
  });
  kwic.addSpacer(4);

  w.addSpacer(6);

  // ════════════════════════════════════════════════════════════
  // SISTEMA
  // ════════════════════════════════════════════════════════════
  const sysRow = w.addStack();
  sysRow.layoutHorizontally();
  sysRow.addSpacer(4);
  if (sys.load_1m != null) {
    addRow(sysRow, "Load",
      `${String(sys.load_1m)} / ${String(sys.load_5m || "?")} / ${String(sys.load_15m || "?")}`,
      C.text
    );
  }
  sysRow.addSpacer(null);
  const mem = sys.memory || {};
  if (mem.total_kb && mem.available_kb) {
    const pct = Math.round((1 - mem.available_kb / mem.total_kb) * 100);
    addRow(sysRow, "MEM", pct + "%", pct > 80 ? C.red : C.green);
  }
  sysRow.addSpacer(4);

  w.addSpacer(2);

  const uptimeRow = w.addStack();
  uptimeRow.layoutHorizontally();
  uptimeRow.addSpacer(4);
  addRow(uptimeRow, "Uptime", fmtUptime(sys.uptime_seconds), C.text);
  uptimeRow.addSpacer(null);
  addRow(uptimeRow, "Procs", String(sys.process_count || "?"), C.text);
  uptimeRow.addSpacer(4);

  w.addSpacer(2);
  if (mem.total_kb && mem.available_kb) {
    const memPct = (1 - mem.available_kb / mem.total_kb) * 100;
    addBar(w, "MEM", memPct, memPct > 80 ? C.red : C.green);
  }

  w.addSpacer(6);
  addDivider(w);
  w.addSpacer(6);

  // ════════════════════════════════════════════════════════════
  // SESIONES RECIENTES
  // ════════════════════════════════════════════════════════════
  if (sessions.length > 0) {
    const sessTitle = w.addText("Recent Sessions");
    sessTitle.font = Font.boldSystemFont(10);
    sessTitle.textColor = C.textMuted;
    sessions.slice(0, 4).forEach((s, i) => {
      const row = w.addStack();
      row.layoutHorizontally();
      row.addSpacer(4);
      const dot = row.addText("\u25CF");
      dot.font = Font.boldSystemFont(6);
      dot.textColor = C.green;
      row.addSpacer(4);
      const stitle = row.addText(
        shorten(String(s.title || (s.id ? s.id.slice(0, 20) : "") || "Session"), 28)
      );
      stitle.font = Font.mediumSystemFont(9);
      stitle.textColor = C.text;
      stitle.lineLimit = 1;
      row.addSpacer(null);
      const src = row.addText(String(s.source || "?"));
      src.font = Font.regularSystemFont(8);
      src.textColor = C.textDim;
      row.addSpacer(4);
      if (i < sessions.length - 1 && i < 3) w.addSpacer(1);
    });
  }

  // ════════════════════════════════════════════════════════════
  // PLATAFORMAS
  // ════════════════════════════════════════════════════════════
  const platforms = (data.gateway || {}).platforms || {};
  if (Object.keys(platforms).length > 0) {
    w.addSpacer(4);
    const platTitle = w.addText("Platforms");
    platTitle.font = Font.boldSystemFont(10);
    platTitle.textColor = C.textMuted;
    const platRow = w.addStack();
    platRow.layoutHorizontally();
    platRow.addSpacer(4);
    Object.entries(platforms).forEach(([name, p]) => {
      const ok = p.state === "connected";
      const chip = platRow.addStack();
      chip.layoutHorizontally();
      chip.centerAlignContent();
      chip.backgroundColor = C.surface2;
      chip.cornerRadius = 4;
      chip.setPadding(3, 6, 3, 6);
      addStatusDot(chip, ok ? C.green : C.red);
      const lbl = chip.addText(" " + name);
      lbl.font = Font.mediumSystemFont(9);
      lbl.textColor = ok ? C.text : C.red;
      platRow.addSpacer(4);
    });
    platRow.addSpacer(4);
  }

  w.addSpacer(null);

  // ════════════════════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════════════════════
  const dt = data.datetime ? new Date(data.datetime) : new Date();

  const footer = w.addStack();
  footer.layoutHorizontally();
  footer.addSpacer(4);
  const statusDot = footer.addText("\u25CF");
  statusDot.font = Font.boldSystemFont(6);
  statusDot.textColor = gw.state === "running" ? C.green : C.red;

  footer.addSpacer(4);
  const fLabel = footer.addText(gw.state || "unknown");
  fLabel.font = Font.regularSystemFont(8);
  fLabel.textColor = C.textDim;

  footer.addSpacer(null);

  const ts = footer.addText(fmtTime(dt));
  ts.font = Font.regularSystemFont(8);
  ts.textColor = C.textMuted;
  footer.addSpacer(4);

  return w;
}

// ──────────────────────────────────────────────────────────────────────────────
// WIDGET DE ERROR (FALLBACK)
// ──────────────────────────────────────────────────────────────────────────────

function buildErrorWidget(e) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(12, 12, 12, 12);
  const errTitle = w.addText("\u26A0\uFE0F Error");
  errTitle.font = Font.boldSystemFont(13);
  errTitle.textColor = C.red;
  errTitle.centerAlignText();
  w.addSpacer(4);
  const errMsg = w.addText(e.message || "Connection failed");
  errMsg.font = Font.mediumSystemFont(10);
  errMsg.textColor = C.textDim;
  errMsg.centerAlignText();
  w.addSpacer(4);
  const retry = w.addText("Tap to retry");
  retry.font = Font.regularSystemFont(9);
  retry.textColor = C.textMuted;
  retry.centerAlignText();
  if (config.runsInWidget) {
    w.addSpacer(4);
    const refresh = w.addText("Refreshes every 5 min");
    refresh.font = Font.regularSystemFont(8);
    refresh.textColor = C.textMuted;
    refresh.centerAlignText();
  }
  return w;
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

try {
  const data = await fetchStatusData();
  const size = config.widgetFamily || "medium";

  var widget;
  if (size === "small") widget = buildSmall(data);
  else if (size === "medium") widget = buildMedium(data);
  else widget = buildLarge(data);

  if (config.runsInWidget) {
    widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);
  }

  Script.setWidget(widget);
} catch (e) {
  console.error("Hermes Status Widget error: " + (e.message || e));
  const errWidget = buildErrorWidget(e);
  if (config.runsInWidget) {
    errWidget.refreshAfterDate = new Date(Date.now() + 2 * 60 * 1000);
  }
  Script.setWidget(errWidget);
}

Script.complete();
