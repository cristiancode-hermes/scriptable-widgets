const CONFIG = {
  defaultLatitude: 40.4168,
  defaultLongitude: -3.7038,
  defaultCity: "Madrid",
  cacheMinutes: 30,
  locationTimeoutSeconds: 8,
  refreshMinutes: 30,
  maxEvents: 3,
  maxTips: 3,
};

const WEATHER_EMOJI = {
  clear: "☀️",
  partly: "🌤️",
  cloudy: "☁️",
  fog: "🌫️",
  rain: "🌧️",
  snow: "❄️",
  storm: "⛈️",
};

const TIERS = [
  { min: 80, label: "Óptimo",    emoji: "🏞️", color: "#34d399" },
  { min: 60, label: "Bueno",     emoji: "🌤️", color: "#38bdf8" },
  { min: 40, label: "Regular",   emoji: "🌥️", color: "#fbbf24" },
  { min: 0,  label: "Desfavorable", emoji: "🌧️", color: "#f87171" },
];

const COLORS = {
  text: "#e6edf3",
  muted: "#8b98a9",
  faint: "#5b6675",
  surface: "#ffffff",
  track: "#ffffff",
  detail: "#79c0ff",
  warning: "#d29922",
  danger: "#f85149",
};

const WEEKDAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function clamp(value, lo, hi) {
  return Math.min(Math.max(value, lo), hi);
}

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

function weatherEmoji(code) {
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

function tierForScore(score) {
  return TIERS.find((tier) => score >= tier.min) || TIERS[TIERS.length - 1];
}

function toDate(value) {
  if (typeof value === "number") return new Date(value);
  return value;
}

function formatClock(date) {
  try {
    const d = toDate(date);
    if (!d || isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

function formatFullDate(now) {
  return WEEKDAY_NAMES[now.getDay()] + " " + now.getDate() + " de " + MONTH_NAMES[now.getMonth()];
}

function truncate(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
}

function computeWeatherScore(weather) {
  const base = { clear: 40, partly: 36, cloudy: 26, fog: 16, rain: 10, snow: 22, storm: 4 };
  let score = base[weatherGroup(weather.code)] ?? 26;
  const temp = weather.temperature;
  if (temp != null) {
    if (temp > 33 || temp < 8) score -= 10;
    else if (temp > 28 || temp < 16) score -= 4;
  }
  if (weather.wind != null) {
    if (weather.wind > 50) score -= 8;
    else if (weather.wind > 30) score -= 4;
  }
  return clamp(Math.round(score), 0, 40);
}

function computeAirScore(aqi) {
  if (aqi == null) return 24;
  if (aqi <= 50) return 30;
  if (aqi <= 100) return 24;
  if (aqi <= 150) return 16;
  if (aqi <= 200) return 8;
  return 2;
}

function computeUvScore(uv) {
  if (uv == null) return 12;
  if (uv <= 2) return 20;
  if (uv <= 5) return 16;
  if (uv <= 7) return 12;
  if (uv <= 10) return 7;
  return 2;
}

function computeFreeScore(agenda) {
  const load = agenda.events.length + agenda.reminders.length + agenda.overdue.length;
  if (load === 0) return 10;
  if (load <= 2) return 8;
  if (load <= 5) return 5;
  if (load <= 9) return 2;
  return 0;
}

function buildRecommendations(scores, weather, aqi, uv, agenda) {
  const tips = [];
  if (scores.total >= 80) tips.push("Perfecto para planes al aire libre");
  if (uv != null && uv >= 7) tips.push("Protección solar alta necesaria ☀️");
  if (aqi != null && aqi > 100) tips.push("Evita el ejercicio intenso 😷");
  if (weather.precip != null && weather.precip > 60) tips.push("Probabilidad de lluvia 🌧️");
  if (weather.temperature != null && weather.temperature >= 33) tips.push("Mucho calor, hidrátate 🥵");
  if (weather.temperature != null && weather.temperature <= 5) tips.push("Frío intenso, abrígate 🧥");
  if (weather.wind != null && weather.wind > 30) tips.push("Viento notable, ojo 💨");
  if (agenda.overdue.length > 0) tips.push("Tienes " + agenda.overdue.length + " recordatorio(s) atrasado(s) ⚠️");
  if (agenda.events.length === 0 && agenda.reminders.length === 0 && tips.length === 0) {
    tips.push("Día despejado de agenda, disfrútalo 🌿");
  }
  if (tips.length === 0) tips.push("Condiciones estables para tu rutina");
  return tips;
}

const Cache = {
  get fm() {
    return FileManager.local();
  },
  get directory() {
    return this.fm.joinPath(this.fm.documentsDirectory(), "outdoor-comfort-cache");
  },
  weatherPath() {
    return this.fm.joinPath(this.directory, "weather.json");
  },
  locationPath() {
    return this.fm.joinPath(this.directory, "location.json");
  },
  read(path, ttlMinutes) {
    try {
      if (!this.fm.fileExists(path)) return null;
      const info = this.fm.modificationDate(path);
      if (Date.now() - info.getTime() > ttlMinutes * 60000) return null;
      const payload = JSON.parse(this.fm.readString(path));
      return payload && payload.savedAt ? payload : null;
    } catch (e) {
      return null;
    }
  },
  write(path, payload) {
    try {
      if (!this.fm.fileExists(this.directory)) {
        this.fm.createDirectory(this.directory, true);
      }
      this.fm.writeString(path, JSON.stringify({ savedAt: Date.now(), payload }));
    } catch (e) {}
  },
};

function fetchJson(url) {
  return new Promise((resolve) => {
    const request = new Request(url);
    request.timeoutInterval = 12;
    request.loadJSON().then(resolve).catch(() => resolve(null));
  });
}

async function loadLocation() {
  const cached = Cache.read(Cache.locationPath(), 24 * 60);
  if (cached) return cached.payload;
  const fallback = { latitude: CONFIG.defaultLatitude, longitude: CONFIG.defaultLongitude, usingDefault: true };
  try {
    const timedOut = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), CONFIG.locationTimeoutSeconds * 1000);
    });
    const location = await Promise.race([Location.current(), timedOut]);
    const coords = { latitude: location.latitude, longitude: location.longitude, usingDefault: false };
    Cache.write(Cache.locationPath(), coords);
    return coords;
  } catch (e) {
    Cache.write(Cache.locationPath(), fallback);
    return fallback;
  }
}

async function loadWeather(lat, lon) {
  const cached = Cache.read(Cache.weatherPath(), CONFIG.cacheMinutes);
  if (cached) return cached.payload;
  const url = "https://api.open-meteo.com/v1/forecast?" + buildQueryString({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "1",
  });
  const json = await fetchJson(url);
  if (!json) return null;
  const current = json.current || {};
  const daily = json.daily || {};
  const payload = {
    code: current.weather_code ?? current.weathercode,
    temperature: current.temperature_2m,
    wind: current.wind_speed_10m,
    humidity: current.relative_humidity_2m,
    maxTemp: (daily.temperature_2m_max || [])[0],
    minTemp: (daily.temperature_2m_min || [])[0],
    uv: (daily.uv_index_max || [])[0],
    precip: (daily.precipitation_probability_max || [])[0],
    dailyCode: (daily.weather_code || daily.weathercode || [])[0],
  };
  Cache.write(Cache.weatherPath(), payload);
  return payload;
}

async function loadAirQuality(lat, lon) {
  const url = "https://air-quality-api.open-meteo.com/v1/air-quality?" + buildQueryString({
    latitude: lat,
    longitude: lon,
    current: "us_aqi",
    timezone: "auto",
  });
  const json = await fetchJson(url);
  if (!json || !json.current) return null;
  return json.current.us_aqi;
}

async function loadAgenda() {
  const events = [];
  const reminders = [];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  try {
    const calendars = await Calendar.forEvents();
    for (const cal of calendars) {
      try {
        if (!cal.allowsContentModifications) continue;
        const items = await CalendarEvent.between(startOfDay, new Date(startOfDay.getTime() + 86400000), [cal]);
        for (const event of items) events.push(event);
      } catch (e) {}
    }
    events.sort((a, b) => toDate(a.startDate).getTime() - toDate(b.startDate).getTime());
  } catch (e) {}
  try {
    const items = await Reminder.allIncomplete();
    for (const item of items) {
      if (item.isCompleted) continue;
      if (!item.dueDate) continue;
      reminders.push(item);
    }
    reminders.sort((a, b) => toDate(a.dueDate).getTime() - toDate(b.dueDate).getTime());
  } catch (e) {}
  const overdue = reminders.filter((item) => toDate(item.dueDate).getTime() < startOfDay.getTime());
  return { events, reminders, overdue };
}

async function loadAllData() {
  const location = await loadLocation();
  const [weather, aqi, agenda] = await Promise.all([
    loadWeather(location.latitude, location.longitude),
    loadAirQuality(location.latitude, location.longitude),
    loadAgenda(),
  ]);
  return { location, weather, aqi, agenda };
}

function computeScores(data) {
  const weatherScore = computeWeatherScore({
    code: data.weather ? (data.weather.code ?? data.weather.dailyCode) : 2,
    temperature: data.weather ? data.weather.temperature : null,
    wind: data.weather ? data.weather.wind : null,
  });
  const airScore = computeAirScore(data.aqi);
  const uvScore = computeUvScore(data.weather ? data.weather.uv : null);
  const freeScore = computeFreeScore(data.agenda);
  const total = clamp(Math.round(weatherScore + airScore + uvScore + freeScore), 0, 100);
  return { weatherScore, airScore, uvScore, freeScore, total };
}

function addBar(parent, fraction, color) {
  const track = parent.addStack();
  track.size = new Size(0, 6);
  track.cornerRadius = 3;
  track.backgroundColor = new Color(COLORS.track, 0.14);
  const fill = track.addStack();
  fill.size = new Size(0, 6);
  fill.cornerRadius = 3;
  fill.backgroundColor = new Color(color);
  fill.addSpacer(clamp(fraction, 0.03, 1) * 100);
  track.addSpacer(null);
}

function addFactorRow(parent, label, value, max, color) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const labelText = row.addText(label);
  labelText.font = Font.systemFont(9);
  labelText.textColor = new Color(COLORS.muted);
  row.addSpacer(6);
  const barColumn = row.addStack();
  barColumn.layoutVertically();
  barColumn.addSpacer(3);
  addBar(barColumn, value / max, color);
  barColumn.addSpacer(3);
  row.addSpacer(6);
  const valueText = row.addText(Math.round(value) + "/" + max);
  valueText.font = Font.mediumSystemFont(9);
  valueText.textColor = new Color(color);
}

function buildErrorWidget() {
  const widget = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [new Color("#0d1117"), new Color("#161b22")];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
  widget.addSpacer();
  const title = widget.addText("⚠️ Datos no disponibles");
  title.font = Font.mediumSystemFont(13);
  title.textColor = new Color(COLORS.text);
  widget.addSpacer(4);
  const hint = widget.addText("Toca para reintentar");
  hint.font = Font.systemFont(10);
  hint.textColor = new Color(COLORS.muted);
  widget.addSpacer();
  widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function buildSmallWidget(widget, data, scores) {
  const tier = tierForScore(scores.total);
  const weather = data.weather || {};
  const conditionEmoji = weatherEmoji(weather.code ?? weather.dailyCode ?? 2);
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const cityText = header.addText(data.location.usingDefault ? CONFIG.defaultCity : "Mi zona");
  cityText.font = Font.systemFont(9);
  cityText.textColor = new Color(COLORS.muted);
  header.addSpacer(null);
  const conditionText = header.addText(conditionEmoji + " " + (weather.temperature != null ? Math.round(weather.temperature) + "°" : "--"));
  conditionText.font = Font.systemFont(9);
  conditionText.textColor = new Color(COLORS.detail);

  widget.addSpacer(6);

  const scoreRow = widget.addStack();
  scoreRow.layoutHorizontally();
  scoreRow.addSpacer(null);
  const scoreText = scoreRow.addText(String(scores.total));
  scoreText.font = Font.boldSystemFont(36);
  scoreText.textColor = new Color(tier.color);
  scoreRow.addSpacer(3);
  const maxText = scoreRow.addText("/100");
  maxText.font = Font.systemFont(10);
  maxText.textColor = new Color(COLORS.muted);
  scoreRow.addSpacer(null);

  widget.addSpacer(2);

  const tierRow = widget.addStack();
  tierRow.layoutHorizontally();
  tierRow.centerAlignContent();
  tierRow.addSpacer(null);
  const tierText = tierRow.addText(tier.emoji + " " + tier.label);
  tierText.font = Font.mediumSystemFont(11);
  tierText.textColor = new Color(tier.color);
  tierRow.addSpacer(null);

  widget.addSpacer(6);

  const chips = widget.addStack();
  chips.layoutHorizontally();
  chips.centerAlignContent();
  const chipData = [
    ["🌤️", scores.weatherScore, "/40", COLORS.detail],
    ["😷", scores.airScore, "/30", COLORS.surface],
    ["☀️", scores.uvScore, "/20", COLORS.warning],
  ];
  for (let i = 0; i < chipData.length; i++) {
    const chip = chips.addStack();
    chip.layoutHorizontally();
    chip.centerAlignContent();
    chip.backgroundColor = new Color(COLORS.surface, 0.08);
    chip.cornerRadius = 6;
    chip.setPadding(3, 6, 3, 6);
    const emoji = chip.addText(chipData[i][0]);
    emoji.font = Font.systemFont(8);
    chip.addSpacer(3);
    const value = chip.addText(chipData[i][1] + chipData[i][2]);
    value.font = Font.mediumSystemFont(8);
    value.textColor = new Color(chipData[i][3]);
    if (i < chipData.length - 1) chips.addSpacer(4);
  }
}

function buildMediumWidget(widget, data, scores, tips) {
  const tier = tierForScore(scores.total);
  const weather = data.weather || {};
  const conditionEmoji = weatherEmoji(weather.code ?? weather.dailyCode ?? 2);

  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const titleText = header.addText("Índice de Confort Exterior");
  titleText.font = Font.mediumSystemFont(11);
  titleText.textColor = new Color(COLORS.text);
  header.addSpacer(null);
  const cityText = header.addText(data.location.usingDefault ? CONFIG.defaultCity : "Mi zona");
  cityText.font = Font.systemFont(9);
  cityText.textColor = new Color(COLORS.muted);

  widget.addSpacer(8);

  const main = widget.addStack();
  main.layoutHorizontally();

  const hero = main.addStack();
  hero.layoutVertically();
  const scoreRow = hero.addStack();
  scoreRow.layoutHorizontally();
  scoreRow.addSpacer(null);
  const scoreText = scoreRow.addText(String(scores.total));
  scoreText.font = Font.boldSystemFont(30);
  scoreText.textColor = new Color(tier.color);
  scoreRow.addSpacer(2);
  const maxText = scoreRow.addText("/100");
  maxText.font = Font.systemFont(9);
  maxText.textColor = new Color(COLORS.muted);
  scoreRow.addSpacer(null);
  const tierText = hero.addText(tier.emoji + " " + tier.label);
  tierText.font = Font.mediumSystemFont(10);
  tierText.textColor = new Color(tier.color);
  hero.addSpacer(4);
  const conditionText = hero.addText(conditionEmoji + " " + conditionLabel(weather.code ?? weather.dailyCode ?? 2));
  conditionText.font = Font.systemFont(9);
  conditionText.textColor = new Color(COLORS.detail);
  if (weather.temperature != null) {
    const tempText = hero.addText(Math.round(weather.temperature) + "° · " + conditionEmoji);
    tempText.font = Font.systemFont(9);
    tempText.textColor = new Color(COLORS.muted);
  }

  main.addSpacer(12);

  const factors = main.addStack();
  factors.layoutVertically();
  addFactorRow(factors, "Clima", scores.weatherScore, 40, COLORS.detail);
  factors.addSpacer(5);
  addFactorRow(factors, "Aire", scores.airScore, 30, COLORS.surface);
  factors.addSpacer(5);
  addFactorRow(factors, "Sol", scores.uvScore, 20, COLORS.warning);
  factors.addSpacer(5);
  addFactorRow(factors, "Agenda", scores.freeScore, 10, tier.color);

  widget.addSpacer(8);

  const tip = tips[0] ? tips[0] : "Datos actualizados hace un momento";
  const tipRow = widget.addStack();
  tipRow.layoutHorizontally();
  tipRow.centerAlignContent();
  tipRow.backgroundColor = new Color(tier.color, 0.12);
  tipRow.cornerRadius = 7;
  tipRow.setPadding(5, 8, 5, 8);
  const tipText = tipRow.addText("💡 " + tip);
  tipText.font = Font.systemFont(9);
  tipText.textColor = new Color(COLORS.text);
}

function buildLargeWidget(widget, data, scores, tips) {
  const tier = tierForScore(scores.total);
  const weather = data.weather || {};
  const conditionEmoji = weatherEmoji(weather.code ?? weather.dailyCode ?? 2);

  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const dateColumn = header.addStack();
  dateColumn.layoutVertically();
  const dateText = dateColumn.addText(formatFullDate(new Date()));
  dateText.font = Font.mediumSystemFont(12);
  dateText.textColor = new Color(COLORS.text);
  const cityText = dateColumn.addText(data.location.usingDefault ? CONFIG.defaultCity : "Mi ubicación actual");
  cityText.font = Font.systemFont(8);
  cityText.textColor = new Color(COLORS.muted);
  header.addSpacer(null);
  const heroTemp = header.addText(conditionEmoji + " " + (weather.temperature != null ? Math.round(weather.temperature) + "°" : "--"));
  heroTemp.font = Font.boldSystemFont(20);
  heroTemp.textColor = new Color(COLORS.detail);

  widget.addSpacer(10);

  const heroRow = widget.addStack();
  heroRow.layoutHorizontally();
  heroRow.centerAlignContent();
  const scoreText = heroRow.addText(String(scores.total));
  scoreText.font = Font.boldSystemFont(44);
  scoreText.textColor = new Color(tier.color);
  heroRow.addSpacer(8);
  const tierColumn = heroRow.addStack();
  tierColumn.layoutVertically();
  const tierText = tierColumn.addText(tier.emoji + " " + tier.label);
  tierText.font = Font.mediumSystemFont(14);
  tierText.textColor = new Color(tier.color);
  const conditionText = tierColumn.addText(conditionLabel(weather.code ?? weather.dailyCode ?? 2));
  conditionText.font = Font.systemFont(10);
  conditionText.textColor = new Color(COLORS.muted);
  if (weather.maxTemp != null || weather.minTemp != null) {
    const rangeText = tierColumn.addText("Máx " + (weather.maxTemp != null ? Math.round(weather.maxTemp) : "--") + "° · Mín " + (weather.minTemp != null ? Math.round(weather.minTemp) : "--") + "°");
    rangeText.font = Font.systemFont(9);
    rangeText.textColor = new Color(COLORS.detail);
  }

  widget.addSpacer(10);

  const factorColumn = widget.addStack();
  factorColumn.layoutVertically();
  addFactorRow(factorColumn, "Condiciones del clima", scores.weatherScore, 40, COLORS.detail);
  factorColumn.addSpacer(5);
  addFactorRow(factorColumn, "Calidad del aire", scores.airScore, 30, COLORS.surface);
  factorColumn.addSpacer(5);
  addFactorRow(factorColumn, "Radiación UV", scores.uvScore, 20, COLORS.warning);
  factorColumn.addSpacer(5);
  addFactorRow(factorColumn, "Espacio en agenda", scores.freeScore, 10, tier.color);

  widget.addSpacer(10);

  const agendaRow = widget.addStack();
  agendaRow.layoutHorizontally();
  agendaRow.centerAlignContent();
  const eventChip = agendaRow.addStack();
  eventChip.layoutHorizontally();
  eventChip.centerAlignContent();
  eventChip.backgroundColor = new Color(COLORS.surface, 0.08);
  eventChip.cornerRadius = 6;
  eventChip.setPadding(4, 8, 4, 8);
  const eventEmoji = eventChip.addText("📅");
  eventEmoji.font = Font.systemFont(9);
  eventChip.addSpacer(4);
  const eventLabel = eventChip.addText(String(data.agenda.events.length) + " eventos");
  eventLabel.font = Font.systemFont(9);
  eventLabel.textColor = new Color(COLORS.text);
  agendaRow.addSpacer(6);
  const reminderChip = agendaRow.addStack();
  reminderChip.layoutHorizontally();
  reminderChip.centerAlignContent();
  reminderChip.backgroundColor = new Color(COLORS.surface, 0.08);
  reminderChip.cornerRadius = 6;
  reminderChip.setPadding(4, 8, 4, 8);
  const reminderEmoji = reminderChip.addText("⏰");
  reminderEmoji.font = Font.systemFont(9);
  reminderChip.addSpacer(4);
  const reminderLabel = reminderChip.addText(String(data.agenda.reminders.length) + " pendientes");
  reminderLabel.font = Font.systemFont(9);
  reminderLabel.textColor = new Color(COLORS.text);
  if (data.agenda.overdue.length > 0) {
    agendaRow.addSpacer(6);
    const overdueChip = agendaRow.addStack();
    overdueChip.layoutHorizontally();
    overdueChip.centerAlignContent();
    overdueChip.backgroundColor = new Color(COLORS.danger, 0.18);
    overdueChip.cornerRadius = 6;
    overdueChip.setPadding(4, 8, 4, 8);
    const overdueEmoji = overdueChip.addText("⚠️");
    overdueEmoji.font = Font.systemFont(9);
    overdueChip.addSpacer(4);
    const overdueLabel = overdueChip.addText(String(data.agenda.overdue.length) + " atrasados");
    overdueLabel.font = Font.systemFont(9);
    overdueLabel.textColor = new Color(COLORS.danger);
  }
  agendaRow.addSpacer(null);
  if (data.agenda.events.length > 0) {
    const nextEvent = data.agenda.events[0];
    const nextText = agendaRow.addText("Próximo: " + formatClock(nextEvent.startDate) + " " + truncate(nextEvent.title, 14));
    nextText.font = Font.systemFont(8);
    nextText.textColor = new Color(COLORS.muted);
  }

  widget.addSpacer(8);

  for (let i = 0; i < Math.min(tips.length, CONFIG.maxTips); i++) {
    const tipRow = widget.addStack();
    tipRow.layoutHorizontally();
    tipRow.centerAlignContent();
    tipRow.backgroundColor = new Color(COLORS.surface, i === 0 ? 0.10 : 0.05);
    tipRow.cornerRadius = 6;
    tipRow.setPadding(4, 8, 4, 8);
    const bullet = tipRow.addText(i === 0 ? "💡" : "·");
    bullet.font = Font.systemFont(9);
    tipRow.addSpacer(5);
    const tipText = tipRow.addText(tips[i]);
    tipText.font = Font.systemFont(9);
    tipText.textColor = new Color(COLORS.text);
    if (i < Math.min(tips.length, CONFIG.maxTips) - 1) widget.addSpacer(4);
  }
}

async function createWidget() {
  const data = await loadAllData();
  if (!data.weather && data.aqi == null) {
    throw new Error("No network data");
  }
  const scores = computeScores(data);
  const tips = buildRecommendations(scores, {
    code: data.weather ? (data.weather.code ?? data.weather.dailyCode) : 2,
    temperature: data.weather ? data.weather.temperature : null,
    wind: data.weather ? data.weather.wind : null,
    precip: data.weather ? data.weather.precip : null,
  }, data.aqi, data.weather ? data.weather.uv : null, data.agenda);

  const widget = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [new Color("#0d1117"), new Color("#161b22")];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
  widget.setPadding(14, 14, 14, 14);

  if (config.widgetFamily === "small") {
    buildSmallWidget(widget, data, scores);
  } else if (config.widgetFamily === "medium") {
    buildMediumWidget(widget, data, scores, tips);
  } else {
    buildLargeWidget(widget, data, scores, tips);
  }

  widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

try {
  const widget = await createWidget();
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentLarge();
  }
} catch (error) {
  Script.setWidget(buildErrorWidget());
}
Script.complete();