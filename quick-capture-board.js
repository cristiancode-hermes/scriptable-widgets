const PALETTE = {
  bg: new Color("#0B0D17"),
  surface: new Color("#161825"),
  surfaceAlt: new Color("#1E2135"),
  accent: new Color("#5E7CE2"),
  accentDim: new Color("#3A4D8F"),
  success: new Color("#34C759"),
  warning: new Color("#FFD60A"),
  link: new Color("#64D2FF"),
  task: new Color("#FF6B8A"),
  text: new Color("#E8EAED"),
  textDim: new Color("#8E93A3"),
  textMuted: new Color("#5A5F72"),
};

const ITEM_TYPES = {
  note: { icon: "📝", color: PALETTE.textDim },
  link: { icon: "🔗", color: PALETTE.link },
  task: { icon: "☑️", color: PALETTE.task },
};

const CATEGORIES = [
  { key: "inbox", label: "📥 Inbox", filter: () => true },
  { key: "links", label: "🔗 Links", filter: (i) => i.type === "link" },
  { key: "tasks", label: "☑️ Tasks", filter: (i) => i.type === "task" },
  { key: "notes", label: "📝 Notes", filter: (i) => i.type === "note" },
];

class CaptureItem {
  constructor(content, type = "note", tags = []) {
    this.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.content = content;
    this.type = type;
    this.tags = tags;
    this.createdAt = new Date().toISOString();
    this.archived = false;
    this.completed = false;
  }
}

class AppState {
  constructor() {
    this.items = [];
    this.quickTags = ["urgente", "idea", "leer", "comprar", "seguimiento"];
  }
}

const Store = {
  _fm: FileManager.local(),

  get path() {
    return this._fm.joinPath(
      this._fm.documentsDirectory(),
      "quick-capture-board.json"
    );
  },

  load() {
    try {
      if (this._fm.fileExists(this.path)) {
        return JSON.parse(this._fm.readString(this.path));
      }
    } catch (e) {}
    return new AppState();
  },

  save(data) {
    try {
      this._fm.writeString(this.path, JSON.stringify(data, null, 2));
      return true;
    } catch (e) {
      return false;
    }
  },
};

const Board = {
  _data: null,

  get data() {
    if (!this._data) this._data = Store.load();
    return this._data;
  },

  get activeItems() {
    return this.data.items.filter((i) => !i.archived);
  },

  get todayItems() {
    const today = new Date().toISOString().split("T")[0];
    return this.activeItems.filter((i) => i.createdAt.split("T")[0] === today);
  },

  get archivedItems() {
    return this.data.items.filter((i) => i.archived);
  },

  addItem(content, type, tags = []) {
    const item = new CaptureItem(content, type, tags);
    this.data.items.unshift(item);
    Store.save(this.data);
    return item;
  },

  completeItem(id) {
    const item = this.data.items.find((i) => i.id === id);
    if (item) {
      item.completed = true;
      Store.save(this.data);
    }
    return item;
  },

  archiveItem(id) {
    const item = this.data.items.find((i) => i.id === id);
    if (item) {
      item.archived = true;
      Store.save(this.data);
    }
    return item;
  },

  deleteItem(id) {
    this.data.items = this.data.items.filter((i) => i.id !== id);
    Store.save(this.data);
  },

  stats() {
    const active = this.activeItems;
    const today = this.todayItems;
    const links = active.filter((i) => i.type === "link").length;
    const tasks = active.filter((i) => i.type === "task").length;
    const notes = active.filter((i) => i.type === "note").length;
    const completed = active.filter((i) => i.completed).length;
    return {
      total: active.length,
      today: today.length,
      links,
      tasks,
      notes,
      completed,
    };
  },
};

function detectType(content) {
  const trimmed = content.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return "link";
  if (/^(todo|tarea|check|pendiente)[:\s-]/i.test(trimmed)) return "task";
  if (/\bhttps?:\/\/\S+/.test(trimmed)) return "link";
  return "note";
}

function extractTags(content) {
  const tagRegex = /#(\w+)/g;
  const tags = [];
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return tags;
}

function timeAgo(isoString) {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function truncText(text, maxLen) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

function makeGradient(c1, c2) {
  const bg = new LinearGradient();
  bg.colors = [c1, c2];
  bg.locations = [0, 1];
  return bg;
}

function addStatChip(parent, emoji, value, color) {
  const chip = parent.addStack();
  chip.layoutVertically();
  chip.centerAlignContent();
  chip.backgroundColor = PALETTE.surface;
  chip.cornerRadius = 8;
  chip.setPadding(4, 8, 4, 8);
  const eLabel = chip.addText(emoji);
  eLabel.font = Font.systemFont(14);
  const vLabel = chip.addText(String(value));
  vLabel.font = Font.boldSystemFont(16);
  vLabel.textColor = color;
  return chip;
}

function renderItemRow(parent, item) {
  const typeInfo = ITEM_TYPES[item.type] || ITEM_TYPES.note;
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = PALETTE.surface;
  row.cornerRadius = 8;
  row.setPadding(6, 10, 6, 10);
  const icon = row.addText(typeInfo.icon);
  icon.font = Font.systemFont(12);
  row.addSpacer(6);
  const textCol = row.addStack();
  textCol.layoutVertically();
  const title = textCol.addText(truncText(item.content, 45));
  title.font = Font.mediumSystemFont(11);
  title.textColor = item.completed
    ? PALETTE.textMuted
    : PALETTE.text;
  title.lineLimit = 1;
  const meta = textCol.addText(
    `${timeAgo(item.createdAt)}${item.tags.length ? " · " + item.tags.slice(0, 2).join(", ") : ""}`
  );
  meta.font = Font.systemFont(9);
  meta.textColor = PALETTE.textMuted;
  row.addSpacer(null);
  if (item.completed) {
    const check = row.addText("✅");
    check.font = Font.systemFont(12);
  }
  return row;
}

function buildSmallWidget(stats) {
  const w = new ListWidget();
  w.backgroundGradient = makeGradient(PALETTE.bg, new Color("#151830"));
  w.setPadding(12, 14, 12, 14);

  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const titleText = header.addText("⚡ Quick Capture");
  titleText.font = Font.boldSystemFont(13);
  titleText.textColor = PALETTE.text;
  header.addSpacer(null);
  const countBadge = header.addText(String(stats.total));
  countBadge.font = Font.boldSystemFont(12);
  countBadge.textColor = PALETTE.accent;

  w.addSpacer(8);

  const statsRow = w.addStack();
  statsRow.layoutHorizontally();
  statsRow.centerAlignContent();
  addStatChip(statsRow, "🔗", stats.links, PALETTE.link);
  statsRow.addSpacer(6);
  addStatChip(statsRow, "☑️", stats.tasks, PALETTE.task);
  statsRow.addSpacer(6);
  addStatChip(statsRow, "📝", stats.notes, PALETTE.textDim);

  w.addSpacer(8);

  const todayRow = w.addStack();
  todayRow.layoutHorizontally();
  todayRow.centerAlignContent();
  const todayLabel = todayRow.addText(`Hoy: ${stats.today} capturas`);
  todayLabel.font = Font.systemFont(11);
  todayLabel.textColor = PALETTE.textDim;
  todayRow.addSpacer(null);
  const completedLabel = todayRow.addText(`✅ ${stats.completed}`);
  completedLabel.font = Font.systemFont(11);
  completedLabel.textColor = PALETTE.success;

  w.refreshAfterDate = new Date(Date.now() + 300000);
  w.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  return w;
}

function buildMediumWidget(stats) {
  const w = new ListWidget();
  w.backgroundGradient = makeGradient(PALETTE.bg, new Color("#151830"));
  w.setPadding(10, 12, 10, 12);

  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const titleText = header.addText("⚡ Quick Capture");
  titleText.font = Font.boldSystemFont(14);
  titleText.textColor = PALETTE.text;
  header.addSpacer(null);
  const countLabel = header.addText(`${stats.total} items`);
  countLabel.font = Font.mediumSystemFont(11);
  countLabel.textColor = PALETTE.accent;

  w.addSpacer(6);

  const chipRow = w.addStack();
  chipRow.layoutHorizontally();
  chipRow.centerAlignContent();
  const chips = [
    { e: "🔗", v: stats.links, c: PALETTE.link },
    { e: "☑️", v: stats.tasks, c: PALETTE.task },
    { e: "📝", v: stats.notes, c: PALETTE.textDim },
    { e: "✅", v: stats.completed, c: PALETTE.success },
  ];
  chips.forEach((ch, i) => {
    const chip = chipRow.addStack();
    chip.layoutHorizontally();
    chip.centerAlignContent();
    chip.backgroundColor = PALETTE.surface;
    chip.cornerRadius = 8;
    chip.setPadding(4, 8, 4, 8);
    const emoji = chip.addText(ch.e);
    emoji.font = Font.systemFont(12);
    chip.addSpacer(4);
    const val = chip.addText(String(ch.v));
    val.font = Font.boldSystemFont(13);
    val.textColor = ch.c;
    if (i < chips.length - 1) chipRow.addSpacer(6);
  });

  w.addSpacer(6);

  const recentItems = Board.activeItems.slice(0, 3);
  if (recentItems.length === 0) {
    const emptyText = w.addText("Sin capturas aún");
    emptyText.font = Font.systemFont(12);
    emptyText.textColor = PALETTE.textMuted;
  } else {
    recentItems.forEach((item) => {
      renderItemRow(w, item);
      w.addSpacer(3);
    });
  }

  w.addSpacer(null);

  const footer = w.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const todayLabel = footer.addText(`Hoy: ${stats.today}`);
  todayLabel.font = Font.systemFont(10);
  todayLabel.textColor = PALETTE.textMuted;
  footer.addSpacer(null);
  const hint = footer.addText("Toca para abrir");
  hint.font = Font.systemFont(9);
  hint.textColor = PALETTE.accentDim;

  w.refreshAfterDate = new Date(Date.now() + 300000);
  w.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  return w;
}

function buildLargeWidget(stats) {
  const w = new ListWidget();
  w.backgroundGradient = makeGradient(PALETTE.bg, new Color("#151830"));
  w.setPadding(12, 14, 12, 14);

  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const titleText = header.addText("⚡ Quick Capture Board");
  titleText.font = Font.boldSystemFont(16);
  titleText.textColor = PALETTE.text;
  header.addSpacer(null);
  const countBadge = header.addText(`${stats.total} total`);
  countBadge.font = Font.mediumSystemFont(12);
  countBadge.textColor = PALETTE.accent;

  w.addSpacer(8);

  const statsRow = w.addStack();
  statsRow.layoutHorizontally();
  statsRow.centerAlignContent();
  statsRow.backgroundColor = PALETTE.surface;
  statsRow.cornerRadius = 10;
  statsRow.setPadding(8, 10, 8, 10);

  const statItems = [
    { label: "Capturas", value: stats.total, color: PALETTE.text },
    { label: "Hoy", value: stats.today, color: PALETTE.warning },
    { label: "Links", value: stats.links, color: PALETTE.link },
    { label: "Tareas", value: stats.tasks, color: PALETTE.task },
    { label: "Notas", value: stats.notes, color: PALETTE.textDim },
    { label: "Completas", value: stats.completed, color: PALETTE.success },
  ];
  statItems.forEach((s, i) => {
    const col = statsRow.addStack();
    col.layoutVertically();
    col.centerAlignContent();
    col.addSpacer(null);
    const val = col.addText(String(s.value));
    val.font = Font.boldSystemFont(18);
    val.textColor = s.color;
    const lbl = col.addText(s.label);
    lbl.font = Font.systemFont(8);
    lbl.textColor = PALETTE.textMuted;
    col.addSpacer(null);
    if (i < statItems.length - 1) {
      statsRow.addSpacer(null);
    }
  });

  w.addSpacer(8);

  const sectionTitle = w.addText("Últimas capturas");
  sectionTitle.font = Font.mediumSystemFont(12);
  sectionTitle.textColor = PALETTE.textDim;
  w.addSpacer(4);

  const recentItems = Board.activeItems.slice(0, 6);
  if (recentItems.length === 0) {
    const emptyText = w.addText("Toca + para capturar tu primera idea");
    emptyText.font = Font.systemFont(12);
    emptyText.textColor = PALETTE.textMuted;
  } else {
    recentItems.forEach((item) => {
      renderItemRow(w, item);
      w.addSpacer(3);
    });
  }

  w.addSpacer(null);

  const footer = w.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const todayLabel = footer.addText(`Hoy: ${stats.today} capturas`);
  todayLabel.font = Font.systemFont(10);
  todayLabel.textColor = PALETTE.textMuted;
  footer.addSpacer(null);
  const hint = footer.addText("Toca para abrir");
  hint.font = Font.systemFont(9);
  hint.textColor = PALETTE.accentDim;

  w.refreshAfterDate = new Date(Date.now() + 300000);
  w.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  return w;
}

async function runAsWidget() {
  const stats = Board.stats();
  const family = config.widgetFamily;
  let widget;
  if (family === "large") widget = buildLargeWidget(stats);
  else if (family === "medium") widget = buildMediumWidget(stats);
  else widget = buildSmallWidget(stats);
  Script.setWidget(widget);
}

async function showMainMenu() {
  while (true) {
    const stats = Board.stats();
    const alert = new Alert();
    alert.title = "⚡ Quick Capture";
    alert.message = `${stats.total} items · Hoy: ${stats.today} · ✅ ${stats.completed}`;
    alert.addAction("➕ Capturar nota rápida");
    alert.addAction("🔗 Capturar enlace");
    alert.addAction("☑️ Capturar tarea");
    alert.addAction("📋 Ver inbox");
    alert.addAction("🔗 Ver links");
    alert.addAction("☑️ Ver tareas");
    alert.addAction("📂 Archivar completadas");
    alert.addAction("🗑️ Borrar todo");
    alert.addCancelAction("✖️ Salir");
    const choice = await alert.presentSheet();
    if (choice === -1) return;
    switch (choice) {
      case 0:
        await captureNote();
        break;
      case 1:
        await captureLink();
        break;
      case 2:
        await captureTask();
        break;
      case 3:
        await viewCategory("inbox");
        break;
      case 4:
        await viewCategory("links");
        break;
      case 5:
        await viewCategory("tasks");
        break;
      case 6:
        await archiveCompleted();
        break;
      case 7:
        await confirmDeleteAll();
        break;
    }
  }
}

async function promptContent(typeLabel, placeholder) {
  const alert = new Alert();
  alert.title = `➕ Nueva ${typeLabel}`;
  alert.message = "Escribe el contenido (#tag para etiquetas)";
  alert.addTextField(placeholder);
  alert.addAction("Capturar");
  alert.addCancelAction("Cancelar");
  const choice = await alert.present();
  if (choice === -1) return null;
  const content = alert.textFieldValue(0).trim();
  if (!content) return null;
  return content;
}

async function promptTagSelection(preselectedTags = []) {
  const alert = new Alert();
  alert.title = "🏷️ Etiquetas";
  alert.message = "Selecciona etiquetas o cancela para ninguna";
  Board.data.quickTags.forEach((tag) => {
    const prefix = preselectedTags.includes(tag) ? "✅ " : "";
    alert.addAction(`${prefix}#${tag}`);
  });
  alert.addAction("Otra etiqueta...");
  alert.addCancelAction("Sin más");
  const choice = await alert.presentSheet();
  if (choice === -1) return preselectedTags;
  if (choice === Board.data.quickTags.length) {
    const customAlert = new Alert();
    customAlert.title = "Etiqueta personalizada";
    customAlert.addTextField("nombre");
    customAlert.addAction("Agregar");
    customAlert.addCancelAction("Cancelar");
    if ((await customAlert.present()) === 0) {
      const custom = customAlert.textFieldValue(0).trim().toLowerCase();
      if (custom && !preselectedTags.includes(custom)) {
        preselectedTags.push(custom);
        if (!Board.data.quickTags.includes(custom)) {
          Board.data.quickTags.push(custom);
          Store.save(Board.data);
        }
      }
    }
    return preselectedTags;
  }
  const selectedTag = Board.data.quickTags[choice];
  if (preselectedTags.includes(selectedTag)) {
    return preselectedTags.filter((t) => t !== selectedTag);
  }
  preselectedTags.push(selectedTag);
  return preselectedTags;
}

async function captureNote() {
  const content = await promptContent("nota", "Idea, pensamiento, recordatorio...");
  if (!content) return;
  const inlineTags = extractTags(content);
  const tags = await promptTagSelection(inlineTags);
  const item = Board.addItem(content, "note", tags);
  await sendNotification("📝 Nota capturada", truncText(item.content, 60));
}

async function captureLink() {
  const content = await promptContent("enlace", "https://...");
  if (!content) return;
  const url = content.match(/https?:\/\/\S+/)?.[0] || content;
  const inlineTags = extractTags(content);
  const tags = await promptTagSelection(inlineTags);
  const item = Board.addItem(url, "link", tags);
  await sendNotification("🔗 Enlace capturado", truncText(item.content, 60));
}

async function captureTask() {
  const content = await promptContent(
    "tarea",
    "Hacer algo específico..."
  );
  if (!content) return;
  const inlineTags = extractTags(content);
  const tags = await promptTagSelection(inlineTags);
  const item = Board.addItem(content, "task", tags);
  await sendNotification("☑️ Tarea capturada", truncText(item.content, 60));
}

async function viewCategory(categoryKey) {
  const category = CATEGORIES.find((c) => c.key === categoryKey);
  if (!category) return;
  const items = Board.activeItems.filter(category.filter);
  if (items.length === 0) {
    const empty = new Alert();
    empty.title = category.label;
    empty.message = "Sin elementos en esta categoría";
    empty.addCancelAction("Volver");
    await empty.presentSheet();
    return;
  }
  while (true) {
    const alert = new Alert();
    alert.title = category.label;
    alert.message = `${items.length} elementos`;
    items.forEach((item, i) => {
      const icon = ITEM_TYPES[item.type]?.icon || "📝";
      const status = item.completed ? "✅ " : "";
      alert.addAction(`${status}${icon} ${truncText(item.content, 40)}`);
    });
    alert.addCancelAction("Volver");
    const choice = await alert.presentSheet();
    if (choice === -1) return;
    await showItemActions(items[choice]);
  }
}

async function showItemActions(item) {
  while (true) {
    const alert = new Alert();
    alert.title = ITEM_TYPES[item.type]?.icon || "📝";
    alert.message = item.content;
    if (item.type === "task" && !item.completed) {
      alert.addAction("✅ Marcar completada");
    }
    if (item.type === "link") {
      alert.addAction("🌐 Abrir en Safari");
    }
    alert.addAction("📦 Archivar");
    alert.addAction("🗑️ Eliminar");
    alert.addCancelAction("Volver");
    const choice = await alert.presentSheet();
    if (choice === -1) return;
    const action = alert.actions[choice].title;
    if (action.includes("Marcar")) {
      Board.completeItem(item.id);
      await sendNotification("✅ Tarea completada", truncText(item.content, 60));
      return;
    }
    if (action.includes("Abrir")) {
      const urlMatch = item.content.match(/https?:\/\/\S+/);
      if (urlMatch) Safari.open(urlMatch[0]);
      return;
    }
    if (action.includes("Archivar")) {
      Board.archiveItem(item.id);
      return;
    }
    if (action.includes("Eliminar")) {
      const confirm = new Alert();
      confirm.title = "Eliminar";
      confirm.message = `¿Eliminar "${truncText(item.content, 30)}"?`;
      confirm.addAction("Eliminar");
      confirm.addCancelAction("Cancelar");
      if ((await confirm.presentAlert()) === 0) {
        Board.deleteItem(item.id);
      }
      return;
    }
  }
}

async function archiveCompleted() {
  const completed = Board.activeItems.filter((i) => i.completed);
  if (completed.length === 0) {
    const info = new Alert();
    info.title = "Archivar";
    info.message = "No hay elementos completados para archivar";
    info.addCancelAction("OK");
    await info.presentSheet();
    return;
  }
  const confirm = new Alert();
  confirm.title = "📦 Archivar completadas";
  confirm.message = `¿Archivar ${completed.length} elementos completados?`;
  confirm.addAction(`Archivar ${completed.length}`);
  confirm.addCancelAction("Cancelar");
  if ((await confirm.presentSheet()) === 0) {
    completed.forEach((item) => Board.archiveItem(item.id));
    await sendNotification(
      "📦 Archivadas",
      `${completed.length} elementos archivados`
    );
  }
}

async function confirmDeleteAll() {
  const confirm = new Alert();
  confirm.title = "⚠️ Borrar todo";
  confirm.message =
    "¿Eliminar TODOS los elementos? Esta acción no se puede deshacer.";
  confirm.addAction("Sí, borrar todo");
  confirm.addCancelAction("Cancelar");
  if ((await confirm.presentSheet()) === 0) {
    Board.data.items = [];
    Store.save(Board.data);
    await sendNotification("🗑️ Borrado", "Todos los elementos eliminados");
  }
}

async function sendNotification(title, body) {
  try {
    const notif = new Notification();
    notif.title = title;
    notif.body = body;
    notif.scriptName = Script.name();
    await notif.schedule();
  } catch (e) {}
}

try {
  if (config.runsInWidget) {
    await runAsWidget();
  } else {
    await showMainMenu();
  }
} catch (e) {
  if (config.runsInWidget) {
    const errWidget = new ListWidget();
    errWidget.backgroundGradient = makeGradient(
      PALETTE.bg,
      new Color("#151830")
    );
    errWidget.addText("⚠️ Error");
    errWidget.addText("Toca para reintentar");
    errWidget.url =
      "scriptable:///open/" + encodeURIComponent(Script.name());
    Script.setWidget(errWidget);
  } else {
    const alert = new Alert();
    alert.title = "Error";
    alert.message = e?.message || "Error inesperado";
    alert.addCancelAction("Cerrar");
    await alert.present();
  }
}

Script.complete();
