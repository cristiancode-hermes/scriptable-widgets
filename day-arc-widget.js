const CONFIG = {
  defaultLatitude: 40.4168,
  defaultLongitude: -3.7038,
  defaultCityName: "Madrid",
  weatherCacheMinutes: 30,
  apiTimeoutSeconds: 8,
  locationTimeoutSeconds: 8,
  maxEventsMedium: 2,
  maxEventsLarge: 4,
  maxRemindersMedium: 2,
  maxRemindersLarge: 4,
  curveHoursMedium: 8,
  curveHoursLarge: 12,
};

const C = {
  textPrimary: new Color("#e8ecf4"),
  textSecondary: new Color("#aab4c8"),
  textMuted: new Color("#71809c"),
  accent: new Color("#64ffda"),
  accentSoft: new Color("#64ffda", 0.16),
  warning: new Color("#ff6b6b"),
  rainBlue: new Color("#4fc3f7"),
  surface: new Color("#ffffff", 0.07),
};

const WMO_MAP = {
  0: { emoji: "☀️", label: "Despejado" },
  1: { emoji: "🌤️", label: "Mayormente despejado" },
  2: { emoji: "⛅", label: "Parcialmente nublado" },
  3: { emoji: "☁️", label: "Nublado" },
  45: { emoji: "🌫️", label: "Niebla" },
  48: { emoji: "🌫️", label: "Niebla escarchada" },
  51: { emoji: "🌦️", label: "Llovizna ligera" },
  53: { emoji: "🌦️", label: "Llovizna" },
  55: { emoji: "🌧️", label: "Llovizna densa" },
  56: { emoji: "🌧️", label: "Llovizna helada" },
  57: { emoji: "🌧️", label: "Llovizna helada densa" },
  61: { emoji: "🌧️", label: "Lluvia ligera" },
  63: { emoji: "🌧️", label: "Lluvia" },
  65: { emoji: "🌧️", label: "Lluvia fuerte" },
  66: { emoji: "🌧️", label: "Lluvia helada" },
  67: { emoji: "🌧️", label: "Lluvia helada fuerte" },
  71: { emoji: "🌨️", label: "Nieve ligera" },
  73: { emoji: "🌨️", label: "Nieve" },
  75: { emoji: "❄️", label: "Nieve fuerte" },
  77: { emoji: "❄️", label: "Granos de nieve" },
  80: { emoji: "🌦️", label: "Chubascos ligeros" },
  81: { emoji: "🌧️", label: "Chubascos" },
  82: { emoji: "⛈️", label: "Chubascos violentos" },
  85: { emoji: "🌨️", label: "Chubascos de nieve" },
  86: { emoji: "🌨️", label: "Chubascos de nieve fuertes" },
  95: { emoji: "⛈️", label: "Tormenta" },
  96: { emoji: "⛈️", label: "Tormenta con granizo" },
  99: { emoji: "⛈️", label: "Tormenta con granizo fuerte" },
};

const WMO_DEFAULT = { emoji: "🌡️", label: "Condición desconocida" };

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const GRADIENTS = {
  clearDay: [["#0b2e59", "#123c6d"], ["#4fc3f7", "#ffd54f"]],
  clearNight: [["#0a1128", "#1a1a3e"], ["#64b5f6", "#9575cd"]],
  cloudy: [["#232a3f", "#2f3a52"], ["#90a4c1", "#5c6b8a"]],
  rain: [["#12233a", "#1b3a4a"], ["#4a7a9c", "#2e5a78"]],
  storm: [["#1a1030", "#241545"], ["#7e57c2", "#37474f"]],
  snow: [["#1b2a4a", "#2e4a6b"], ["#b3e5fc", "#8fb8de"]],
  fog: [["#2a2f3a", "#3a4250"], ["#9aa5b8", "#6b7688"]],
};

class WeatherCache {
  constructor() {
    this.fm = FileManager.local();
    this.dir = this.fm.joinPath(this.fm.documentsDirectory(), "day-arc-cache");
    this.file = this.fm.joinPath(this.dir, "forecast.json");
  }

  read() {
    try {
      if (!this.fm.fileExists(this.file)) return null;
      const parsed = JSON.parse(this.fm.readString(this.file));
      if (!parsed || !parsed.savedAt || !parsed.payload) return null;
      const ageMinutes = (Date.now() - parsed.savedAt) / 60000;
      if (ageMinutes > CONFIG.weatherCacheMinutes) return null;
      return parsed.payload;
    } catch (error) {
      return null;
    }
  }

  write(payload) {
    try {
      if (!this.fm.fileExists(this.dir)) this.fm.createDirectory(this.dir);
      this.fm.writeString(this.file, JSON.stringify({ savedAt: Date.now(), payload }));
    } catch (error) {}
  }
}

function pad2(value) {
  return value < 10 ? "0" + value : "" + value;
}

function formatTime(date) {
  return pad2(date.getHours()) + ":" + pad2(date.getMinutes());
}

function formatTemp(value) {
  if (value === null || value === undefined) return "--";
  return Math.round(value) + "°";
}

function shortenTitle(title, maxLength) {
  if (!title) return "Sin título";
  return title.length > maxLength ? title.slice(0, maxLength - 1) + "…" : title;
}

function weatherInfo(code) {
  return WMO_MAP[code] || WMO_DEFAULT;
}

function todayHeaderLong() {
  const now = new Date();
  return WEEKDAYS[now.getDay()] + " " + now.getDate() + " de " + MONTHS[now.getMonth()];
}

function todayHeaderShort() {
  const now = new Date();
  return WEEKDAYS_SHORT[now.getDay()] + " " + now.getDate() + " " + MONTHS_SHORT[now.getMonth()];
}

async function resolveCoordinates() {
  try {
    Location.setAccuracyToThreeKilometers();
    const location = await Promise.race([
      Location.current().catch(() => null),
      new Promise(resolve => setTimeout(() => resolve(null), CONFIG.locationTimeoutSeconds * 1000)),
    ]);
    if (location && location.latitude) {
      return { lat: location.latitude, lon: location.longitude, cityName: null };
    }
  } catch (error) {}
  return { lat: CONFIG.defaultLatitude, lon: CONFIG.defaultLongitude, cityName: CONFIG.defaultCityName };
}

async function fetchWeatherData(lat, lon, cache) {
  const cached = cache.read();
  if (cached) return cached;
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=1";
  const request = new Request(url);
  request.timeoutInterval = CONFIG.apiTimeoutSeconds;
  const json = await request.loadJSON();
  if (json && json.current) cache.write(json);
  return json;
}

function parseCurrentWeather(json) {
  const current = (json && json.current) || {};
  const code = current.weather_code ?? current.weathercode ?? 0;
  const info = weatherInfo(code);
  return {
    temp: current.temperature_2m ?? null,
    feelsLike: current.apparent_temperature ?? null,
    humidity: current.relative_humidity_2m ?? null,
    wind: current.wind_speed_10m ?? null,
    code: code,
    emoji: info.emoji,
    label: info.label,
  };
}

function parseDailyExtremes(json) {
  const daily = (json && json.daily) || {};
  const maxArray = daily.temperature_2m_max || [];
  const minArray = daily.temperature_2m_min || [];
  return { maxTemp: maxArray[0] ?? null, minTemp: minArray[0] ?? null };
}

function parseHourlyPoints(json, maxPoints) {
  try {
    const hourly = (json && json.hourly) || {};
    const times = hourly.time || [];
    const temps = hourly.temperature_2m || [];
    const pops = hourly.precipitation_probability || [];
    const codes = hourly.weather_code || hourly.weathercode || [];
    if (times.length === 0) return [];
    const nowHour = new Date().getHours();
    const points = [];
    for (let i = 0; i < times.length && points.length < maxPoints; i++) {
      const hour = parseInt(times[i].slice(11, 13), 10);
      if (isNaN(hour) || hour < nowHour) continue;
      points.push({ hour: hour, temp: temps[i] ?? null, pop: pops[i] ?? 0, code: codes[i] ?? 0 });
    }
    if (points.length === 0) {
      for (let i = 0; i < times.length && points.length < maxPoints; i++) {
        const hour = parseInt(times[i].slice(11, 13), 10);
        points.push({ hour: isNaN(hour) ? 0 : hour, temp: temps[i] ?? null, pop: pops[i] ?? 0, code: codes[i] ?? 0 });
      }
    }
    return points;
  } catch (error) {
    return [];
  }
}

async function fetchTodayEvents() {
  try {
    const calendars = await Calendar.forEvents();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const events = [];
    for (const cal of calendars) {
      if (!cal.allowsContentModifications) continue;
      const found = await CalendarEvent.between(start, end, [cal]);
      for (const event of found) events.push(event);
    }
    events.sort((a, b) => a.startDate - b.startDate);
    return events;
  } catch (error) {
    return [];
  }
}

async function fetchDueReminders() {
  try {
    let lists = [];
    try {
      lists = await Reminder.allLists();
    } catch (error) {
      lists = [];
    }
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const reminders = [];
    for (const list of lists) {
      const items = await Reminder.allIncomplete([list]);
      for (const item of items) {
        if (item.isCompleted) continue;
        if (item.dueDate && item.dueDate.getTime() > end.getTime()) continue;
        reminders.push(item);
      }
    }
    reminders.sort((a, b) => (a.dueDate || new Date(0)).getTime() - (b.dueDate || new Date(0)).getTime());
    return reminders;
  } catch (error) {
    return [];
  }
}

function formatEventTime(event) {
  try {
    if (!event.startDate) return "";
    return formatTime(event.startDate);
  } catch (error) {
    return "";
  }
}

function formatReminderTime(reminder) {
  try {
    if (!reminder.dueDate) return "";
    return formatTime(reminder.dueDate);
  } catch (error) {
    return "";
  }
}

function isOverdue(reminder) {
  try {
    return !!reminder.dueDate && reminder.dueDate.getTime() < Date.now();
  } catch (error) {
    return false;
  }
}

function applyBackground(widget, code) {
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour >= 21;
  let key = "cloudy";
  if (code === 0 || code === 1) key = isNight ? "clearNight" : "clearDay";
  else if (code >= 45 && code <= 48) key = "fog";
  else if (code >= 51 && code <= 67) key = "rain";
  else if (code >= 71 && code <= 77) key = "snow";
  else if (code >= 80 && code <= 82) key = "rain";
  else if (code >= 85 && code <= 86) key = "snow";
  else if (code >= 95) key = "storm";
  const pair = GRADIENTS[key];
  const bg = new LinearGradient();
  bg.colors = pair[0].map(hex => new Color(hex));
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
}

function drawHourlyCurve(canvas, points, palette) {
  try {
    const valid = points.filter(p => typeof p.temp === "number");
    if (valid.length < 2) return;
    const width = canvas.size.width;
    const height = canvas.size.height;
    let minTemp = Infinity;
    let maxTemp = -Infinity;
    for (const point of valid) {
      if (point.temp < minTemp) minTemp = point.temp;
      if (point.temp > maxTemp) maxTemp = point.temp;
    }
    if (maxTemp - minTemp < 1) {
      minTemp -= 1;
      maxTemp += 1;
    }
    const padX = 6;
    const padTop = 5;
    const padBottom = 4;
    const chartHeight = height - padTop - padBottom;
    const stepX = (width - padX * 2) / (valid.length - 1);
    const yFor = temp => padTop + (1 - (temp - minTemp) / (maxTemp - minTemp)) * chartHeight;

    const path = new Path();
    valid.forEach((point, index) => {
      const x = padX + index * stepX;
      const y = yFor(point.temp);
      if (index === 0) path.move(new Point(x, y));
      else path.addLine(new Point(x, y));
    });
    canvas.addPath(path);
    canvas.setStrokeColor(new Color(palette.line));
    canvas.setLineWidth(2);
    canvas.strokePath();

    valid.forEach((point, index) => {
      const x = padX + index * stepX;
      const y = yFor(point.temp);
      canvas.setFillColor(new Color(palette.dot));
      canvas.fillEllipse(new Rect(x - 2.5, y - 2.5, 5, 5));
      if (point.pop >= 30) {
        const barHeight = Math.min(10, point.pop / 10);
        canvas.setFillColor(new Color(palette.rain, 0.35 + point.pop / 300));
        canvas.fillRect(new Rect(x - 2, height - padBottom - barHeight, 4, barHeight));
      }
    });
  } catch (error) {}
}

function addCurveSection(parent, data, family, canvasHeight) {
  if (!data.hourly || data.hourly.length < 2) return;
  const canvas = new DrawContext();
  canvas.size = new Size(family === "large" ? 300 : 292, canvasHeight);
  canvas.opaque = false;
  canvas.respectScreenScale = true;
  drawHourlyCurve(canvas, data.hourly, { line: "#64ffda", dot: "#64ffda", rain: "#4fc3f7" });
  const artStack = parent.addStack();
  artStack.addImage(canvas.getImage());
  const maxPop = Math.max(...data.hourly.map(p => p.pop || 0));
  const caption = parent.addStack();
  caption.layoutHorizontally();
  caption.centerAlignContent();
  const captionText = caption.addText("Temperatura próximas " + data.hourly.length + " h");
  captionText.font = Font.systemFont(8);
  captionText.textColor = C.textMuted;
  if (maxPop >= 30) {
    caption.addSpacer(6);
    const rainBadge = caption.addText("🌧 " + maxPop + "%");
    rainBadge.font = Font.mediumSystemFont(8);
    rainBadge.textColor = C.rainBlue;
  }
}

function addEventRow(parent, event, maxLength) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const time = formatEventTime(event);
  const marker = row.addText(time ? "🕑" : "📅");
  marker.font = Font.systemFont(10);
  row.addSpacer(4);
  const title = row.addText(shortenTitle(event.title, maxLength));
  title.font = Font.systemFont(10);
  title.textColor = C.textPrimary;
  if (time) {
    row.addSpacer(null);
    const timeLabel = row.addText(time);
    timeLabel.font = Font.systemFont(10);
    timeLabel.textColor = C.accent;
  }
  parent.addSpacer(3);
}

function addReminderRow(parent, reminder, maxLength) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const overdue = isOverdue(reminder);
  const marker = row.addText(overdue ? "⚠️" : "🔔");
  marker.font = Font.systemFont(10);
  row.addSpacer(4);
  const title = row.addText(shortenTitle(reminder.title, maxLength));
  title.font = Font.systemFont(10);
  title.textColor = overdue ? C.warning : C.textPrimary;
  const time = formatReminderTime(reminder);
  if (time) {
    row.addSpacer(null);
    const timeLabel = row.addText(time);
    timeLabel.font = Font.systemFont(10);
    timeLabel.textColor = overdue ? C.warning : C.textMuted;
  }
  parent.addSpacer(3);
}

function addEmptyRow(parent, message) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const text = row.addText(message);
  text.font = Font.systemFont(10);
  text.textColor = C.textMuted;
  parent.addSpacer(3);
}

function addWeatherHeader(widget, data, family) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const dateLabel = header.addText(family === "small" ? todayHeaderShort() : todayHeaderLong());
  dateLabel.font = Font.mediumSystemFont(family === "small" ? 11 : 12);
  dateLabel.textColor = C.accent;
  header.addSpacer(null);
  const cityLabel = header.addText(data.cityName ? data.cityName : "Mi ubicación");
  cityLabel.font = Font.systemFont(10);
  cityLabel.textColor = C.textMuted;
  widget.addSpacer(6);
}

function buildSmall(widget, data) {
  widget.setPadding(12, 14, 12, 14);
  const root = widget.addStack();
  root.layoutVertically();
  root.addSpacer(null);
  const header = root.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const dateLabel = header.addText(todayHeaderShort());
  dateLabel.font = Font.mediumSystemFont(11);
  dateLabel.textColor = C.accent;
  header.addSpacer(null);
  const cityLabel = header.addText(data.cityName ? data.cityName : "Mi ubicación");
  cityLabel.font = Font.systemFont(9);
  cityLabel.textColor = C.textMuted;
  root.addSpacer(6);
  const main = root.addStack();
  main.layoutHorizontally();
  main.centerAlignContent();
  const emoji = main.addText(data.current.emoji);
  emoji.font = Font.systemFont(24);
  main.addSpacer(8);
  const temp = main.addText(formatTemp(data.current.temp));
  temp.font = Font.boldSystemFont(30);
  temp.textColor = C.textPrimary;
  root.addSpacer(2);
  const condition = root.addText(data.current.label);
  condition.font = Font.systemFont(10);
  condition.textColor = C.textSecondary;
  const extremes = root.addText("↑ " + formatTemp(data.maxTemp) + "   ↓ " + formatTemp(data.minTemp));
  extremes.font = Font.systemFont(10);
  extremes.textColor = C.textMuted;
  root.addSpacer(6);
  if (data.events.length > 0) {
    addEventRow(root, data.events[0], 16);
  } else {
    addEmptyRow(root, "Sin eventos hoy");
  }
  const reminderCount = data.reminders.length;
  const reminderRow = root.addStack();
  reminderRow.layoutHorizontally();
  reminderRow.centerAlignContent();
  const reminderMarker = reminderRow.addText(reminderCount > 0 ? "🔔" : "🗒️");
  reminderMarker.font = Font.systemFont(9);
  reminderRow.addSpacer(4);
  const reminderText = reminderRow.addText(reminderCount > 0 ? reminderCount + " pendientes" : "Sin recordatorios");
  reminderText.font = Font.systemFont(9);
  reminderText.textColor = reminderCount > 0 ? C.textSecondary : C.textMuted;
  root.addSpacer(null);
}

function buildMedium(widget, data) {
  widget.setPadding(12, 14, 12, 14);
  const root = widget.addStack();
  root.layoutVertically();
  addWeatherHeader(root, data, "medium");
  const body = root.addStack();
  body.layoutHorizontally();
  const left = body.addStack();
  left.layoutVertically();
  left.centerAlignContent();
  const main = left.addStack();
  main.layoutHorizontally();
  main.centerAlignContent();
  const emoji = main.addText(data.current.emoji);
  emoji.font = Font.systemFont(26);
  main.addSpacer(6);
  const temp = main.addText(formatTemp(data.current.temp));
  temp.font = Font.boldSystemFont(32);
  temp.textColor = C.textPrimary;
  left.addSpacer(2);
  const condition = left.addText(data.current.label);
  condition.font = Font.systemFont(10);
  condition.textColor = C.textSecondary;
  const extremes = left.addText("↑ " + formatTemp(data.maxTemp) + "   ↓ " + formatTemp(data.minTemp));
  extremes.font = Font.systemFont(10);
  extremes.textColor = C.textMuted;
  body.addSpacer(12);
  const divider = body.addText("│");
  divider.font = Font.systemFont(40);
  divider.textColor = new Color("#64ffda", 0.25);
  body.addSpacer(12);
  const right = body.addStack();
  right.layoutVertically();
  const eventsHeader = right.addText("📅 Eventos");
  eventsHeader.font = Font.mediumSystemFont(10);
  eventsHeader.textColor = C.accent;
  right.addSpacer(3);
  if (data.events.length > 0) {
    data.events.slice(0, CONFIG.maxEventsMedium).forEach(event => addEventRow(right, event, 16));
  } else {
    addEmptyRow(right, "Sin eventos hoy");
  }
  right.addSpacer(3);
  const remindersHeader = right.addText("🔔 Recordatorios");
  remindersHeader.font = Font.mediumSystemFont(10);
  remindersHeader.textColor = C.accent;
  right.addSpacer(3);
  if (data.reminders.length > 0) {
    data.reminders.slice(0, CONFIG.maxRemindersMedium).forEach(reminder => addReminderRow(right, reminder, 16));
  } else {
    addEmptyRow(right, "Sin recordatorios");
  }
  root.addSpacer(6);
  addCurveSection(root, data, "medium", 34);
}

function buildLarge(widget, data) {
  widget.setPadding(14, 16, 12, 16);
  const root = widget.addStack();
  root.layoutVertically();
  addWeatherHeader(root, data, "large");
  const hero = root.addStack();
  hero.layoutHorizontally();
  hero.centerAlignContent();
  const emoji = hero.addText(data.current.emoji);
  emoji.font = Font.systemFont(34);
  hero.addSpacer(10);
  const heroCol = hero.addStack();
  heroCol.layoutVertically();
  const temp = heroCol.addText(formatTemp(data.current.temp));
  temp.font = Font.boldSystemFont(40);
  temp.textColor = C.textPrimary;
  const condition = heroCol.addText(data.current.label);
  condition.font = Font.systemFont(11);
  condition.textColor = C.textSecondary;
  hero.addSpacer(null);
  const metaCol = hero.addStack();
  metaCol.layoutVertically();
  metaCol.centerAlignContent();
  const extremes = metaCol.addText("↑ " + formatTemp(data.maxTemp) + "   ↓ " + formatTemp(data.minTemp));
  extremes.font = Font.systemFont(12);
  extremes.textColor = C.accent;
  const metaParts = [];
  if (data.current.wind !== null && data.current.wind !== undefined) metaParts.push("💨 " + Math.round(data.current.wind) + " km/h");
  if (data.current.humidity !== null && data.current.humidity !== undefined) metaParts.push("💧 " + Math.round(data.current.humidity) + "%");
  if (metaParts.length > 0) {
    const meta = metaCol.addText(metaParts.join("   "));
    meta.font = Font.systemFont(10);
    meta.textColor = C.textMuted;
  }
  root.addSpacer(8);
  addCurveSection(root, data, "large", 60);
  root.addSpacer(8);
  const columns = root.addStack();
  columns.layoutHorizontally();
  const leftCol = columns.addStack();
  leftCol.layoutVertically();
  const eventsHeader = leftCol.addText("📅 Eventos de hoy");
  eventsHeader.font = Font.mediumSystemFont(11);
  eventsHeader.textColor = C.accent;
  leftCol.addSpacer(3);
  if (data.events.length > 0) {
    data.events.slice(0, CONFIG.maxEventsLarge).forEach(event => addEventRow(leftCol, event, 22));
  } else {
    addEmptyRow(leftCol, "Sin eventos hoy");
  }
  columns.addSpacer(14);
  const rightCol = columns.addStack();
  rightCol.layoutVertically();
  const remindersHeader = rightCol.addText("🔔 Recordatorios");
  remindersHeader.font = Font.mediumSystemFont(11);
  remindersHeader.textColor = C.accent;
  rightCol.addSpacer(3);
  if (data.reminders.length > 0) {
    data.reminders.slice(0, CONFIG.maxRemindersLarge).forEach(reminder => addReminderRow(rightCol, reminder, 22));
  } else {
    addEmptyRow(rightCol, "Sin recordatorios");
  }
  root.addSpacer(8);
  const footer = root.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const hint = footer.addText("Toca para abrir en Scriptable");
  hint.font = Font.systemFont(8);
  hint.textColor = C.textMuted;
}

function createErrorWidget() {
  const widget = new ListWidget();
  const bg = new LinearGradient();
  bg.colors = [new Color("#1a1a2e"), new Color("#0f0c29")];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
  widget.addSpacer();
  const message = widget.addText("⚠️ Widget no disponible");
  message.font = Font.systemFont(14);
  message.textColor = new Color("#ff6b6b");
  widget.addSpacer();
  widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + 600000);
  return widget;
}

async function createWidget() {
  try {
    const family = config.widgetFamily;
    const coords = await resolveCoordinates();
    const cache = new WeatherCache();
    const weather = await fetchWeatherData(coords.lat, coords.lon, cache);
    const [events, reminders] = await Promise.all([fetchTodayEvents(), fetchDueReminders()]);
    const current = parseCurrentWeather(weather);
    const extremes = parseDailyExtremes(weather);
    const data = {
      current: current,
      maxTemp: extremes.maxTemp,
      minTemp: extremes.minTemp,
      hourly: parseHourlyPoints(weather, family === "large" ? CONFIG.curveHoursLarge : CONFIG.curveHoursMedium),
      events: events,
      reminders: reminders,
      cityName: coords.cityName,
    };
    const widget = new ListWidget();
    applyBackground(widget, current.code);
    if (family === "small") buildSmall(widget, data);
    else if (family === "medium") buildMedium(widget, data);
    else buildLarge(widget, data);
    widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
    widget.refreshAfterDate = new Date(Date.now() + CONFIG.weatherCacheMinutes * 60000);
    return widget;
  } catch (error) {
    return createErrorWidget();
  }
}

async function run() {
  const widget = await createWidget();
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentMedium();
  }
}

try {
  await run();
} catch (error) {
  const widget = createErrorWidget();
  if (config.runsInWidget) Script.setWidget(widget);
}
Script.complete();
