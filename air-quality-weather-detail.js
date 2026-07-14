

const CONFIG = {
  
  defaultLatitude: 40.4168,
  defaultLongitude: -3.7038,
  defaultCountry: "ESP",

  
  cacheMinutes: 20,

  
  useMetric: true,

  
  apiTimeout: 8,

  
  showFeelsLikeSmall: true,

  
  aqiThresholds: [
    { max: 50,  label: "Buena",  color: "#4caf50" },
    { max: 100, label: "Moderada", color: "#ffeb3b" },
    { max: 150, label: "Insalubre (grupos sensibles)", color: "#ff9800" },
    { max: 200, label: "Insalubre", color: "#f44336" },
    { max: 300, label: "Muy insalubre", color: "#9c27b0" },
    { max: 500, label: "Peligrosa", color: "#880e4f" },
  ],
};

const C = {
  
  aqiGradients: {
    good:       [new Color("#1b3a2b"), new Color("#1a2f2a")],
    moderate:   [new Color("#3a3520"), new Color("#2a2f20")],
    sensitive:  [new Color("#3a2a1a"), new Color("#2a221a")],
    unhealthy:  [new Color("#3a1a1a"), new Color("#2a1515")],
    veryUnhealthy: [new Color("#2a1a3a"), new Color("#1f1530")],
    hazardous:  [new Color("#2a0a1a"), new Color("#1f0515")],
  },

  
  surface:      new Color("#ffffff", 0.07),
  surfaceAlt:   new Color("#ffffff", 0.04),
  surfaceActive: new Color("#ffffff", 0.12),
  text:         new Color("#ffffff", 0.95),
  textSecondary: new Color("#ffffff", 0.75),
  textMuted:    new Color("#ffffff", 0.45),
  textUltra:    new Color("#ffffff", 0.25),
  separator:    new Color("#ffffff", 0.08),

  
  tempHot:      new Color("#ff6b6b"),
  tempCold:     new Color("#74b9ff"),
  tempMild:     new Color("#ffeaa7"),
  humidity:     new Color("#81ecec"),
  wind:         new Color("#a29bfe"),
  uvLow:        new Color("#55efc4"),
  uvModerate:   new Color("#fdcb6e"),
  uvHigh:       new Color("#e17055"),
  uvVeryHigh:   new Color("#d63031"),
  uvExtreme:    new Color("#6c5ce7"),

  
  windCalm:     new Color("#81ecec"),
  windBreeze:   new Color("#74b9ff"),
  windStrong:   new Color("#a29bfe"),
  windGale:     new Color("#fd79a8"),
};

const S = {
  
  sunMax:       "☀️",
  sunHoriz:     "🌅",
  cloudSun:     "⛅",
  cloud:        "☁️",
  cloudRain:    "🌧️",
  cloudSnow:    "❄️",
  cloudFog:     "🌫️",
  cloudLightning: "⛈️",
  cloudDrizzle: "🌦️",
  
  leaf:         "🌿",
  mask:         "😷",
  wind:         "💨",
  
  thermometer:  "🌡️",
  droplet:      "💧",
  windIcon:     "💨",
  gauge:        "📊",
  eye:          "👁️",
  arrowUp:      "↑",
  arrowDown:    "↓",
  
  sunSmall:     "☀️",
  
  clock:        "🕐",
  calendar:     "📅",
  location:     "📍",
  warning:      "⚠️",
  moon:         "🌙",
  star:         "⭐",
  sunrise:      "🌅",
  sunset:       "🌇",
  
  compass:      "🧭",
  directionN:   "⬆️",
  directionNE:  "↗️",
  directionE:   "➡️",
  directionSE:  "↘️",
  directionS:   "⬇️",
  directionSW:  "↙️",
  directionW:   "⬅️",
  directionNW:  "↖️",
};

const WMO_MAP = {
  0:  { emoji: S.sunMax,      label: "Despejado",           color: "#ffeaa7" },
  1:  { emoji: S.sunMax,      label: "Mayormente despejado", color: "#ffeaa7" },
  2:  { emoji: S.cloudSun,    label: "Parcialmente nublado", color: "#fdcb6e" },
  3:  { emoji: S.cloud,       label: "Nublado",             color: "#b2bec3" },
  45: { emoji: S.cloudFog,    label: "Niebla",              color: "#dfe6e9" },
  48: { emoji: S.cloudFog,    label: "Niebla helada",       color: "#b2bec3" },
  51: { emoji: S.cloudDrizzle, label: "Llovizna ligera",    color: "#81ecec" },
  53: { emoji: S.cloudDrizzle, label: "Llovizna moderada",  color: "#74b9ff" },
  55: { emoji: S.cloudDrizzle, label: "Llovizna densa",     color: "#0984e3" },
  56: { emoji: S.cloudDrizzle, label: "Llovizna helada",    color: "#a29bfe" },
  57: { emoji: S.cloudDrizzle, label: "Llovizna helada",    color: "#6c5ce7" },
  61: { emoji: S.cloudRain,   label: "Lluvia ligera",       color: "#74b9ff" },
  63: { emoji: S.cloudRain,   label: "Lluvia moderada",     color: "#0984e3" },
  65: { emoji: S.cloudRain,   label: "Lluvia fuerte",       color: "#0652DD" },
  66: { emoji: S.cloudRain,   label: "Lluvia helada",       color: "#a29bfe" },
  67: { emoji: S.cloudRain,   label: "Lluvia helada fuerte", color: "#6c5ce7" },
  71: { emoji: S.cloudSnow,   label: "Nieve ligera",        color: "#dfe6e9" },
  73: { emoji: S.cloudSnow,   label: "Nieve moderada",      color: "#b2bec3" },
  75: { emoji: S.cloudSnow,   label: "Nieve fuerte",        color: "#636e72" },
  77: { emoji: S.cloudSnow,   label: "Granos de nieve",     color: "#b2bec3" },
  80: { emoji: S.cloudRain,   label: "Chubascos ligeros",   color: "#81ecec" },
  81: { emoji: S.cloudRain,   label: "Chubascos moderados", color: "#74b9ff" },
  82: { emoji: S.cloudRain,   label: "Chubascos violentos", color: "#0984e3" },
  85: { emoji: S.cloudSnow,   label: "Chubascos de nieve",  color: "#dfe6e9" },
  86: { emoji: S.cloudSnow,   label: "Chubascos de nieve",  color: "#b2bec3" },
  95: { emoji: S.cloudLightning, label: "Tormenta",         color: "#fdcb6e" },
  96: { emoji: S.cloudLightning, label: "Tormenta con granizo", color: "#e17055" },
  99: { emoji: S.cloudLightning, label: "Tormenta fuerte",  color: "#d63031" },
};

function getWeatherInfo(code) {
  return WMO_MAP[code] || { emoji: S.cloud, label: "Desconocido", color: "#b2bec3" };
}

function getAQIInfo(aqi) {
  if (aqi == null || isNaN(aqi)) return { label: "Sin datos", color: "#636e72", gradient: "good" };
  const thresholds = CONFIG.aqiThresholds;
  for (const t of thresholds) {
    if (aqi <= t.max) return { label: t.label, color: t.color, gradient: gradientKey(t.label) };
  }
  return { label: "Peligrosa", color: "#880e4f", gradient: "hazardous" };
}

function gradientKey(label) {
  const map = {
    "Buena": "good",
    "Moderada": "moderate",
    "Insalubre (grupos sensibles)": "sensitive",
    "Insalubre": "unhealthy",
    "Muy insalubre": "veryUnhealthy",
    "Peligrosa": "hazardous",
  };
  return map[label] || "moderate";
}

function fmtTime(date) {
  const df = new DateFormatter();
  df.useShortTimeStyle();
  return df.string(date);
}

function fmtDate(date) {
  const df = new DateFormatter();
  df.useMediumDateStyle();
  df.useNoTimeStyle();
  return df.string(date);
}

function fmtDayName(date) {
  const df = new DateFormatter();
  df.locale = "es-ES";
  df.useFullDateStyle();
  df.useNoTimeStyle();
  return df.string(date);
}

function windDirectionEmoji(deg) {
  if (deg == null) return S.compass;
  if (deg >= 337.5 || deg < 22.5) return S.directionN;
  if (deg >= 22.5  && deg < 67.5)  return S.directionNE;
  if (deg >= 67.5  && deg < 112.5) return S.directionE;
  if (deg >= 112.5 && deg < 157.5) return S.directionSE;
  if (deg >= 157.5 && deg < 202.5) return S.directionS;
  if (deg >= 202.5 && deg < 247.5) return S.directionSW;
  if (deg >= 247.5 && deg < 292.5) return S.directionW;
  return S.directionNW;
}

function windDirectionLabel(deg) {
  if (deg == null) return "";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}

function fmtWindSpeed(speed) {
  if (speed == null) return "--";
  const val = CONFIG.useMetric ? speed : speed * 0.621371;
  return val.toFixed(1);
}

function windUnit() {
  return CONFIG.useMetric ? "km/h" : "mph";
}

function humidityComfort(h) {
  if (h == null) return { emoji: "💧", label: "--" };
  if (h < 30) return { emoji: "🏜️", label: "Muy seco" };
  if (h < 40) return { emoji: "🌵", label: "Seco" };
  if (h < 60) return { emoji: "👍", label: "Confortable" };
  if (h < 70) return { emoji: "💦", label: "Húmedo" };
  return { emoji: "🌊", label: "Muy húmedo" };
}

function uvInfo(index) {
  if (index == null || isNaN(index)) return { label: "--", color: C.textMuted, emoji: "☀️" };
  if (index <= 2)  return { label: "Bajo",      color: C.uvLow,      emoji: "🟢" };
  if (index <= 5)  return { label: "Moderado",  color: C.uvModerate, emoji: "🟡" };
  if (index <= 7)  return { label: "Alto",      color: C.uvHigh,     emoji: "🟠" };
  if (index <= 10) return { label: "Muy alto",  color: C.uvVeryHigh, emoji: "🔴" };
  return { label: "Extremo",  color: C.uvExtreme,  emoji: "🟣" };
}

function fmtTemp(celsius) {
  if (celsius == null) return "--°";
  const val = CONFIG.useMetric ? celsius : celsius * 1.8 + 32;
  return val.toFixed(1).replace(".0", "") + "°";
}

function tempUnit() {
  return CONFIG.useMetric ? "°C" : "°F";
}

function tempColor(celsius) {
  if (celsius == null) return C.text;
  if (celsius >= 35) return C.tempHot;
  if (celsius >= 25) return new Color("#ff9f43");
  if (celsius >= 15) return C.tempMild;
  if (celsius >= 5)  return C.tempCold;
  return new Color("#74b9ff");
}

class CacheManager {
  constructor(name) {
    this.fm = FileManager.local();
    this.dir = this.fm.joinPath(this.fm.documentsDirectory(), "caches", name);
    if (!this.fm.fileExists(this.dir)) {
      this.fm.createDirectory(this.dir, true);
    }
  }

  path(key) {
    const clean = key.replace(/[^a-zA-Z0-9_-]/g, "_");
    return this.fm.joinPath(this.dir, clean + ".json");
  }

  read(key, maxAgeMin) {
    const p = this.path(key);
    if (!this.fm.fileExists(p)) return null;
    try {
      const age = (Date.now() - this.fm.modificationDate(p).getTime()) / 60000;
      if (age > maxAgeMin) {
        this.fm.remove(p);
        return null;
      }
      return JSON.parse(this.fm.readString(p));
    } catch {
      return null;
    }
  }

  write(key, data) {
    try {
      this.fm.writeString(this.path(key), JSON.stringify(data));
    } catch {}
  }
}

async function fetchWithTimeout(url, timeoutSeconds) {
  const req = new Request(url);
  req.timeoutInterval = timeoutSeconds;
  req.headers = { "User-Agent": "Scriptable/1.0" };
  return await req.loadJSON();
}

async function fetchLocationByIP() {
  const data = await fetchWithTimeout("http://ip-api.com/json/?fields=lat,lon,countryCode", 5);
  return {
    latitude: data.lat ?? CONFIG.defaultLatitude,
    longitude: data.lon ?? CONFIG.defaultLongitude,
    country: data.countryCode ?? CONFIG.defaultCountry,
  };
}

async function fetchWeatherData(lat, lon) {
  
  const params = `latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weathercode,wind_speed_10m,wind_direction_10m,pressure_msl,uv_index,cloud_cover` +
    `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,wind_speed_10m_max,precipitation_sum` +
    `&forecast_days=3&timeformat=unixtime&timezone=auto`;
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  return await fetchWithTimeout(url, CONFIG.apiTimeout);
}

async function fetchAirQuality(lat, lon) {
  const params = `latitude=${lat}&longitude=${lon}` +
    `&current=european_aqi,us_aqi,pm2_5,pm10,nitrogen_dioxide_ozone` +
    `&timeformat=unixtime`;
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`;
  return await fetchWithTimeout(url, CONFIG.apiTimeout);
}

function parseWidgetParameter(param) {
  if (!param || param.trim() === "") return null;

  const trimmed = param.trim();
  
  const parts = trimmed.split("|");
  const coords = parts[0].split(",").map(s => parseFloat(s.trim()));

  if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
    return {
      latitude: coords[0],
      longitude: coords[1],
      country: parts[1]?.trim() || CONFIG.defaultCountry,
      cityName: parts[2]?.trim() || null,
    };
  }
  return null;
}

function buildSmallWidget(w, data) {
  const { current, aqi, location } = data;
  const weather = getWeatherInfo(current.weathercode);
  const aqiInfo = getAQIInfo(aqi.usAqi);
  const gradientKeys = Object.keys(C.aqiGradients);
  const gradKey = gradientKeys.includes(aqiInfo.gradient) ? aqiInfo.gradient : "moderate";
  const grad = C.aqiGradients[gradKey];

  const bg = new LinearGradient();
  bg.colors = grad;
  bg.locations = [0, 1];
  w.backgroundGradient = bg;

  
  const topRow = w.addStack();
  topRow.layoutHorizontally();
  topRow.addText(S.location);
  const cityLabel = topRow.addText(location.city || "Ubicación actual");
  cityLabel.font = Font.systemFont(11);
  cityLabel.textColor = C.textMuted;
  topRow.addSpacer();

  w.addSpacer(4);

  
  const mainRow = w.addStack();
  mainRow.layoutHorizontally();
  mainRow.centerAlignContent();

  
  const tempStack = mainRow.addStack();
  tempStack.layoutVertically();

  const tempLabel = tempStack.addText(fmtTemp(current.temperature));
  tempLabel.font = Font.boldSystemFont(36);
  tempLabel.textColor = weather.color;

  
  if (CONFIG.showFeelsLikeSmall && current.apparentTemperature != null) {
    const feelsLabel = tempStack.addText(`Sensación ${fmtTemp(current.apparentTemperature)}`);
    feelsLabel.font = Font.systemFont(9);
    feelsLabel.textColor = C.textMuted;
  }

  mainRow.addSpacer(null);

  
  const weatherEmoji = mainRow.addText(weather.emoji);
  weatherEmoji.font = Font.systemFont(32);

  w.addSpacer(8);

  
  const sep = w.addStack();
  sep.layoutHorizontally();
  const sepLine = sep.addText("─".repeat(8));
  sepLine.font = Font.systemFont(6);
  sepLine.textColor = C.textUltra;
  sep.addSpacer();
  sepLine.lineLimit = 1;

  w.addSpacer(6);

  
  const aqiRow = w.addStack();
  aqiRow.layoutHorizontally();
  aqiRow.centerAlignContent();

  const aqiBadge = aqiRow.addStack();
  aqiBadge.layoutHorizontally();
  aqiBadge.centerAlignContent();
  aqiBadge.backgroundColor = new Color(aqiInfo.color, 0.2);
  aqiBadge.cornerRadius = 8;
  aqiBadge.setPadding(4, 8, 4, 8);

  const aqiIcon = aqiBadge.addText(S.leaf);
  aqiIcon.font = Font.systemFont(11);
  aqiBadge.addSpacer(4);

  const aqiValue = aqiBadge.addText(aqi.usAqi != null ? `${aqi.usAqi} AQI` : "-- AQI");
  aqiValue.font = Font.boldSystemFont(11);
  aqiValue.textColor = new Color(aqiInfo.color);

  aqiRow.addSpacer(null);

  
  if (current.humidity != null) {
    const humStack = aqiRow.addStack();
    humStack.layoutHorizontally();
    humStack.centerAlignContent();

    const humIcon = humStack.addText(S.droplet);
    humIcon.font = Font.systemFont(9);
    humStack.addSpacer(2);
    const humVal = humStack.addText(`${current.humidity}%`);
    humVal.font = Font.systemFont(10);
    humVal.textColor = C.humidity;
  }

  w.addSpacer(4);

  
  const timeRow = w.addStack();
  timeRow.layoutHorizontally();
  timeRow.addSpacer(null);
  const timeLabel = timeRow.addText(`↻ ${fmtTime(new Date())}`);
  timeLabel.font = Font.systemFont(8);
  timeLabel.textColor = C.textUltra;
  timeRow.addSpacer(null);
}

function buildMediumWidget(w, data) {
  const { current, aqi, daily, location } = data;
  const weather = getWeatherInfo(current.weathercode);
  const aqiInfo = getAQIInfo(aqi.usAqi);
  const grad = C.aqiGradients[aqiInfo.gradient] || C.aqiGradients.moderate;

  const bg = new LinearGradient();
  bg.colors = grad;
  bg.locations = [0, 1];
  w.backgroundGradient = bg;

  
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const locStack = header.addStack();
  locStack.layoutHorizontally();
  locStack.centerAlignContent();
  const locIcon = locStack.addText(S.location);
  locIcon.font = Font.systemFont(10);
  locStack.addSpacer(3);
  const locLabel = locStack.addText(location.city || "Ubicación actual");
  locLabel.font = Font.systemFont(10);
  locLabel.textColor = C.textSecondary;

  header.addSpacer(null);

  const refreshLabel = header.addText(`↻ ${fmtTime(new Date())}`);
  refreshLabel.font = Font.systemFont(8);
  refreshLabel.textColor = C.textUltra;

  w.addSpacer(6);

  
  const body = w.addStack();
  body.layoutHorizontally();

  
  const leftCol = body.addStack();
  leftCol.layoutVertically();
  leftCol.size = new Size(0, 0); 

  const tempRow = leftCol.addStack();
  tempRow.layoutHorizontally();
  tempRow.centerAlignContent();

  const tempLabel = tempRow.addText(fmtTemp(current.temperature));
  tempLabel.font = Font.boldSystemFont(40);
  tempLabel.textColor = weather.color;

  tempRow.addSpacer(6);

  const condCol = tempRow.addStack();
  condCol.layoutVertically();
  const condEmoji = condCol.addText(weather.emoji);
  condEmoji.font = Font.systemFont(22);
  const condLabel = condCol.addText(weather.label);
  condLabel.font = Font.systemFont(9);
  condLabel.textColor = C.textSecondary;
  condLabel.lineLimit = 1;

  leftCol.addSpacer(4);

  
  if (daily && daily.temperatureMin != null && daily.temperatureMax != null) {
    const minMax = leftCol.addStack();
    minMax.layoutHorizontally();
    minMax.centerAlignContent();

    const minLabel = minMax.addText(`${S.arrowDown}${fmtTemp(daily.temperatureMin)}`);
    minLabel.font = Font.systemFont(11);
    minLabel.textColor = C.tempCold;
    minMax.addSpacer(8);
    const maxLabel = minMax.addText(`${S.arrowUp}${fmtTemp(daily.temperatureMax)}`);
    maxLabel.font = Font.systemFont(11);
    maxLabel.textColor = C.tempHot;
  }

  leftCol.addSpacer(6);

  
  if (current.apparentTemperature != null) {
    const feelsRow = leftCol.addStack();
    feelsRow.layoutHorizontally();
    feelsRow.centerAlignContent();
    const feelsIcon = feelsRow.addText(S.thermometer);
    feelsIcon.font = Font.systemFont(9);
    feelsRow.addSpacer(3);
    const feelsLabel = feelsRow.addText(`Sensación ${fmtTemp(current.apparentTemperature)}`);
    feelsLabel.font = Font.systemFont(10);
    feelsLabel.textColor = C.textSecondary;
  }

  leftCol.addSpacer(null);

  
  const rightCol = body.addStack();
  rightCol.layoutVertically();
  rightCol.addSpacer(2);

  
  addMetricCard(rightCol, S.leaf, "Calidad del Aire",
    aqi.usAqi != null ? `${aqi.usAqi} · ${aqiInfo.label}` : "Sin datos",
    new Color(aqiInfo.color));

  rightCol.addSpacer(4);

  
  const uv = uvInfo(current.uvIndex);
  addMetricCard(rightCol, S.sunSmall, "Índice UV",
    current.uvIndex != null ? `${current.uvIndex.toFixed(1)} · ${uv.label}` : "--",
    uv.color);

  rightCol.addSpacer(4);

  
  addMetricCard(rightCol, S.windIcon, "Viento",
    `${fmtWindSpeed(current.windSpeed)} ${windUnit()} · ${windDirectionLabel(current.windDirection)}`,
    C.wind);

  rightCol.addSpacer(4);

  
  const comfort = humidityComfort(current.humidity);
  addMetricCard(rightCol, S.droplet, "Humedad",
    current.humidity != null ? `${current.humidity}% · ${comfort.emoji} ${comfort.label}` : "--",
    C.humidity);

  rightCol.addSpacer(null);

  
  const aqiMiniRow = rightCol.addStack();
  aqiMiniRow.layoutHorizontally();
  aqiMiniRow.addSpacer(null);
  const aqiDot = aqiMiniRow.addText("●");
  aqiDot.font = Font.systemFont(7);
  aqiDot.textColor = new Color(aqiInfo.color);
  aqiMiniRow.addSpacer(3);
  const aqiDetail = aqiMiniRow.addText(`PM2.5: ${aqi.pm25 != null ? aqi.pm25.toFixed(1) : "--"} µg`);
  aqiDetail.font = Font.systemFont(8);
  aqiDetail.textColor = C.textUltra;
}

function addMetricCard(parent, icon, label, value, valueColor) {
  const card = parent.addStack();
  card.layoutHorizontally();
  card.centerAlignContent();
  card.backgroundColor = C.surface;
  card.cornerRadius = 6;
  card.setPadding(4, 8, 4, 8);

  const iconLabel = card.addText(icon);
  iconLabel.font = Font.systemFont(9);
  card.addSpacer(4);

  const infoCol = card.addStack();
  infoCol.layoutVertically();

  const labelRow = infoCol.addText(label);
  labelRow.font = Font.systemFont(7);
  labelRow.textColor = C.textMuted;

  const valueRow = infoCol.addText(value);
  valueRow.font = Font.boldSystemFont(9);
  valueRow.textColor = valueColor || C.text;
  valueRow.lineLimit = 1;

  card.addSpacer(null);
}

function buildLargeWidget(w, data) {
  const { current, aqi, daily, hourly, location } = data;
  const weather = getWeatherInfo(current.weathercode);
  const aqiInfo = getAQIInfo(aqi.usAqi);
  const grad = C.aqiGradients[aqiInfo.gradient] || C.aqiGradients.moderate;

  const bg = new LinearGradient();
  bg.colors = grad;
  bg.locations = [0, 1];
  w.backgroundGradient = bg;

  
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const locStack = header.addStack();
  locStack.layoutHorizontally();
  locStack.centerAlignContent();
  const locIcon = locStack.addText(S.location);
  locIcon.font = Font.systemFont(10);
  locStack.addSpacer(3);
  const locLabel = locStack.addText(location.city || "Ubicación actual");
  locLabel.font = Font.boldSystemFont(12);
  locLabel.textColor = C.text;
  locStack.addSpacer(6);

  const countryBadge = locStack.addStack();
  countryBadge.layoutHorizontally();
  countryBadge.centerAlignContent();
  countryBadge.backgroundColor = C.surface;
  countryBadge.cornerRadius = 4;
  countryBadge.setPadding(1, 5, 1, 5);
  const countryLabel = countryBadge.addText(location.country || "");
  countryLabel.font = Font.systemFont(8);
  countryLabel.textColor = C.textMuted;

  header.addSpacer(null);

  const dateLabel = header.addText(fmtDate(new Date()));
  dateLabel.font = Font.systemFont(9);
  dateLabel.textColor = C.textMuted;

  w.addSpacer(6);

  
  const row1 = w.addStack();
  row1.layoutHorizontally();

  
  const tempCol = row1.addStack();
  tempCol.layoutVertically();
  tempCol.centerAlignContent();

  
  const condEmoji = tempCol.addText(weather.emoji);
  condEmoji.font = Font.systemFont(28);

  const tempVal = tempCol.addText(fmtTemp(current.temperature));
  tempVal.font = Font.boldSystemFont(32);
  tempVal.textColor = weather.color;

  const condText = tempCol.addText(weather.label);
  condText.font = Font.systemFont(9);
  condText.textColor = C.textSecondary;

  const feelsVal = tempCol.addText(`Sensación ${fmtTemp(current.apparentTemperature)}`);
  feelsVal.font = Font.systemFont(8);
  feelsVal.textColor = C.textMuted;

  row1.addSpacer(10);

  
  const metricsCol = row1.addStack();
  metricsCol.layoutVertically();
  metricsCol.addSpacer(4);

  
  const aqiCard = metricsCol.addStack();
  aqiCard.layoutHorizontally();
  aqiCard.centerAlignContent();
  aqiCard.backgroundColor = C.surface;
  aqiCard.cornerRadius = 8;
  aqiCard.setPadding(6, 10, 6, 10);

  const aqiCircle = aqiCard.addStack();
  aqiCircle.layoutVertically();
  aqiCircle.centerAlignContent();
  aqiCircle.backgroundColor = new Color(aqiInfo.color, 0.2);
  aqiCircle.cornerRadius = 20;
  aqiCircle.setPadding(6, 8, 6, 8);
  aqiCircle.size = new Size(40, 40);

  const aqiNum = aqiCircle.addText(aqi.usAqi != null ? `${aqi.usAqi}` : "--");
  aqiNum.font = Font.boldSystemFont(16);
  aqiNum.textColor = new Color(aqiInfo.color);

  const aqiLabel = aqiCircle.addText("AQI");
  aqiLabel.font = Font.systemFont(7);
  aqiLabel.textColor = new Color(aqiInfo.color, 0.8);

  aqiCard.addSpacer(8);

  const aqiInfoCol = aqiCard.addStack();
  aqiInfoCol.layoutVertically();
  const aqiTitle = aqiInfoCol.addText(aqiInfo.label);
  aqiTitle.font = Font.boldSystemFont(11);
  aqiTitle.textColor = new Color(aqiInfo.color);
  const aqiSub = aqiInfoCol.addText(`PM2.5: ${aqi.pm25 != null ? aqi.pm25.toFixed(1) : "--"} · PM10: ${aqi.pm10 != null ? aqi.pm10.toFixed(1) : "--"}`);
  aqiSub.font = Font.systemFont(8);
  aqiSub.textColor = C.textMuted;
  aqiSub.lineLimit = 1;

  aqiCard.addSpacer(null);

  metricsCol.addSpacer(4);

  
  const miniRow = metricsCol.addStack();
  miniRow.layoutHorizontally();

  if (daily && daily.temperatureMin != null) {
    const minMaxChip = miniRow.addStack();
    minMaxChip.layoutHorizontally();
    minMaxChip.centerAlignContent();
    minMaxChip.backgroundColor = C.surface;
    minMaxChip.cornerRadius = 6;
    minMaxChip.setPadding(3, 6, 3, 6);

    const minLabel = minMaxChip.addText(`${S.arrowDown}${fmtTemp(daily.temperatureMin)}`);
    minLabel.font = Font.systemFont(9);
    minLabel.textColor = C.tempCold;
    minMaxChip.addSpacer(3);
    const maxLabel = minMaxChip.addText(`${S.arrowUp}${fmtTemp(daily.temperatureMax)}`);
    maxLabel.font = Font.systemFont(9);
    maxLabel.textColor = C.tempHot;

    miniRow.addSpacer(3);
  }

  
  if (current.uvIndex != null) {
    const uvChip = miniRow.addStack();
    uvChip.layoutHorizontally();
    uvChip.centerAlignContent();
    uvChip.backgroundColor = C.surface;
    uvChip.cornerRadius = 6;
    uvChip.setPadding(3, 6, 3, 6);

    const uvEmoji = uvChip.addText(uvInfo(current.uvIndex).emoji);
    uvEmoji.font = Font.systemFont(9);
    uvChip.addSpacer(2);
    const uvVal = uvChip.addText(`UV ${current.uvIndex.toFixed(1)}`);
    uvVal.font = Font.systemFont(9);
    uvVal.textColor = uvInfo(current.uvIndex).color;
  }

  miniRow.addSpacer(3);

  
  if (current.windSpeed != null) {
    const windChip = miniRow.addStack();
    windChip.layoutHorizontally();
    windChip.centerAlignContent();
    windChip.backgroundColor = C.surface;
    windChip.cornerRadius = 6;
    windChip.setPadding(3, 6, 3, 6);

    const windEmoji = windChip.addText(windDirectionEmoji(current.windDirection));
    windEmoji.font = Font.systemFont(9);
    windChip.addSpacer(2);
    const windVal = windChip.addText(`${fmtWindSpeed(current.windSpeed)} ${windUnit().charAt(0)}`);
    windVal.font = Font.systemFont(9);
    windVal.textColor = C.wind;
  }

  row1.addSpacer(null);

  w.addSpacer(6);

  
  const sepLine = w.addText("─".repeat(30));
  sepLine.font = Font.systemFont(5);
  sepLine.textColor = C.textUltra;
  sepLine.lineLimit = 1;

  w.addSpacer(6);

  
  const row2 = w.addStack();
  row2.layoutHorizontally();

  
  const aqiDetailCol = row2.addStack();
  aqiDetailCol.layoutVertically();

  const aqiDetailHeader = aqiDetailCol.addText("📊 Componentes AQI");
  aqiDetailHeader.font = Font.boldSystemFont(9);
  aqiDetailHeader.textColor = C.textSecondary;

  aqiDetailCol.addSpacer(3);

  const pollutants = [
    { name: "PM2.5", value: aqi.pm25, unit: "µg/m³", color: new Color(aqiInfo.color) },
    { name: "PM10",  value: aqi.pm10, unit: "µg/m³", color: C.text },
    { name: "O₃",    value: aqi.ozone, unit: "µg/m³", color: C.uvModerate },
    { name: "NO₂",   value: aqi.no2,  unit: "µg/m³", color: C.uvHigh },
  ];

  for (const p of pollutants) {
    if (p.value == null) continue;
    const pollutantRow = aqiDetailCol.addStack();
    pollutantRow.layoutHorizontally();
    pollutantRow.centerAlignContent();
    pollutantRow.backgroundColor = C.surfaceAlt;
    pollutantRow.cornerRadius = 4;
    pollutantRow.setPadding(3, 6, 3, 6);

    const pName = pollutantRow.addText(p.name);
    pName.font = Font.systemFont(9);
    pName.textColor = C.textMuted;
    pName.minimumScaleFactor = 0.8;

    pollutantRow.addSpacer(null);

    const pVal = pollutantRow.addText(p.value.toFixed(1));
    pVal.font = Font.boldSystemFont(9);
    pVal.textColor = p.color;

    pollutantRow.addSpacer(3);

    const pUnit = pollutantRow.addText(p.unit);
    pUnit.font = Font.systemFont(7);
    pUnit.textColor = C.textUltra;

    aqiDetailCol.addSpacer(2);
  }

  aqiDetailCol.addSpacer(null);

  
  const forecastCol = row2.addStack();
  forecastCol.addSpacer(8);

  const forecastHeader = forecastCol.addText("📅 Previsión 3 días");
  forecastHeader.font = Font.boldSystemFont(9);
  forecastHeader.textColor = C.textSecondary;

  forecastCol.addSpacer(3);

  if (daily && daily.forecast && daily.forecast.length > 0) {
    for (let i = 0; i < Math.min(daily.forecast.length, 3); i++) {
      const day = daily.forecast[i];
      const dayWeather = getWeatherInfo(day.weathercode);

      const dayRow = forecastCol.addStack();
      dayRow.layoutHorizontally();
      dayRow.centerAlignContent();
      dayRow.backgroundColor = C.surfaceAlt;
      dayRow.cornerRadius = 4;
      dayRow.setPadding(3, 6, 3, 6);

      
      const dayName = dayRow.addText(i === 0 ? "Hoy" : day.dayName);
      dayName.font = Font.systemFont(9);
      dayName.textColor = i === 0 ? C.text : C.textMuted;
      dayName.minimumScaleFactor = 0.7;

      dayRow.addSpacer(3);

      const dayEmoji = dayRow.addText(dayWeather.emoji);
      dayEmoji.font = Font.systemFont(10);

      dayRow.addSpacer(null);

      const dayPrecip = dayRow.addText(day.precip > 0 ? `${S.droplet}${day.precip.toFixed(0)}%` : "");
      dayPrecip.font = Font.systemFont(7);
      dayPrecip.textColor = C.humidity;

      dayRow.addSpacer(3);

      const dayMin = dayRow.addText(fmtTemp(day.tempMin));
      dayMin.font = Font.systemFont(9);
      dayMin.textColor = C.tempCold;

      const daySep = dayRow.addText("|");
      daySep.font = Font.systemFont(8);
      daySep.textColor = C.textUltra;

      const dayMax = dayRow.addText(fmtTemp(day.tempMax));
      dayMax.font = Font.systemFont(9);
      dayMax.textColor = C.tempHot;

      forecastCol.addSpacer(2);
    }
  } else {
    const noData = forecastCol.addText("No hay datos de previsión");
    noData.font = Font.systemFont(8);
    noData.textColor = C.textMuted;
  }

  forecastCol.addSpacer(null);

  w.addSpacer(4);

  
  const footer = w.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  footer.backgroundColor = C.surface;
  footer.cornerRadius = 6;
  footer.setPadding(4, 8, 4, 8);

  if (daily && daily.sunrise) {
    const sunriseStack = footer.addStack();
    sunriseStack.layoutHorizontally();
    sunriseStack.centerAlignContent();
    sunriseStack.addText(S.sunrise);
    const sunriseLabel = sunriseStack.addText(fmtTime(daily.sunrise));
    sunriseLabel.font = Font.systemFont(9);
    sunriseLabel.textColor = C.textMuted;

    footer.addSpacer(12);

    const sunsetStack = footer.addStack();
    sunsetStack.layoutHorizontally();
    sunsetStack.centerAlignContent();
    sunsetStack.addText(S.sunset);
    const sunsetLabel = sunsetStack.addText(fmtTime(daily.sunset));
    sunsetLabel.font = Font.systemFont(9);
    sunsetLabel.textColor = C.textMuted;
  }

  footer.addSpacer(null);

  if (current.humidity != null) {
    const humStack = footer.addStack();
    humStack.layoutHorizontally();
    humStack.centerAlignContent();
    humStack.addText(S.droplet);
    const humLabel = humStack.addText(`${current.humidity}%`);
    humLabel.font = Font.systemFont(9);
    humLabel.textColor = C.humidity;

    footer.addSpacer(8);
  }

  if (current.cloudCover != null) {
    const cloudStack = footer.addStack();
    cloudStack.layoutHorizontally();
    cloudStack.centerAlignContent();
    cloudStack.addText(S.cloud);
    const cloudLabel = cloudStack.addText(`${current.cloudCover}%`);
    cloudLabel.font = Font.systemFont(9);
    cloudLabel.textColor = C.textMuted;
  }
}

function createErrorWidget(message) {
  const widget = new ListWidget();
  const bg = new LinearGradient();
  bg.colors = [new Color("#1a0a0a"), new Color("#2a1515")];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;

  const stack = widget.addStack();
  stack.layoutVertically();
  stack.centerAlignContent();
  stack.addSpacer(null);

  const icon = stack.addText(S.warning);
  icon.font = Font.systemFont(32);
  stack.addSpacer(6);

  const errorTitle = stack.addText("Error al cargar datos");
  errorTitle.font = Font.boldSystemFont(12);
  errorTitle.textColor = C.tempHot;
  stack.addSpacer(4);

  const shortMsg = message.length > 80 ? message.slice(0, 77) + "..." : message;
  const errorMsg = stack.addText(shortMsg);
  errorMsg.font = Font.systemFont(9);
  errorMsg.textColor = C.textMuted;
  errorMsg.lineLimit = 3;
  errorMsg.textAlign = "center";

  stack.addSpacer(4);

  const retryLabel = stack.addText("Toca para recargar");
  retryLabel.font = Font.systemFont(8);
  retryLabel.textColor = C.textUltra;

  stack.addSpacer(null);

  widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + 600000); 

  return widget;
}

async function run() {
  const widget = new ListWidget();

  try {
    
    const param = args.widgetParameter || null;
    let config = parseWidgetParameter(param);

    if (!config) {
      
      const ipLocation = await fetchLocationByIP();
      config = {
        latitude: ipLocation.latitude,
        longitude: ipLocation.longitude,
        country: ipLocation.country || CONFIG.defaultCountry,
        cityName: null,
      };
    }

    
    const cache = new CacheManager("air-quality-weather-detail");
    const cacheKey = `${config.latitude.toFixed(2)}_${config.longitude.toFixed(2)}`;

    
    const now = Math.floor(Date.now() / 1000);
    let weatherData = cache.read(`weather_${cacheKey}`, CONFIG.cacheMinutes);
    let aqiData = cache.read(`aqi_${cacheKey}`, CONFIG.cacheMinutes);
    let geoData = cache.read(`geo_${cacheKey}`, 1440); 

    if (!weatherData) {
      weatherData = await fetchWeatherData(config.latitude, config.longitude);
      cache.write(`weather_${cacheKey}`, weatherData);
    }

    if (!aqiData) {
      aqiData = await fetchAirQuality(config.latitude, config.longitude);
      cache.write(`aqi_${cacheKey}`, aqiData);
    }

    
    let cityName = config.cityName;
    if (!cityName && geoData?.city) {
      cityName = geoData.city;
    }
    
    const locationName = cityName || `${config.latitude.toFixed(2)}°, ${config.longitude.toFixed(2)}°`;

    
    const current = weatherData.current || {};
    const dailyData = weatherData.daily || {};

    
    const daily = {
      temperatureMin: dailyData.temperature_2m_min?.[0],
      temperatureMax: dailyData.temperature_2m_max?.[0],
      sunrise: dailyData.sunrise?.[0] ? new Date(dailyData.sunrise[0] * 1000) : null,
      sunset: dailyData.sunset?.[0] ? new Date(dailyData.sunset[0] * 1000) : null,
      uvMax: dailyData.uv_index_max?.[0],
      precipitationSum: dailyData.precipitation_sum?.[0],
      forecast: [],
    };

    
    if (dailyData.time) {
      const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      for (let i = 0; i < Math.min(dailyData.time.length, 3); i++) {
        const d = new Date(dailyData.time[i] * 1000);
        daily.forecast.push({
          dayName: dayNames[d.getDay()],
          tempMin: dailyData.temperature_2m_min?.[i],
          tempMax: dailyData.temperature_2m_max?.[i],
          weathercode: dailyData.weathercode?.[i],
          precip: dailyData.precipitation_sum?.[i] || 0,
        });
      }
    }

    
    const aqiCurrent = aqiData.current || {};
    const aqi = {
      usAqi: aqiCurrent.us_aqi,
      europeanAqi: aqiCurrent.european_aqi,
      pm25: aqiCurrent.pm2_5,
      pm10: aqiCurrent.pm10,
      ozone: aqiCurrent.nitrogen_dioxide_ozone, 
      no2: aqiCurrent.nitrogen_dioxide,
    };

    
    if (aqiCurrent.nitrogen_dioxide_ozone != null && aqiCurrent.nitrogen_dioxide == null) {
      aqi.ozone = aqiCurrent.nitrogen_dioxide_ozone;
    }

    
    const data = {
      current: {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        apparentTemperature: current.apparent_temperature,
        weathercode: current.weathercode,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        pressure: current.pressure_msl,
        uvIndex: current.uv_index,
        cloudCover: current.cloud_cover,
      },
      aqi,
      daily,
      location: {
        city: locationName,
        country: config.country,
        lat: config.latitude,
        lon: config.longitude,
      },
    };

    
    
    const widgetSize = config.runsInWidget ? config.widgetFamily : "medium";

    switch (widgetSize) {
      case "small":
        buildSmallWidget(widget, data);
        break;
      case "medium":
        buildMediumWidget(widget, data);
        break;
      case "large":
        buildLargeWidget(widget, data);
        break;
      default:
        buildMediumWidget(widget, data);
    }

    
    widget.refreshAfterDate = new Date(Date.now() + 30 * 60000);

  } catch (err) {
    return createErrorWidget(err.message || "Error desconocido");
  }

  
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    const size = args.widgetParameter ? "medium" : "large";
    if (size === "large") {
      await widget.presentLarge();
    } else {
      await widget.presentMedium();
    }
  }
}

await run();
Script.complete();
