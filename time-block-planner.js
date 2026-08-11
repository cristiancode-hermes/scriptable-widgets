const STORE_FILE = "time-block-planner.json";

const CATEGORIES = [
  { key: "trabajo", label: "Trabajo", icon: "💼" },
  { key: "estudio", label: "Estudio", icon: "📚" },
  { key: "salud", label: "Salud", icon: "🏃" },
  { key: "personal", label: "Personal", icon: "🏠" },
  { key: "creativo", label: "Creativo", icon: "🎨" },
  { key: "reuniones", label: "Reuniones", icon: "📞" },
];

const C = {
  bgTop: new Color("#0f0e1a"),
  bgBottom: new Color("#1c1930"),
  surface: new Color("#ffffff", 0.07),
  surfaceActive: new Color("#5b4bd6", 0.35),
  text: new Color("#f2f0ff"),
  textMuted: new Color("#a9a4c9"),
  accent: new Color("#8b7cf6"),
  success: new Color("#4cd964"),
  warning: new Color("#ffcc00"),
  track: new Color("#2c2a3d"),
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
        if (parsed && parsed.plans) return parsed;
      }
    } catch (error) {}
    return { plans: {}, notificationsEnabled: true };
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

function minutesToLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return pad2(hours) + ":" + pad2(mins);
}

function formatDuration(minutes) {
  if (minutes < 60) return minutes + "m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? hours + "h " + mins + "m" : hours + "h";
}

function dateKey(date) {
  return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
}

function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function prettyDate() {
  const now = new Date();
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return days[now.getDay()] + " " + now.getDate() + " " + months[now.getMonth()];
}

function shortDayLabel(date) {
  const days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  return days[date.getDay()] + " " + pad2(date.getDate()) + "/" + pad2(date.getMonth() + 1);
}

function categoryOf(key) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[0];
}

function totalMinutes(blocks) {
  return blocks.reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0);
}

function completedMinutes(blocks) {
  return blocks.filter(b => b.completed).reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0);
}

function dayProgress(blocks) {
  const total = totalMinutes(blocks);
  if (total <= 0) return 0;
  return completedMinutes(blocks) / total;
}

function currentBlock(blocks, now) {
  return blocks.find(b => now >= b.startMinutes && now < b.endMinutes) || null;
}

function nextBlock(blocks, now) {
  return blocks.find(b => !b.completed && b.startMinutes >= now) || null;
}

async function scheduleBlockNotifications(state) {
  try {
    const pending = await Notification.allPending();
    for (const notification of pending) {
      try {
        await Notification.removePending(notification.identifier);
      } catch (error) {}
    }
  } catch (error) {}
  if (!state.notificationsEnabled) return;
  const key = dateKey(new Date());
  const blocks = state.plans[key] || [];
  const now = nowMinutes();
  for (const block of blocks) {
    if (block.completed || block.startMinutes <= now) continue;
    try {
      const notification = new Notification();
      notification.title = "⏰ " + block.title;
      notification.body = "Comienza a las " + minutesToLabel(block.startMinutes) + " · " + categoryOf(block.category).label;
      notification.sound = "default";
      notification.scriptName = Script.name();
      const trigger = new Date();
      trigger.setHours(Math.floor(block.startMinutes / 60), block.startMinutes % 60, 0, 0);
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
  widget.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);
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

function buildSmallWidget(blocks, now) {
  const widget = buildWidgetBase();
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const clock = header.addText(minutesToLabel(now));
  clock.font = Font.mediumSystemFont(14);
  clock.textColor = C.accent;
  header.addSpacer(null);
  const pctLabel = header.addText(Math.round(dayProgress(blocks) * 100) + "%");
  pctLabel.font = Font.mediumSystemFont(12);
  pctLabel.textColor = C.textMuted;
  widget.addSpacer(8);

  const active = currentBlock(blocks, now);
  if (active) {
    const icon = widget.addText(categoryOf(active.category).icon);
    icon.font = Font.systemFont(18);
    const title = widget.addText(active.title);
    title.font = Font.boldSystemFont(14);
    title.textColor = C.text;
    const range = widget.addText(minutesToLabel(active.startMinutes) + "-" + minutesToLabel(active.endMinutes));
    range.font = Font.systemFont(10);
    range.textColor = C.textMuted;
    const remaining = widget.addText(formatDuration(active.endMinutes - now) + " restantes");
    remaining.font = Font.systemFont(10);
    remaining.textColor = C.accent;
  } else {
    const idle = widget.addText(blocks.length === 0 ? "Sin plan de hoy" : "Sin bloque activo");
    idle.font = Font.mediumSystemFont(13);
    idle.textColor = C.textMuted;
    const upcoming = nextBlock(blocks, now);
    if (upcoming) {
      const nextLabel = widget.addText("Siguiente: " + minutesToLabel(upcoming.startMinutes) + " " + upcoming.title);
      nextLabel.font = Font.systemFont(10);
      nextLabel.textColor = C.textMuted;
      nextLabel.lineLimit = 1;
    }
  }

  widget.addSpacer(null);
  addProgressBar(widget, dayProgress(blocks));
  return widget;
}

function addUpcomingRow(parent, block) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const time = row.addText(minutesToLabel(block.startMinutes));
  time.font = Font.monospacedSystemFont(10);
  time.textColor = C.textMuted;
  row.addSpacer(8);
  const title = row.addText(block.title);
  title.font = Font.systemFont(11);
  title.textColor = C.text;
  title.lineLimit = 1;
  row.addSpacer(null);
  const icon = row.addText(categoryOf(block.category).icon);
  icon.font = Font.systemFont(10);
}

function buildMediumWidget(blocks, now) {
  const widget = buildWidgetBase();
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const title = header.addText("📅 Plan de hoy");
  title.font = Font.boldSystemFont(15);
  title.textColor = C.text;
  header.addSpacer(null);
  const count = header.addText(blocks.length + " bloques");
  count.font = Font.systemFont(10);
  count.textColor = C.textMuted;
  widget.addSpacer(8);

  const active = currentBlock(blocks, now);
  if (active) {
    const card = widget.addStack();
    card.layoutHorizontally();
    card.centerAlignContent();
    card.backgroundColor = C.surfaceActive;
    card.cornerRadius = 10;
    card.setPadding(8, 10, 8, 10);
    const icon = card.addText(categoryOf(active.category).icon);
    icon.font = Font.systemFont(18);
    card.addSpacer(8);
    const info = card.addStack();
    info.layoutVertically();
    const blockTitle = info.addText(active.title);
    blockTitle.font = Font.boldSystemFont(13);
    blockTitle.textColor = C.text;
    const meta = info.addText(minutesToLabel(active.startMinutes) + "-" + minutesToLabel(active.endMinutes) + " · " + formatDuration(active.endMinutes - now) + " restante");
    meta.font = Font.systemFont(9);
    meta.textColor = C.textMuted;
    card.addSpacer(null);
    const badge = card.addText("AHORA");
    badge.font = Font.boldSystemFont(9);
    badge.textColor = C.accent;
    widget.addSpacer(8);
  } else {
    const idle = widget.addText(blocks.length === 0 ? "Sin bloques planificados" : "Sin bloque activo ahora");
    idle.font = Font.mediumSystemFont(12);
    idle.textColor = C.textMuted;
    widget.addSpacer(6);
  }

  const upcoming = blocks.filter(b => !b.completed && b.startMinutes >= now).slice(0, 2);
  for (const block of upcoming) {
    addUpcomingRow(widget, block);
    widget.addSpacer(6);
  }

  widget.addSpacer(null);
  addProgressBar(widget, dayProgress(blocks));
  return widget;
}

function addStatChip(parent, value, label, color) {
  const chip = parent.addStack();
  chip.layoutVertically();
  chip.backgroundColor = C.surface;
  chip.cornerRadius = 8;
  chip.setPadding(4, 8, 4, 8);
  const valueLabel = chip.addText(value);
  valueLabel.font = Font.boldSystemFont(12);
  valueLabel.textColor = color;
  const caption = chip.addText(label);
  caption.font = Font.systemFont(8);
  caption.textColor = C.textMuted;
}

function addTimelineRow(parent, block, now) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const isActive = now >= block.startMinutes && now < block.endMinutes;
  row.backgroundColor = isActive ? C.surfaceActive : C.surface;
  row.cornerRadius = 9;
  row.setPadding(6, 10, 6, 10);
  const mark = row.addText(block.completed ? "✅" : isActive ? "⏳" : "⬜");
  mark.font = Font.systemFont(10);
  row.addSpacer(8);
  const info = row.addStack();
  info.layoutVertically();
  const blockTitle = info.addText(block.title);
  blockTitle.font = Font.mediumSystemFont(12);
  blockTitle.textColor = isActive ? C.text : C.textMuted;
  const meta = info.addText(minutesToLabel(block.startMinutes) + "-" + minutesToLabel(block.endMinutes) + " · " + categoryOf(block.category).label);
  meta.font = Font.systemFont(9);
  meta.textColor = C.textMuted;
  row.addSpacer(null);
  const duration = row.addText(formatDuration(block.endMinutes - block.startMinutes));
  duration.font = Font.monospacedSystemFont(9);
  duration.textColor = isActive ? C.accent : C.textMuted;
  parent.addSpacer(4);
}

function buildLargeWidget(blocks, now) {
  const widget = buildWidgetBase();
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const title = header.addText("🗓️ Plan de hoy");
  title.font = Font.boldSystemFont(15);
  title.textColor = C.text;
  header.addSpacer(null);
  const dateLabel = header.addText(prettyDate());
  dateLabel.font = Font.systemFont(9);
  dateLabel.textColor = C.textMuted;
  widget.addSpacer(10);

  const stats = widget.addStack();
  stats.layoutHorizontally();
  addStatChip(stats, formatDuration(totalMinutes(blocks)), "planificado", C.text);
  stats.addSpacer(6);
  addStatChip(stats, formatDuration(completedMinutes(blocks)), "completado", C.success);
  stats.addSpacer(6);
  addStatChip(stats, Math.round(dayProgress(blocks) * 100) + "%", "progreso", C.accent);
  widget.addSpacer(10);

  addProgressBar(widget, dayProgress(blocks));
  widget.addSpacer(10);

  const sorted = [...blocks].sort((a, b) => a.startMinutes - b.startMinutes);
  if (sorted.length === 0) {
    const empty = widget.addText("Sin bloques hoy. Abre la app y planifica tu día.");
    empty.font = Font.systemFont(11);
    empty.textColor = C.textMuted;
  } else {
    for (const block of sorted) {
      addTimelineRow(widget, block, now);
    }
  }

  widget.addSpacer(null);
  const footer = widget.addText("Toca para abrir el planificador");
  footer.font = Font.systemFont(8);
  footer.textColor = C.textMuted;
  return widget;
}

async function runAsWidget() {
  try {
    const state = Store.load();
    const blocks = state.plans[dateKey(new Date())] || [];
    const now = nowMinutes();
    let widget;
    if (config.widgetFamily === "small") {
      widget = buildSmallWidget(blocks, now);
    } else if (config.widgetFamily === "medium") {
      widget = buildMediumWidget(blocks, now);
    } else {
      widget = buildLargeWidget(blocks, now);
    }
    Script.setWidget(widget);
  } catch (error) {
    const fallback = new ListWidget();
    const gradient = new LinearGradient();
    gradient.colors = [C.bgTop, C.bgBottom];
    gradient.locations = [0, 1];
    fallback.backgroundGradient = gradient;
    const errorLabel = fallback.addText("⚠️ Error en el widget");
    errorLabel.font = Font.boldSystemFont(12);
    errorLabel.textColor = C.warning;
    fallback.addText("Toca para reintentar");
    fallback.url = "scriptable:///open/" + encodeURIComponent(Script.name());
    fallback.refreshAfterDate = new Date(Date.now() + 600000);
    Script.setWidget(fallback);
  }
  Script.complete();
}

async function presentTodayPlan(state) {
  const key = dateKey(new Date());
  const blocks = state.plans[key] || [];
  const alert = new Alert();
  alert.title = "📅 Plan de hoy";
  if (blocks.length === 0) {
    alert.message = "Sin bloques planificados. Añade uno con ➕.";
  } else {
    const lines = blocks.map(b => {
      const status = b.completed ? "✅" : "⬜";
      return status + " " + minutesToLabel(b.startMinutes) + "-" + minutesToLabel(b.endMinutes) + " " + categoryOf(b.category).icon + " " + b.title;
    });
    alert.message = lines.join("\n") + "\n\n" + formatDuration(completedMinutes(blocks)) + " de " + formatDuration(totalMinutes(blocks)) + " completadas";
  }
  alert.addCancelAction("Cerrar");
  await alert.present();
}

async function presentAddBlock(state) {
  const titleAlert = new Alert();
  titleAlert.title = "➕ Nuevo bloque";
  titleAlert.message = "¿Qué vas a hacer?";
  titleAlert.addTextField("Ej: Trabajo profundo");
  titleAlert.addAction("Siguiente");
  titleAlert.addCancelAction("Cancelar");
  if ((await titleAlert.present()) !== 0) return;
  const title = titleAlert.textFieldValue(0).trim();
  if (!title) return;

  const categoryAlert = new Alert();
  categoryAlert.title = "Categoría";
  for (const cat of CATEGORIES) {
    categoryAlert.addAction(cat.icon + " " + cat.label);
  }
  categoryAlert.addCancelAction("Cancelar");
  const categoryIndex = await categoryAlert.presentSheet();
  if (categoryIndex < 0) return;
  const category = CATEGORIES[categoryIndex].key;

  const startPicker = new DatePicker();
  startPicker.mode = DatePicker.Mode.Time;
  const startDate = await startPicker.pickTimeAndDate();
  if (!startDate) return;
  const endPicker = new DatePicker();
  endPicker.mode = DatePicker.Mode.Time;
  const endDate = await endPicker.pickTimeAndDate();
  if (!endDate) return;

  const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
  const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
  if (endMinutes <= startMinutes) {
    const warn = new Alert();
    warn.title = "⚠️ Rango inválido";
    warn.message = "El fin debe ser posterior al inicio.";
    warn.addCancelAction("OK");
    await warn.present();
    return;
  }

  const key = dateKey(new Date());
  if (!state.plans[key]) state.plans[key] = [];
  const block = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: title,
    category: category,
    startMinutes: startMinutes,
    endMinutes: endMinutes,
    completed: false,
  };
  state.plans[key].push(block);
  state.plans[key].sort((a, b) => a.startMinutes - b.startMinutes);
  Store.save(state);
  await scheduleBlockNotifications(state);
}

async function presentToggleBlock(state) {
  const key = dateKey(new Date());
  const blocks = state.plans[key] || [];
  if (blocks.length === 0) {
    const empty = new Alert();
    empty.title = "Sin bloques hoy";
    empty.message = "Añade un bloque primero.";
    empty.addCancelAction("OK");
    await empty.present();
    return;
  }
  const alert = new Alert();
  alert.title = "✔️ Completar / desmarcar";
  for (const b of blocks) {
    alert.addAction((b.completed ? "✅ " : "⬜ ") + minutesToLabel(b.startMinutes) + " " + b.title);
  }
  alert.addCancelAction("Cancelar");
  const choice = await alert.presentSheet();
  if (choice < 0) return;
  blocks[choice].completed = !blocks[choice].completed;
  Store.save(state);
}

async function presentDeleteBlock(state) {
  const key = dateKey(new Date());
  const blocks = state.plans[key] || [];
  if (blocks.length === 0) {
    const empty = new Alert();
    empty.title = "Sin bloques hoy";
    empty.message = "Nada que borrar.";
    empty.addCancelAction("OK");
    await empty.present();
    return;
  }
  const alert = new Alert();
  alert.title = "🗑️ Borrar bloque";
  for (const b of blocks) {
    alert.addAction(minutesToLabel(b.startMinutes) + " " + b.title);
  }
  alert.addCancelAction("Cancelar");
  const choice = await alert.presentSheet();
  if (choice < 0) return;
  const confirm = new Alert();
  confirm.title = "¿Borrar?";
  confirm.message = blocks[choice].title + " (" + minutesToLabel(blocks[choice].startMinutes) + "-" + minutesToLabel(blocks[choice].endMinutes) + ")";
  confirm.addAction("Borrar");
  confirm.addCancelAction("Cancelar");
  if ((await confirm.present()) !== 0) return;
  blocks.splice(choice, 1);
  Store.save(state);
  await scheduleBlockNotifications(state);
}

async function presentWeeklySummary(state) {
  const lines = [];
  let totalPlanned = 0;
  let totalDone = 0;
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const key = dateKey(day);
    const blocks = state.plans[key] || [];
    const planned = totalMinutes(blocks);
    const done = completedMinutes(blocks);
    totalPlanned += planned;
    totalDone += done;
    const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;
    lines.push(shortDayLabel(day) + ": " + formatDuration(done) + " / " + formatDuration(planned) + " (" + pct + "%)");
  }
  const alert = new Alert();
  alert.title = "📊 Resumen semanal";
  alert.message = lines.join("\n") + "\n\nTotal: " + formatDuration(totalDone) + " de " + formatDuration(totalPlanned);
  alert.addCancelAction("Cerrar");
  await alert.present();
}

async function presentMainMenu(state) {
  const key = dateKey(new Date());
  const blocks = state.plans[key] || [];
  const planned = totalMinutes(blocks);
  const pct = Math.round(dayProgress(blocks) * 100);
  const alert = new Alert();
  alert.title = "⏰ Planificador de Bloques";
  alert.message = "Hoy: " + blocks.length + " bloques · " + formatDuration(planned) + " planificadas · " + pct + "% completado";
  alert.addAction("📅 Ver plan de hoy");
  alert.addAction("➕ Añadir bloque");
  alert.addAction("✔️ Completar / desmarcar");
  alert.addAction("🗑️ Borrar bloque");
  alert.addAction("📊 Resumen semanal");
  alert.addAction("🔔 Notificaciones: " + (state.notificationsEnabled ? "ON" : "OFF"));
  alert.addCancelAction("✖️ Cerrar");
  const choice = await alert.presentSheet();
  if (choice === 0) {
    await presentTodayPlan(state);
  } else if (choice === 1) {
    await presentAddBlock(state);
  } else if (choice === 2) {
    await presentToggleBlock(state);
  } else if (choice === 3) {
    await presentDeleteBlock(state);
  } else if (choice === 4) {
    await presentWeeklySummary(state);
  } else if (choice === 5) {
    state.notificationsEnabled = !state.notificationsEnabled;
    Store.save(state);
    await scheduleBlockNotifications(state);
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
  if (!config.runsInWidget) {
    const alert = new Alert();
    alert.title = "Error";
    alert.message = error && error.message ? error.message : "Error inesperado";
    alert.addCancelAction("Cerrar");
    await alert.present();
  }
}
Script.complete();
