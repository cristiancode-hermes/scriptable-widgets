const CONFIG = {
  defaultLatitude: 40.4168,
  defaultLongitude: -3.7038,
  defaultCity: "Madrid",
  cacheMinutes: 30,
  locationTimeoutSeconds: 8,
  apiTimeoutSeconds: 8,
  retryMinutes: 10,
  maxEvents: 4,
  hourlyPoints: 12,
};

const C = {
  text: new Color("#e8eefc"),
  secondary: new Color("#9aa7c2"),
  muted: new Color("#5c6a86"),
  accent: new Color("#7ee0c4"),
  warning: new Color("#ffb74d"),
  danger: new Color("#ff6b6b"),
  surface: new Color("#ffffff", 0.07),
  todaySurface: new Color("#7ee0c4", 0.12),
  rain: new Color("#4fc3f7"),
  uv: new Color("#ffd54f"),
};

const SPECIES = [
  { key: "olive_pollen", label: "Olivo", emoji: "🫒" },
  { key: "grass_pollen", label: "Gramíneas", emoji: "🌾" },
  { key: "birch_pollen", label: "Abedul", emoji: "🌳" },
  { key: "alder_pollen", label: "Aliso", emoji: "🍂" },
  { key: "mugwort_pollen", label: "Artemisa", emoji: "🌿" },
  { key: "ragweed_pollen", label: "Ambrosía", emoji: "🌼" },
];

const POLLEN_BANDS = [
  { max: 0.99, label: "Nulo", short: "Nulo", level: 0, color: "#64ffda", emoji: "🟢" },
  { max: 9.99, label: "Bajo", short: "Bajo", level: 1, color: "#81c784", emoji: "🟢" },
  { max: 49.99, label: "Moderado", short: "Mod.", level: 2, color: "#ffd54f", emoji: "🟡" },
  { max: 149.99, label: "Alto", short: "Alto", level: 3, color: "#ff9800", emoji: "🟠" },
  { max: Infinity, label: "Muy alto", short: "Ext.", level: 4, color: "#ff6b6b", emoji: "🔴" },
];

const UV_BANDS = [
  { max: 2.49, label: "Bajo", color: "#81c784" },
  { max: 5.49, label: "Moderado", color: "#ffd54f" },
  { max: 7.49, label: "Alto", color: "#ff9800" },
  { max: 10.49, label: "Muy alto", color: "#ff6b6b" },
  { max: Infinity, label: "Extremo", color: "#ce93d8" },
];

const WMO_MAP = {
  0: { emoji: "☀️", label: "Despejado" },
  1: { emoji: "🌤️", label: "Mayormente despejado" },
  2: { emoji: "⛅", label: "Parcialmente nublado" },
  3: { emoji: "☁️", label: "Nublado" },
  45: { emoji: "🌫️", label: "Niebla" },
  48: { emoji: "🌫️", label: "Niebla escarchada" },
  51: { emoji: "🌦️", label: "Llovizna ligera" },
  53: { emoji: "🌦️", label: "Llovizna" },
  61: { emoji: "🌧️", label: "Lluvia ligera" },
  63: { emoji: "🌧️", label: "Lluvia" },
  65: { emoji: "🌧️", label: "Lluvia fuerte" },
  80: { emoji: "🌦️", label: "Chubascos" },
  81: { emoji: "🌧️", label: "Chubascos" },
  82: { emoji: "⛈️", label: "Chubascos fuertes" },
  95: { emoji: "⛈️", label: "Tormenta" },
  96: { emoji: "⛈️", label: "Tormenta con granizo" },
  99: { emoji: "⛈️", label: "Tormenta con granizo" },
};

const WMO_DEFAULT = { emoji: "🌡️", label: "Sin datos" };

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const GRADIENTS = {
  0: ["#0a1f1c", "#112b28"],
  1: ["#0b2418", "#16361f"],
  2: ["#241c0a", "#3a2e12"],
  3: ["#2a1608", "#3d220e"],
  4: ["#2a0e14", "#1a0a12"],
  unknown: ["#0a192f", "#112240"],
};

class PayloadCache {
  constructor(fileName) {
    this.fm = FileManager.local();
    this.dir = this.fm.joinPath(this.fm.documentsDirectory(), "pollen-uv-sentinel-cache");
    this.file = this.fm.joinPath(this.dir, fileName);
  }

  read() {
    try {
      if (!this.fm.fileExists(this.file)) return null;
      const parsed = JSON.parse(this.fm.readString(this.file));
      if (!parsed || !parsed.savedAt || !parsed.payload) return null;
      const ageMinutes = (Date.now() - parsed.savedAt) / 60000;
      if (ageMinutes > CONFIG.cacheMinutes) return null;
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

function pickNumber(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
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

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function pollenBand(value) {
  if (value === null || value === undefined) {
    return { label: "Sin datos", short: "—", level: null, color: "#8892b0", emoji: "⚪" };
  }
  for (const band of POLLEN_BANDS) {
    if (value <= band.max) return band;
  }
  return POLLEN_BANDS[POLLEN_BANDS.length - 1];
}

function uvBand(value) {
  if (value === null || value === undefined) {
    return { label: "Sin datos", color: "#8892b0" };
  }
  for (const band of UV_BANDS) {
    if (value <= band.max) return band;
  }
  return UV_BANDS[UV_BANDS.length - 1];
}

function weatherInfo(code) {
  if (code === null || code === undefined) return WMO_DEFAULT;
  return WMO_MAP[code] || WMO_DEFAULT;
}

function burnMinutes(uv) {
  if (uv === null || uv === undefined || uv <= 0) return null;
  return Math.max(8, Math.round(180 / uv));
}

function hourFromStamp(stamp) {
  try {
    if (!stamp || typeof stamp !== "string" || stamp.length < 13) return null;
    const hour = parseInt(stamp.slice(11, 13), 10);
    return Number.isFinite(hour) ? hour : null;
  } catch (error) {
    return null;
  }
}

function addSymbol(stack, name, size, color) {
  try {
    const symbol = SFSymbol.named(name);
    symbol.applyFont(Font.systemFont(size));
    const image = stack.addImage(symbol.image);
    image.imageSize = new Size(size, size);
    image.tintColor = color;
  } catch (error) {
    const fallback = stack.addText("•");
    fallback.font = Font.systemFont(size);
    fallback.textColor = color;
  }
}

function addBar(parent, fraction, colorHex, width) {
  const track = parent.addStack();
  track.layoutHorizontally();
  track.backgroundColor = new Color("#ffffff", 0.08);
  track.cornerRadius = 3;
  track.size = new Size(width, 6);
  const fill = track.addStack();
  fill.backgroundColor = new Color(colorHex);
  fill.cornerRadius = 3;
  const pct = Math.max(0, Math.min(1, fraction));
  fill.size = new Size(Math.max(2, Math.round(width * pct)), 6);
  track.addSpacer(null);
}

function applyGradient(widget, level) {
  const key = level === null || level === undefined ? "unknown" : level;
  const pair = GRADIENTS[key] || GRADIENTS.unknown;
  const gradient = new LinearGradient();
  gradient.colors = pair.map((hex) => new Color(hex));
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
}

async function fetchLocation() {
  try {
    Location.setAccuracyToThreeKilometers();
    const locationPromise = Location.current();
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve(null), CONFIG.locationTimeoutSeconds * 1000);
    });
    const location = await Promise.race([locationPromise, timeoutPromise]);
    if (location && location.latitude && location.longitude) {
      return { latitude: location.latitude, longitude: location.longitude, usingDefault: false };
    }
  } catch (error) {}
  return {
    latitude: CONFIG.defaultLatitude,
    longitude: CONFIG.defaultLongitude,
    usingDefault: true,
  };
}

function extractSpeciesMap(source) {
  const map = {};
  for (const species of SPECIES) {
    map[species.key] = pickNumber(source ? source[species.key] : null);
  }
  return map;
}

function speciesListFromMap(map) {
  return SPECIES.map((species) => {
    const value = map[species.key];
    const band = pollenBand(value);
    return {
      key: species.key,
      label: species.label,
      emoji: species.emoji,
      value,
      band,
    };
  }).sort((a, b) => {
    const av = a.value === null ? -1 : a.value;
    const bv = b.value === null ? -1 : b.value;
    return bv - av;
  });
}

function combinedFromList(list) {
  const numeric = list.filter((item) => item.value !== null);
  if (numeric.length === 0) {
    return { value: null, band: pollenBand(null), dominant: null };
  }
  const top = numeric[0];
  return { value: top.value, band: top.band, dominant: top };
}

async function fetchPollen(latitude, longitude) {
  const cache = new PayloadCache("pollen.json");
  const cached = cache.read();
  if (cached) return cached;
  try {
    const url =
      "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" +
      latitude +
      "&longitude=" +
      longitude +
      "&current=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen" +
      "&hourly=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen" +
      "&timezone=auto&forecast_days=1";
    const request = new Request(url);
    request.timeoutInterval = CONFIG.apiTimeoutSeconds;
    const json = await request.loadJSON();
    const current = json.current || {};
    const hourly = json.hourly || {};
    const times = hourly.time || [];
    const nowHour = new Date().getHours();
    let index = times.findIndex((stamp) => hourFromStamp(stamp) === nowHour);
    if (index < 0) index = 0;
    const hourlyCurrent = {};
    for (const species of SPECIES) {
      const series = hourly[species.key] || [];
      hourlyCurrent[species.key] = pickNumber(series[index]);
    }
    const currentMap = extractSpeciesMap(current);
    const merged = {};
    for (const species of SPECIES) {
      merged[species.key] = pickNumber(currentMap[species.key], hourlyCurrent[species.key]);
    }
    const hourlyCombined = [];
    for (let i = 0; i < times.length; i++) {
      const hour = hourFromStamp(times[i]);
      if (hour === null) continue;
      let peak = null;
      for (const species of SPECIES) {
        const series = hourly[species.key] || [];
        const value = pickNumber(series[i]);
        if (value === null) continue;
        if (peak === null || value > peak) peak = value;
      }
      hourlyCombined.push({ hour, value: peak });
    }
    const payload = { species: merged, hourlyCombined };
    cache.write(payload);
    return payload;
  } catch (error) {
    return { species: extractSpeciesMap({}), hourlyCombined: [] };
  }
}

async function fetchWeather(latitude, longitude) {
  const cache = new PayloadCache("weather.json");
  const cached = cache.read();
  if (cached) return cached;
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=" +
      latitude +
      "&longitude=" +
      longitude +
      "&current=temperature_2m,relative_humidity_2m,weather_code,uv_index,precipitation" +
      "&hourly=uv_index,precipitation_probability,temperature_2m" +
      "&daily=uv_index_max,precipitation_probability_max,weather_code,temperature_2m_max,temperature_2m_min" +
      "&timezone=auto&forecast_days=1";
    const request = new Request(url);
    request.timeoutInterval = CONFIG.apiTimeoutSeconds;
    const json = await request.loadJSON();
    const current = json.current || {};
    const hourly = json.hourly || {};
    const daily = json.daily || {};
    const times = hourly.time || [];
    const nowHour = new Date().getHours();
    let index = times.findIndex((stamp) => hourFromStamp(stamp) === nowHour);
    if (index < 0) index = 0;
    const uvSeries = hourly.uv_index || [];
    const rainSeries = hourly.precipitation_probability || [];
    const hourlySlice = [];
    const start = index >= 0 ? index : 0;
    for (let i = start; i < times.length && hourlySlice.length < CONFIG.hourlyPoints; i++) {
      hourlySlice.push({
        hour: hourFromStamp(times[i]),
        uv: pickNumber(uvSeries[i]),
        rain: pickNumber(rainSeries[i]),
      });
    }
    const payload = {
      temperature: pickNumber(current.temperature_2m),
      humidity: pickNumber(current.relative_humidity_2m),
      weatherCode: pickNumber(current.weather_code, current.weathercode, (daily.weather_code || daily.weathercode || [])[0]),
      uvNow: pickNumber(current.uv_index, uvSeries[index]),
      uvMax: pickNumber((daily.uv_index_max || [])[0]),
      rainNow: pickNumber(current.precipitation),
      rainMax: pickNumber((daily.precipitation_probability_max || [])[0], rainSeries[index]),
      tempMax: pickNumber((daily.temperature_2m_max || [])[0]),
      tempMin: pickNumber((daily.temperature_2m_min || [])[0]),
      hourly: hourlySlice,
    };
    cache.write(payload);
    return payload;
  } catch (error) {
    return {
      temperature: null,
      humidity: null,
      weatherCode: null,
      uvNow: null,
      uvMax: null,
      rainNow: null,
      rainMax: null,
      tempMax: null,
      tempMin: null,
      hourly: [],
    };
  }
}

async function fetchTodayEvents() {
  const results = [];
  try {
    const calendars = await Calendar.forEvents();
    const dayStart = startOfDay(new Date());
    const dayEnd = new Date(dayStart.getTime() + 86399999);
    for (const calendar of calendars) {
      if (!calendar.allowsContentModifications) continue;
      const events = await CalendarEvent.between(dayStart, dayEnd, [calendar]);
      for (const event of events) {
        if (!event.startDate) continue;
        results.push({ title: event.title, startDate: event.startDate });
      }
    }
  } catch (error) {}
  results.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  return results.slice(0, CONFIG.maxEvents);
}

function nextEvent(events) {
  const now = Date.now();
  for (const event of events) {
    if (new Date(event.startDate).getTime() >= now) return event;
  }
  return events.length > 0 ? events[0] : null;
}

function drawHourlyStrip(points, width, height) {
  const context = new DrawContext();
  context.size = new Size(width, height);
  context.opaque = false;
  context.respectScreenScale = true;
  const valid = points.filter((point) => typeof point.uv === "number" || typeof point.rain === "number");
  if (valid.length < 2) return null;
  const uvs = valid.map((point) => (typeof point.uv === "number" ? point.uv : 0));
  const maxUv = Math.max(1, ...uvs);
  const path = new Path();
  valid.forEach((point, index) => {
    const x = (index / (valid.length - 1)) * (width - 8) + 4;
    const uv = typeof point.uv === "number" ? point.uv : 0;
    const y = height - 6 - (uv / maxUv) * (height - 12);
    if (index === 0) path.move(new Point(x, y));
    else path.addLine(new Point(x, y));
  });
  context.addPath(path);
  context.setStrokeColor(new Color("#ffd54f"));
  context.setLineWidth(2);
  context.strokePath();
  valid.forEach((point, index) => {
    const x = (index / (valid.length - 1)) * (width - 8) + 4;
    const uv = typeof point.uv === "number" ? point.uv : 0;
    const y = height - 6 - (uv / maxUv) * (height - 12);
    context.setFillColor(new Color("#ffd54f"));
    context.fillEllipse(new Rect(x - 2.5, y - 2.5, 5, 5));
    const rain = typeof point.rain === "number" ? point.rain : 0;
    if (rain >= 30) {
      context.setFillColor(new Color("#4fc3f7", Math.min(1, rain / 100)));
      context.fillRect(new Rect(x - 1.5, height - 4, 3, 3));
    }
  });
  return context.getImage();
}

function buildSmall(widget, data) {
  applyGradient(widget, data.combined.band.level);
  widget.setPadding(10, 12, 10, 12);
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  addSymbol(header, "leaf.fill", 11, new Color(data.combined.band.color));
  header.addSpacer(4);
  const title = header.addText("POLEN");
  title.font = Font.boldSystemFont(9);
  title.textColor = C.accent;
  header.addSpacer(null);
  const city = header.addText(data.cityName);
  city.font = Font.systemFont(8);
  city.textColor = C.muted;
  widget.addSpacer(6);
  const hero = widget.addStack();
  hero.layoutHorizontally();
  hero.centerAlignContent();
  const emoji = hero.addText(data.combined.band.emoji);
  emoji.font = Font.systemFont(22);
  hero.addSpacer(8);
  const heroCol = hero.addStack();
  heroCol.layoutVertically();
  const bandLabel = heroCol.addText(data.combined.band.label);
  bandLabel.font = Font.boldSystemFont(16);
  bandLabel.textColor = new Color(data.combined.band.color);
  const dominant = heroCol.addText(data.combined.dominant ? data.combined.dominant.label : "Sin lectura");
  dominant.font = Font.systemFont(9);
  dominant.textColor = C.secondary;
  widget.addSpacer(8);
  const uvRow = widget.addStack();
  uvRow.layoutHorizontally();
  uvRow.centerAlignContent();
  uvRow.backgroundColor = C.surface;
  uvRow.cornerRadius = 8;
  uvRow.setPadding(5, 8, 5, 8);
  addSymbol(uvRow, "sun.max.fill", 11, C.uv);
  uvRow.addSpacer(5);
  const uvText = uvRow.addText(data.weather.uvNow === null ? "UV —" : "UV " + data.weather.uvNow.toFixed(1));
  uvText.font = Font.mediumSystemFont(11);
  uvText.textColor = new Color(data.uv.color);
  uvRow.addSpacer(null);
  const weatherEmoji = uvRow.addText(data.weather.info.emoji);
  weatherEmoji.font = Font.systemFont(12);
  widget.addSpacer(6);
  const footer = widget.addText(formatTemp(data.weather.temperature) + "  " + data.weather.info.label);
  footer.font = Font.systemFont(9);
  footer.textColor = C.secondary;
}

function buildMedium(widget, data) {
  applyGradient(widget, data.combined.band.level);
  widget.setPadding(12, 14, 12, 14);
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const dateLabel = header.addText(data.weekdayShort.toUpperCase() + " " + data.dayNumber + " " + data.monthShort.toUpperCase());
  dateLabel.font = Font.boldSystemFont(10);
  dateLabel.textColor = C.accent;
  header.addSpacer(null);
  const city = header.addText(data.cityName);
  city.font = Font.systemFont(9);
  city.textColor = C.muted;
  widget.addSpacer(8);
  const main = widget.addStack();
  main.layoutHorizontally();
  const left = main.addStack();
  left.layoutVertically();
  const hero = left.addStack();
  hero.layoutHorizontally();
  hero.centerAlignContent();
  const emoji = hero.addText(data.combined.band.emoji);
  emoji.font = Font.systemFont(26);
  hero.addSpacer(8);
  const heroCol = hero.addStack();
  heroCol.layoutVertically();
  const bandLabel = heroCol.addText(data.combined.band.label);
  bandLabel.font = Font.boldSystemFont(18);
  bandLabel.textColor = new Color(data.combined.band.color);
  const grains = heroCol.addText(data.combined.value === null ? "sin granos/m³" : Math.round(data.combined.value) + " granos/m³");
  grains.font = Font.systemFont(9);
  grains.textColor = C.secondary;
  left.addSpacer(8);
  const chips = left.addStack();
  chips.layoutHorizontally();
  const uvChip = chips.addStack();
  uvChip.layoutHorizontally();
  uvChip.centerAlignContent();
  uvChip.backgroundColor = C.surface;
  uvChip.cornerRadius = 8;
  uvChip.setPadding(5, 8, 5, 8);
  addSymbol(uvChip, "sun.max.fill", 11, C.uv);
  uvChip.addSpacer(4);
  const uvText = uvChip.addText(data.weather.uvNow === null ? "UV —" : "UV " + data.weather.uvNow.toFixed(1));
  uvText.font = Font.mediumSystemFont(10);
  uvText.textColor = new Color(data.uv.color);
  chips.addSpacer(6);
  const tempChip = chips.addStack();
  tempChip.layoutHorizontally();
  tempChip.centerAlignContent();
  tempChip.backgroundColor = C.surface;
  tempChip.cornerRadius = 8;
  tempChip.setPadding(5, 8, 5, 8);
  const tempText = tempChip.addText(data.weather.info.emoji + " " + formatTemp(data.weather.temperature));
  tempText.font = Font.mediumSystemFont(10);
  tempText.textColor = C.text;
  left.addSpacer(6);
  const burn = burnMinutes(data.weather.uvNow);
  const meta = left.addText(
    (data.weather.uvMax === null ? "UV máx —" : "UV máx " + data.weather.uvMax.toFixed(1)) +
      (burn ? " · quemadura ~" + burn + " min" : "")
  );
  meta.font = Font.systemFont(8);
  meta.textColor = C.secondary;
  if (data.next) {
    left.addSpacer(4);
    const eventLine = left.addText("📅 " + formatTime(new Date(data.next.startDate)) + "  " + shortenTitle(data.next.title, 22));
    eventLine.font = Font.systemFont(8);
    eventLine.textColor = C.secondary;
  }
  main.addSpacer(12);
  const divider = main.addText("│");
  divider.font = Font.systemFont(46);
  divider.textColor = new Color("#7ee0c4", 0.25);
  main.addSpacer(12);
  const right = main.addStack();
  right.layoutVertically();
  const speciesHeader = right.addText("ESPECIES");
  speciesHeader.font = Font.boldSystemFont(8);
  speciesHeader.textColor = C.accent;
  right.addSpacer(4);
  const topSpecies = data.species.slice(0, 4);
  for (const item of topSpecies) {
    const row = right.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    const name = row.addText(item.emoji + " " + item.label);
    name.font = Font.systemFont(9);
    name.textColor = C.text;
    row.addSpacer(null);
    const value = row.addText(item.value === null ? "—" : String(Math.round(item.value)));
    value.font = Font.mediumSystemFont(9);
    value.textColor = new Color(item.band.color);
    right.addSpacer(2);
    addBar(right, item.value === null ? 0 : Math.min(1, item.value / 150), item.band.color, 130);
    right.addSpacer(4);
  }
}

function buildLarge(widget, data) {
  applyGradient(widget, data.combined.band.level);
  widget.setPadding(14, 16, 12, 16);
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  addSymbol(header, "leaf.fill", 14, C.accent);
  header.addSpacer(6);
  const title = header.addText("Centinela de polen y UV");
  title.font = Font.boldSystemFont(13);
  title.textColor = C.text;
  header.addSpacer(null);
  const dateLabel = header.addText(data.weekday + " " + data.dayNumber + " " + data.monthShort);
  dateLabel.font = Font.systemFont(10);
  dateLabel.textColor = C.secondary;
  widget.addSpacer(10);
  const heroCard = widget.addStack();
  heroCard.layoutHorizontally();
  heroCard.centerAlignContent();
  heroCard.backgroundColor = C.todaySurface;
  heroCard.cornerRadius = 12;
  heroCard.setPadding(10, 12, 10, 12);
  const heroLeft = heroCard.addStack();
  heroLeft.layoutVertically();
  const heroEmoji = heroLeft.addText(data.combined.band.emoji + "  " + data.combined.band.label);
  heroEmoji.font = Font.boldSystemFont(20);
  heroEmoji.textColor = new Color(data.combined.band.color);
  const grains = heroLeft.addText(
    data.combined.dominant
      ? data.combined.dominant.label + " · " + (data.combined.value === null ? "—" : Math.round(data.combined.value) + " granos/m³")
      : "Sin lectura de polen"
  );
  grains.font = Font.systemFont(11);
  grains.textColor = C.secondary;
  heroCard.addSpacer(null);
  const heroRight = heroCard.addStack();
  heroRight.layoutVertically();
  const uvNow = heroRight.addText(data.weather.uvNow === null ? "UV —" : "UV " + data.weather.uvNow.toFixed(1));
  uvNow.font = Font.boldSystemFont(18);
  uvNow.textColor = new Color(data.uv.color);
  const uvMeta = heroRight.addText(data.uv.label + (data.weather.uvMax === null ? "" : " · máx " + data.weather.uvMax.toFixed(1)));
  uvMeta.font = Font.systemFont(9);
  uvMeta.textColor = C.secondary;
  const burn = burnMinutes(data.weather.uvNow);
  if (burn) {
    const burnLine = heroRight.addText("Quemadura ~" + burn + " min");
    burnLine.font = Font.systemFont(9);
    burnLine.textColor = C.warning;
  }
  widget.addSpacer(10);
  const metaRow = widget.addStack();
  metaRow.layoutHorizontally();
  metaRow.centerAlignContent();
  const weatherChip = metaRow.addStack();
  weatherChip.layoutHorizontally();
  weatherChip.centerAlignContent();
  weatherChip.backgroundColor = C.surface;
  weatherChip.cornerRadius = 8;
  weatherChip.setPadding(6, 8, 6, 8);
  const weatherText = weatherChip.addText(
    data.weather.info.emoji + " " + formatTemp(data.weather.temperature) + "  " + data.weather.info.label
  );
  weatherText.font = Font.systemFont(10);
  weatherText.textColor = C.text;
  metaRow.addSpacer(6);
  const rangeChip = metaRow.addStack();
  rangeChip.backgroundColor = C.surface;
  rangeChip.cornerRadius = 8;
  rangeChip.setPadding(6, 8, 6, 8);
  const rangeText = rangeChip.addText(formatTemp(data.weather.tempMax) + " / " + formatTemp(data.weather.tempMin));
  rangeText.font = Font.systemFont(10);
  rangeText.textColor = C.secondary;
  metaRow.addSpacer(6);
  const rainChip = metaRow.addStack();
  rainChip.backgroundColor = C.surface;
  rainChip.cornerRadius = 8;
  rainChip.setPadding(6, 8, 6, 8);
  const rainText = rainChip.addText(data.weather.rainMax === null ? "💧 —" : "💧 " + Math.round(data.weather.rainMax) + "%");
  rainText.font = Font.systemFont(10);
  rainText.textColor = C.rain;
  metaRow.addSpacer(null);
  const city = metaRow.addText(data.cityName);
  city.font = Font.systemFont(9);
  city.textColor = C.muted;
  widget.addSpacer(10);
  const grid = widget.addStack();
  grid.layoutHorizontally();
  const leftCol = grid.addStack();
  leftCol.layoutVertically();
  const rightCol = grid.addStack();
  rightCol.layoutVertically();
  data.species.forEach((item, index) => {
    const col = index < 3 ? leftCol : rightCol;
    if (index === 3) grid.addSpacer(10);
    const card = col.addStack();
    card.layoutHorizontally();
    card.centerAlignContent();
    card.backgroundColor = C.surface;
    card.cornerRadius = 10;
    card.setPadding(7, 8, 7, 8);
    const nameCol = card.addStack();
    nameCol.layoutVertically();
    const name = nameCol.addText(item.emoji + " " + item.label);
    name.font = Font.mediumSystemFont(11);
    name.textColor = C.text;
    const band = nameCol.addText(item.band.label);
    band.font = Font.systemFont(8);
    band.textColor = new Color(item.band.color);
    card.addSpacer(null);
    const value = card.addText(item.value === null ? "—" : String(Math.round(item.value)));
    value.font = Font.boldSystemFont(14);
    value.textColor = new Color(item.band.color);
    col.addSpacer(6);
  });
  widget.addSpacer(6);
  const stripImage = drawHourlyStrip(data.weather.hourly, 320, 44);
  if (stripImage) {
    const stripLabel = widget.addText("UV próximas horas  ·  barras = lluvia ≥30%");
    stripLabel.font = Font.systemFont(8);
    stripLabel.textColor = C.muted;
    widget.addSpacer(4);
    const stripRow = widget.addStack();
    const image = stripRow.addImage(stripImage);
    image.imageSize = new Size(320, 44);
    widget.addSpacer(8);
  }
  const agendaHeader = widget.addText("AGENDA HOY");
  agendaHeader.font = Font.boldSystemFont(8);
  agendaHeader.textColor = C.accent;
  widget.addSpacer(4);
  if (data.events.length === 0) {
    const empty = widget.addText("Sin eventos en el calendario");
    empty.font = Font.systemFont(10);
    empty.textColor = C.muted;
  } else {
    for (const event of data.events) {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.backgroundColor = C.surface;
      row.cornerRadius = 8;
      row.setPadding(5, 8, 5, 8);
      const time = row.addText(formatTime(new Date(event.startDate)));
      time.font = Font.mediumSystemFont(10);
      time.textColor = C.accent;
      row.addSpacer(8);
      const titleText = row.addText(shortenTitle(event.title, 36));
      titleText.font = Font.systemFont(10);
      titleText.textColor = C.text;
      widget.addSpacer(4);
    }
  }
  widget.addSpacer(6);
  const footer = widget.addStack();
  footer.layoutHorizontally();
  const hint = footer.addText("Toca para abrir en Scriptable");
  hint.font = Font.systemFont(7);
  hint.textColor = C.muted;
  footer.addSpacer(null);
  const refresh = footer.addText("Actualiza cada " + CONFIG.cacheMinutes + " min");
  refresh.font = Font.systemFont(7);
  refresh.textColor = C.muted;
}

async function createWidget() {
  try {
    const location = await fetchLocation();
    const [pollen, weather, events] = await Promise.all([
      fetchPollen(location.latitude, location.longitude),
      fetchWeather(location.latitude, location.longitude),
      fetchTodayEvents(),
    ]);
    const species = speciesListFromMap(pollen.species || {});
    const combined = combinedFromList(species);
    const now = new Date();
    const data = {
      cityName: location.usingDefault ? CONFIG.defaultCity : "Tu ubicación",
      usingDefaultLocation: location.usingDefault,
      weekday: WEEKDAYS[now.getDay()],
      weekdayShort: WEEKDAYS_SHORT[now.getDay()],
      dayNumber: now.getDate(),
      monthShort: MONTHS_SHORT[now.getMonth()],
      species,
      combined,
      weather: {
        ...weather,
        info: weatherInfo(weather.weatherCode),
      },
      uv: uvBand(weather.uvNow),
      events,
      next: nextEvent(events),
    };
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
    widget.refreshAfterDate = new Date(Date.now() + CONFIG.cacheMinutes * 60000);
    return widget;
  } catch (error) {
    const fallback = new ListWidget();
    applyGradient(fallback, "unknown");
    fallback.addSpacer();
    const message = fallback.addText("⚠️ No se pudo cargar el centinela");
    message.font = Font.systemFont(13);
    message.textColor = C.danger;
    fallback.addSpacer();
    fallback.url = "scriptable:///open/" + encodeURIComponent(Script.name());
    fallback.refreshAfterDate = new Date(Date.now() + CONFIG.retryMinutes * 60000);
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
  applyGradient(errorWidget, "unknown");
  errorWidget.addSpacer();
  errorWidget.addText("⚠️ Widget Error");
  errorWidget.addText("Toca para reintentar");
  errorWidget.addSpacer();
  errorWidget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  errorWidget.refreshAfterDate = new Date(Date.now() + CONFIG.retryMinutes * 60000);
  Script.setWidget(errorWidget);
}
Script.complete();
