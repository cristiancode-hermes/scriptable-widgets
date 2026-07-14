

const CONFIG = {
  
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  cyclesBeforeLongBreak: 4,

  
  priorities: {
    baja: { color: new Color("#8E8E93"), icon: "arrow.down.circle" },
    media: { color: new Color("#FF9F0A"), icon: "equal.circle" },
    alta:  { color: new Color("#FF453A"), icon: "exclamationmark.circle" },
    crítica: { color: new Color("#BF5AF2"), icon: "flame.circle" },
  },

  
  categories: {
    trabajo:    "briefcase",
    personal:   "person",
    estudio:    "book",
    salud:      "heart",
    creativo:   "paintpalette",
    finanzas:   "dollarsign.circle",
    otro:       "ellipsis.circle",
  },

  
  dataFile: "pomodoro-flow-data.json",

  
  theme: {
    bg:            new Color("#1C1C1E"),
    bgSecondary:   new Color("#2C2C2E"),
    bgTertiary:    new Color("#3A3A3C"),
    text:          new Color("#FFFFFF"),
    textSecondary: new Color("#EBEBF599"),
    textTertiary:  new Color("#EBEBF54D"),
    accent:        new Color("#5E5CE6"),
    accentLight:   new Color("#7B79F0"),
    success:       new Color("#30D158"),
    warning:       new Color("#FF9F0A"),
    danger:        new Color("#FF453A"),
    separator:     new Color("#38383A"),
  },

  
  gradients: {
    pomodoro:  [new Color("#5E5CE6"), new Color("#BF5AF2")],
    break:     [new Color("#30D158"), new Color("#34C759")],
    task:      [new Color("#FF9F0A"), new Color("#FF6482")],
    stats:     [new Color("#007AFF"), new Color("#5AC8FA")],
    empty:     [new Color("#2C2C2E"), new Color("#3A3A3C")],
  },
};

class Task {
  constructor(title, priority = "media", category = "otro") {
    this.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.title = title;
    this.priority = priority;
    this.category = category;
    this.createdAt = new Date().toISOString();
    this.completedAt = null;
    this.completed = false;
    this.pomodorosUsed = 0; 
    this.notes = "";
  }
}

class PomodoroState {
  constructor() {
    this.phase = "idle"; 
    this.sessionStart = null;
    this.elapsedSeconds = 0;
    this.totalWorkSeconds = 0;
    this.totalBreakSeconds = 0;
    this.cyclesCompleted = 0;
    this.tasksCompletedToday = 0;
    this.currentTaskId = null;
  }
}

class AppData {
  constructor() {
    this.tasks = [];
    this.pomodoro = new PomodoroState();
    this.sessions = []; 
    this.lastOpened = new Date().toISOString();
    this.settings = {
      workDuration: CONFIG.workDuration,
      breakDuration: CONFIG.breakDuration,
      longBreakDuration: CONFIG.longBreakDuration,
      cyclesBeforeLongBreak: CONFIG.cyclesBeforeLongBreak,
    };
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
        const data = JSON.parse(raw);
        return this._migrate(data);
      }
    } catch (e) {
      console.warn("DataStore.load error: " + e.message);
    }
    return new AppData();
  },

  save(data) {
    try {
      data.lastOpened = new Date().toISOString();
      this._fm.writeString(this.filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (e) {
      console.error("DataStore.save error: " + e.message);
      return false;
    }
  },

  _migrate(data) {
    
    if (!data.pomodoro) data.pomodoro = new PomodoroState();
    if (!data.sessions) data.sessions = [];
    if (!data.settings) {
      data.settings = {
        workDuration: CONFIG.workDuration,
        breakDuration: CONFIG.breakDuration,
        longBreakDuration: CONFIG.longBreakDuration,
        cyclesBeforeLongBreak: CONFIG.cyclesBeforeLongBreak,
      };
    }
    return data;
  },

  exportJSON() {
    const data = this.load();
    return JSON.stringify(data, null, 2);
  },

  importJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.tasks && data.pomodoro) {
        this.save(data);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },
};

const Notifier = {
  async schedule(title, body, seconds = 0) {
    try {
      const notif = new Notification();
      notif.title = title;
      notif.body = body;
      notif.sound = "default";
      notif.scriptName = Script.name();

      if (seconds > 0) {
        notif.setTriggerDate(new Date(Date.now() + seconds * 1000));
      }

      await notif.schedule();
      return true;
    } catch (e) {
      console.warn("Notifier.schedule error: " + e.message);
      return false;
    }
  },

  async sendImmediate(title, body) {
    try {
      const notif = new Notification();
      notif.title = title;
      notif.body = body;
      notif.sound = "default";
      notif.scriptName = Script.name();
      await notif.schedule();
      return true;
    } catch (e) {
      console.warn("Notifier.sendImmediate error: " + e.message);
      return false;
    }
  },
};

const UI = {
  
  gradientLayer(colors, locations = [0, 1]) {
    const grad = new LinearGradient();
    grad.colors = colors;
    grad.locations = locations;
    return grad;
  },

  
  gradientStack(colors, cornerRadius = 14, locations = [0, 1]) {
    const stack = new WidgetStack();
    stack.backgroundGradient = this.gradientLayer(colors, locations);
    stack.cornerRadius = cornerRadius;
    return stack;
  },

  
  withPadding(stack, insets = { top: 12, bottom: 12, left: 14, right: 14 }) {
    stack.setPadding(insets.top, insets.left, insets.bottom, insets.right);
    return stack;
  },

  
  text(content, opts = {}) {
    const t = new WidgetText();
    t.text = content;
    if (opts.font) t.font = opts.font;
    if (opts.color) t.textColor = opts.color;
    if (opts.opacity !== undefined) t.textOpacity = opts.opacity;
    if (opts.alignment) t.textAlignment = opts.alignment;
    if (opts.shadow) t.shadow = opts.shadow;
    if (opts.url) t.url = opts.url;
    return t;
  },

  
  sfSymbol(name, size = 16, color = null) {
    const t = new WidgetText();
    t.font = Font.mediumSystemFont(size);
    t.text = SFSymbol.named(name).symbol;
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

  
  priorityBadge(priority) {
    const p = CONFIG.priorities[priority] || CONFIG.priorities.media;
    const stack = new WidgetStack();
    stack.setPadding(2, 6, 2, 6);
    stack.backgroundColor = p.color;
    stack.cornerRadius = 4;

    const icon = stack.addText(SFSymbol.named(p.icon).symbol);
    icon.font = Font.mediumSystemFont(9);
    icon.textColor = Color.white();
    return stack;
  },

  
  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  },

  
  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  },

  
  shadow(widget, opts = {}) {
    widget.shadowColor = opts.color || new Color("#000000", 0.3);
    widget.shadowRadius = opts.radius || 6;
    widget.shadowOffset = opts.offset || { width: 0, height: 2 };
  },
};

const PomodoroEngine = {
  _data: null,
  _timer: null,

  get data() {
    if (!this._data) this._data = DataStore.load();
    return this._data;
  },

  save() {
    DataStore.save(this._data);
  },

  
  getTodayTasks() {
    const today = new Date().toISOString().split("T")[0];
    return this._data.tasks.filter((t) => {
      return t.createdAt.startsWith(today) || (t.completedAt && t.completedAt.startsWith(today));
    });
  },

  
  getPendingTasks() {
    return this._data.tasks.filter((t) => !t.completed);
  },

  
  getAllTasks() {
    return this._data.tasks;
  },

  
  addTask(title, priority = "media", category = "otro") {
    if (!title || title.trim().length === 0) return null;
    const task = new Task(title.trim(), priority, category);
    this._data.tasks.push(task);
    this.save();
    return task;
  },

  
  completeTask(taskId) {
    const task = this._data.tasks.find((t) => t.id === taskId);
    if (!task || task.completed) return false;
    task.completed = true;
    task.completedAt = new Date().toISOString();
    if (this._data.pomodoro.currentTaskId === taskId) {
      this._data.pomodoro.currentTaskId = null;
    }
    this._data.pomodoro.tasksCompletedToday++;
    this.save();
    return true;
  },

  
  deleteTask(taskId) {
    const idx = this._data.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return false;
    this._data.tasks.splice(idx, 1);
    if (this._data.pomodoro.currentTaskId === taskId) {
      this._data.pomodoro.currentTaskId = null;
    }
    this.save();
    return true;
  },

  
  setPriority(taskId, priority) {
    const task = this._data.tasks.find((t) => t.id === taskId);
    if (!task || !CONFIG.priorities[priority]) return false;
    task.priority = priority;
    this.save();
    return true;
  },

  
  setCurrentTask(taskId) {
    const task = this._data.tasks.find((t) => t.id === taskId);
    if (!task) return false;
    this._data.pomodoro.currentTaskId = taskId;
    this.save();
    return true;
  },

  get currentTask() {
    if (!this._data.pomodoro.currentTaskId) return null;
    return this._data.tasks.find((t) => t.id === this._data.pomodoro.currentTaskId) || null;
  },

  
  startPomodoro() {
    const state = this._data.pomodoro;
    if (state.phase !== "idle") return false;

    state.phase = "work";
    state.sessionStart = new Date().toISOString();
    state.elapsedSeconds = 0;
    this.save();

    
    const workSec = this._data.settings.workDuration * 60;
    Notifier.schedule(
      "🍅 Fin del Pomodoro",
      `¡Buen trabajo! ${this._data.settings.workDuration} minutos de enfoque completados. Es hora de descansar.`,
      workSec,
    );

    return true;
  },

  
  startBreak() {
    const state = this._data.pomodoro;
    if (state.phase === "idle") return false;

    const isLong = state.cyclesCompleted > 0 &&
      (state.cyclesCompleted + 1) % this._data.settings.cyclesBeforeLongBreak === 0;

    const duration = isLong
      ? this._data.settings.longBreakDuration
      : this._data.settings.breakDuration;

    state.phase = isLong ? "longBreak" : "break";
    state.sessionStart = new Date().toISOString();
    state.elapsedSeconds = 0;
    this.save();

    
    Notifier.schedule(
      isLong ? "☕ Fin del descanso largo" : "☕ Fin del descanso",
      `¡${Math.floor(duration)} minutos de descanso completados! ¿Listo para el siguiente Pomodoro?`,
      duration * 60,
    );

    return true;
  },

  
  completeCycle() {
    const state = this._data.pomodoro;

    if (state.phase === "work") {
      
      const workSec = this._data.settings.workDuration * 60;
      state.totalWorkSeconds += workSec;
      state.cyclesCompleted++;

      
      if (state.currentTaskId) {
        const task = this._data.tasks.find((t) => t.id === state.currentTaskId);
        if (task) task.pomodorosUsed++;
      }

      this.startBreak();
      return "break";
    } else if (state.phase === "break" || state.phase === "longBreak") {
      const breakSec = state.phase === "longBreak"
        ? this._data.settings.longBreakDuration * 60
        : this._data.settings.breakDuration * 60;
      state.totalBreakSeconds += breakSec;
      state.elapsedSeconds = 0;
      state.sessionStart = new Date().toISOString();
      state.phase = "work";
      this.save();

      
      const workSec = this._data.settings.workDuration * 60;
      Notifier.schedule(
        "🍅 Fin del Pomodoro",
        `¡Buen trabajo! ${this._data.settings.workDuration} minutos de enfoque completados.`,
        workSec,
      );

      return "work";
    }

    return null;
  },

  
  stopSession() {
    const state = this._data.pomodoro;
    if (state.phase === "idle") return false;

    
    const session = {
      endedAt: new Date().toISOString(),
      workSeconds: state.totalWorkSeconds,
      breakSeconds: state.totalBreakSeconds,
      cyclesCompleted: state.cyclesCompleted,
      tasksCompleted: state.tasksCompletedToday,
    };
    this._data.sessions.push(session);

    
    state.phase = "idle";
    state.sessionStart = null;
    state.elapsedSeconds = 0;
    state.totalWorkSeconds = 0;
    state.totalBreakSeconds = 0;
    state.cyclesCompleted = 0;
    state.tasksCompletedToday = 0;
    state.currentTaskId = null;
    this.save();
    return true;
  },

  
  getProgress() {
    const state = this._data.pomodoro;
    if (state.phase === "idle") return 0;

    let duration;
    switch (state.phase) {
      case "work":
        duration = this._data.settings.workDuration * 60;
        break;
      case "break":
        duration = this._data.settings.breakDuration * 60;
        break;
      case "longBreak":
        duration = this._data.settings.longBreakDuration * 60;
        break;
      default:
        return 0;
    }

    return Math.min(state.elapsedSeconds / duration, 1);
  },

  
  tick() {
    const state = this._data.pomodoro;
    if (state.phase === "idle" || !state.sessionStart) return;

    const start = new Date(state.sessionStart);
    state.elapsedSeconds = Math.floor((Date.now() - start.getTime()) / 1000);
  },

  
  getRemainingSeconds() {
    const state = this._data.pomodoro;
    if (state.phase === "idle" || !state.sessionStart) return 0;

    let duration;
    switch (state.phase) {
      case "work":
        duration = this._data.settings.workDuration * 60;
        break;
      case "break":
        duration = this._data.settings.breakDuration * 60;
        break;
      case "longBreak":
        duration = this._data.settings.longBreakDuration * 60;
        break;
      default:
        return 0;
    }

    return Math.max(0, duration - state.elapsedSeconds);
  },

  
  getDailyStats() {
    const state = this._data.pomodoro;
    const today = new Date().toISOString().split("T")[0];
    const todaySessions = this._data.sessions.filter((s) => s.endedAt.startsWith(today));
    const todayWork = todaySessions.reduce((acc, s) => acc + s.workSeconds, 0);
    const todayBreaks = todaySessions.reduce((acc, s) => acc + s.breakSeconds, 0);
    const totalCycles = todaySessions.reduce((acc, s) => acc + s.cyclesCompleted, 0) + state.cyclesCompleted;

    return {
      totalWorkSeconds: todayWork + (state.phase === "work" ? state.elapsedSeconds : 0),
      totalBreakSeconds: todayBreaks,
      cyclesCompleted: totalCycles,
      tasksCompleted: todaySessions.reduce((acc, s) => acc + s.tasksCompleted, 0) + state.tasksCompletedToday,
      sessionsCount: todaySessions.length,
    };
  },
};

function createWidget(data, config) {
  const engine = new PomodoroEngine();

  
  if (!data) {
    const fm = FileManager.iCloud() || FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), CONFIG.dataFile);
    if (fm.fileExists(path)) {
      data = JSON.parse(fm.readString(path));
    } else {
      data = new AppData();
    }
  }

  
  if (config) {
    if (config.work) data.settings.workDuration = parseInt(config.work) || CONFIG.workDuration;
    if (config.break) data.settings.breakDuration = parseInt(config.break) || CONFIG.breakDuration;
    if (config.long) data.settings.longBreakDuration = parseInt(config.long) || CONFIG.longBreakDuration;
    if (config.cycles) data.settings.cyclesBeforeLongBreak = parseInt(config.cycles) || CONFIG.cyclesBeforeLongBreak;
  }

  const widget = new ListWidget();
  widget.backgroundColor = CONFIG.theme.bg;

  const size = config.widgetFamily || "small";

  switch (size) {
    case "small":
      buildSmallWidget(widget, data, engine);
      break;
    case "medium":
      buildMediumWidget(widget, data, engine);
      break;
    case "large":
      buildLargeWidget(widget, data, engine);
      break;
  }

  
  widget.backgroundGradient = UI.gradientLayer(
    [CONFIG.theme.bg, CONFIG.theme.bgSecondary],
  );

  return widget;
}

function buildSmallWidget(widget, data, engine) {
  const state = data.pomodoro;
  const pendingTasks = data.tasks.filter((t) => !t.completed);
  const currentTask = state.currentTaskId
    ? data.tasks.find((t) => t.id === state.currentTaskId) || null
    : null;

  
  widget.addSpacer(4);

  
  const headerStack = widget.addStack();
  headerStack.layoutHorizontally();
  headerStack.addSpacer(null);

  let phaseIcon, phaseColor, phaseLabel;
  if (state.phase === "work") {
    phaseIcon = "🍅";
    phaseColor = CONFIG.theme.accent;
    phaseLabel = "ENFOQUE";
  } else if (state.phase === "break" || state.phase === "longBreak") {
    phaseIcon = "☕";
    phaseColor = CONFIG.theme.success;
    phaseLabel = "DESCANSO";
  } else {
    phaseIcon = "⏸️";
    phaseColor = CONFIG.theme.textTertiary;
    phaseLabel = "INACTIVO";
  }

  const iconText = headerStack.addText(phaseIcon);
  iconText.font = Font.mediumSystemFont(20);

  const phaseText = headerStack.addText(` ${phaseLabel}`);
  phaseText.font = Font.boldSystemFont(11);
  phaseText.textColor = phaseColor;

  headerStack.addSpacer(null);

  widget.addSpacer(2);

  
  const lineStack = widget.addStack();
  lineStack.layoutHorizontally();
  lineStack.addSpacer(6);
  const line = lineStack.addStack();
  line.size = new Size(0, 2);
  line.backgroundColor = phaseColor;
  line.cornerRadius = 1;
  lineStack.addSpacer(6);

  widget.addSpacer(6);

  
  if (state.phase !== "idle") {
    
    let totalSec;
    switch (state.phase) {
      case "work":
        totalSec = data.settings.workDuration * 60;
        break;
      case "break":
        totalSec = data.settings.breakDuration * 60;
        break;
      case "longBreak":
        totalSec = data.settings.longBreakDuration * 60;
        break;
      default:
        totalSec = 0;
    }
    const elapsed = state.elapsedSeconds || 0;
    const remaining = Math.max(0, totalSec - elapsed);

    const timerStack = widget.addStack();
    timerStack.layoutHorizontally();
    timerStack.addSpacer(null);

    const timerText = timerStack.addText(UI.formatTime(remaining));
    timerText.font = Font.boldMonospacedSystemFont(32);
    timerText.textColor = phaseColor;
    timerStack.addSpacer(null);

    
    const progress = totalSec > 0 ? Math.min(elapsed / totalSec, 1) : 0;
    widget.addSpacer(4);
    const progressStack = widget.addStack();
    progressStack.layoutHorizontally();
    progressStack.addSpacer(6);
    const progressBg = progressStack.addStack();
    progressBg.size = new Size(0, 4);
    progressBg.backgroundColor = CONFIG.theme.bgTertiary;
    progressBg.cornerRadius = 2;
    const fillStack = progressStack.addStack();
    fillStack.size = new Size(0, 4);
    fillStack.backgroundColor = phaseColor;
    fillStack.cornerRadius = 2;
    
    progressBg.relativeWidth = 1.0;
    fillStack.relativeWidth = progress;
    progressStack.addSpacer(6);

    widget.addSpacer(6);

    
    const cycleStack = widget.addStack();
    cycleStack.layoutHorizontally();
    cycleStack.addSpacer(null);
    const cycleText = cycleStack.addText(`Ciclo ${state.cyclesCompleted + 1}`);
    cycleText.font = Font.mediumSystemFont(10);
    cycleText.textColor = CONFIG.theme.textTertiary;
    cycleStack.addSpacer(null);
  } else {
    
    const idleStack = widget.addStack();
    idleStack.layoutVertically();
    idleStack.addSpacer(null);

    const startText = idleStack.addText("Toca para\nempezar");
    startText.font = Font.mediumSystemFont(14);
    startText.textColor = CONFIG.theme.textTertiary;
    startText.textAlignment = 1;
    idleStack.addSpacer(null);
  }

  widget.addSpacer(2);

  
  if (pendingTasks.length > 0) {
    const separator = widget.addStack();
    separator.setPadding(0, 0, 0, 0);
    const sepLine = separator.addStack();
    sepLine.size = new Size(0, 0.5);
    sepLine.backgroundColor = CONFIG.theme.separator;
    sepLine.relativeWidth = 1;

    widget.addSpacer(4);

    const taskStack = widget.addStack();
    taskStack.layoutHorizontally();

    if (currentTask) {
      const bullet = taskStack.addText("→ ");
      bullet.font = Font.mediumSystemFont(10);
      bullet.textColor = CONFIG.theme.accent;

      const taskTitle = taskStack.addText(
        currentTask.title.length > 22 ? currentTask.title.slice(0, 22) + "…" : currentTask.title,
      );
      taskTitle.font = Font.mediumSystemFont(10);
      taskTitle.textColor = CONFIG.theme.textSecondary;
      taskTitle.lineLimit = 1;
    } else {
      const nextText = taskStack.addText(
        `${pendingTasks.length} tarea${pendingTasks.length > 1 ? "s" : ""} pendiente${pendingTasks.length > 1 ? "s" : ""}`,
      );
      nextText.font = Font.mediumSystemFont(10);
      nextText.textColor = CONFIG.theme.textTertiary;
    }
  }

  widget.addSpacer(6);
}

function buildMediumWidget(widget, data, engine) {
  const state = data.pomodoro;
  const pendingTasks = data.tasks.filter((t) => !t.completed);

  
  const mainStack = widget.addStack();
  mainStack.layoutHorizontally();

  
  const leftCol = mainStack.addStack();
  leftCol.layoutVertically();
  leftCol.setPadding(10, 12, 10, 8);
  leftCol.size = new Size(0, 0);
  leftCol.relativeWidth = 0.42;

  const isActive = state.phase !== "idle";
  const phaseColor = isActive
    ? (state.phase === "work" ? CONFIG.theme.accent : CONFIG.theme.success)
    : CONFIG.theme.textTertiary;
  const phaseEmoji = state.phase === "work" ? "🍅" : state.phase === "break" ? "☕" : state.phase === "longBreak" ? "☕" : "⏸️";
  const phaseLabel = state.phase === "work" ? "ENFOQUE" : state.phase === "break" ? "PAUSA" : state.phase === "longBreak" ? "LARGA" : "INACTIVO";

  leftCol.addText(phaseEmoji);
  leftCol.addSpacer(2);

  const label = leftCol.addText(phaseLabel);
  label.font = Font.boldSystemFont(9);
  label.textColor = phaseColor;

  
  if (isActive) {
    let totalSec;
    if (state.phase === "work") totalSec = data.settings.workDuration * 60;
    else if (state.phase === "break") totalSec = data.settings.breakDuration * 60;
    else totalSec = data.settings.longBreakDuration * 60;

    const elapsed = state.elapsedSeconds || 0;
    const remaining = Math.max(0, totalSec - elapsed);

    leftCol.addSpacer(4);
    const timeText = leftCol.addText(UI.formatTime(remaining));
    timeText.font = Font.boldMonospacedSystemFont(26);
    timeText.textColor = Color.white();

    
    const progress = totalSec > 0 ? Math.min(elapsed / totalSec, 1) : 0;
    leftCol.addSpacer(2);
    const pStack = leftCol.addStack();
    pStack.layoutHorizontally();
    const pBg = pStack.addStack();
    pBg.size = new Size(0, 3);
    pBg.backgroundColor = CONFIG.theme.bgTertiary;
    pBg.cornerRadius = 1.5;
    pBg.relativeWidth = 1;
    const pFill = pStack.addStack();
    pFill.size = new Size(0, 3);
    pFill.backgroundColor = phaseColor;
    pFill.cornerRadius = 1.5;
    pFill.relativeWidth = progress;

    leftCol.addSpacer(4);

    const cycleInfo = leftCol.addText(`#${state.cyclesCompleted + 1}`);
    cycleInfo.font = Font.mediumSystemFont(9);
    cycleInfo.textColor = CONFIG.theme.textTertiary;
  } else {
    leftCol.addSpacer(4);
    const startHint = leftCol.addText("Toca para\niniciar");
    startHint.font = Font.mediumSystemFont(12);
    startHint.textColor = CONFIG.theme.textTertiary;
  }

  leftCol.addSpacer(null);

  
  const divider = mainStack.addStack();
  divider.size = new Size(1, 0);
  divider.backgroundColor = CONFIG.theme.separator;
  divider.setPadding(8, 0, 8, 0);

  
  const rightCol = mainStack.addStack();
  rightCol.layoutVertically();
  rightCol.setPadding(10, 8, 10, 12);
  rightCol.relativeWidth = 0.58;

  const headerRight = rightCol.addText("📋 Tareas");
  headerRight.font = Font.boldSystemFont(11);
  headerRight.textColor = CONFIG.theme.text;
  rightCol.addSpacer(6);

  if (pendingTasks.length === 0) {
    rightCol.addSpacer(null);
    const emptyText = rightCol.addText("Todo listo ✓\nAñade tareas\ndesde la app");
    emptyText.font = Font.mediumSystemFont(10);
    emptyText.textColor = CONFIG.theme.textTertiary;
    rightCol.addSpacer(null);
  } else {
    
    const maxShow = Math.min(pendingTasks.length, 3);
    for (let i = 0; i < maxShow; i++) {
      const task = pendingTasks[i];
      const taskRow = rightCol.addStack();
      taskRow.layoutHorizontally();
      taskRow.addSpacer(null);

      const priorityColors = {
        baja: "▫️",
        media: "🟡",
        alta: "🔴",
        crítica: "🟣",
      };
      const dot = taskRow.addText((priorityColors[task.priority] || "▪️") + " ");
      dot.font = Font.mediumSystemFont(9);

      const title = taskRow.addText(
        task.title.length > 20 ? task.title.slice(0, 20) + "…" : task.title,
      );
      title.font = Font.mediumSystemFont(10);
      title.textColor = CONFIG.theme.textSecondary;
      title.lineLimit = 1;

      taskRow.addSpacer(null);

      if (task.pomodorosUsed > 0) {
        const count = taskRow.addText(` ${"🍅".repeat(Math.min(task.pomodorosUsed, 3))}`);
        count.font = Font.mediumSystemFont(8);
      }

      if (i < maxShow - 1) rightCol.addSpacer(4);
    }

    rightCol.addSpacer(null);

    
    if (pendingTasks.length > 3) {
      const more = rightCol.addText(`+${pendingTasks.length - 3} más`);
      more.font = Font.mediumSystemFont(9);
      more.textColor = CONFIG.theme.textTertiary;
    }
  }

  rightCol.addSpacer(6);
}

function buildLargeWidget(widget, data, engine) {
  const state = data.pomodoro;
  const pendingTasks = data.tasks.filter((t) => !t.completed);
  const todayTasks = data.tasks.filter((t) => {
    const today = new Date().toISOString().split("T")[0];
    return t.createdAt.startsWith(today) || (t.completedAt && t.completedAt.startsWith(today));
  });

  const isActive = state.phase !== "idle";
  const phaseColor = isActive
    ? (state.phase === "work" ? CONFIG.theme.accent : CONFIG.theme.success)
    : CONFIG.theme.textTertiary;
  const phaseEmoji = state.phase === "work" ? "🍅" : state.phase === "break" ? "☕" : state.phase === "longBreak" ? "☕" : "⏸️";
  const phaseLabel = state.phase === "work" ? "ENFOQUE" : state.phase === "break" ? "PAUSA CORTA" : state.phase === "longBreak" ? "PAUSA LARGA" : "INACTIVO";

  
  const headerRow = widget.addStack();
  headerRow.layoutHorizontally();
  headerRow.setPadding(12, 14, 6, 14);

  
  const leftH = headerRow.addStack();
  leftH.layoutVertically();

  const estadoRow = leftH.addStack();
  estadoRow.layoutHorizontally();
  estadoRow.addText(phaseEmoji + " ");
  const estadoLabel = estadoRow.addText(phaseLabel);
  estadoLabel.font = Font.boldSystemFont(12);
  estadoLabel.textColor = phaseColor;

  
  leftH.addSpacer(2);
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const fecha = leftH.addText(dateStr.charAt(0).toUpperCase() + dateStr.slice(1));
  fecha.font = Font.mediumSystemFont(10);
  fecha.textColor = CONFIG.theme.textTertiary;

  
  const rightH = headerRow.addStack();
  rightH.layoutVertically();
  rightH.addSpacer(null);

  if (isActive) {
    let totalSec;
    if (state.phase === "work") totalSec = data.settings.workDuration * 60;
    else if (state.phase === "break") totalSec = data.settings.breakDuration * 60;
    else totalSec = data.settings.longBreakDuration * 60;

    const elapsed = state.elapsedSeconds || 0;
    const remaining = Math.max(0, totalSec - elapsed);

    const timeBig = rightH.addText(UI.formatTime(remaining));
    timeBig.font = Font.boldMonospacedSystemFont(36);
    timeBig.textColor = Color.white();
    timeBig.textAlignment = 2;

    const totalLabel = rightH.addText(`de ${UI.formatTime(totalSec)}`);
    totalLabel.font = Font.mediumSystemFont(10);
    totalLabel.textColor = CONFIG.theme.textTertiary;
    totalLabel.textAlignment = 2;

    const progress = totalSec > 0 ? Math.min(elapsed / totalSec, 1) : 0;
    rightH.addSpacer(2);
    const pStack = rightH.addStack();
    pStack.layoutHorizontally();
    const pBg = pStack.addStack();
    pBg.size = new Size(0, 3);
    pBg.backgroundColor = CONFIG.theme.bgTertiary;
    pBg.cornerRadius = 1.5;
    pBg.relativeWidth = 1;
    const pFill = pStack.addStack();
    pFill.size = new Size(0, 3);
    pFill.backgroundColor = phaseColor;
    pFill.cornerRadius = 1.5;
    pFill.relativeWidth = progress;
  } else {
    const idleBig = rightH.addText("--:--");
    idleBig.font = Font.boldMonospacedSystemFont(36);
    idleBig.textColor = CONFIG.theme.textTertiary;
    idleBig.textAlignment = 2;

    const idleHint = rightH.addText("Inicia un Pomodoro");
    idleHint.font = Font.mediumSystemFont(10);
    idleHint.textColor = CONFIG.theme.textTertiary;
    idleHint.textAlignment = 2;
  }

  
  const sep1 = widget.addStack();
  sep1.setPadding(0, 14, 0, 14);
  const sepLine1 = sep1.addStack();
  sepLine1.size = new Size(0, 0.5);
  sepLine1.backgroundColor = CONFIG.theme.separator;
  sepLine1.relativeWidth = 1;

  widget.addSpacer(6);

  
  const statsRow = widget.addStack();
  statsRow.layoutHorizontally();
  statsRow.setPadding(0, 14, 6, 14);

  const cyclesCompleted = state.cyclesCompleted;
  const completedTasks = data.tasks.filter((t) => t.completed);
  const completedToday = completedTasks.filter((t) => {
    return t.completedAt && t.completedAt.startsWith(new Date().toISOString().split("T")[0]);
  });

  const stats = [
    { label: "Ciclos", value: cyclesCompleted, icon: "🍅" },
    { label: "Hoy", value: completedToday.length, icon: "✅" },
    { label: "Pendientes", value: pendingTasks.length, icon: "📋" },
    { label: "Total", value: data.tasks.length, icon: "📦" },
  ];

  for (const s of stats) {
    const statBlock = statsRow.addStack();
    statBlock.layoutVertically();
    statBlock.addSpacer(null);

    const val = statBlock.addText(`${s.icon} ${s.value}`);
    val.font = Font.boldSystemFont(14);
    val.textColor = Color.white();
    val.textAlignment = 1;

    const lab = statBlock.addText(s.label);
    lab.font = Font.mediumSystemFont(8);
    lab.textColor = CONFIG.theme.textTertiary;
    lab.textAlignment = 1;

    statBlock.addSpacer(null);

    if (s !== stats[stats.length - 1]) {
      statsRow.addSpacer(null);
    }
  }

  widget.addSpacer(6);

  
  const sep2 = widget.addStack();
  sep2.setPadding(0, 14, 0, 14);
  const sepLine2 = sep2.addStack();
  sepLine2.size = new Size(0, 0.5);
  sepLine2.backgroundColor = CONFIG.theme.separator;
  sepLine2.relativeWidth = 1;

  widget.addSpacer(6);

  
  const tasksHeader = widget.addStack();
  tasksHeader.layoutHorizontally();
  tasksHeader.setPadding(0, 14, 0, 14);

  const tasksTitle = tasksHeader.addText("📋 Tareas pendientes");
  tasksTitle.font = Font.boldSystemFont(11);
  tasksTitle.textColor = CONFIG.theme.text;

  tasksHeader.addSpacer(null);

  if (pendingTasks.length > 0) {
    const countBadge = tasksHeader.addText(`${pendingTasks.length}`);
    countBadge.font = Font.boldSystemFont(10);
    countBadge.textColor = CONFIG.theme.accent;
  }

  widget.addSpacer(4);

  const taskListStack = widget.addStack();
  taskListStack.layoutVertically();
  taskListStack.setPadding(0, 14, 0, 14);

  if (pendingTasks.length === 0) {
    taskListStack.addSpacer(2);
    const emptyRow = taskListStack.addText("✨ No hay tareas pendientes. ¡Buen trabajo!");
    emptyRow.font = Font.mediumSystemFont(10);
    emptyRow.textColor = CONFIG.theme.textTertiary;
    taskListStack.addSpacer(2);
  } else {
    const maxShow = Math.min(pendingTasks.length, 5);
    for (let i = 0; i < maxShow; i++) {
      const task = pendingTasks[i];
      const taskRow = taskListStack.addStack();
      taskRow.layoutHorizontally();

      const priorityDots = {
        baja: "▫️",
        media: "🟡",
        alta: "🔴",
        crítica: "🟣",
      };

      const dot = taskRow.addText((priorityDots[task.priority] || "▪️") + " ");
      dot.font = Font.mediumSystemFont(10);

      const title = taskRow.addText(
        task.title.length > 30 ? task.title.slice(0, 30) + "…" : task.title,
      );
      title.font = Font.mediumSystemFont(10);
      title.textColor = CONFIG.theme.textSecondary;
      title.lineLimit = 1;

      taskRow.addSpacer(null);

      if (task.pomodorosUsed > 0) {
        const poms = taskRow.addText(` 🍅${task.pomodorosUsed}`);
        poms.font = Font.mediumSystemFont(8);
        poms.textColor = CONFIG.theme.textTertiary;
      }

      if (i < maxShow - 1) taskListStack.addSpacer(4);
    }

    if (pendingTasks.length > 5) {
      taskListStack.addSpacer(4);
      const moreRow = taskListStack.addText(`+${pendingTasks.length - 5} tareas más...`);
      moreRow.font = Font.mediumSystemFont(9);
      moreRow.textColor = CONFIG.theme.textTertiary;
      moreRow.textAlignment = 2;
    }
  }

  widget.addSpacer(6);

  
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.setPadding(0, 14, 10, 14);
  footer.addSpacer(null);

  const hints = ["🍅 Iniciar", "☕ Pausa", "➕ Tarea", "⏹️ Parar"];
  for (const h of hints) {
    const hintStack = footer.addStack();
    hintStack.layoutVertically();
    hintStack.addText(h);
    hintStack.addSpacer(null);

    if (h !== hints[hints.length - 1]) {
      footer.addSpacer(10);
    }
  }

  footer.addSpacer(null);
}

async function showFullApp() {
  const engine = new PomodoroEngine();
  const data = engine.data;

  
  while (true) {
    const state = engine.data.pomodoro;
    const pendingCount = engine.getPendingTasks().length;

    let timerStatus;
    if (state.phase === "work") {
      timerStatus = "🍅 Enfoque activo";
    } else if (state.phase === "break" || state.phase === "longBreak") {
      timerStatus = "☕ Descanso";
    } else {
      timerStatus = "⏸️ Inactivo";
    }

    const menu = new Alert();
    menu.title = "🍅 Pomodoro Flow";
    menu.message = `${timerStatus}  ·  📋 ${pendingCount} tareas pendientes\nCiclos hoy: ${state.cyclesCompleted}  ·  ⏱️ ${UI.formatDuration(state.totalWorkSeconds)} enfocados`;

    
    const taskOpt = "📋 Gestionar tareas";
    const addOpt = "➕ Añadir tarea";

    if (state.phase === "idle") {
      menu.addAction("▶️ Iniciar Pomodoro");
    } else {
      menu.addAction("⏭️ Siguiente fase");
      menu.addAction("⏹️ Parar sesión");
    }

    menu.addAction(addOpt);
    menu.addAction(taskOpt);
    menu.addAction("📊 Estadísticas");
    menu.addAction("⚙️ Configuración");
    menu.addCancelAction("✖️ Cerrar");

    const choice = await menu.presentSheet();

    if (choice === -1) {
      
      engine.stopSession();
      return;
    }

    
    let idx = 0;

    if (state.phase === "idle") {
      if (choice === 0) {
        
        engine.startPomodoro();
        const workMin = engine.data.settings.workDuration;
        await Notifier.sendImmediate(
          "🍅 Pomodoro iniciado",
          `${workMin} minutos de enfoque. ¡A darle!`,
        );
        showResult(`🍅 Pomodoro iniciado\n\n${workMin} min de enfoque.\nRecibirás una notificación al terminar.`);
      } else if (choice === 1) {
        await addTaskFlow(engine);
      } else if (choice === 2) {
        await taskManagerFlow(engine);
      } else if (choice === 3) {
        await statsFlow(engine);
      } else if (choice === 4) {
        await settingsFlow(engine);
      }
    } else {
      
      if (choice === 0) {
        
        const nextPhase = engine.completeCycle();
        if (nextPhase === "break") {
          showResult("☕ Descanso iniciado\n\nTómate unos minutos para recargar.");
        } else if (nextPhase === "work") {
          showResult("🍅 Nuevo Pomodoro\n\n¡De vuelta al enfoque!");
        }
      } else if (choice === 1) {
        
        engine.stopSession();
        showResult("⏹️ Sesión finalizada\n\nDescansa y revisa tus logros.");
      } else if (choice === 2) {
        await addTaskFlow(engine);
      } else if (choice === 3) {
        await taskManagerFlow(engine);
      } else if (choice === 4) {
        await statsFlow(engine);
      } else if (choice === 5) {
        await settingsFlow(engine);
      }
    }
  }
}

async function addTaskFlow(engine) {
  const alert = new Alert();
  alert.title = "➕ Nueva tarea";
  alert.message = "¿Qué tienes que hacer?";
  alert.addTextField("Ej: Revisar diseño del dashboard");
  alert.addAction("Añadir");
  alert.addCancelAction("Cancelar");

  const choice = await alert.present();

  if (choice === -1) return;

  const title = alert.textFieldValue(0).trim();
  if (!title) {
    showResult("⚠️ La tarea no puede estar vacía.");
    return;
  }

  
  const prioAlert = new Alert();
  prioAlert.title = "🎯 Prioridad";
  prioAlert.message = `"${title.length > 30 ? title.slice(0, 30) + "…" : title}"`;
  prioAlert.addAction("🟢 Baja");
  prioAlert.addAction("🟡 Media");
  prioAlert.addAction("🔴 Alta");
  prioAlert.addAction("🟣 Crítica");
  prioAlert.addCancelAction("Cancelar");

  const prioChoice = await prioAlert.present();
  if (prioChoice === -1) return;

  const priorities = ["baja", "media", "alta", "crítica"];
  const priority = priorities[prioChoice];

  
  const catAlert = new Alert();
  catAlert.title = "📁 Categoría";
  const cats = Object.keys(CONFIG.categories);
  for (const c of cats) {
    catAlert.addAction(`📌 ${c.charAt(0).toUpperCase() + c.slice(1)}`);
  }
  catAlert.addCancelAction("Cancelar");

  const catChoice = await catAlert.present();
  if (catChoice === -1) return;

  const category = cats[catChoice];

  engine.addTask(title, priority, category);
  showResult(`✅ Tarea añadida\n\n"${title}"\n\nPrioridad: ${priority}\nCategoría: ${category}`);
}

async function taskManagerFlow(engine) {
  const pending = engine.getPendingTasks();

  if (pending.length === 0) {
    showResult("✨ No hay tareas pendientes.\n\n¡Disfruta del momento!");
    return;
  }

  
  const taskAlert = new Alert();
  taskAlert.title = "📋 Tareas pendientes";
  taskAlert.message = `Selecciona una tarea (${pending.length} total)`;

  for (const t of pending) {
    const pSymbols = { baja: "▫️", media: "🟡", alta: "🔴", crítica: "🟣" };
    const pSymbol = pSymbols[t.priority] || "▪️";
    const pomCount = t.pomodorosUsed > 0 ? ` 🍅${t.pomodorosUsed}` : "";
    const label = t.title.length > 35 ? t.title.slice(0, 35) + "…" : t.title;
    taskAlert.addAction(`${pSymbol} ${label}${pomCount}`);
  }

  taskAlert.addCancelAction("↩️ Volver");

  const choice = await taskAlert.present();
  if (choice === -1) return;

  const selectedTask = pending[choice];

  
  const actionAlert = new Alert();
  actionAlert.title = selectedTask.title;
  actionAlert.message = `Prioridad: ${selectedTask.priority}\nCategoría: ${selectedTask.category}\n🍅 Pomodoros: ${selectedTask.pomodorosUsed}`;

  
  if (selectedTask.id !== engine.data.pomodoro.currentTaskId) {
    actionAlert.addAction("🎯 Asignar a Pomodoro actual");
  }
  actionAlert.addAction("✅ Completar");
  actionAlert.addAction("⬆️ Subir prioridad");
  actionAlert.addAction("⬇️ Bajar prioridad");
  actionAlert.addAction("🗑️ Eliminar");
  actionAlert.addCancelAction("↩️ Volver");

  const actionChoice = await actionAlert.present();
  if (actionChoice === -1) return;

  let actIdx = 0;

  if (selectedTask.id !== engine.data.pomodoro.currentTaskId) {
    if (actionChoice === 0) {
      engine.setCurrentTask(selectedTask.id);
      showResult(`🎯 "${selectedTask.title}" asignada al Pomodoro actual.`);
      return;
    }
    actIdx = 1;
  }

  if (actionChoice === actIdx) {
    
    engine.completeTask(selectedTask.id);
    showResult(`✅ "${selectedTask.title}" completada.\n\n¡Sigue así! 🚀`);
  } else if (actionChoice === actIdx + 1) {
    
    const order = ["baja", "media", "alta", "crítica"];
    const currentIdx = order.indexOf(selectedTask.priority);
    if (currentIdx < order.length - 1) {
      engine.setPriority(selectedTask.id, order[currentIdx + 1]);
      showResult(`⬆️ Prioridad subida a ${order[currentIdx + 1]}`);
    } else {
      showResult("⚠️ Ya tiene la máxima prioridad.");
    }
  } else if (actionChoice === actIdx + 2) {
    
    const order = ["baja", "media", "alta", "crítica"];
    const currentIdx = order.indexOf(selectedTask.priority);
    if (currentIdx > 0) {
      engine.setPriority(selectedTask.id, order[currentIdx - 1]);
      showResult(`⬇️ Prioridad bajada a ${order[currentIdx - 1]}`);
    } else {
      showResult("⚠️ Ya tiene la mínima prioridad.");
    }
  } else if (actionChoice === actIdx + 3) {
    
    const confirmAlert = new Alert();
    confirmAlert.title = "🗑️ Eliminar tarea";
    confirmAlert.message = `¿Eliminar "${selectedTask.title}"?`;
    confirmAlert.addAction("Eliminar");
    confirmAlert.addCancelAction("Cancelar");
    const confirmChoice = await confirmAlert.present();
    if (confirmChoice === 0) {
      engine.deleteTask(selectedTask.id);
      showResult(`🗑️ "${selectedTask.title}" eliminada.`);
    }
  }
}

async function statsFlow(engine) {
  const stats = engine.getDailyStats();
  const sessions = engine.data.sessions;

  
  const allTimeWork = sessions.reduce((acc, s) => acc + s.workSeconds, 0);
  const allTimeBreak = sessions.reduce((acc, s) => acc + s.breakSeconds, 0);
  const allTimeCycles = sessions.reduce((acc, s) => acc + s.cyclesCompleted, 0);
  const allTimeTasksDone = sessions.reduce((acc, s) => acc + s.tasksCompleted, 0);

  const statsAlert = new Alert();
  statsAlert.title = "📊 Estadísticas";

  statsAlert.message =
    `📅 Hoy\n` +
    `⏱️ Enfoque: ${UI.formatDuration(stats.totalWorkSeconds)}\n` +
    `🍅 Ciclos: ${stats.cyclesCompleted}\n` +
    `✅ Tareas: ${stats.tasksCompleted}\n\n` +
    `🏆 Total histórico\n` +
    `⏱️ Enfoque: ${UI.formatDuration(allTimeWork)}\n` +
    `🍅 Ciclos: ${allTimeCycles}\n` +
    `✅ Tareas: ${allTimeTasksDone}\n` +
    `📦 Sesiones: ${sessions.length}`;

  statsAlert.addAction("🔄 Exportar datos");
  statsAlert.addCancelAction("↩️ Volver");

  const choice = await statsAlert.present();
  if (choice === 0) {
    
    const jsonData = DataStore.exportJSON();
    const fm = FileManager.local();
    const exportPath = fm.joinPath(fm.temporaryDirectory(), "pomodoro-flow-backup.json");
    fm.writeString(exportPath, jsonData);
    await QuickLook.present(exportPath);
  }
}

async function settingsFlow(engine) {
  const settingsAlert = new Alert();
  settingsAlert.title = "⚙️ Configuración";
  settingsAlert.message =
    `⏱️ Enfoque: ${engine.data.settings.workDuration} min\n` +
    `☕ Pausa: ${engine.data.settings.breakDuration} min\n` +
    `☕ Pausa larga: ${engine.data.settings.longBreakDuration} min\n` +
    `🔄 Ciclos antes de pausa larga: ${engine.data.settings.cyclesBeforeLongBreak}`;

  settingsAlert.addAction("⏱️ Cambiar duración enfoque");
  settingsAlert.addAction("☕ Cambiar duración pausa");
  settingsAlert.addAction("🔄 Cambiar ciclos");
  settingsAlert.addAction("📤 Importar datos");
  settingsAlert.addCancelAction("↩️ Volver");

  const choice = await settingsAlert.present();
  if (choice === -1) return;

  if (choice === 0) {
    const input = new Alert();
    input.title = "⏱️ Duración enfoque";
    input.message = "Minutos por Pomodoro (1-120)";
    input.addTextField(String(engine.data.settings.workDuration));
    input.addAction("Guardar");
    input.addCancelAction("Cancelar");
    const c = await input.present();
    if (c === 0) {
      const val = parseInt(input.textFieldValue(0));
      if (val && val >= 1 && val <= 120) {
        engine.data.settings.workDuration = val;
        engine.save();
        showResult(`✅ Enfoque cambiado a ${val} min`);
      } else {
        showResult("⚠️ Valor inválido (1-120)");
      }
    }
  } else if (choice === 1) {
    const input = new Alert();
    input.title = "☕ Duración pausa";
    input.message = "Minutos de pausa corta (1-30)";
    input.addTextField(String(engine.data.settings.breakDuration));
    input.addAction("Guardar");
    input.addCancelAction("Cancelar");
    const c = await input.present();
    if (c === 0) {
      const val = parseInt(input.textFieldValue(0));
      if (val && val >= 1 && val <= 30) {
        engine.data.settings.breakDuration = val;
        engine.save();
        showResult(`✅ Pausa cambiada a ${val} min`);
      } else {
        showResult("⚠️ Valor inválido (1-30)");
      }
    }
  } else if (choice === 2) {
    const input = new Alert();
    input.title = "🔄 Ciclos";
    input.message = "Ciclos antes de pausa larga (1-10)";
    input.addTextField(String(engine.data.settings.cyclesBeforeLongBreak));
    input.addAction("Guardar");
    input.addCancelAction("Cancelar");
    const c = await input.present();
    if (c === 0) {
      const val = parseInt(input.textFieldValue(0));
      if (val && val >= 1 && val <= 10) {
        engine.data.settings.cyclesBeforeLongBreak = val;
        engine.save();
        showResult(`✅ Ciclos cambiado a ${val}`);
      } else {
        showResult("⚠️ Valor inválido (1-10)");
      }
    }
  } else if (choice === 3) {
    
    const fm = FileManager.iCloud() || FileManager.local();
    const bookmarkedFolder = await DocumentPicker.open(false);
    if (bookmarkedFolder) {
      const files = fm.listContents(bookmarkedFolder);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));
      if (jsonFiles.length > 0) {
        const content = fm.readString(fm.joinPath(bookmarkedFolder, jsonFiles[0]));
        if (DataStore.importJSON(content)) {
          showResult("✅ Datos importados correctamente.\n\nReinicia la app para ver los cambios.");
        } else {
          showResult("⚠️ Error al importar. Verifica el formato.");
        }
      }
    }
  }
}

function showResult(message) {
  const alert = new Alert();
  alert.title = "🍅 Pomodoro Flow";
  alert.message = message;
  alert.addAction("OK");
  alert.present();
}

async function main() {
  try {
    
    const widgetParams = args.widgetParameter;
    let config = { widgetFamily: config.widgetFamily || "small" };

    if (widgetParams) {
      const parts = widgetParams.split("|");
      for (const p of parts) {
        const [key, value] = p.split("=").map((s) => s.trim().toLowerCase());
        if (key && value) {
          config[key] = value;
        }
      }
    }

    
    const isWidget = config.widgetFamily || args.widgetParameter !== null;

    if (isWidget) {
      
      const data = DataStore.load();

      
      if (data.pomodoro.sessionStart) {
        const start = new Date(data.pomodoro.sessionStart);
        data.pomodoro.elapsedSeconds = Math.floor((Date.now() - start.getTime()) / 1000);
      }

      const widget = createWidget(data, config);
      Script.setWidget(widget);
      Script.complete();
    } else {
      
      await showFullApp();
    }
  } catch (error) {
    
    console.error("Critical error: " + error.message);

    const errorWidget = new ListWidget();
    errorWidget.backgroundColor = new Color("#1C1C1E");

    const errStack = errorWidget.addStack();
    errStack.layoutVertically();
    errStack.setPadding(16, 16, 16, 16);
    errStack.addSpacer(null);

    const errIcon = errStack.addText("⚠️");
    errIcon.font = Font.boldSystemFont(28);
    errIcon.textAlignment = 1;

    errStack.addSpacer(4);

    const errTitle = errStack.addText("Error en Pomodoro Flow");
    errTitle.font = Font.boldSystemFont(12);
    errTitle.textColor = new Color("#FF453A");
    errTitle.textAlignment = 1;

    errStack.addSpacer(2);

    const errMsg = errStack.addText(error.message);
    errMsg.font = Font.mediumSystemFont(10);
    errMsg.textColor = new Color("#EBEBF599");
    errMsg.textAlignment = 1;

    errStack.addSpacer(null);

    Script.setWidget(errorWidget);
    Script.complete();
  }
}

await main();
