const CONFIG = {
  nightGradient: ["#0a192f", "#112240", "#1a1a2e"],
  dayGradient: ["#0f2027", "#203a43", "#2c5364"],
  accent: "#64ffda",
  warning: "#ff6b6b",
  text: "#ccd6f6",
  muted: "#8892b0",
  faint: "#495670",
  defaultCity: "Madrid",
  defaultCoords: { lat: 40.4168, lon: -3.7038 },
  locationKey: "weekday-pulse-location",
  refreshMinutes: 30,
  maxEvents: 4,
  maxUpcoming: 3,
  maxOverdue: 2,
};

const WEATHER_EMOJI = {
  clear: "☀️",
  partly: "🌤️",
  cloudy: "☁️",
  fog: "🌫️",
  rain: "🌧️",
  snow: "❄️",
  storm: "⛈️",
  night: "🌙",
};

function buildQueryString(params) {
  return Object.entries(params)
    .map(([key, value]) => key + "=" + encodeURIComponent(value))
    .join("&");
}

function weatherGroup(code) {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 95) return "storm";
  return "partly";
}

function weatherEmoji(code, isDay) {
  if (!isDay) return WEATHER_EMOJI.night;
  return WEATHER_EMOJI[weatherGroup(code)] || WEATHER_EMOJI.partly;
}

function conditionLabel(code) {
  const group = weatherGroup(code);
  if (group === "clear") return "Despejado";
  if (group === "partly") return "Parcialmente nublado";
  if (group === "cloudy") return "Nublado";
  if (group === "fog") return "Niebla";
  if (group === "rain") return "Lluvia";
  if (group === "snow") return "Nieve";
  if (group === "storm") return "Tormenta";
  return "Variable";
}

function dayProgress() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const minutesElapsed = (now.getTime() - startOfDay.getTime()) / 60000;
  return Math.min(Math.max(minutesElapsed / 1440, 0), 1);
}

function weekdayShort(now) {
  const days = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
  return days[now.getDay()];
}

function monthLabel(now) {
  const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  return months[now.getMonth()];
}

function formatFullDate(now) {
  return now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}

function formatClock(date) {
  if (!date || isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatEventTime(ev) {
  if (ev.isAllDay) return "✦";
  return ev.time || "·";
}

function applyGradient(widget, weather) {
  const gradient = new LinearGradient();
  const palette = weather && weather.isDay ? CONFIG.dayGradient : CONFIG.nightGradient;
  gradient.colors = palette.map((colorHex) => new Color(colorHex));
  gradient.locations = [0, 0.5, 1];
  widget.backgroundGradient = gradient;
}

function addDivider(parent, symbol) {
  const divider = parent.addText(symbol);
  divider.font = Font.systemFont(40);
  divider.textColor = new Color(CONFIG.accent, 0.22);
  return divider;
}

function progressFill(widget, progress, color) {
  const track = widget.addStack();
  track.size = new Size(0, 6);
  track.cornerRadius = 3;
  track.backgroundColor = new Color("#ffffff", 0.12);
  const fill = track.addStack();
  fill.size = new Size(0, 6);
  fill.cornerRadius = 3;
  fill.backgroundColor = new Color(color);
  fill.addSpacer(Math.round(progress * 100));
  track.addSpacer(null);
}

async function loadCoordinates() {
  const fm = FileManager.local();
  const dir = fm.joinPath(fm.documentsDirectory(), "caches");
  const cachePath = fm.joinPath(dir, CONFIG.locationKey);
  if (fm.fileExists(cachePath)) {
    try {
      const cached = JSON.parse(fm.readString(cachePath));
      if (cached && Date.now() - cached.savedAt < 3600000) {
        return { name: cached.name, lat: cached.lat, lon: cached.lon };
      }
    } catch (err) {}
  }
  let coords = { name: CONFIG.defaultCity, lat: CONFIG.defaultCoords.lat, lon: CONFIG.defaultCoords.lon, savedAt: Date.now() };
  try {
    const location = await Promise.race([
      Location.current(),
      new Promise((resolve) => setTimeout(() => resolve(null), 6000)),
    ]);
    if (location) {
      coords = { name: "Tu ubicación", lat: location.latitude, lon: location.longitude, savedAt: Date.now() };
    }
  } catch (err) {}
  try {
    if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
    fm.writeString(cachePath, JSON.stringify(coords));
  } catch (err) {}
  return { name: coords.name, lat: coords.lat, lon: coords.lon };
}

async function fetchWeather(location) {
  const params = {
    latitude: String(location.lat),
    longitude: String(location.lon),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m",
    daily: "temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "1",
  };
  const url = "https://api.open-meteo.com/v1/forecast?" + buildQueryString(params);
  const request = new Request(url);
  const json = await request.loadJSON();
  const code = json.current.weather_code ?? json.current.weathercode;
  const isDay = json.current.is_day === 1;
  return {
    temp: Math.round(json.current.temperature_2m),
    feels: Math.round(json.current.apparent_temperature ?? json.current.temperature_2m),
    humidity: json.current.relative_humidity_2m ?? 0,
    wind: json.current.wind_speed_10m ?? 0,
    high: Math.round(json.daily.temperature_2m_max[0]),
    low: Math.round(json.daily.temperature_2m_min[0]),
    code,
    isDay,
    emoji: weatherEmoji(code, isDay),
    label: conditionLabel(code),
  };
}

async function loadWeather(location) {
  try {
    const weather = await fetchWeather(location);
    weather.city = location.name;
    return weather;
  } catch (err) {
    const fallbackHour = new Date().getHours();
    return {
      temp: null,
      feels: null,
      humidity: 0,
      wind: 0,
      high: null,
      low: null,
      code: 1,
      isDay: fallbackHour >= 7 && fallbackHour < 21,
      emoji: weatherEmoji(1, fallbackHour >= 7 && fallbackHour < 21),
      label: "Sin datos",
      city: location.name,
    };
  }
}

async function loadEvents(now) {
  try {
    const calendars = await Calendar.forEvents();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 86399999);
    const allEvents = [];
    for (const calendar of calendars) {
      if (!calendar.allowsContentModifications) continue;
      const calendarEvents = await CalendarEvent.between(startOfDay, endOfDay, [calendar]);
      for (const event of calendarEvents) allEvents.push(event);
    }
    allEvents.sort((a, b) => a.startDate - b.startDate);
    return allEvents.slice(0, CONFIG.maxEvents).map((event) => ({
      title: event.title || "Sin título",
      time: formatClock(new Date(event.startDate)),
      isAllDay: event.isAllDay,
    }));
  } catch (err) {
    return [];
  }
}

async function loadReminders(now) {
  try {
    const lists = await Reminder.allLists();
    const items = [];
    for (const list of lists) {
      const fromList = await Reminder.allIncomplete([list]);
      for (const item of fromList) {
        if (!item.isCompleted) items.push(item);
      }
    }
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const overdue = [];
    const upcoming = [];
    for (const item of items) {
      if (!item.dueDate) continue;
      if (item.dueDate < todayStart) overdue.push(item.title);
      else if (item.dueDate < todayEnd) upcoming.push(item.title);
    }
    return {
      overdue: overdue.slice(0, CONFIG.maxOverdue),
      upcoming: upcoming.slice(0, CONFIG.maxUpcoming),
      overdueCount: overdue.length,
      upcomingCount: upcoming.length,
    };
  } catch (err) {
    return { overdue: [], upcoming: [], overdueCount: 0, upcomingCount: 0 };
  }
}

function buildSmall(widget, weather, events, reminders) {
  const now = new Date();
  widget.setPadding(16, 16, 16, 16);
  const headerRow = widget.addStack();
  headerRow.layoutHorizontally();
  headerRow.centerAlignContent();
  const weekdayEl = headerRow.addText(weekdayShort(now));
  weekdayEl.font = Font.mediumSystemFont(12);
  weekdayEl.textColor = new Color(CONFIG.accent);
  headerRow.addSpacer(null);
  const weatherEl = headerRow.addText(weather ? weather.emoji : WEATHER_EMOJI.partly);
  weatherEl.font = Font.systemFont(12);
  widget.addSpacer(8);
  const dateEl = widget.addText(String(now.getDate()));
  dateEl.font = Font.blackSystemFont(48);
  dateEl.textColor = new Color(CONFIG.text);
  widget.addSpacer(2);
  const monthEl = widget.addText(monthLabel(now));
  monthEl.font = Font.mediumSystemFont(11);
  monthEl.textColor = new Color(CONFIG.muted);
  widget.addSpacer(12);
  const tempEl = widget.addText(weather && weather.temp != null ? weather.temp + "° · " + weather.label : "— · " + (weather ? weather.label : "Sin datos"));
  tempEl.font = Font.mediumSystemFont(12);
  tempEl.textColor = new Color(CONFIG.text);
  widget.addSpacer(6);
  const countsEl = widget.addText("📅 " + events.length + "  ·  ⏰ " + reminders.upcomingCount);
  countsEl.font = Font.systemFont(10);
  countsEl.textColor = new Color(CONFIG.muted);
  widget.addSpacer(6);
  if (reminders.overdueCount > 0) {
    const warnEl = widget.addText("⚠ " + reminders.overdueCount + " atrasada(s)");
    warnEl.font = Font.systemFont(10);
    warnEl.textColor = new Color(CONFIG.warning);
  }
  widget.addSpacer(6);
  return widget;
}

function buildMedium(widget, weather, events, reminders) {
  const now = new Date();
  widget.setPadding(16, 16, 16, 16);
  const mainStack = widget.addStack();
  mainStack.layoutHorizontally();

  const leftCol = mainStack.addStack();
  leftCol.layoutVertically();
  const weekdayEl = leftCol.addText(formatFullDate(now).split(",")[0]);
  weekdayEl.font = Font.mediumSystemFont(13);
  weekdayEl.textColor = new Color(CONFIG.accent);
  const dayNum = leftCol.addText(String(now.getDate()));
  dayNum.font = Font.blackSystemFont(44);
  dayNum.textColor = new Color(CONFIG.text);
  const monthEl = leftCol.addText(monthLabel(now) + " · " + now.getFullYear());
  monthEl.font = Font.mediumSystemFont(10);
  monthEl.textColor = new Color(CONFIG.muted);
  leftCol.addSpacer(12);
  if (weather) {
    const weatherRow = leftCol.addStack();
    weatherRow.layoutHorizontally();
    weatherRow.centerAlignContent();
    const emojiEl = weatherRow.addText(weather.emoji);
    emojiEl.font = Font.systemFont(24);
    weatherRow.addSpacer(6);
    const tempEl = weatherRow.addText(weather.temp != null ? weather.temp + "°" : "—");
    tempEl.font = Font.mediumSystemFont(18);
    tempEl.textColor = new Color(CONFIG.text);
  }
  leftCol.addSpacer(10);
  const countEl = leftCol.addText("📅 " + events.length + " eventos\n⏰ " + reminders.upcomingCount + " recordatorios");
  countEl.font = Font.systemFont(10);
  countEl.textColor = new Color(CONFIG.muted);
  leftCol.addSpacer(4);

  mainStack.addSpacer(14);
  addDivider(mainStack, "│");
  mainStack.addSpacer(14);

  const rightCol = mainStack.addStack();
  rightCol.layoutVertically();
  const headEl = rightCol.addText("Agenda de hoy");
  headEl.font = Font.boldSystemFont(11);
  headEl.textColor = new Color(CONFIG.text);
  rightCol.addSpacer(6);
  if (events.length === 0) {
    const emptyEl = rightCol.addText("Sin eventos programados");
    emptyEl.font = Font.systemFont(10);
    emptyEl.textColor = new Color(CONFIG.muted);
  } else {
    for (const event of events.slice(0, 3)) {
      const eventRow = rightCol.addStack();
      eventRow.layoutHorizontally();
      const timeEl = eventRow.addText(formatEventTime(event));
      timeEl.font = Font.monospacedSystemFont(9, Font.medium);
      timeEl.textColor = new Color(CONFIG.accent);
      timeEl.width = 34;
      eventRow.addSpacer(6);
      const titleEl = eventRow.addText(event.title);
      titleEl.font = Font.systemFont(10);
      titleEl.textColor = new Color(CONFIG.text);
      titleEl.lineLimit = 1;
      eventRow.addSpacer(2);
    }
  }
  rightCol.addSpacer(null);
  const footEl = rightCol.addText(reminders.overdueCount > 0 ? "⚠ " + reminders.overdueCount + " atrasada(s)" : Math.round(dayProgress() * 100) + "% del día");
  footEl.font = Font.systemFont(9);
  footEl.textColor = reminders.overdueCount > 0 ? new Color(CONFIG.warning) : new Color(CONFIG.faint);
  rightCol.addSpacer(4);
  return widget;
}

function buildLarge(widget, weather, events, reminders) {
  const now = new Date();
  widget.setPadding(16, 16, 16, 16);
  const headerRow = widget.addStack();
  headerRow.layoutHorizontally();
  headerRow.centerAlignContent();
  const titleEl = headerRow.addText(formatFullDate(now));
  titleEl.font = Font.mediumSystemFont(15);
  titleEl.textColor = new Color(CONFIG.accent);
  headerRow.addSpacer(null);
  const clockEl = headerRow.addText(formatClock(now));
  clockEl.font = Font.boldSystemFont(13);
  clockEl.textColor = new Color(CONFIG.text);
  widget.addSpacer(12);

  if (weather) {
    const weatherRow = widget.addStack();
    weatherRow.layoutHorizontally();
    weatherRow.centerAlignContent();
    const emojiEl = weatherRow.addText(weather.emoji);
    emojiEl.font = Font.systemFont(30);
    weatherRow.addSpacer(8);
    const tempEl = weatherRow.addText(weather.temp != null ? weather.temp + "°" : "—");
    tempEl.font = Font.boldSystemFont(30);
    tempEl.textColor = new Color(CONFIG.text);
    weatherRow.addSpacer(10);
    const metaCol = weatherRow.addStack();
    metaCol.layoutVertically();
    const labelEl = metaCol.addText(weather.label);
    labelEl.font = Font.systemFont(11);
    labelEl.textColor = new Color(CONFIG.accent);
    const rangeEl = metaCol.addText(weather.high != null ? "Máx " + weather.high + "° · Mín " + weather.low + "°" : "");
    rangeEl.font = Font.systemFont(9);
    rangeEl.textColor = new Color(CONFIG.muted);
    weatherRow.addSpacer(null);
    const cityEl = weatherRow.addText(weather.city || "");
    cityEl.font = Font.systemFont(9);
    cityEl.textColor = new Color(CONFIG.muted);
    cityEl.textAlignment = 2;
    widget.addSpacer(8);
    progressFill(widget, dayProgress(), CONFIG.accent);
    widget.addSpacer(12);
  }

  const columns = widget.addStack();
  columns.layoutHorizontally();

  const eventsCol = columns.addStack();
  eventsCol.layoutVertically();
  const eventsHead = eventsCol.addText("Agenda · " + events.length);
  eventsHead.font = Font.boldSystemFont(11);
  eventsHead.textColor = new Color(CONFIG.text);
  eventsCol.addSpacer(6);
  if (events.length === 0) {
    const emptyEl = eventsCol.addText("Nada programado");
    emptyEl.font = Font.systemFont(10);
    emptyEl.textColor = new Color(CONFIG.muted);
  } else {
    for (const event of events.slice(0, CONFIG.maxEvents)) {
      const eventRow = eventsCol.addStack();
      eventRow.layoutHorizontally();
      const timeEl = eventRow.addText(formatEventTime(event));
      timeEl.font = Font.monospacedSystemFont(9, Font.medium);
      timeEl.textColor = new Color(CONFIG.accent);
      timeEl.width = 34;
      eventRow.addSpacer(6);
      const titleEl = eventRow.addText(event.title);
      titleEl.font = Font.systemFont(10);
      titleEl.textColor = new Color(CONFIG.text);
      titleEl.lineLimit = 1;
      eventRow.addSpacer(2);
    }
  }
  eventsCol.addSpacer(null);

  columns.addSpacer(14);
  addDivider(columns, "│");
  columns.addSpacer(14);

  const remindersCol = columns.addStack();
  remindersCol.layoutVertically();
  const remindersHead = remindersCol.addText(reminders.overdueCount > 0 ? "⚠ Recordatorios" : "Recordatorios");
  remindersHead.font = Font.boldSystemFont(11);
  remindersHead.textColor = reminders.overdueCount > 0 ? new Color(CONFIG.warning) : new Color(CONFIG.text);
  remindersCol.addSpacer(6);
  if (reminders.overdue.length === 0 && reminders.upcoming.length === 0) {
    const emptyEl = remindersCol.addText("Todo al día ✅");
    emptyEl.font = Font.systemFont(10);
    emptyEl.textColor = new Color(CONFIG.muted);
  } else {
    for (const title of reminders.overdue) {
      const row = remindersCol.addStack();
      row.layoutHorizontally();
      const dotEl = row.addText("⚠");
      dotEl.font = Font.systemFont(10);
      dotEl.textColor = new Color(CONFIG.warning);
      row.addSpacer(5);
      const labelEl = row.addText(title);
      labelEl.font = Font.systemFont(10);
      labelEl.textColor = new Color("#ffb3b3");
      labelEl.lineLimit = 1;
      row.addSpacer(2);
    }
    for (const title of reminders.upcoming) {
      const row = remindersCol.addStack();
      row.layoutHorizontally();
      const dotEl = row.addText("○");
      dotEl.font = Font.systemFont(10);
      dotEl.textColor = new Color(CONFIG.accent);
      row.addSpacer(5);
      const labelEl = row.addText(title);
      labelEl.font = Font.systemFont(10);
      labelEl.textColor = new Color(CONFIG.text);
      labelEl.lineLimit = 1;
      row.addSpacer(2);
    }
  }
  remindersCol.addSpacer(null);

  widget.addSpacer(10);
  const footerRow = widget.addStack();
  footerRow.layoutHorizontally();
  const hintEl = footerRow.addText("Toca para abrir la agenda");
  hintEl.font = Font.systemFont(9);
  hintEl.textColor = new Color(CONFIG.faint);
  footerRow.addSpacer(null);
  const pctEl = footerRow.addText(Math.round(dayProgress() * 100) + "% del día");
  pctEl.font = Font.systemFont(9);
  pctEl.textColor = new Color(CONFIG.faint);
  widget.addSpacer(4);
  return widget;
}

async function createWidget() {
  const now = new Date();
  const location = await loadCoordinates();
  const [weather, events, reminders] = await Promise.all([
    loadWeather(location),
    loadEvents(now),
    loadReminders(now),
  ]);
  const widget = new ListWidget();
  applyGradient(widget, weather);
  widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  if (config.widgetFamily === "small") {
    return buildSmall(widget, weather, events, reminders);
  }
  if (config.widgetFamily === "medium") {
    return buildMedium(widget, weather, events, reminders);
  }
  return buildLarge(widget, weather, events, reminders);
}

try {
  const widget = await createWidget();
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentLarge();
  }
  Script.complete();
} catch (error) {
  const fallback = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [new Color("#0a192f"), new Color("#112240")];
  gradient.locations = [0, 1];
  fallback.backgroundGradient = gradient;
  const messageEl = fallback.addText("⚠️ Widget Error");
  messageEl.font = Font.boldSystemFont(14);
  messageEl.textColor = new Color("#ff6b6b");
  fallback.addSpacer(4);
  const retryEl = fallback.addText("Toca para reintentar");
  retryEl.font = Font.systemFont(11);
  retryEl.textColor = new Color("#ccd6f6");
  fallback.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  fallback.refreshAfterDate = new Date(Date.now() + 600000);
  Script.setWidget(fallback);
  Script.complete();
}