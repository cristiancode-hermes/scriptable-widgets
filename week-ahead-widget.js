const CONFIG = {
  defaultLatitude: 40.4168,
  defaultLongitude: -3.7038,
  defaultCityName: "Madrid",
  weatherCacheMinutes: 30,
  apiTimeoutSeconds: 8,
  locationTimeoutSeconds: 8,
  maxAgendaMedium: 2,
  maxUpcomingMedium: 4,
};

const C = {
  textPrimary: new Color("#ccd6f6"),
  textSecondary: new Color("#8892b0"),
  textMuted: new Color("#495670"),
  accent: new Color("#64ffda"),
  accentSoft: new Color("#64ffda", 0.16),
  warning: new Color("#ff6b6b"),
  rainBlue: new Color("#4fc3f7"),
  surface: new Color("#ffffff", 0.07),
  todaySurface: new Color("#64ffda", 0.12),
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

const WMO_DEFAULT = { emoji: "🌡️", label: "Sin datos" };

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
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
    this.dir = this.fm.joinPath(this.fm.documentsDirectory(), "week-ahead-cache");
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

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function buildWeekDays() {
  const days = [];
  const base = startOfDay(new Date());
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(base.getTime() + offset * 86400000);
    days.push({
      date: date,
      weekday: WEEKDAYS[date.getDay()],
      weekdayShort: WEEKDAYS_SHORT[date.getDay()],
      dayNumber: date.getDate(),
      monthShort: MONTHS_SHORT[date.getMonth()],
      isToday: offset === 0,
      weather: null,
      eventCount: 0,
      firstEventTitle: null,
      reminderCount: 0,
    });
  }
  return days;
}

async function fetchLocation() {
  try {
    const locationPromise = Location.current();
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), CONFIG.locationTimeoutSeconds * 1000));
    const location = await Promise.race([locationPromise, timeoutPromise]);
    if (location && location.latitude && location.longitude) {
      return { latitude: location.latitude, longitude: location.longitude, usingDefault: false };
    }
  } catch (error) {}
  return { latitude: CONFIG.defaultLatitude, longitude: CONFIG.defaultLongitude, usingDefault: true };
}

async function fetchForecast(latitude, longitude) {
  const cache = new WeatherCache();
  const cached = cache.read();
  if (cached) return cached;
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + latitude + "&longitude=" + longitude + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7";
    const request = new Request(url);
    request.timeoutInterval = CONFIG.apiTimeoutSeconds;
    const json = await request.loadJSON();
    const daily = json.daily || {};
    const payload = {
      weatherCodes: daily.weather_code || daily.weathercode || [],
      tempMax: daily.temperature_2m_max || [],
      tempMin: daily.temperature_2m_min || [],
      precip: daily.precipitation_probability_max || [],
    };
    cache.write(payload);
    return payload;
  } catch (error) {
    return { weatherCodes: [], tempMax: [], tempMin: [], precip: [] };
  }
}

async function fetchWeekEvents() {
  const results = [];
  try {
    const calendars = await Calendar.forEvents();
    const weekStart = startOfDay(new Date());
    const weekEnd = new Date(weekStart.getTime() + 6 * 86400000 + 86399999);
    for (const calendar of calendars) {
      if (!calendar.allowsContentModifications) continue;
      const events = await CalendarEvent.between(weekStart, weekEnd, [calendar]);
      for (const event of events) {
        if (event.startDate) results.push({ title: event.title, startDate: event.startDate });
      }
    }
  } catch (error) {}
  return results;
}

async function fetchWeekReminders() {
  const results = [];
  try {
    const lists = await Reminder.allLists();
    for (const list of lists) {
      const items = await Reminder.allIncomplete([list]);
      for (const item of items) {
        results.push({ title: item.title, dueDate: item.dueDate });
      }
    }
  } catch (error) {}
  return results;
}

function attachDataToDays(days, forecast, events, reminders) {
  const sortedEvents = [...events].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  for (let index = 0; index < days.length; index++) {
    const day = days[index];
    const dayStart = day.date.getTime();
    const dayEnd = dayStart + 86400000;
    const code = forecast.weatherCodes[index];
    const fallback = code === undefined || code === null ? WMO_DEFAULT : weatherInfo(code);
    day.weather = {
      code: code === undefined || code === null ? null : code,
      emoji: fallback.emoji,
      label: fallback.label,
      tempMax: forecast.tempMax[index],
      tempMin: forecast.tempMin[index],
      precipProb: forecast.precip[index],
    };
    const dayEvents = sortedEvents.filter((event) => {
      const start = new Date(event.startDate).getTime();
      return start >= dayStart && start < dayEnd;
    });
    day.eventCount = dayEvents.length;
    day.firstEventTitle = dayEvents.length > 0 ? dayEvents[0].title : null;
    day.reminderCount = reminders.filter((reminder) => {
      if (!reminder.dueDate) return false;
      const due = new Date(reminder.dueDate).getTime();
      return due >= dayStart && due < dayEnd;
    }).length;
  }
  return days;
}

function aggregateWeek(days, events, reminders, location) {
  const sortedEvents = [...events].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const todayStart = days[0].date.getTime();
  const todayEnd = todayStart + 86400000;
  const eventsToday = sortedEvents.filter((event) => {
    const start = new Date(event.startDate).getTime();
    return start >= todayStart && start < todayEnd;
  });
  const overdueReminders = reminders.filter((reminder) => {
    if (!reminder.dueDate) return false;
    return new Date(reminder.dueDate).getTime() < todayStart;
  }).length;
  return {
    days,
    eventsToday,
    totalEvents: days.reduce((sum, day) => sum + day.eventCount, 0),
    totalReminders: days.reduce((sum, day) => sum + day.reminderCount, 0),
    overdueReminders,
    cityName: location.usingDefault ? CONFIG.defaultCityName : "Tu ubicación",
    usingDefaultLocation: location.usingDefault,
  };
}

function gradientFor(weather) {
  const code = weather ? weather.code : null;
  let key = "clearDay";
  if (code === 2 || code === 3) key = "cloudy";
  else if (code === 45 || code === 48) key = "fog";
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) key = "rain";
  else if (code >= 71 && code <= 77 || code === 85 || code === 86) key = "snow";
  else if (code >= 95) key = "storm";
  else if (code === 0 || code === 1) key = "clearDay";
  const palette = GRADIENTS[key];
  const gradient = new LinearGradient();
  gradient.colors = palette[0].map((hex) => new Color(hex));
  gradient.locations = [0, 1];
  return gradient;
}

function buildSmall(widget, data) {
  widget.backgroundGradient = gradientFor(data.days[0].weather);
  const today = data.days[0];
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const headerText = header.addText(today.weekdayShort.toUpperCase() + " " + today.dayNumber + " " + today.monthShort.toUpperCase());
  headerText.font = Font.systemFont(9);
  headerText.textColor = C.accent;
  header.addSpacer(null);
  const todayEmoji = header.addText(today.weather.emoji);
  todayEmoji.font = Font.systemFont(15);
  widget.addSpacer(3);
  const tempRow = widget.addStack();
  tempRow.layoutHorizontally();
  tempRow.centerAlignContent();
  const tempText = tempRow.addText(formatTemp(today.weather.tempMax) + " / " + formatTemp(today.weather.tempMin));
  tempText.font = Font.mediumSystemFont(18);
  tempText.textColor = C.textPrimary;
  tempRow.addSpacer(6);
  const condition = tempRow.addText(today.weather.label);
  condition.font = Font.systemFont(8);
  condition.textColor = C.textSecondary;
  widget.addSpacer(7);
  const strip = widget.addStack();
  strip.layoutHorizontally();
  for (const day of data.days) {
    const cell = strip.addStack();
    cell.layoutVertically();
    cell.centerAlignContent();
    const letter = cell.addText(day.weekdayShort.slice(0, 1).toUpperCase());
    letter.font = Font.systemFont(7);
    letter.textColor = day.isToday ? C.accent : C.textMuted;
    const emoji = cell.addText(day.weather.emoji);
    emoji.font = Font.systemFont(9);
    const high = cell.addText(formatTemp(day.weather.tempMax));
    high.font = Font.systemFont(7);
    high.textColor = C.textSecondary;
    const marker = cell.addText(day.eventCount > 0 ? "•" : " ");
    marker.font = Font.systemFont(6);
    marker.textColor = day.eventCount > 0 ? C.accent : new Color("#ffffff", 0);
    strip.addSpacer(1);
  }
  widget.addSpacer(6);
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const eventsLabel = footer.addText("📅 " + data.totalEvents);
  eventsLabel.font = Font.systemFont(8);
  eventsLabel.textColor = C.textSecondary;
  footer.addSpacer(7);
  const remindersLabel = footer.addText("⏰ " + data.totalReminders);
  remindersLabel.font = Font.systemFont(8);
  remindersLabel.textColor = data.overdueReminders > 0 ? C.warning : C.textSecondary;
  footer.addSpacer(null);
  const cityLabel = footer.addText(data.cityName);
  cityLabel.font = Font.systemFont(7);
  cityLabel.textColor = C.textMuted;
}

function buildMedium(widget, data) {
  widget.backgroundGradient = gradientFor(data.days[0].weather);
  const today = data.days[0];
  const main = widget.addStack();
  main.layoutHorizontally();
  const leftCol = main.addStack();
  leftCol.layoutVertically();
  const dateLabel = leftCol.addText(today.weekday + " " + today.dayNumber + " " + today.monthShort);
  dateLabel.font = Font.boldSystemFont(13);
  dateLabel.textColor = C.accent;
  const weatherRow = leftCol.addStack();
  weatherRow.layoutHorizontally();
  weatherRow.centerAlignContent();
  const bigEmoji = weatherRow.addText(today.weather.emoji);
  bigEmoji.font = Font.systemFont(24);
  weatherRow.addSpacer(5);
  const temps = weatherRow.addText(formatTemp(today.weather.tempMax) + " / " + formatTemp(today.weather.tempMin));
  temps.font = Font.mediumSystemFont(14);
  temps.textColor = C.textPrimary;
  const condition = leftCol.addText(today.weather.label);
  condition.font = Font.systemFont(8);
  condition.textColor = C.textSecondary;
  if (today.weather.precipProb !== undefined && today.weather.precipProb !== null && today.weather.precipProb > 20) {
    const precip = leftCol.addText("💧 " + today.weather.precipProb + "%");
    precip.font = Font.systemFont(8);
    precip.textColor = C.rainBlue;
  }
  leftCol.addSpacer(5);
  const agendaHeader = leftCol.addText("AGENDA HOY");
  agendaHeader.font = Font.systemFont(7);
  agendaHeader.textColor = C.textMuted;
  const agendaItems = data.eventsToday.slice(0, CONFIG.maxAgendaMedium);
  if (agendaItems.length === 0) {
    const empty = leftCol.addText("Sin eventos");
    empty.font = Font.systemFont(8);
    empty.textColor = C.textMuted;
  } else {
    for (const event of agendaItems) {
      const agendaRow = leftCol.addStack();
      agendaRow.layoutHorizontally();
      agendaRow.centerAlignContent();
      const time = agendaRow.addText(formatTime(new Date(event.startDate)));
      time.font = Font.monospacedSystemFont(8);
      time.textColor = C.accent;
      agendaRow.addSpacer(4);
      const title = agendaRow.addText(shortenTitle(event.title, 16));
      title.font = Font.systemFont(8);
      title.textColor = C.textPrimary;
    }
  }
  const remindersLine = leftCol.addText(data.overdueReminders > 0 ? "⚠️ " + data.overdueReminders + " atrasados" : "⏰ " + data.totalReminders + " pendientes");
  remindersLine.font = Font.systemFont(8);
  remindersLine.textColor = data.overdueReminders > 0 ? C.warning : C.textMuted;
  main.addSpacer(10);
  const divider = main.addText("│");
  divider.font = Font.systemFont(46);
  divider.textColor = new Color("#64ffda", 0.25);
  main.addSpacer(10);
  const rightCol = main.addStack();
  rightCol.layoutVertically();
  const weekLabel = rightCol.addText("PRÓXIMOS DÍAS");
  weekLabel.font = Font.systemFont(7);
  weekLabel.textColor = C.textMuted;
  const upcomingDays = data.days.slice(1, 1 + CONFIG.maxUpcomingMedium);
  for (const day of upcomingDays) {
    const row = rightCol.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    row.backgroundColor = day.eventCount > 0 || day.reminderCount > 0 ? C.surface : null;
    row.cornerRadius = 6;
    row.setPadding(4, 6, 4, 6);
    const dayLabel = row.addText(day.weekdayShort + " " + day.dayNumber);
    dayLabel.font = Font.systemFont(9);
    dayLabel.textColor = C.textPrimary;
    row.addSpacer(4);
    const dayEmoji = row.addText(day.weather.emoji);
    dayEmoji.font = Font.systemFont(11);
    row.addSpacer(4);
    const dayHigh = row.addText(formatTemp(day.weather.tempMax));
    dayHigh.font = Font.systemFont(8);
    dayHigh.textColor = C.textSecondary;
    row.addSpacer(null);
    const busy = row.addText((day.eventCount > 0 ? "📅" + day.eventCount : "") + (day.reminderCount > 0 ? " ⏰" + day.reminderCount : ""));
    busy.font = Font.systemFont(8);
    busy.textColor = day.eventCount > 0 ? C.accent : C.textMuted;
  }
}

function buildLarge(widget, data) {
  widget.backgroundGradient = gradientFor(data.days[0].weather);
  const today = data.days[0];
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const title = header.addText("SEMANA DEL " + today.dayNumber + " " + today.monthShort.toUpperCase());
  title.font = Font.boldSystemFont(14);
  title.textColor = C.textPrimary;
  header.addSpacer(null);
  const counts = header.addText("📅 " + data.totalEvents + " · ⏰ " + data.totalReminders + (data.overdueReminders > 0 ? " · ⚠️ " + data.overdueReminders : ""));
  counts.font = Font.systemFont(8);
  counts.textColor = data.overdueReminders > 0 ? C.warning : C.textSecondary;
  widget.addSpacer(2);
  const metaRow = widget.addStack();
  metaRow.layoutHorizontally();
  metaRow.centerAlignContent();
  const cityLabel = metaRow.addText(data.cityName + (data.usingDefaultLocation ? " · por defecto" : ""));
  cityLabel.font = Font.systemFont(7);
  cityLabel.textColor = C.textMuted;
  metaRow.addSpacer(null);
  const todaySummary = metaRow.addText("Hoy " + today.weather.emoji + " " + formatTemp(today.weather.tempMax) + " / " + formatTemp(today.weather.tempMin));
  todaySummary.font = Font.mediumSystemFont(10);
  todaySummary.textColor = C.accent;
  widget.addSpacer(4);
  for (const day of data.days) {
    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    row.backgroundColor = day.isToday ? C.todaySurface : C.surface;
    row.cornerRadius = 7;
    row.setPadding(5, 8, 5, 8);
    if (day.isToday) {
      const badge = row.addText("HOY");
      badge.font = Font.boldSystemFont(7);
      badge.textColor = C.accent;
      row.addSpacer(4);
    }
    const dayLabel = row.addText(day.weekdayShort + " " + day.dayNumber);
    dayLabel.font = Font.mediumSystemFont(10);
    dayLabel.textColor = day.isToday ? C.accent : C.textPrimary;
    row.addSpacer(6);
    const emoji = row.addText(day.weather.emoji);
    emoji.font = Font.systemFont(11);
    row.addSpacer(6);
    const temps = row.addText(formatTemp(day.weather.tempMax) + " / " + formatTemp(day.weather.tempMin));
    temps.font = Font.monospacedSystemFont(8);
    temps.textColor = C.textPrimary;
    row.addSpacer(8);
    if (day.weather.precipProb !== undefined && day.weather.precipProb !== null && day.weather.precipProb > 20) {
      const precip = row.addText("💧" + day.weather.precipProb + "%");
      precip.font = Font.systemFont(8);
      precip.textColor = C.rainBlue;
      row.addSpacer(8);
    }
    row.addSpacer(null);
    const agenda = row.addText(day.eventCount > 0 ? (day.firstEventTitle ? shortenTitle(day.firstEventTitle, 24) : "📅 " + day.eventCount) : "—");
    agenda.font = Font.systemFont(8);
    agenda.textColor = day.eventCount > 0 ? C.textSecondary : C.textMuted;
    row.addSpacer(8);
    const reminders = row.addText(day.reminderCount > 0 ? "⏰ " + day.reminderCount : "");
    reminders.font = Font.systemFont(8);
    reminders.textColor = day.reminderCount > 0 ? C.textSecondary : new Color("#ffffff", 0);
    widget.addSpacer(2);
  }
  widget.addSpacer(2);
  const footer = widget.addStack();
  footer.layoutHorizontally();
  const hint = footer.addText("Toca para abrir en Scriptable");
  hint.font = Font.systemFont(7);
  hint.textColor = C.textMuted;
  footer.addSpacer(null);
  const refresh = footer.addText("Actualiza cada " + CONFIG.weatherCacheMinutes + " min");
  refresh.font = Font.systemFont(7);
  refresh.textColor = C.textMuted;
}

async function createWidget() {
  try {
    const location = await fetchLocation();
    const forecast = await fetchForecast(location.latitude, location.longitude);
    const [events, reminders] = await Promise.all([fetchWeekEvents(), fetchWeekReminders()]);
    const days = attachDataToDays(buildWeekDays(), forecast, events, reminders);
    const data = aggregateWeek(days, events, reminders, location);
    const widget = new ListWidget();
    const family = config.widgetFamily;
    if (family === "small") {
      buildSmall(widget, data);
    } else if (family === "medium") {
      buildMedium(widget, data);
    } else {
      buildLarge(widget, data);
    }
    widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
    widget.refreshAfterDate = new Date(Date.now() + CONFIG.weatherCacheMinutes * 60000);
    return widget;
  } catch (error) {
    const fallback = new ListWidget();
    const gradient = new LinearGradient();
    gradient.colors = [new Color("#0a192f"), new Color("#1a1a2e")];
    gradient.locations = [0, 1];
    fallback.backgroundGradient = gradient;
    fallback.addSpacer();
    const message = fallback.addText("⚠️ No se pudo cargar la semana");
    message.font = Font.systemFont(13);
    message.textColor = new Color("#ff6b6b");
    fallback.addSpacer();
    fallback.url = "scriptable:///open/" + encodeURIComponent(Script.name());
    fallback.refreshAfterDate = new Date(Date.now() + 600000);
    return fallback;
  }
}

try {
  const widget = await createWidget();
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentMedium();
  }
} catch (error) {
  const errorWidget = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [new Color("#1a1a2e"), new Color("#0f0c29")];
  gradient.locations = [0, 1];
  errorWidget.backgroundGradient = gradient;
  errorWidget.addSpacer();
  errorWidget.addText("⚠️ Widget Error");
  errorWidget.addText("Toca para reintentar");
  errorWidget.addSpacer();
  errorWidget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  errorWidget.refreshAfterDate = new Date(Date.now() + 600000);
  Script.setWidget(errorWidget);
}
Script.complete();
