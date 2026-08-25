const STORE_FILE = "waiting-for-ledger.json";

const C = {
  bgTop: new Color("#0c1118"),
  bgBottom: new Color("#162033"),
  surface: new Color("#ffffff", 0.07),
  surfaceHot: new Color("#ff6b4a", 0.28),
  surfaceSoon: new Color("#3d8bfd", 0.22),
  text: new Color("#eef3fb"),
  textMuted: new Color("#93a0b8"),
  accent: new Color("#5eead4"),
  danger: new Color("#ff7a59"),
  warning: new Color("#f5c451"),
  success: new Color("#4ade80"),
  track: new Color("#243044"),
};

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
        if (parsed && Array.isArray(parsed.items)) return parsed;
      }
    } catch (error) {}
    return { items: [], notificationsEnabled: true };
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

function parseFollowUp(iso) {
  try {
    const parsed = new Date(iso);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function daysUntil(iso) {
  const target = parseFollowUp(iso);
  if (!target) return 0;
  const delta = startOfDay(target).getTime() - startOfDay(new Date()).getTime();
  return Math.round(delta / 86400000);
}

function dueLabel(iso) {
  const days = daysUntil(iso);
  if (days < 0) return "hace " + Math.abs(days) + "d";
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return "en " + days + "d";
}

function openItems(state) {
  return (state.items || []).filter((item) => item.status !== "done");
}

function doneItems(state) {
  return (state.items || []).filter((item) => item.status === "done");
}

function overdueItems(state) {
  return openItems(state).filter((item) => daysUntil(item.followUpAt) < 0);
}

function dueTodayItems(state) {
  return openItems(state).filter((item) => daysUntil(item.followUpAt) === 0);
}

function upcomingItems(state) {
  return openItems(state).filter((item) => daysUntil(item.followUpAt) > 0);
}

function sortedOpen(state) {
  return openItems(state).slice().sort((a, b) => {
    const da = parseFollowUp(a.followUpAt);
    const db = parseFollowUp(b.followUpAt);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return ta - tb;
  });
}

function nextFollowUp(state) {
  const list = sortedOpen(state);
  return list.length ? list[0] : null;
}

function itemLine(item) {
  const who = item.person ? " · " + item.person : "";
  return item.title + who + " · " + dueLabel(item.followUpAt);
}

async function scheduleFollowUpNotifications(state) {
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
  for (const item of openItems(state)) {
    const follow = parseFollowUp(item.followUpAt);
    if (!follow) continue;
    const trigger = new Date(follow.getFullYear(), follow.getMonth(), follow.getDate(), 9, 0, 0, 0);
    if (trigger.getTime() <= now.getTime()) continue;
    try {
      const notification = new Notification();
      notification.title = "⏳ Esperando: " + item.title;
      notification.body = item.person
        ? "Seguimiento con " + item.person + " · " + prettyDate(follow)
        : "Toca para revisar el ledger · " + prettyDate(follow);
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

function addProgressBar(parent, fraction) {
  const track = parent.addStack();
  track.backgroundColor = C.track;
  track.cornerRadius = 4;
  track.size = new Size(0, 6);
  const fill = track.addStack();
  fill.backgroundColor = C.accent;
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

function addItemRow(parent, item, compact) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = daysUntil(item.followUpAt) < 0 ? C.surfaceHot : C.surface;
  row.cornerRadius = 8;
  row.setPadding(6, 8, 6, 8);
  const mark = row.addText(daysUntil(item.followUpAt) < 0 ? "⚠️" : "⏳");
  mark.font = Font.systemFont(12);
  row.addSpacer(6);
  const col = row.addStack();
  col.layoutVertically();
  const title = col.addText(item.title);
  title.font = Font.mediumSystemFont(compact ? 11 : 13);
  title.textColor = C.text;
  title.lineLimit = 1;
  if (!compact && item.person) {
    const who = col.addText(item.person);
    who.font = Font.systemFont(10);
    who.textColor = C.textMuted;
    who.lineLimit = 1;
  }
  row.addSpacer(null);
  const due = row.addText(dueLabel(item.followUpAt));
  due.font = Font.mediumSystemFont(10);
  due.textColor = daysUntil(item.followUpAt) < 0 ? C.danger : C.accent;
}

function buildSmallWidget(state) {
  const widget = buildWidgetBase();
  widget.setPadding(12, 14, 12, 14);
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const brand = header.addText("WAITING");
  brand.font = Font.boldSystemFont(11);
  brand.textColor = C.accent;
  header.addSpacer(null);
  const openCount = header.addText(String(openItems(state).length));
  openCount.font = Font.boldSystemFont(16);
  openCount.textColor = C.text;
  widget.addSpacer(8);
  const overdue = overdueItems(state).length;
  const today = dueTodayItems(state).length;
  const chips = widget.addStack();
  chips.layoutHorizontally();
  addChip(chips, "⚠️ " + overdue, C.danger, C.surfaceHot);
  chips.addSpacer(6);
  addChip(chips, "📌 " + today, C.warning, C.surface);
  widget.addSpacer(10);
  const next = nextFollowUp(state);
  if (next) {
    const title = widget.addText(next.title);
    title.font = Font.mediumSystemFont(13);
    title.textColor = C.text;
    title.lineLimit = 2;
    widget.addSpacer(4);
    const meta = widget.addText((next.person ? next.person + " · " : "") + dueLabel(next.followUpAt));
    meta.font = Font.systemFont(11);
    meta.textColor = C.textMuted;
    meta.lineLimit = 1;
  } else {
    const empty = widget.addText("Nada en espera");
    empty.font = Font.systemFont(12);
    empty.textColor = C.textMuted;
  }
  return widget;
}

function buildMediumWidget(state) {
  const widget = buildWidgetBase();
  widget.setPadding(12, 14, 12, 14);
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const brand = header.addText("⏳ Waiting For");
  brand.font = Font.boldSystemFont(14);
  brand.textColor = C.text;
  header.addSpacer(null);
  addChip(header, overdueItems(state).length + " atrasados", C.danger, C.surfaceHot);
  header.addSpacer(6);
  addChip(header, dueTodayItems(state).length + " hoy", C.warning, C.surfaceSoon);
  widget.addSpacer(8);
  const list = sortedOpen(state).slice(0, 3);
  if (list.length === 0) {
    const empty = widget.addText("Sin pendientes de terceros. Añade el primero.");
    empty.font = Font.systemFont(12);
    empty.textColor = C.textMuted;
    empty.lineLimit = 2;
  } else {
    for (let i = 0; i < list.length; i++) {
      addItemRow(widget, list[i], true);
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
  const brand = header.addText("⏳ Waiting For Ledger");
  brand.font = Font.boldSystemFont(16);
  brand.textColor = C.text;
  header.addSpacer(null);
  const stamp = header.addText(prettyDate(new Date()));
  stamp.font = Font.systemFont(11);
  stamp.textColor = C.textMuted;
  widget.addSpacer(10);
  const stats = widget.addStack();
  stats.layoutHorizontally();
  const open = openItems(state).length;
  const done = doneItems(state).length;
  const total = Math.max(1, open + done);
  const cards = [
    { label: "Abiertos", value: String(open), color: C.accent },
    { label: "Atrasados", value: String(overdueItems(state).length), color: C.danger },
    { label: "Hoy", value: String(dueTodayItems(state).length), color: C.warning },
    { label: "Cerrados", value: String(done), color: C.success },
  ];
  for (let i = 0; i < cards.length; i++) {
    const card = stats.addStack();
    card.layoutVertically();
    card.backgroundColor = C.surface;
    card.cornerRadius = 10;
    card.setPadding(8, 10, 8, 10);
    const value = card.addText(cards[i].value);
    value.font = Font.boldSystemFont(18);
    value.textColor = cards[i].color;
    const label = card.addText(cards[i].label);
    label.font = Font.systemFont(9);
    label.textColor = C.textMuted;
    if (i < cards.length - 1) stats.addSpacer(6);
  }
  widget.addSpacer(10);
  addProgressBar(widget, done / total);
  widget.addSpacer(4);
  const pct = widget.addText(Math.round((done / total) * 100) + "% resuelto");
  pct.font = Font.systemFont(10);
  pct.textColor = C.textMuted;
  widget.addSpacer(10);
  const overdue = overdueItems(state).slice(0, 3);
  if (overdue.length) {
    const section = widget.addText("ATRASADOS");
    section.font = Font.boldSystemFont(10);
    section.textColor = C.danger;
    widget.addSpacer(6);
    for (let i = 0; i < overdue.length; i++) {
      addItemRow(widget, overdue[i], false);
      if (i < overdue.length - 1) widget.addSpacer(5);
    }
    widget.addSpacer(10);
  }
  const rest = sortedOpen(state).filter((item) => daysUntil(item.followUpAt) >= 0).slice(0, 5);
  const upcomingTitle = widget.addText(rest.length ? "PRÓXIMOS SEGUIMIENTOS" : "SIN ABIERTOS");
  upcomingTitle.font = Font.boldSystemFont(10);
  upcomingTitle.textColor = C.accent;
  widget.addSpacer(6);
  if (rest.length === 0 && overdue.length === 0) {
    const empty = widget.addText("Nadie te debe nada. Cuando delegues, anótalo aquí.");
    empty.font = Font.systemFont(12);
    empty.textColor = C.textMuted;
    empty.lineLimit = 2;
  } else {
    for (let i = 0; i < rest.length; i++) {
      addItemRow(widget, rest[i], false);
      if (i < rest.length - 1) widget.addSpacer(5);
    }
  }
  return widget;
}

function buildErrorWidget() {
  const widget = buildWidgetBase();
  const title = widget.addText("⚠️ Ledger Error");
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

async function presentOpenList(state) {
  const list = sortedOpen(state);
  const alert = new Alert();
  alert.title = "📋 En espera";
  if (list.length === 0) {
    alert.message = "No hay ítems abiertos.";
    alert.addCancelAction("Cerrar");
    await alert.present();
    return;
  }
  alert.message = list.map((item) => itemLine(item)).join("\n");
  alert.addCancelAction("Cerrar");
  await alert.present();
}

async function presentAddItem(state) {
  const input = new Alert();
  input.title = "➕ Nuevo waiting-for";
  input.message = "Qué esperas y de quién.";
  input.addTextField("Qué espero");
  input.addTextField("De quién (opcional)");
  input.addAction("Seguir");
  input.addCancelAction("Cancelar");
  const choice = await input.present();
  if (choice !== 0) return;
  const title = (input.textFieldValue(0) || "").trim();
  const person = (input.textFieldValue(1) || "").trim();
  if (!title) {
    const warn = new Alert();
    warn.title = "Título vacío";
    warn.message = "Escribe qué estás esperando.";
    warn.addCancelAction("OK");
    await warn.present();
    return;
  }
  const picker = new DatePicker();
  picker.mode = DatePicker.Mode.Date;
  const picked = await picker.pickTimeAndDate();
  if (!picked) return;
  const follow = new Date(picked.getFullYear(), picked.getMonth(), picked.getDate(), 9, 0, 0, 0);
  state.items.push({
    id: makeId(),
    title: title,
    person: person,
    createdAt: new Date().toISOString(),
    followUpAt: follow.toISOString(),
    status: "open",
    doneAt: null,
  });
  Store.save(state);
  await scheduleFollowUpNotifications(state);
}

async function presentMarkDone(state) {
  const list = sortedOpen(state);
  if (list.length === 0) {
    const empty = new Alert();
    empty.title = "Nada que cerrar";
    empty.message = "No hay ítems abiertos.";
    empty.addCancelAction("OK");
    await empty.present();
    return;
  }
  const alert = new Alert();
  alert.title = "✅ Marcar recibido";
  for (const item of list) {
    alert.addAction(itemLine(item));
  }
  alert.addCancelAction("Cancelar");
  const choice = await alert.presentSheet();
  if (choice < 0) return;
  list[choice].status = "done";
  list[choice].doneAt = new Date().toISOString();
  Store.save(state);
  await scheduleFollowUpNotifications(state);
}

async function presentReschedule(state) {
  const list = sortedOpen(state);
  if (list.length === 0) {
    const empty = new Alert();
    empty.title = "Nada que reprogramar";
    empty.message = "No hay ítems abiertos.";
    empty.addCancelAction("OK");
    await empty.present();
    return;
  }
  const alert = new Alert();
  alert.title = "📆 Reprogramar seguimiento";
  for (const item of list) {
    alert.addAction(itemLine(item));
  }
  alert.addCancelAction("Cancelar");
  const choice = await alert.presentSheet();
  if (choice < 0) return;
  const picker = new DatePicker();
  picker.mode = DatePicker.Mode.Date;
  const picked = await picker.pickTimeAndDate();
  if (!picked) return;
  const follow = new Date(picked.getFullYear(), picked.getMonth(), picked.getDate(), 9, 0, 0, 0);
  list[choice].followUpAt = follow.toISOString();
  Store.save(state);
  await scheduleFollowUpNotifications(state);
}

async function presentDeleteItem(state) {
  const list = sortedOpen(state);
  if (list.length === 0) {
    const empty = new Alert();
    empty.title = "Nada que borrar";
    empty.message = "No hay ítems abiertos.";
    empty.addCancelAction("OK");
    await empty.present();
    return;
  }
  const alert = new Alert();
  alert.title = "🗑️ Borrar ítem";
  for (const item of list) {
    alert.addAction(itemLine(item));
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
  state.items = state.items.filter((item) => item.id !== list[choice].id);
  Store.save(state);
  await scheduleFollowUpNotifications(state);
}

async function presentSummary(state) {
  const open = openItems(state);
  const overdue = overdueItems(state);
  const today = dueTodayItems(state);
  const upcoming = upcomingItems(state);
  const done = doneItems(state);
  const lines = [
    "Abiertos: " + open.length,
    "Atrasados: " + overdue.length,
    "Seguimiento hoy: " + today.length,
    "Próximos: " + upcoming.length,
    "Cerrados: " + done.length,
  ];
  if (overdue.length) {
    lines.push("");
    lines.push("Atrasados:");
    overdue.slice(0, 5).forEach((item) => lines.push("• " + itemLine(item)));
  }
  const alert = new Alert();
  alert.title = "📊 Resumen Waiting For";
  alert.message = lines.join("\n");
  alert.addCancelAction("Cerrar");
  await alert.present();
}

async function presentMainMenu(state) {
  const open = openItems(state).length;
  const overdue = overdueItems(state).length;
  const today = dueTodayItems(state).length;
  const alert = new Alert();
  alert.title = "⏳ Waiting For Ledger";
  alert.message = open + " abiertos · " + overdue + " atrasados · " + today + " hoy";
  alert.addAction("📋 Ver pendientes");
  alert.addAction("➕ Añadir waiting-for");
  alert.addAction("✅ Marcar recibido");
  alert.addAction("📆 Reprogramar seguimiento");
  alert.addAction("🗑️ Borrar ítem");
  alert.addAction("📊 Resumen");
  alert.addAction("🔔 Notificaciones: " + (state.notificationsEnabled ? "ON" : "OFF"));
  alert.addCancelAction("✖️ Cerrar");
  const choice = await alert.presentSheet();
  if (choice === 0) {
    await presentOpenList(state);
  } else if (choice === 1) {
    await presentAddItem(state);
  } else if (choice === 2) {
    await presentMarkDone(state);
  } else if (choice === 3) {
    await presentReschedule(state);
  } else if (choice === 4) {
    await presentDeleteItem(state);
  } else if (choice === 5) {
    await presentSummary(state);
  } else if (choice === 6) {
    state.notificationsEnabled = !state.notificationsEnabled;
    Store.save(state);
    await scheduleFollowUpNotifications(state);
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
