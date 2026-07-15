const CONFIG = {
  lat: 40.4168,
  lon: -3.7038,
  locationName: "Madrid",
  weatherUrl: "https://api.open-meteo.com/v1/forecast",
  aqiUrl: "https://air-quality-api.open-meteo.com/v1/air-quality",
  cryptoUrl: "https://api.coingecko.com/api/v3/simple/price",
  refreshMinutes: 30,
};

const C = {
  bg: new Color("#0c0c14"),
  surface: new Color("#16161f"),
  card: new Color("#1e1e2e"),
  accent: new Color("#3b82f6"),
  green: new Color("#22c55e"),
  red: new Color("#ef4444"),
  yellow: new Color("#eab308"),
  orange: new Color("#f97316"),
  purple: new Color("#a855f7"),
  text: new Color("#e4e4ec"),
  dim: new Color("#8888a0"),
  muted: new Color("#55556a"),
  border: new Color("#ffffff", 0.05),
};

function wmoEmoji(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌧️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  return "🌩️";
}

function wmoLabel(code) {
  const map = {
    0: "Clear",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return map[code] || "Unknown";
}

function fmtCurrency(n) {
  if (n == null) return "—";
  if (n >= 1000) return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (n >= 1) return "$" + n.toFixed(2);
  return "$" + n.toPrecision(4);
}

function fmtPct(n) {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return sign + n.toFixed(2) + "%";
}

function fmtTime(d) {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return h + ":" + m;
}

async function fetchWeather(lat, lon) {
  const params = "?latitude=" + lat + "&longitude=" + lon + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,pressure_msl&timeformat=unixtime";
  const req = new Request(CONFIG.weatherUrl + params);
  req.timeoutInterval = 6;
  return await req.loadJSON();
}

async function fetchAirQuality(lat, lon) {
  const params = "?latitude=" + lat + "&longitude=" + lon + "&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&timeformat=unixtime";
  const req = new Request(CONFIG.aqiUrl + params);
  req.timeoutInterval = 6;
  return await req.loadJSON();
}

async function fetchCrypto() {
  const ids = "bitcoin,ethereum,solana,cardano,chainlink";
  const params = "?ids=" + ids + "&vs_currencies=usd&include_24hr_change=true";
  const req = new Request(CONFIG.cryptoUrl + params);
  req.timeoutInterval = 6;
  return await req.loadJSON();
}

function aqiInfo(usAqi) {
  if (usAqi == null) return { label: "N/A", color: C.muted, level: "unknown" };
  if (usAqi <= 50) return { label: "Buena", color: C.green, level: "good" };
  if (usAqi <= 100) return { label: "Moderada", color: C.yellow, level: "moderate" };
  if (usAqi <= 150) return { label: "Sensible", color: C.orange, level: "sensitive" };
  if (usAqi <= 200) return { label: "Insalubre", color: C.red, level: "unhealthy" };
  if (usAqi <= 300) return { label: "Muy insalubre", color: C.purple, level: "veryUnhealthy" };
  return { label: "Peligrosa", color: new Color("#880e4f"), level: "hazardous" };
}

function addCard(stack) {
  stack.backgroundColor = C.card;
  stack.cornerRadius = 10;
  stack.setPadding(8, 10, 8, 10);
}

function addRow(parent, label, value, valueColor) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const lbl = row.addText(label);
  lbl.font = Font.mediumSystemFont(10);
  lbl.textColor = C.dim;
  row.addSpacer(null);
  if (value !== undefined && value !== null) {
    const val = row.addText(String(value));
    val.font = Font.boldSystemFont(11);
    val.textColor = valueColor || C.text;
  }
}

function addSectionTitle(parent, icon, title) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const ico = row.addText(icon + " ");
  ico.font = Font.boldSystemFont(10);
  ico.textColor = C.accent;
  const lbl = row.addText(title);
  lbl.font = Font.boldSystemFont(10);
  lbl.textColor = C.accent;
}

function buildWeatherContent(parent, weather) {
  if (!weather || !weather.current) {
    addRow(parent, "🌡️", "Weather unavailable", C.dim);
    return;
  }
  const c = weather.current;
  const emoji = wmoEmoji(c.weather_code);
  const label = wmoLabel(c.weather_code);
  const temp = Math.round(c.temperature_2m);
  const feels = Math.round(c.apparent_temperature);

  const topRow = parent.addStack();
  topRow.layoutHorizontally();
  topRow.centerAlignContent();
  const icon = topRow.addText(emoji + " " + temp + "°C");
  icon.font = Font.boldSystemFont(24);
  topRow.addSpacer(null);
  const cond = topRow.addText(label);
  cond.font = Font.mediumSystemFont(11);
  cond.textColor = C.dim;

  parent.addSpacer(4);

  addRow(parent, "🤔 Sensación", feels + "°C", C.text);
  addRow(parent, "💧 Humedad", c.relative_humidity_2m + "%", C.text);
  addRow(parent, "💨 Viento", c.wind_speed_10m + " km/h", C.text);
}

function buildAQIContent(parent, aqiData) {
  if (!aqiData || !aqiData.current) {
    addRow(parent, "🌍 AQI", "Unavailable", C.dim);
    return;
  }
  const cur = aqiData.current;
  const usAqi = cur.us_aqi;
  const info = aqiInfo(usAqi);

  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const lbl = row.addText("US AQI");
  lbl.font = Font.mediumSystemFont(10);
  lbl.textColor = C.dim;
  row.addSpacer(null);
  const val = row.addText(usAqi != null ? String(usAqi) : "—");
  val.font = Font.boldSystemFont(16);
  val.textColor = info.color;
  row.addSpacer(6);
  const badge = row.addText(info.label);
  badge.font = Font.boldSystemFont(9);
  badge.textColor = info.color;

  parent.addSpacer(2);

  if (cur.pm2_5 != null) addRow(parent, "  PM2.5", cur.pm2_5.toFixed(1) + " µg", C.dim);
  if (cur.pm10 != null) addRow(parent, "  PM10", cur.pm10.toFixed(1) + " µg", C.dim);
}

function buildCryptoContent(parent, crypto) {
  if (!crypto) {
    addRow(parent, "💰 Crypto", "Unavailable", C.dim);
    return;
  }

  const coins = [
    { id: "bitcoin", name: "BTC", icon: "₿" },
    { id: "ethereum", name: "ETH", icon: "⟠" },
    { id: "solana", name: "SOL", icon: "◎" },
  ];

  for (const coin of coins) {
    const data = crypto[coin.id];
    if (!data) continue;
    const price = data.usd;
    const change = data.usd_24h_change;
    const changeStr = fmtPct(change);
    const changeColor = change >= 0 ? C.green : C.red;

    const row = parent.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    const icon = row.addText(coin.icon + " ");
    icon.font = Font.mediumSystemFont(10);
    icon.textColor = C.dim;
    const name = row.addText(coin.name);
    name.font = Font.boldSystemFont(11);
    name.textColor = C.text;
    row.addSpacer(null);
    const prc = row.addText(fmtCurrency(price));
    prc.font = Font.boldSystemFont(11);
    prc.textColor = C.text;
    row.addSpacer(6);
    const chg = row.addText(changeStr);
    chg.font = Font.boldSystemFont(10);
    chg.textColor = changeColor;
  }
}

function buildSmall(weather, aqi, crypto) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;

  const titleRow = w.addStack();
  titleRow.layoutHorizontally();
  titleRow.centerAlignContent();
  const title = titleRow.addText("📊 Dashboard");
  title.font = Font.boldSystemFont(11);
  title.textColor = C.accent;
  titleRow.addSpacer(null);
  const timeLabel = titleRow.addText(fmtTime(new Date()));
  timeLabel.font = Font.regularSystemFont(8);
  timeLabel.textColor = C.muted;

  w.addSpacer(6);

  const weatherCard = w.addStack();
  weatherCard.layoutVertically();
  addCard(weatherCard);
  buildWeatherContent(weatherCard, weather);

  w.addSpacer(6);

  const cryptoCard = w.addStack();
  cryptoCard.layoutVertically();
  addCard(cryptoCard);
  addSectionTitle(cryptoCard, "💰", "Crypto");
  cryptoCard.addSpacer(4);
  buildCryptoContent(cryptoCard, crypto);

  w.addSpacer(null);

  const aqiVal = aqi && aqi.current ? aqi.current.us_aqi : null;
  const info = aqiInfo(aqiVal);
  const footer = w.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const dot = footer.addText("●");
  dot.font = Font.boldSystemFont(8);
  dot.textColor = info.color;
  footer.addSpacer(3);
  const aqiLabel = footer.addText("AQI: " + (aqiVal != null ? aqiVal : "—"));
  aqiLabel.font = Font.regularSystemFont(8);
  aqiLabel.textColor = C.muted;

  w.setPadding(12, 10, 8, 10);
  return w;
}

function buildMedium(weather, aqi, crypto) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;

  const top = w.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  const title = top.addText("📊 Global Dashboard");
  title.font = Font.boldSystemFont(14);
  title.textColor = C.accent;
  top.addSpacer(null);
  const loc = top.addText(CONFIG.locationName);
  loc.font = Font.mediumSystemFont(9);
  loc.textColor = C.dim;
  top.addSpacer(8);
  const timeLabel = top.addText(fmtTime(new Date()));
  timeLabel.font = Font.regularSystemFont(8);
  timeLabel.textColor = C.muted;

  w.addSpacer(8);

  const wCard = w.addStack();
  wCard.layoutVertically();
  addCard(wCard);
  addSectionTitle(wCard, "🌤️", "Weather");
  wCard.addSpacer(4);
  buildWeatherContent(wCard, weather);

  w.addSpacer(6);

  const midRow = w.addStack();
  midRow.layoutHorizontally();

  const aqiCard = midRow.addStack();
  aqiCard.layoutVertically();
  aqiCard.size = new Size(0, 0);
  addCard(aqiCard);
  addSectionTitle(aqiCard, "🌍", "Air Quality");
  aqiCard.addSpacer(4);
  buildAQIContent(aqiCard, aqi);

  midRow.addSpacer(6);

  const cryptoCard = midRow.addStack();
  cryptoCard.layoutVertically();
  cryptoCard.size = new Size(0, 0);
  addCard(cryptoCard);
  addSectionTitle(cryptoCard, "💰", "Crypto");
  cryptoCard.addSpacer(4);
  buildCryptoContent(cryptoCard, crypto);

  w.addSpacer(null);
  w.setPadding(12, 12, 8, 12);
  return w;
}

function buildLarge(weather, aqi, crypto) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;

  const top = w.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  const title = top.addText("📊 Global Dashboard");
  title.font = Font.boldSystemFont(16);
  title.textColor = C.accent;
  top.addSpacer(null);
  const loc = top.addText(CONFIG.locationName);
  loc.font = Font.mediumSystemFont(10);
  loc.textColor = C.dim;
  top.addSpacer(8);
  const timeLabel = top.addText(fmtTime(new Date()));
  timeLabel.font = Font.regularSystemFont(9);
  timeLabel.textColor = C.muted;

  w.addSpacer(8);

  const wCard = w.addStack();
  wCard.layoutVertically();
  addCard(wCard);

  const wInner = wCard.addStack();
  wInner.layoutHorizontally();

  const wLeft = wInner.addStack();
  wLeft.layoutVertically();
  if (weather && weather.current) {
    const c = weather.current;
    const emoji = wmoEmoji(c.weather_code);
    const temp = Math.round(c.temperature_2m);
    const icon = wLeft.addText(emoji + " " + temp + "°C");
    icon.font = Font.boldSystemFont(32);
    const cond = wLeft.addText(wmoLabel(c.weather_code));
    cond.font = Font.mediumSystemFont(11);
    cond.textColor = C.dim;
  }
  wLeft.addSpacer(null);

  wInner.addSpacer(16);

  const wRight = wInner.addStack();
  wRight.layoutVertically();
  if (weather && weather.current) {
    const c = weather.current;
    addRow(wRight, "🤔 Sensación", Math.round(c.apparent_temperature) + "°C", C.text);
    addRow(wRight, "💧 Humedad", c.relative_humidity_2m + "%", C.text);
    addRow(wRight, "💨 Viento", c.wind_speed_10m + " km/h", C.text);
  }

  w.addSpacer(8);

  const midRow = w.addStack();
  midRow.layoutHorizontally();

  const aqiCard = midRow.addStack();
  aqiCard.layoutVertically();
  aqiCard.size = new Size(0, 0);
  addCard(aqiCard);
  addSectionTitle(aqiCard, "🌍", "Air Quality");
  aqiCard.addSpacer(4);
  buildAQIContent(aqiCard, aqi);

  midRow.addSpacer(6);

  const cryptoCard = midRow.addStack();
  cryptoCard.layoutVertically();
  cryptoCard.size = new Size(0, 0);
  addCard(cryptoCard);

  const cryptoTitle = cryptoCard.addStack();
  cryptoTitle.layoutHorizontally();
  cryptoTitle.centerAlignContent();
  const cIcon = cryptoTitle.addText("💰 ");
  cIcon.font = Font.boldSystemFont(10);
  cIcon.textColor = C.accent;
  const cLabel = cryptoTitle.addText("Crypto");
  cLabel.font = Font.boldSystemFont(10);
  cLabel.textColor = C.accent;
  cryptoTitle.addSpacer(null);
  const moreLabel = cryptoTitle.addText("+2 more");
  moreLabel.font = Font.regularSystemFont(8);
  moreLabel.textColor = C.muted;
  cryptoCard.addSpacer(4);
  buildCryptoContent(cryptoCard, crypto);

  w.addSpacer(null);
  w.setPadding(14, 14, 10, 14);
  return w;
}

function createErrorWidget(msg) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const icon = row.addText("⚠️ ");
  icon.font = Font.boldSystemFont(12);
  icon.textColor = C.red;
  const err = row.addText(msg || "Error loading data");
  err.font = Font.mediumSystemFont(10);
  err.textColor = C.dim;
  w.addSpacer(null);
  const retry = w.addText("Tap to retry");
  retry.font = Font.regularSystemFont(8);
  retry.textColor = C.muted;
  retry.centerAlignText();
  w.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  w.refreshAfterDate = new Date(Date.now() + 600000);
  w.setPadding(12, 10, 8, 10);
  return w;
}

async function run() {
  try {
    const lat = CONFIG.lat;
    const lon = CONFIG.lon;

    const [weather, aqi, crypto] = await Promise.all([
      fetchWeather(lat, lon),
      fetchAirQuality(lat, lon),
      fetchCrypto(),
    ]);

    let widget;
    const family = config.widgetFamily;

    if (family === "small") {
      widget = buildSmall(weather, aqi, crypto);
    } else if (family === "medium") {
      widget = buildMedium(weather, aqi, crypto);
    } else {
      widget = buildLarge(weather, aqi, crypto);
    }

    widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60 * 1000);

    if (config.runsInWidget) {
      Script.setWidget(widget);
    } else {
      await widget.presentMedium();
    }
  } catch (e) {
    const fallback = createErrorWidget(e.message || "Unknown error");
    if (config.runsInWidget) {
      Script.setWidget(fallback);
    } else {
      await fallback.presentMedium();
    }
  }
}

await run();
Script.complete();
