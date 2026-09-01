const STORE_FILE = "wip-kanban-board.json";
const DEFAULT_WIP_LIMIT = 3;
const MAX_WIP_LIMIT = 6;

const C = {
  bgTop: new Color("#0b1020"),
  bgBottom: new Color("#151c32"),
  surface: new Color("#ffffff", 0.07),
  surfaceDoing: new Color("#5b8cff", 0.22),
  surfaceHot: new Color("#ff7a59", 0.26),
  text: new Color("#eef3fb"),
  textMuted: new Color("#8f9bb8"),
  accent: new Color("#7dd3fc"),
  doing: new Color("#93c5fd"),
  danger: new Color("#ff7a59"),
  warning: new Color("#f5c451"),
  success: new Color("#4ade80"),
  track: new Color("#243044"),
};

const EFFORT = [
  { key: "S", label: "S · 15–30 min", icon: "▫️" },
  { key: "M", label: "M · 1–2 h", icon: "◻️" },
  { key: "L", label: "L · medio día+", icon: "◼" },
];

const Store = {
  _fm: null,

  get fm() {
    if (!this._fm) {
      try {
        if (typeof FileManager.iCloud === "function") {
          const cloud = FileManager.iCloud();
          if (cloud) this._fm = cloud;
        }
      } catch (error) {}
      if (!this._fm) this._fm = FileManager.local();
    }
    return this._fm;
  },

  get path() {
    return this.fm.joinPath(this.fm.documentsDirectory(), STORE_FILE);
  },

  load() {
    try {
      if (this.fm.fileExists(this.path)) {
        const parsed = JSON.parse(this.fm.readString(this.path));
        if (parsed && Array.isArray(parsed.cards)) {
          const limit = Number(parsed.wipLimit);
          parsed.wipLimit = Number.isFinite(limit)
            ? Math.min(MAX_WIP_LIMIT, Math.max(1, Math.round(limit)))
            : DEFAULT_WIP_LIMIT;
          if (typeof parsed.notificationsEnabled !== "boolean") {
            parsed.notificationsEnabled = true;
          }
          return parsed;
        }
      }
    } catch (error) {}
    return { cards: [], wipLimit: DEFAULT_WIP_LIMIT, notificationsEnabled: true };
  },

  save(data) {
    try {
      this.fm.writeString(this.path, JSON.stringify(data));
      return true;
    } catch (error) {
      return false;
    }
  },
};

function pad2(value) {
  return value < 10 ? "0" + value : String(value);
}

function dateKey(date) {
  return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function prettyDate(date) {
  const days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  return days[date.getDay()] + " " + pad2(date.getDate()) + "/" + pad2(date.getMonth() + 1);
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function parseIso(iso) {
  try {
    const parsed = new Date(iso);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function daysSince(iso) {
  const started = parseIso(iso);
  if (!started) return 0;
  const delta = startOfDay(new Date()).getTime() - startOfDay(started).getTime();
  return Math.max(0, Math.round(delta / 86400000));
}

function cardsInLane(state, lane) {
  return (state.cards || []).filter((card) => card.lane === lane);
}

function backlogCards(state) {
  return cardsInLane(state, "backlog");
}

function doingCards(state) {
  return cardsInLane(state, "doing");
}

function doneCards(state) {
  return cardsInLane(state, "done");
}

function doneTodayCards(state) {
  const today = dateKey(new Date());
  return doneCards(state).filter((card) => {
    const done = parseIso(card.doneAt);
    return done ? dateKey(done) === today : false;
  });
}

function throughputDays(state, days) {
  const cutoff = startOfDay(new Date());
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return doneCards(state).filter((card) => {
    const done = parseIso(card.doneAt);
    return done ? startOfDay(done).getTime() >= cutoff.getTime() : false;
  }).length;
}

function wipFraction(state) {
  const limit = Math.max(1, state.wipLimit || DEFAULT_WIP_LIMIT);
  return Math.min(1, doingCards(state).length / limit);
}

function effortIcon(key) {
  const found = EFFORT.find((item) => item.key === key);
  return found ? found.icon : "▫️";
}

function ageLabel(card) {
  if (card.lane !== "doing") return "";
  const days = daysSince(card.startedAt || card.createdAt);
  if (days <= 0) return "hoy";
  if (days === 1) return "1d";
  return days + "d";
}

function cardLine(card) {
  const laneMark = card.lane === "doing" ? "🚧" : card.lane === "done" ? "✅" : "📥";
  const age = card.lane === "doing" ? " · " + ageLabel(card) : "";
  return laneMark + " " + effortIcon(card.effort) + " " + card.title + age;
}

function sortedDoing(state) {
  return doingCards(state).slice().sort((a, b) => {
    const da = parseIso(a.startedAt);
    const db = parseIso(b.startedAt);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return ta - tb;
  });
}

function sortedBacklog(state) {
  return backlogCards(state).slice().sort((a, b) => {
    const da = parseIso(a.createdAt);
    const db = parseIso(b.createdAt);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return ta - tb;
  });
}

function staleDoing(state) {
  return doingCards(state).filter((card) => daysSince(card.startedAt || card.createdAt) >= 1);
}

async function scheduleWipNotifications(state) {
  try {
    const pending = await Notification.allPending();
    for (const notification of pending) {
      try {
        await Notification.removePending(notification.identifier);
      } catch (error) {}
    }
  } catch (error) {}
  if (!state.notificationsEnabled) return;
  const now = new Date();
  const tomorrowNine = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0, 0);
  const active = doingCards(state);
  if (active.length === 0) return;
  try {
    const digest = new Notification();
    digest.title = "🚧 WIP Kanban";
    const stale = staleDoing(state).length;
    digest.body = stale
      ? active.length + "/" + state.wipLimit + " en curso · " + stale + " llevan más de un día"
      : active.length + "/" + state.wipLimit + " en curso · revisa el tablero";
    digest.sound = "default";
    digest.scriptName = Script.name();
    digest.setTriggerDate(tomorrowNine);
    await digest.schedule();
  } catch (error) {}
  for (const card of active) {
    const started = parseIso(card.startedAt || card.createdAt);
    if (!started) continue;
    const trigger = new Date(started.getTime() + 24 * 60 * 60 * 1000);
    if (trigger.getTime() <= now.getTime()) continue;
    try {
      const notification = new Notification();
      notification.title = "⏳ Sigue en curso";
      notification.body = card.title + " · " + doingCards(state).length + "/" + state.wipLimit + " WIP";
      notification.sound = "default";
      notification.scriptName = Script.name();
      notification.setTriggerDate(trigger);
      await notification.schedule();
    } catch (error) {}
  }
}

function buildWidgetBase() {
  const widget = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [C.bgTop, C.bgBottom];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
  widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return widget;
}

function addProgressBar(parent, fraction, color) {
  const track = parent.addStack();
  track.backgroundColor = C.track;
  track.cornerRadius = 4;
  track.size = new Size(0, 6);
  const fill = track.addStack();
  fill.backgroundColor = color || C.accent;
  fill.cornerRadius = 4;
  fill.size = new Size(0, 6);
  fill.addSpacer(Math.max(1, fraction * 100));
  track.addSpacer(null);
}

function addChip(parent, label, color, bg) {
  const chip = parent.addStack();
  chip.layoutHorizontally();
  chip.centerAlignContent();
  chip.backgroundColor = bg;
  chip.cornerRadius = 6;
  chip.setPadding(3, 7, 3, 7);
  const text = chip.addText(label);
  text.font = Font.mediumSystemFont(10);
  text.textColor = color;
  return chip;
}

function addCardRow(parent, card, compact) {
  const stale = card.lane === "doing" && daysSince(card.startedAt || card.createdAt) >= 1;
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = stale ? C.surfaceHot : card.lane === "doing" ? C.surfaceDoing : C.surface;
  row.cornerRadius = 8;
  row.setPadding(6, 8, 6, 8);
  const mark = row.addText(stale ? "⚠️" : effortIcon(card.effort));
  mark.font = Font.systemFont(12);
  row.addSpacer(6);
  const col = row.addStack();
  col.layoutVertically();
  const title = col.addText(card.title);
  title.font = Font.mediumSystemFont(compact ? 11 : 13);
  title.textColor = C.text;
  title.lineLimit = 1;
  if (!compact) {
    const meta = col.addText((card.effort || "S") + " · " + ageLabel(card));
    meta.font = Font.systemFont(10);
    meta.textColor = C.textMuted;
    meta.lineLimit = 1;
  }
  row.addSpacer(null);
  if (card.lane === "doing") {
    const due = row.addText(ageLabel(card));
    due.font = Font.mediumSystemFont(10);
    due.textColor = stale ? C.danger : C.doing;
  }
}

function buildSmallWidget(state) {
  const widget = buildWidgetBase();
  widget.setPadding(12, 14, 12, 14);
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const brand = header.addText("WIP");
  brand.font = Font.boldSystemFont(11);
  brand.textColor = C.accent;
  header.addSpacer(null);
  const ratio = header.addText(doingCards(state).length + "/" + state.wipLimit);
  ratio.font = Font.boldSystemFont(16);
  ratio.textColor = doingCards(state).length >= state.wipLimit ? C.danger : C.text;
  widget.addSpacer(8);
  addProgressBar(widget, wipFraction(state), doingCards(state).length >= state.wipLimit ? C.danger : C.accent);
  widget.addSpacer(8);
  const chips = widget.addStack();
  chips.layoutHorizontally();
  addChip(chips, "📥 " + backlogCards(state).length, C.textMuted, C.surface);
  chips.addSpacer(6);
  addChip(chips, "✅ " + doneTodayCards(state).length, C.success, C.surface);
  widget.addSpacer(10);
  const current = sortedDoing(state)[0];
  if (current) {
    const title = widget.addText(current.title);
    title.font = Font.mediumSystemFont(13);
    title.textColor = C.text;
    title.lineLimit = 2;
    widget.addSpacer(4);
    const meta = widget.addText(effortIcon(current.effort) + " " + ageLabel(current));
    meta.font = Font.systemFont(11);
    meta.textColor = C.textMuted;
    meta.lineLimit = 1;
  } else {
    const empty = widget.addText(backlogCards(state).length ? "WIP libre · tira una tarjeta" : "Tablero vacío");
    empty.font = Font.systemFont(12);
    empty.textColor = C.textMuted;
    empty.lineLimit = 2;
  }
  return widget;
}

function buildMediumWidget(state) {
  const widget = buildWidgetBase();
  widget.setPadding(12, 14, 12, 14);
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const brand = header.addText("🚧 WIP Kanban");
  brand.font = Font.boldSystemFont(14);
  brand.textColor = C.text;
  header.addSpacer(null);
  addChip(header, doingCards(state).length + "/" + state.wipLimit, doingCards(state).length >= state.wipLimit ? C.danger : C.accent, C.surfaceDoing);
  header.addSpacer(6);
  addChip(header, "✅ " + doneTodayCards(state).length, C.success, C.surface);
  widget.addSpacer(8);
  addProgressBar(widget, wipFraction(state), doingCards(state).length >= state.wipLimit ? C.danger : C.accent);
  widget.addSpacer(8);
  const list = sortedDoing(state).slice(0, 3);
  if (list.length === 0) {
    const empty = widget.addText(
      backlogCards(state).length
        ? "Nada en curso. Hay " + backlogCards(state).length + " en backlog."
        : "Sin tarjetas. Abre el script y añade la primera."
    );
    empty.font = Font.systemFont(12);
    empty.textColor = C.textMuted;
    empty.lineLimit = 2;
  } else {
    for (let i = 0; i < list.length; i++) {
      addCardRow(widget, list[i], true);
      if (i < list.length - 1) widget.addSpacer(5);
    }
  }
  return widget;
}

function buildLargeWidget(state) {
  const widget = buildWidgetBase();
  widget.setPadding(14, 16, 14, 16);
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const brand = header.addText("🚧 WIP Kanban");
  brand.font = Font.boldSystemFont(16);
  brand.textColor = C.text;
  header.addSpacer(null);
  const stamp = header.addText(prettyDate(new Date()));
  stamp.font = Font.systemFont(11);
  stamp.textColor = C.textMuted;
  widget.addSpacer(10);
  const stats = widget.addStack();
  stats.layoutHorizontally();
  const cards = [
    { label: "Backlog", value: String(backlogCards(state).length), color: C.textMuted },
    { label: "En curso", value: doingCards(state).length + "/" + state.wipLimit, color: doingCards(state).length >= state.wipLimit ? C.danger : C.doing },
    { label: "Hoy", value: String(doneTodayCards(state).length), color: C.success },
    { label: "7d", value: String(throughputDays(state, 7)), color: C.accent },
  ];
  for (let i = 0; i < cards.length; i++) {
    const card = stats.addStack();
    card.layoutVertically();
    card.backgroundColor = C.surface;
    card.cornerRadius = 10;
    card.setPadding(8, 10, 8, 10);
    const value = card.addText(cards[i].value);
    value.font = Font.boldSystemFont(16);
    value.textColor = cards[i].color;
    const label = card.addText(cards[i].label);
    label.font = Font.systemFont(9);
    label.textColor = C.textMuted;
    if (i < cards.length - 1) stats.addSpacer(6);
  }
  widget.addSpacer(10);
  addProgressBar(widget, wipFraction(state), doingCards(state).length >= state.wipLimit ? C.danger : C.accent);
  widget.addSpacer(4);
  const pct = widget.addText(Math.round(wipFraction(state) * 100) + "% del límite WIP");
  pct.font = Font.systemFont(10);
  pct.textColor = C.textMuted;
  widget.addSpacer(10);
  const doingTitle = widget.addText("EN CURSO");
  doingTitle.font = Font.boldSystemFont(10);
  doingTitle.textColor = C.doing;
  widget.addSpacer(6);
  const doing = sortedDoing(state).slice(0, 4);
  if (doing.length === 0) {
    const empty = widget.addText("WIP libre. Tira una tarjeta del backlog para empezar.");
    empty.font = Font.systemFont(12);
    empty.textColor = C.textMuted;
    empty.lineLimit = 2;
  } else {
    for (let i = 0; i < doing.length; i++) {
      addCardRow(widget, doing[i], false);
      if (i < doing.length - 1) widget.addSpacer(5);
    }
  }
  widget.addSpacer(10);
  const backlogTitle = widget.addText("BACKLOG");
  backlogTitle.font = Font.boldSystemFont(10);
  backlogTitle.textColor = C.accent;
  widget.addSpacer(6);
  const backlog = sortedBacklog(state).slice(0, 4);
  if (backlog.length === 0) {
    const emptyBacklog = widget.addText("Backlog vacío. Captura la siguiente pieza de trabajo.");
    emptyBacklog.font = Font.systemFont(12);
    emptyBacklog.textColor = C.textMuted;
    emptyBacklog.lineLimit = 2;
  } else {
    for (let i = 0; i < backlog.length; i++) {
      addCardRow(widget, backlog[i], true);
      if (i < backlog.length - 1) widget.addSpacer(5);
    }
  }
  return widget;
}

function buildErrorWidget() {
  const widget = buildWidgetBase();
  const title = widget.addText("⚠️ WIP Error");
  title.font = Font.boldSystemFont(14);
  title.textColor = C.danger;
  widget.addSpacer(6);
  const hint = widget.addText("Toca para reabrir");
  hint.font = Font.systemFont(12);
  hint.textColor = C.textMuted;
  widget.refreshAfterDate = new Date(Date.now() + 10 * 60 * 1000);
  return widget;
}

async function runAsWidget() {
  const state = Store.load();
  const family = config.widgetFamily;
  let widget;
  if (family === "small") widget = buildSmallWidget(state);
  else if (family === "large") widget = buildLargeWidget(state);
  else widget = buildMediumWidget(state);
  Script.setWidget(widget);
}

async function presentBoard(state) {
  const alert = new Alert();
  alert.title = "📋 Tablero WIP";
  const doing = sortedDoing(state);
  const backlog = sortedBacklog(state);
  const lines = [];
  lines.push("Límite " + doing.length + "/" + state.wipLimit);
  lines.push("");
  lines.push("En curso:");
  if (doing.length === 0) lines.push("· (vacío)");
  else doing.forEach((card) => lines.push(cardLine(card)));
  lines.push("");
  lines.push("Backlog:");
  if (backlog.length === 0) lines.push("· (vacío)");
  else backlog.slice(0, 8).forEach((card) => lines.push(cardLine(card)));
  alert.message = lines.join("\n");
  alert.addCancelAction("Cerrar");
  await alert.present();
}

async function presentAddCard(state) {
  const input = new Alert();
  input.title = "➕ Nueva tarjeta";
  input.message = "Entra al backlog. Luego tira a Doing respetando el WIP.";
  input.addTextField("Qué hay que hacer");
  input.addAction("Seguir");
  input.addCancelAction("Cancelar");
  const choice = await input.present();
  if (choice !== 0) return;
  const title = (input.textFieldValue(0) || "").trim();
  if (!title) {
    const warn = new Alert();
    warn.title = "Título vacío";
    warn.message = "Escribe la pieza de trabajo.";
    warn.addCancelAction("OK");
    await warn.present();
    return;
  }
  const effortAlert = new Alert();
  effortAlert.title = "Esfuerzo";
  effortAlert.message = title;
  for (const item of EFFORT) {
    effortAlert.addAction(item.icon + " " + item.label);
  }
  effortAlert.addCancelAction("Cancelar");
  const effortChoice = await effortAlert.presentSheet();
  if (effortChoice < 0) return;
  state.cards.push({
    id: makeId(),
    title: title,
    effort: EFFORT[effortChoice].key,
    lane: "backlog",
    createdAt: new Date().toISOString(),
    startedAt: null,
    doneAt: null,
  });
  Store.save(state);
}

async function presentPullToDoing(state) {
  const list = sortedBacklog(state);
  if (list.length === 0) {
    const empty = new Alert();
    empty.title = "Backlog vacío";
    empty.message = "Añade una tarjeta antes de tirar a Doing.";
    empty.addCancelAction("OK");
    await empty.present();
    return;
  }
  if (doingCards(state).length >= state.wipLimit) {
    const warn = new Alert();
    warn.title = "WIP lleno";
    warn.message = "Hay " + doingCards(state).length + "/" + state.wipLimit + " en curso. Termina o devuelve una antes de tirar otra.";
    warn.addCancelAction("OK");
    await warn.present();
    return;
  }
  const alert = new Alert();
  alert.title = "🚧 Tirar a Doing";
  alert.message = "Hueco " + doingCards(state).length + "/" + state.wipLimit;
  for (const card of list) {
    alert.addAction(cardLine(card));
  }
  alert.addCancelAction("Cancelar");
  const choice = await alert.presentSheet();
  if (choice < 0) return;
  list[choice].lane = "doing";
  list[choice].startedAt = new Date().toISOString();
  list[choice].doneAt = null;
  Store.save(state);
  await scheduleWipNotifications(state);
}

async function presentCompleteCard(state) {
  const list = sortedDoing(state);
  if (list.length === 0) {
    const empty = new Alert();
    empty.title = "Nada en curso";
    empty.message = "No hay tarjetas en Doing.";
    empty.addCancelAction("OK");
    await empty.present();
    return;
  }
  const alert = new Alert();
  alert.title = "✅ Completar";
  for (const card of list) {
    alert.addAction(cardLine(card));
  }
  alert.addCancelAction("Cancelar");
  const choice = await alert.presentSheet();
  if (choice < 0) return;
  list[choice].lane = "done";
  list[choice].doneAt = new Date().toISOString();
  Store.save(state);
  await scheduleWipNotifications(state);
}

async function presentReturnToBacklog(state) {
  const list = sortedDoing(state);
  if (list.length === 0) {
    const empty = new Alert();
    empty.title = "Nada que devolver";
    empty.message = "No hay tarjetas en Doing.";
    empty.addCancelAction("OK");
    await empty.present();
    return;
  }
  const alert = new Alert();
  alert.title = "📥 Devolver a backlog";
  for (const card of list) {
    alert.addAction(cardLine(card));
  }
  alert.addCancelAction("Cancelar");
  const choice = await alert.presentSheet();
  if (choice < 0) return;
  list[choice].lane = "backlog";
  list[choice].startedAt = null;
  list[choice].doneAt = null;
  Store.save(state);
  await scheduleWipNotifications(state);
}

async function presentDeleteCard(state) {
  const list = sortedBacklog(state).concat(sortedDoing(state));
  if (list.length === 0) {
    const empty = new Alert();
    empty.title = "Nada que borrar";
    empty.message = "No hay tarjetas abiertas.";
    empty.addCancelAction("OK");
    await empty.present();
    return;
  }
  const alert = new Alert();
  alert.title = "🗑️ Borrar tarjeta";
  for (const card of list) {
    alert.addAction(cardLine(card));
  }
  alert.addCancelAction("Cancelar");
  const choice = await alert.presentSheet();
  if (choice < 0) return;
  const confirm = new Alert();
  confirm.title = "¿Borrar?";
  confirm.message = list[choice].title;
  confirm.addAction("Borrar");
  confirm.addCancelAction("Cancelar");
  if ((await confirm.present()) !== 0) return;
  state.cards = state.cards.filter((card) => card.id !== list[choice].id);
  Store.save(state);
  await scheduleWipNotifications(state);
}

async function presentWipLimit(state) {
  const alert = new Alert();
  alert.title = "Límite WIP";
  alert.message = "Ahora: " + state.wipLimit + ". Un límite bajo fuerza a terminar antes de empezar.";
  for (let n = 1; n <= MAX_WIP_LIMIT; n++) {
    alert.addAction(n === state.wipLimit ? "→ " + n : String(n));
  }
  alert.addCancelAction("Cancelar");
  const choice = await alert.presentSheet();
  if (choice < 0) return;
  const nextLimit = choice + 1;
  if (doingCards(state).length > nextLimit) {
    const warn = new Alert();
    warn.title = "Demasiadas en curso";
    warn.message = "Hay " + doingCards(state).length + " en Doing. Completa o devuelve hasta " + nextLimit + " antes de bajar el límite.";
    warn.addCancelAction("OK");
    await warn.present();
    return;
  }
  state.wipLimit = nextLimit;
  Store.save(state);
  await scheduleWipNotifications(state);
}

async function presentSummary(state) {
  const doing = doingCards(state);
  const stale = staleDoing(state);
  const lines = [
    "Backlog: " + backlogCards(state).length,
    "En curso: " + doing.length + "/" + state.wipLimit,
    "Estancadas (>1d): " + stale.length,
    "Hechas hoy: " + doneTodayCards(state).length,
    "Throughput 7d: " + throughputDays(state, 7),
    "Hechas total: " + doneCards(state).length,
  ];
  if (doing.length) {
    lines.push("");
    lines.push("En curso:");
    doing.forEach((card) => lines.push("• " + cardLine(card)));
  }
  const alert = new Alert();
  alert.title = "📊 Resumen WIP";
  alert.message = lines.join("\n");
  alert.addCancelAction("Cerrar");
  await alert.present();
}

async function presentMainMenu(state) {
  const doing = doingCards(state).length;
  const backlog = backlogCards(state).length;
  const stale = staleDoing(state).length;
  const alert = new Alert();
  alert.title = "🚧 WIP Kanban";
  alert.message = doing + "/" + state.wipLimit + " en curso · " + backlog + " backlog" + (stale ? " · " + stale + " estancadas" : "");
  alert.addAction("📋 Ver tablero");
  alert.addAction("➕ Añadir tarjeta");
  alert.addAction("🚧 Tirar a Doing");
  alert.addAction("✅ Completar");
  alert.addAction("📥 Devolver a backlog");
  alert.addAction("🗑️ Borrar tarjeta");
  alert.addAction("🎚️ Límite WIP: " + state.wipLimit);
  alert.addAction("📊 Resumen");
  alert.addAction("🔔 Notificaciones: " + (state.notificationsEnabled ? "ON" : "OFF"));
  alert.addCancelAction("✖️ Cerrar");
  const choice = await alert.presentSheet();
  if (choice === 0) {
    await presentBoard(state);
  } else if (choice === 1) {
    await presentAddCard(state);
  } else if (choice === 2) {
    await presentPullToDoing(state);
  } else if (choice === 3) {
    await presentCompleteCard(state);
  } else if (choice === 4) {
    await presentReturnToBacklog(state);
  } else if (choice === 5) {
    await presentDeleteCard(state);
  } else if (choice === 6) {
    await presentWipLimit(state);
  } else if (choice === 7) {
    await presentSummary(state);
  } else if (choice === 8) {
    state.notificationsEnabled = !state.notificationsEnabled;
    Store.save(state);
    await scheduleWipNotifications(state);
  } else {
    return false;
  }
  return true;
}

async function runAsUtility() {
  const state = Store.load();
  let keepOpen = true;
  while (keepOpen) {
    keepOpen = await presentMainMenu(state);
  }
}

try {
  if (config.runsInWidget) {
    await runAsWidget();
  } else {
    await runAsUtility();
  }
} catch (error) {
  if (config.runsInWidget) {
    try {
      Script.setWidget(buildErrorWidget());
    } catch (inner) {}
  } else {
    const alert = new Alert();
    alert.title = "Error";
    alert.message = error && error.message ? error.message : "Error inesperado";
    alert.addCancelAction("Cerrar");
    await alert.present();
  }
}
Script.complete();
