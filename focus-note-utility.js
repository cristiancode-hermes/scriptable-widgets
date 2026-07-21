const CONFIG = {
  focusDurations: [15, 25, 30, 45, 60, 90],
  defaultFocusMinutes: 30,
  breakMinutes: 5,
  dataFile: "focus-note-data.json",

  theme: {
    bg: new Color("#1C1C1E"),
    bgSecondary: new Color("#2C2C2E"),
    bgTertiary: new Color("#3A3A3C"),
    text: new Color("#FFFFFF"),
    textSecondary: new Color("#EBEBF599"),
    textTertiary: new Color("#EBEBF54D"),
    accent: new Color("#007AFF"),
    accentLight: new Color("#5AC8FA"),
    success: new Color("#30D158"),
    warning: new Color("#FF9F0A"),
    danger: new Color("#FF453A"),
    purple: new Color("#BF5AF2"),
    pink: new Color("#FF6482"),
    orange: new Color("#FF9500"),
    separator: new Color("#38383A"),
  },

  gradients: {
    focus: [new Color("#007AFF"), new Color("#5856D6")],
    break: [new Color("#30D158"), new Color("#34C759")],
    notes: [new Color("#FF9500"), new Color("#FF6482")],
    stats: [new Color("#BF5AF2"), new Color("#5E5CE6")],
    idle: [new Color("#2C2C2E"), new Color("#3A3A3C")],
  },
};

class FocusSession {
  constructor(durationMinutes = CONFIG.defaultFocusMinutes) {
    this.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.durationMinutes = durationMinutes;
    this.startedAt = new Date().toISOString();
    this.endedAt = null;
    this.completed = false;
    this.interrupted = false;
    this.notes = [];
    this.tag = "general";
    this.energyLevel = null;
  }
}

class FocusNote {
  constructor(text) {
    this.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.text = text;
    this.createdAt = new Date().toISOString();
  }
}

class AppState {
  constructor() {
    this.sessions = [];
    this.allNotes = [];
    this.dailyGoalMinutes = 120;
    this.currentSessionId = null;
    this.streakDays = 0;
    this.lastActiveDate = null;
  }
}

const DataStore = {
  _fm: FileManager.iCloud() || FileManager.local(),

  get filePath() {
    return this._fm.joinPath(this._fm.documentsDirectory(), CONFIG.dataFile);
  },

  load() {
    try {
      if (this._fm.fileExists(this.filePath)) {
        const raw = this._fm.readString(this.filePath);
        return JSON.parse(raw);
      }
    } catch {
      return new AppState();
    }
    return new AppState();
  },

  save(data) {
    try {
      this._fm.writeString(this.filePath, JSON.stringify(data, null, 2));
      return true;
    } catch {
      return false;
    }
  },
};

const FocusEngine = {
  _data: null,

  get data() {
    if (!this._data) this._data = DataStore.load();
    return this._data;
  },

  save() {
    DataStore.save(this._data);
  },

  get isSessionActive() {
    return this._data.currentSessionId !== null;
  },

  get currentSession() {
    if (!this._data.currentSessionId) return null;
    return this._data.sessions.find((s) => s.id === this._data.currentSessionId) || null;
  },

  startSession(durationMinutes, tag = "general") {
    if (this.isSessionActive) return null;
    const session = new FocusSession(durationMinutes);
    session.tag = tag;
    this._data.sessions.push(session);
    this._data.currentSessionId = session.id;
    this.save();
    return session;
  },

  completeSession() {
    const session = this.currentSession;
    if (!session) return false;
    session.completed = true;
    session.endedAt = new Date().toISOString();
    this._data.currentSessionId = null;
    this._updateStreak();
    this.save();
    return true;
  },

  interruptSession() {
    const session = this.currentSession;
    if (!session) return false;
    session.interrupted = true;
    session.endedAt = new Date().toISOString();
    this._data.currentSessionId = null;
    this.save();
    return true;
  },

  addNoteToSession(sessionId, text) {
    const session = this._data.sessions.find((s) => s.id === sessionId);
    if (!session || !text?.trim()) return null;
    const note = new FocusNote(text.trim());
    session.notes.push(note);
    this._data.allNotes.push(note);
    this.save();
    return note;
  },

  addQuickNote(text) {
    const note = new FocusNote(text.trim());
    this._data.allNotes.push(note);
    if (this.isSessionActive) {
      const session = this.currentSession;
      if (session) session.notes.push(note);
    }
    this.save();
    return note;
  },

  getTodaySessions() {
    const today = new Date().toISOString().split("T")[0];
    return this._data.sessions.filter((s) => s.startedAt.startsWith(today));
  },

  getTodayFocusMinutes() {
    const today = this.getTodaySessions();
    return today
      .filter((s) => s.completed)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  },

  getWeekSessions() {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    return this._data.sessions.filter((s) => s.startedAt >= weekAgo);
  },

  getStreak() {
    return this._data.streakDays;
  },

  getNotesByDate(dateStr) {
    return this._data.allNotes.filter((n) => n.createdAt.startsWith(dateStr));
  },

  getTopTags() {
    const tagCount = {};
    for (const s of this._data.sessions) {
      if (s.completed) {
        tagCount[s.tag] = (tagCount[s.tag] || 0) + s.durationMinutes;
      }
    }
    return Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  },

  setDailyGoal(minutes) {
    this._data.dailyGoalMinutes = Math.max(15, Math.min(480, minutes));
    this.save();
  },

  _updateStreak() {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (this._data.lastActiveDate === today) return;

    if (this._data.lastActiveDate === yesterday) {
      this._data.streakDays++;
    } else if (this._data.lastActiveDate !== today) {
      this._data.streakDays = 1;
    }

    this._data.lastActiveDate = today;
  },
};

const Format = {
  time(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  },

  minutes(mins) {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  },

  timeAgo(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "justo ahora";
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${Math.floor(hours / 24)}d`;
  },

  date(isoStr) {
    const d = new Date(isoStr);
    const df = new DateFormatter();
    df.useShortDateStyle();
    df.useNoTimeStyle();
    return df.string(d);
  },

  timeShort(isoStr) {
    const d = new Date(isoStr);
    const df = new DateFormatter();
    df.useNoDateStyle();
    df.useShortTimeStyle();
    return df.string(d);
  },

  weekdayName() {
    const df = new DateFormatter();
    df.locale = "es-ES";
    const day = df.string(new Date(), "EEEE");
    return day.charAt(0).toUpperCase() + day.slice(1);
  },

  fullDate() {
    const df = new DateFormatter();
    df.locale = "es-ES";
    return df.string(new Date(), "d 'de' MMMM 'de' yyyy");
  },
};

const UI = {
  gradientLayer(colors, locations = [0, 1]) {
    const g = new LinearGradient();
    g.colors = colors;
    g.locations = locations;
    return g;
  },

  card(colors, radius = 14) {
    const s = new WidgetStack();
    s.backgroundGradient = this.gradientLayer(colors);
    s.cornerRadius = radius;
    return s;
  },

  padding(stack, insets = { top: 12, bottom: 12, left: 14, right: 14 }) {
    stack.setPadding(insets.top, insets.left, insets.bottom, insets.right);
    return stack;
  },

  label(text, opts = {}) {
    const t = new WidgetText();
    t.text = text;
    if (opts.font) t.font = opts.font;
    if (opts.color) t.textColor = opts.color;
    if (opts.alignment) t.textAlignment = opts.alignment;
    if (opts.opacity !== undefined) t.textOpacity = opts.opacity;
    return t;
  },

  icon(name, size = 16, color = null) {
    const t = new WidgetText();
    t.font = Font.mediumSystemFont(size);
    try {
      t.text = SFSymbol.named(name).symbol;
    } catch {
      t.text = "•";
    }
    if (color) t.textColor = color;
    return t;
  },

  separator(color = CONFIG.theme.separator) {
    const s = new WidgetStack();
    s.addSpacer(null);
    s.backgroundColor = color;
    s.setPadding(0, 0, 0, 0);
    s.size = new Size(0, 0.5);
    return s;
  },

  progressBar(value, max, color, bgColor) {
    if (max <= 0) max = 1;
    const pct = Math.min(value / max, 1);
    const s = new WidgetStack();
    s.backgroundColor = bgColor || CONFIG.theme.bgTertiary;
    s.cornerRadius = 3;
    s.size = new Size(0, 6);

    const fill = s.addStack();
    fill.backgroundColor = color || CONFIG.theme.accent;
    fill.cornerRadius = 3;
    fill.size = new Size(0, 6);
    fill.addSpacer(pct * 100);

    s.addSpacer(null);
    return s;
  },

  tagBadge(tag, color) {
    const s = new WidgetStack();
    s.setPadding(2, 8, 2, 8);
    s.backgroundColor = color || CONFIG.theme.bgTertiary;
    s.cornerRadius = 8;
    const t = s.addText(tag);
    t.font = Font.systemFont(10);
    t.textColor = CONFIG.theme.textSecondary;
    return s;
  },

  deleteNotesOlderThan(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const state = FocusEngine.data;
    const before = state.allNotes.length;
    state.allNotes = state.allNotes.filter((n) => n.createdAt >= cutoff);
    for (const session of state.sessions) {
      session.notes = session.notes.filter((n) => n.createdAt >= cutoff);
    }
    const removed = before - state.allNotes.length;
    if (removed > 0) FocusEngine.save();
    return removed;
  },

  formatSessionTag(tag) {
    const tagIcons = {
      general: "star.fill",
      trabajo: "briefcase.fill",
      estudio: "book.fill",
      lectura: "book.closed.fill",
      escritura: "pencil.fill",
      coding: "chevron.left.forwardslash.chevron.right",
      creativo: "paintpalette.fill",
      ejercicio: "figure.walk",
      meditacion: "sparkles",
    };
    return tagIcons[tag] || "circle.fill";
  },
};

class MainUI {
  async present() {
    const alert = new Alert();
    alert.title = "🧠 Focus Note";
    alert.message = this._buildMainMessage();

    alert.addAction("Iniciar Focus");
    alert.addAction("Nota Rápida");
    alert.addAction("Mis Notas");
    alert.addAction("Estadísticas");
    alert.addAction("Meta Diaria");
    alert.addCancelAction("Cerrar");

    const result = await alert.present();
    await this._handleAction(result);
  }

  async presentWithSession() {
    const session = FocusEngine.currentSession;
    const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
    const remaining = session.durationMinutes * 60 - elapsed;
    const pct = Math.min(elapsed / (session.durationMinutes * 60), 1);

    const alert = new Alert();
    alert.title = `🧠 Focus Activo — ${session.tag}`;
    alert.message = [
      `⏱ ${Format.time(Math.max(0, remaining))} restantes`,
      `📝 ${session.notes.length} notas en esta sesión`,
      `Progreso: ${Math.round(pct * 100)}%`,
    ].join("\n");

    alert.addAction("Agregar Nota");
    alert.addAction("Completar ✓");
    alert.addDestructiveAction("Interrumpir");
    alert.addCancelAction("Cerrar");

    const result = await alert.present();
    await this._handleSessionAction(result);
  }

  async _handleAction(index) {
    switch (index) {
      case 0:
        await this._startFocus();
        break;
      case 1:
        await this._quickNote();
        break;
      case 2:
        await this._showNotes();
        break;
      case 3:
        await this._showStats();
        break;
      case 4:
        await this._setDailyGoal();
        break;
    }
  }

  async _handleSessionAction(index) {
    switch (index) {
      case 0:
        await this._addNoteToSession();
        break;
      case 1:
        FocusEngine.completeSession();
        const cAlert = new Alert();
        cAlert.title = "✓ Sesión Completada";
        cAlert.message = "¡Gran trabajo! Tu sesión de focus ha sido registrada.";
        cAlert.addAction("Ver Estadísticas");
        cAlert.addCancelAction("Cerrar");
        const cResult = await cAlert.present();
        if (cResult === 0) await this._showStats();
        break;
      case 2:
        FocusEngine.interruptSession();
        const iAlert = new Alert();
        iAlert.title = "⏹ Sesión Interrumpida";
        iAlert.message = "La sesión ha sido interrumpida. No se contabiliza en tu progreso diario.";
        iAlert.addCancelAction("Cerrar");
        await iAlert.present();
        break;
    }
  }

  async _startFocus() {
    const picker = new Alert();
    picker.title = "⏱ Duración del Focus";
    picker.message = "¿Cuántos minutos quieres enfocarte?";

    for (const d of CONFIG.focusDurations) {
      picker.addAction(`${d} min`);
    }
    picker.addCancelAction("Cancelar");

    const durationIdx = await picker.present();
    if (durationIdx === -1) return;

    const duration = CONFIG.focusDurations[durationIdx] || CONFIG.defaultFocusMinutes;

    const tagPicker = new Alert();
    tagPicker.title = "🏷 Etiqueta";
    tagPicker.message = "¿Qué tipo de trabajo harás?";
    const tags = ["general", "trabajo", "estudio", "lectura", "escritura", "coding", "creativo", "ejercicio", "meditacion"];
    for (const t of tags) tagPicker.addAction(t);
    tagPicker.addCancelAction("Cancelar");

    const tagIdx = await tagPicker.present();
    if (tagIdx === -1) return;

    const tag = tags[tagIdx] || "general";

    const session = FocusEngine.startSession(duration, tag);
    if (!session) {
      const err = new Alert();
      err.title = "Error";
      err.message = "Ya hay una sesión activa. Complétala o interrúmpela primero.";
      err.addCancelAction("OK");
      await err.present();
      return;
    }

    const success = new Alert();
    success.title = "🎯 Focus Iniciado";
    success.message = [
      `${duration} minutos de enfoque.`,
      `Etiqueta: ${tag}`,
      "",
      "Puedes agregar notas durante la sesión.",
    ].join("\n");
    success.addAction("Agregar Nota");
    success.addCancelAction("Comenzar");
    const sResult = await success.present();
    if (sResult === 0) await this._addNoteToSession();
  }

  async _quickNote() {
    const fm = FileManager.local();
    const draftPath = fm.joinPath(fm.documentsDirectory(), "focus_note_draft.txt");

    if (fm.fileExists(draftPath)) fm.remove(draftPath);
    fm.writeString(draftPath, "");

    Safari.open(`scriptable:///run/${Script.name()}?note_draft=1`);

    const alert = new Alert();
    alert.title = "📝 Nota Rápida";
    alert.message = "Se abrirá Scriptable para que escribas tu nota.";
    alert.addCancelAction("OK");
    await alert.present();

    try {
      if (fm.fileExists(draftPath)) {
        const text = fm.readString(draftPath).trim();
        if (text) {
          FocusEngine.addQuickNote(text);
          fm.remove(draftPath);
          const done = new Alert();
          done.title = "✓ Nota Guardada";
          done.message = text.length > 60 ? text.substring(0, 60) + "…" : text;
          done.addCancelAction("Cerrar");
          await done.present();
          return;
        }
      }
    } catch {
      const err = new Alert();
      err.title = "Error";
      err.message = "No se pudo guardar la nota.";
      err.addCancelAction("Cerrar");
      await err.present();
    }
  }

  async _addNoteToSession() {
    const prompt = new Alert();
    prompt.title = "📝 Nota de Sesión";
    prompt.message = "Escribe tu nota o idea:";
    prompt.addTextField("Escribe aquí...");
    prompt.addAction("Guardar");
    prompt.addCancelAction("Cancelar");

    await prompt.present();
  }

  async _showNotes() {
    const todayNotes = FocusEngine.getNotesByDate(new Date().toISOString().split("T")[0]);
    const recentNotes = FocusEngine.data.allNotes
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    const lines = [];
    if (todayNotes.length > 0) {
      const count = FocusEngine.getTodayFocusMinutes();
      lines.push(`📊 Hoy: ${Format.minutes(count)} de focus · ${todayNotes.length} notas`);
      lines.push("");
      for (const n of todayNotes.slice(0, 5)) {
        const text = n.text.length > 50 ? n.text.substring(0, 50) + "…" : n.text;
        lines.push(`• ${text}`);
      }
      lines.push("");
    }

    lines.push(`📚 Total: ${FocusEngine.data.allNotes.length} notas guardadas`);
    lines.push("");
    lines.push("━━ Últimas notas ━━");
    for (const n of recentNotes.slice(0, 10)) {
      const text = n.text.length > 45 ? n.text.substring(0, 45) + "…" : n.text;
      lines.push(`[${Format.timeAgo(n.createdAt)}] ${text}`);
    }

    const alert = new Alert();
    alert.title = "📝 Notas";
    alert.message = lines.join("\n");
    alert.addAction("Nueva Nota");
    alert.addAction("Limpiar Antiguas");
    alert.addCancelAction("Cerrar");

    const result = await alert.present();
    if (result === 0) await this._quickNote();
    if (result === 1) {
      const removed = UI.deleteNotesOlderThan(90);
      const done = new Alert();
      done.title = "🧹 Limpieza";
      done.message = `Se eliminaron ${removed} notas con más de 90 días.`;
      done.addCancelAction("Cerrar");
      await done.present();
    }
  }

  async _showStats() {
    const todayMins = FocusEngine.getTodayFocusMinutes();
    const dailyGoal = FocusEngine.data.dailyGoalMinutes;
    const weekSessions = FocusEngine.getWeekSessions();
    const weekCompleted = weekSessions.filter((s) => s.completed);
    const weekMins = weekCompleted.reduce((sum, s) => sum + s.durationMinutes, 0);
    const streak = FocusEngine.getStreak();
    const topTags = FocusEngine.getTopTags();
    const totalSessions = FocusEngine.data.sessions.length;
    const totalCompleted = FocusEngine.data.sessions.filter((s) => s.completed).length;

    const lines = [];
    lines.push(`📆 ${Format.weekdayName()} · ${FocusEngine.data.sessions.length > 0 ? FocusEngine.data.sessions[FocusEngine.data.sessions.length - 1].startedAt.split("T")[0] : new Date().toISOString().split("T")[0]}`);
  lines.push("");

  const goalPct = dailyGoal > 0 ? Math.min(Math.round((todayMins / dailyGoal) * 100), 100) : 0;
  lines.push(`🎯 Hoy: ${Format.minutes(todayMins)} / ${Format.minutes(dailyGoal)} (${goalPct}%)`);
  lines.push(`🔥 Racha: ${streak} día${streak !== 1 ? "s" : ""}`);
  lines.push("");
  lines.push(`📊 Esta semana: ${Format.minutes(weekMins)} en ${weekCompleted.length} sesiones`);
  lines.push(`Total: ${totalCompleted}/${totalSessions} sesiones completadas`);
  lines.push("");

  if (topTags.length > 0) {
    lines.push("🏷 Top categorías:");
    for (const [tag, mins] of topTags) {
      lines.push(`  ${tag}: ${Format.minutes(mins)}`);
    }
  }

  const alert = new Alert();
  alert.title = "📊 Estadísticas de Focus";
  alert.message = lines.join("\n");
  alert.addCancelAction("Cerrar");
  await alert.present();
}

async _setDailyGoal() {
  const alert = new Alert();
  alert.title = "🎯 Meta Diaria";
  alert.message = `Meta actual: ${Format.minutes(FocusEngine.data.dailyGoalMinutes)}`;
  alert.addTextField(`${FocusEngine.data.dailyGoalMinutes}`, "Minutos por día");
  alert.addAction("Guardar");
  alert.addCancelAction("Cancelar");
  await alert.present();
}

_buildMainMessage() {
  const todayMins = FocusEngine.getTodayFocusMinutes();
  const goal = FocusEngine.data.dailyGoalMinutes;
  const streak = FocusEngine.getStreak();
  const notesToday = FocusEngine.getNotesByDate(new Date().toISOString().split("T")[0]).length;
  const topTags = FocusEngine.getTopTags();

  const lines = [];
  lines.push(`📆 ${Format.fullDate()}`);
  lines.push("");
  lines.push(`🎯 Progreso: ${Format.minutes(todayMins)} / ${Format.minutes(goal)}`);
  lines.push(`🔥 Racha: ${streak} día${streak !== 1 ? "s" : ""}`);
  lines.push(`📝 Notas hoy: ${notesToday}`);

  if (topTags.length > 0) {
    lines.push("");
    lines.push(`🏷 Más usado: ${topTags[0][0]} (${Format.minutes(topTags[0][1])})`);
  }

  return lines.join("\n");
}
}

async function runAsWidget() {
  const widget = new ListWidget();
  const family = config.widgetFamily || "small";

  const state = FocusEngine.data;
  const hasSession = FocusEngine.isSessionActive;
  const todayMins = FocusEngine.getTodayFocusMinutes();
  const goal = state.dailyGoalMinutes;
  const streak = FocusEngine.getStreak();
  const todayNotes = FocusEngine.getNotesByDate(new Date().toISOString().split("T")[0]).length;

  const bgGrad = hasSession ? CONFIG.gradients.focus : CONFIG.gradients.idle;
  const grad = new LinearGradient();
  grad.colors = bgGrad;
  grad.locations = [0, 1];
  widget.backgroundGradient = grad;

  if (family === "small") {
    widget.setPadding(14, 14, 14, 14);

    const header = widget.addStack();
    header.layoutHorizontally();
    header.addSpacer();
    const icon = header.addText(hasSession ? "🧠" : "🎯");
    icon.font = Font.systemFont(22);
    header.addSpacer();

    widget.addSpacer(6);

    const pct = goal > 0 ? Math.min(todayMins / goal, 1) : 0;
    const prog = widget.addStack();
    prog.backgroundColor = CONFIG.theme.bgTertiary;
    prog.cornerRadius = 4;
    prog.size = new Size(0, 8);
    const fill = prog.addStack();
    fill.backgroundColor = pct >= 1 ? CONFIG.theme.success : CONFIG.theme.accent;
    fill.cornerRadius = 4;
    fill.size = new Size(0, 8);
    fill.addSpacer(pct * 100);
    prog.addSpacer(null);

    widget.addSpacer(8);

    const val = widget.addText(`${Math.round(pct * 100)}%`);
    val.font = Font.boldSystemFont(28);
    val.textColor = CONFIG.theme.text;

    const sub = widget.addText(`de ${Format.minutes(goal)}`);
    sub.font = Font.systemFont(11);
    sub.textColor = CONFIG.theme.textSecondary;

    widget.addSpacer(4);

    const metaLine = widget.addStack();
    metaLine.layoutHorizontally();
    metaLine.addSpacer();
    const streakIcon = metaLine.addText("🔥");
    streakIcon.font = Font.systemFont(10);
    metaLine.addSpacer(3);
    const streakVal = metaLine.addText(`${streak}d`);
    streakVal.font = Font.systemFont(11);
    streakVal.textColor = CONFIG.theme.textSecondary;
    metaLine.addSpacer();

    widget.addSpacer(2);

    if (hasSession) {
      const session = FocusEngine.currentSession;
      const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      const remaining = Math.max(0, session.durationMinutes * 60 - elapsed);
      const activeLine = widget.addStack();
      activeLine.layoutHorizontally();
      activeLine.addSpacer();
      const activeText = activeLine.addText(`Focus: ${Format.time(remaining)}`);
      activeText.font = Font.systemFont(10);
      activeText.textColor = CONFIG.theme.success;
      activeLine.addSpacer();
    }

  } else if (family === "medium") {
    widget.setPadding(14, 14, 14, 14);

    const header = widget.addStack();
    header.layoutHorizontally();
    header.addSpacer();
    const title = header.addText("🧠 Focus Note");
    title.font = Font.boldSystemFont(14);
    title.textColor = CONFIG.theme.text;
    header.addSpacer();

    widget.addSpacer(8);

    const content = widget.addStack();
    content.layoutHorizontally();

    const leftCol = content.addStack();
    leftCol.layoutVertically();
    leftCol.size = new Size(0, 1);

    const pct = goal > 0 ? Math.min(todayMins / goal, 1) : 0;
    const bigPct = leftCol.addText(`${Math.round(pct * 100)}%`);
    bigPct.font = Font.boldSystemFont(36);
    bigPct.textColor = pct >= 1 ? CONFIG.theme.success : CONFIG.theme.accent;

    const desc = leftCol.addText(`de ${Format.minutes(goal)} diarios`);
    desc.font = Font.systemFont(11);
    desc.textColor = CONFIG.theme.textSecondary;

    leftCol.addSpacer(4);

    const streakLine = leftCol.addStack();
    streakLine.layoutHorizontally();
    const fire = streakLine.addText("🔥");
    fire.font = Font.systemFont(12);
    streakLine.addSpacer(3);
    const sVal = streakLine.addText(`${streak} día${streak !== 1 ? "s" : ""}`);
    sVal.font = Font.systemFont(12);
    sVal.textColor = CONFIG.theme.textSecondary;

    leftCol.addSpacer(6);

    const progBar = leftCol.addStack();
    progBar.backgroundColor = CONFIG.theme.bgTertiary;
    progBar.cornerRadius = 4;
    progBar.size = new Size(0, 6);
    const pFill = progBar.addStack();
    pFill.backgroundColor = pct >= 1 ? CONFIG.theme.success : CONFIG.theme.accent;
    pFill.cornerRadius = 4;
    pFill.size = new Size(0, 6);
    pFill.addSpacer(pct * 100);
    progBar.addSpacer(null);

    content.addSpacer(14);

    const rightCol = content.addStack();
    rightCol.layoutVertically();
    rightCol.size = new Size(0, 1);

    const todayLabel = rightCol.addText("📊 Hoy");
    todayLabel.font = Font.boldSystemFont(11);
    todayLabel.textColor = CONFIG.theme.textSecondary;

    rightCol.addSpacer(4);

    const todayVal = rightCol.addText(Format.minutes(todayMins));
    todayVal.font = Font.boldSystemFont(16);
    todayVal.textColor = CONFIG.theme.text;

    rightCol.addSpacer(6);

    const notesLabel = rightCol.addText("📝 Notas");
    notesLabel.font = Font.boldSystemFont(11);
    notesLabel.textColor = CONFIG.theme.textSecondary;

    rightCol.addSpacer(4);

    const notesVal = rightCol.addText(String(todayNotes));
    notesVal.font = Font.boldSystemFont(16);
    notesVal.textColor = CONFIG.theme.text;

    rightCol.addSpacer(6);

    if (hasSession) {
      const session = FocusEngine.currentSession;
      const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      const remaining = Math.max(0, session.durationMinutes * 60 - elapsed);
      const activeTag = rightCol.addStack();
      activeTag.setPadding(3, 8, 3, 8);
      activeTag.backgroundColor = CONFIG.theme.success;
      activeTag.cornerRadius = 6;
      const at = activeTag.addText(`${Format.time(remaining)}`);
      at.font = Font.boldSystemFont(11);
      at.textColor = Color.white();
    }

  } else {
    widget.setPadding(16, 16, 16, 16);

    const header = widget.addStack();
    header.layoutHorizontally();
    const hLeft = header.addStack();
    hLeft.layoutVertically();
    const hTitle = hLeft.addText("🧠 Focus Note");
    hTitle.font = Font.boldSystemFont(18);
    hTitle.textColor = CONFIG.theme.text;
    const hSub = hLeft.addText(Format.fullDate());
    hSub.font = Font.systemFont(11);
    hSub.textColor = CONFIG.theme.textSecondary;

    header.addSpacer();

    const hRight = header.addStack();
    hRight.layoutVertically();
    hRight.setPadding(4, 0, 0, 0);

    if (hasSession) {
      const session = FocusEngine.currentSession;
      const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      const remaining = Math.max(0, session.durationMinutes * 60 - elapsed);
      const badge = hRight.addStack();
      badge.setPadding(3, 10, 3, 10);
      badge.backgroundColor = CONFIG.theme.success;
      badge.cornerRadius = 8;
      const bt = badge.addText(`Focus ${Format.time(remaining)}`);
      bt.font = Font.boldSystemFont(12);
      bt.textColor = Color.white();
    }

    widget.addSpacer(10);

    const statsRow = widget.addStack();
    statsRow.layoutHorizontally();
    statsRow.addSpacer();

    const todayCard = statsRow.addStack();
    todayCard.layoutVertically();
    todayCard.backgroundColor = new Color("#ffffff", 0.08);
    todayCard.cornerRadius = 12;
    todayCard.setPadding(10, 14, 10, 14);

    const tcTitle = todayCard.addText("HOY");
    tcTitle.font = Font.systemFont(10);
    tcTitle.textColor = CONFIG.theme.textTertiary;

    todayCard.addSpacer(4);

    const tcVal = todayCard.addText(Format.minutes(todayMins));
    tcVal.font = Font.boldSystemFont(22);
    tcVal.textColor = CONFIG.theme.text;

    const pct = goal > 0 ? Math.min(todayMins / goal, 1) : 0;
    const tcSub = todayCard.addText(`de ${Format.minutes(goal)}`);
    tcSub.font = Font.systemFont(10);
    tcSub.textColor = CONFIG.theme.textSecondary;

    statsRow.addSpacer(10);

    const streakCard = statsRow.addStack();
    streakCard.layoutVertically();
    streakCard.backgroundColor = new Color("#ffffff", 0.08);
    streakCard.cornerRadius = 12;
    streakCard.setPadding(10, 14, 10, 14);

    const scTitle = streakCard.addText("RACHA");
    scTitle.font = Font.systemFont(10);
    scTitle.textColor = CONFIG.theme.textTertiary;

    streakCard.addSpacer(4);

    const scVal = streakCard.addText(`🔥 ${streak}`);
    scVal.font = Font.boldSystemFont(22);
    scVal.textColor = CONFIG.theme.text;

    const scSub = streakCard.addText(`día${streak !== 1 ? "s" : ""}`);
    scSub.font = Font.systemFont(10);
    scSub.textColor = CONFIG.theme.textSecondary;

    statsRow.addSpacer(10);

    const notesCard = statsRow.addStack();
    notesCard.layoutVertically();
    notesCard.backgroundColor = new Color("#ffffff", 0.08);
    notesCard.cornerRadius = 12;
    notesCard.setPadding(10, 14, 10, 14);

    const ncTitle = notesCard.addText("NOTAS");
    ncTitle.font = Font.systemFont(10);
    ncTitle.textColor = CONFIG.theme.textTertiary;

    notesCard.addSpacer(4);

    const ncVal = notesCard.addText(`📝 ${todayNotes}`);
    ncVal.font = Font.boldSystemFont(22);
    ncVal.textColor = CONFIG.theme.text;

    const ncSub = notesCard.addText("hoy");
    ncSub.font = Font.systemFont(10);
    ncSub.textColor = CONFIG.theme.textSecondary;

    statsRow.addSpacer();

    widget.addSpacer(10);

    const progLabel = widget.addStack();
    progLabel.layoutHorizontally();
    const pl = progLabel.addText("Progreso diario");
    pl.font = Font.systemFont(11);
    pl.textColor = CONFIG.theme.textSecondary;
    progLabel.addSpacer();
    const plPct = progLabel.addText(`${Math.round(pct * 100)}%`);
    plPct.font = Font.boldSystemFont(11);
    plPct.textColor = CONFIG.theme.text;

    widget.addSpacer(4);

    const bigProg = widget.addStack();
    bigProg.backgroundColor = CONFIG.theme.bgTertiary;
    bigProg.cornerRadius = 5;
    bigProg.size = new Size(0, 10);
    const bigFill = bigProg.addStack();
    bigFill.backgroundColor = pct >= 1 ? CONFIG.theme.success : CONFIG.theme.accent;
    bigFill.cornerRadius = 5;
    bigFill.size = new Size(0, 10);
    bigFill.addSpacer(pct * 100);
    bigProg.addSpacer(null);

    widget.addSpacer(10);

    const topTags = FocusEngine.getTopTags();
    if (topTags.length > 0) {
      const tagsLabel = widget.addStack();
      tagsLabel.layoutHorizontally();
      const tl = tagsLabel.addText("🏷 Categorías");
      tl.font = Font.systemFont(11);
      tl.textColor = CONFIG.theme.textSecondary;
      tagsLabel.addSpacer();

      const tagsRow = widget.addStack();
      tagsRow.layoutHorizontally();
      tagsRow.addSpacer();

      const tagColors = {
        general: CONFIG.theme.bgTertiary,
        trabajo: CONFIG.theme.accent,
        estudio: CONFIG.theme.purple,
        lectura: CONFIG.theme.orange,
        escritura: CONFIG.theme.pink,
        coding: CONFIG.theme.accentLight,
        creativo: CONFIG.theme.warning,
        ejercicio: CONFIG.theme.success,
        meditacion: CONFIG.theme.purple,
      };

      const maxVisible = 4;
      for (let i = 0; i < Math.min(topTags.length, maxVisible); i++) {
        const [tag, mins] = topTags[i];
        if (i > 0) {
          tagsRow.addSpacer(4);
        }
        const badge = tagsRow.addStack();
        badge.setPadding(3, 8, 3, 8);
        badge.backgroundColor = tagColors[tag] || CONFIG.theme.bgTertiary;
        badge.cornerRadius = 8;
        const bt = badge.addText(`${tag} ${Format.minutes(mins)}`);
        bt.font = Font.systemFont(9);
        bt.textColor = CONFIG.theme.text;
      }

      tagsRow.addSpacer();
    }

    widget.addSpacer(4);

    const footer = widget.addStack();
    footer.layoutHorizontally();
    footer.addSpacer();
    const totalInfo = footer.addText(`Total: ${state.sessions.length} sesiones · ${state.allNotes.length} notas`);
    totalInfo.font = Font.systemFont(9);
    totalInfo.textColor = CONFIG.theme.textTertiary;
    footer.addSpacer();
  }

  widget.url = "scriptable:///run/" + Script.name();
  widget.refreshAfterDate = new Date(Date.now() + 300000);
  Script.setWidget(widget);
  Script.complete();
}

async function runAsUtility() {
  const session = FocusEngine.currentSession;
  if (session) {
    const ui = new MainUI();
    await ui.presentWithSession();
  } else {
    const ui = new MainUI();
    await ui.present();
  }
}

try {
  if (config.runsInWidget) {
    await runAsWidget();
  } else {
    await runAsUtility();
  }
} catch (e) {
  const errAlert = new Alert();
  errAlert.title = "Error en Focus Note";
  errAlert.message = e.message || "Ocurrió un error inesperado.";
  errAlert.addCancelAction("Cerrar");
  await errAlert.present();
}
