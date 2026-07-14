

const CONFIG = {
  
  defaultLatitude: 40.4168,
  defaultLongitude: -3.7038,

  
  weatherCacheMinutes: 30,

  
  maxEventsLarge: 6,
  maxEventsMedium: 3,
  maxRemindersLarge: 4,
  maxRemindersMedium: 2,

  
  useMetric: true,

  
  apiTimeout: 6,

  
  theme: "auto",
};

const C = {
  
  gradientMorning: [new Color("#1a1b41"), new Color("#2d1b4e")],   
  gradientAfternoon: [new Color("#0f2027"), new Color("#203a43")], 
  gradientEvening: [new Color("#1a0a2e"), new Color("#16213e")],   
  gradientNight: [new Color("#090a0f"), new Color("#0a0a1a")],     
  gradientRain: [new Color("#1b1b2f"), new Color("#2d2d44")],      
  gradientSnow: [new Color("#1e2a3a"), new Color("#2a3a4a")],      

  
  cardBg: new Color("#ffffff", 0.07),
  cardBgAlt: new Color("#ffffff", 0.04),
  cardBorder: new Color("#ffffff", 0.06),

  
  text: Color.white(),
  textDim: new Color("#ffffff", 0.65),
  textMuted: new Color("#ffffff", 0.35),
  textUltraMuted: new Color("#ffffff", 0.18),

  
  accentBlue: new Color("#5e5ce6"),
  accentBlueDim: new Color("#5e5ce6", 0.25),
  accentGreen: new Color("#34c759"),
  accentGreenDim: new Color("#34c759", 0.2),
  accentOrange: new Color("#ff9500"),
  accentOrangeDim: new Color("#ff9500", 0.2),
  accentRed: new Color("#ff3b30"),
  accentRedDim: new Color("#ff3b30", 0.2),
  accentYellow: new Color("#ffcc02"),
  accentYellowDim: new Color("#ffcc02", 0.2),
  accentCyan: new Color("#64d2ff"),
  accentPurple: new Color("#af52de"),

  
  divider: new Color("#ffffff", 0.07),
};

const WMO_MAP = {
  0:  { sym: "sun.max.fill",             color: C.accentOrange,  label: "Despejado" },
  1:  { sym: "sun.min.fill",             color: C.accentOrange,  label: "Mayormente despejado" },
  2:  { sym: "cloud.sun.fill",           color: C.accentYellow,  label: "Parcialmente nublado" },
  3:  { sym: "cloud.fill",               color: C.textDim,       label: "Nublado" },
  45: { sym: "cloud.fog.fill",           color: C.textMuted,     label: "Niebla" },
  48: { sym: "cloud.fog.fill",           color: C.textMuted,     label: "Niebla con escarcha" },
  51: { sym: "cloud.drizzle.fill",       color: C.accentCyan,    label: "Llovizna ligera" },
  53: { sym: "cloud.drizzle.fill",       color: C.accentCyan,    label: "Llovizna" },
  55: { sym: "cloud.drizzle.fill",       color: C.accentCyan,    label: "Llovizna intensa" },
  56: { sym: "cloud.sleet.fill",         color: C.accentCyan,    label: "Llovizna helada" },
  57: { sym: "cloud.sleet.fill",         color: C.accentCyan,    label: "Llovizna helada intensa" },
  61: { sym: "cloud.rain.fill",          color: C.accentBlue,    label: "Lluvia ligera" },
  63: { sym: "cloud.rain.fill",          color: C.accentBlue,    label: "Lluvia" },
  65: { sym: "cloud.heavyrain.fill",     color: C.accentBlue,    label: "Lluvia intensa" },
  66: { sym: "cloud.sleet.fill",         color: C.accentBlue,    label: "Lluvia helada" },
  67: { sym: "cloud.sleet.fill",         color: C.accentBlue,    label: "Lluvia helada intensa" },
  71: { sym: "cloud.snow.fill",          color: Color.white(),   label: "Nieve ligera" },
  73: { sym: "cloud.snow.fill",          color: Color.white(),   label: "Nieve" },
  75: { sym: "cloud.snow.fill",          color: Color.white(),   label: "Nieve intensa" },
  77: { sym: "cloud.hail.fill",          color: Color.white(),   label: "Granizo" },
  80: { sym: "cloud.sun.rain.fill",      color: C.accentCyan,    label: "Chubascos ligeros" },
  81: { sym: "cloud.sun.rain.fill",      color: C.accentCyan,    label: "Chubascos" },
  82: { sym: "cloud.sun.rain.fill",      color: C.accentCyan,    label: "Chubascos intensos" },
  85: { sym: "cloud.snow.fill",          color: Color.white(),   label: "Nevisca ligera" },
  86: { sym: "cloud.snow.fill",          color: Color.white(),   label: "Nevisca" },
  95: { sym: "cloud.bolt.fill",          color: C.accentOrange,  label: "Tormenta" },
  96: { sym: "cloud.bolt.rain.fill",     color: C.accentOrange,  label: "Tormenta con granizo" },
  99: { sym: "cloud.bolt.rain.fill",     color: C.accentOrange,  label: "Tormenta fuerte con granizo" },
};

const WMO_DEFAULT = { sym: "questionmark.circle.fill", color: C.textDim, label: "Desconocido" };

const LOCAL_QUOTES = [
  { text: "El único modo de hacer un gran trabajo es amar lo que haces.",   author: "Steve Jobs" },
  { text: "La creatividad es la inteligencia divirtiéndose.",               author: "Albert Einstein" },
  { text: "No cuenta tu edad, sino tu energía.",                            author: "Ralph Waldo Emerson" },
  { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
  { text: "Lo que haces hoy puede mejorar todos tus mañanas.",             author: "Ralph Marston" },
  { text: "Empieza donde estás. Usa lo que tienes. Haz lo que puedas.",     author: "Arthur Ashe" },
  { text: "El futuro pertenece a quienes creen en la belleza de sus sueños.", author: "Eleanor Roosevelt" },
  { text: "No esperes. El momento nunca será perfecto.",                   author: "Napoleon Hill" },
  { text: "La disciplina es el puente entre metas y logros.",              author: "Jim Rohn" },
  { text: "Cree que puedes y ya estás a medio camino.",                    author: "Theodore Roosevelt" },
  { text: "El mejor momento para plantar un árbol fue hace 20 años. El segundo mejor momento es ahora.", author: "Proverbio chino" },
  { text: "La vida es 10% lo que te sucede y 90% cómo reaccionas.",       author: "Charles R. Swindoll" },
  { text: "Haz de cada día tu obra maestra.",                              author: "John Wooden" },
  { text: "La constancia no es lo mismo que no parar, es no dejar de empezar.", author: "Anónimo" },
  { text: "Tu tiempo es limitado, no lo malgastes viviendo la vida de otro.", author: "Steve Jobs" },
  { text: "El que no arriesga no bebe champán.",                           author: "Proverbio" },
  { text: "La excelencia no es un acto, es un hábito.",                    author: "Aristóteles" },
  { text: "No se trata de tener tiempo, se trata de hacer tiempo.",        author: "Anónimo" },
  { text: "Las grandes cosas nunca vienen de las zonas de confort.",       author: "Anónimo" },
  { text: "El único imposible es aquello que no intentas.",                author: "Anónimo" },
];

class CacheManager {
  constructor(name) {
    this.fm = FileManager.local();
    this.dir = this.fm.joinPath(this.fm.documentsDirectory(), "caches", name);
    this.ensureDir();
  }

  ensureDir() {
    if (!this.fm.fileExists(this.dir)) {
      this.fm.createDirectory(this.dir, true);
    }
  }

  path(key) {
    return this.fm.joinPath(this.dir, key.replace(/[^a-zA-Z0-9_-]/g, "_") + ".json");
  }

  read(key, maxAgeMinutes = 30) {
    const p = this.path(key);
    if (!this.fm.fileExists(p)) return null;
    const stat = this.fm.modificationDate(p);
    const age = (Date.now() - stat.getTime()) / 60000;
    if (age > maxAgeMinutes) {
      this.fm.remove(p);
      return null;
    }
    try {
      const raw = this.fm.readString(p);
      return JSON.parse(raw);
    } catch {
      this.fm.remove(p);
      return null;
    }
  }

  write(key, data) {
    const p = this.path(key);
    this.fm.writeString(p, JSON.stringify(data));
  }
}

async function getLocation(widgetParam) {
  
  if (widgetParam) {
    const parts = widgetParam.split("|")[0].trim(); 
    const coords = parts.split(",").map(Number);
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      return { latitude: coords[0], longitude: coords[1], source: "param" };
    }
  }

  
  try {
    const req = new Request("http://ip-api.com/json?fields=lat,lon");
    req.timeoutInterval = 3;
    const data = await req.loadJSON();
    if (data && data.lat && data.lon) {
      return { latitude: data.lat, longitude: data.lon, source: "ip" };
    }
  } catch {
    
  }

  
  return {
    latitude: CONFIG.defaultLatitude,
    longitude: CONFIG.defaultLongitude,
    source: "default",
  };
}

async function fetchWeather(lat, lon, cache) {
  const cacheKey = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = cache.read(cacheKey, CONFIG.weatherCacheMinutes);
  if (cached) return cached;

  try {
    const qp = `latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weathercode,wind_speed_10m,uv_index&timeformat=unixtime&timezone=auto`;
    const url = `https://api.open-meteo.com/v1/forecast?${qp}`;
    const req = new Request(url);
    req.timeoutInterval = CONFIG.apiTimeout;
    const data = await req.loadJSON();

    const result = {
      temp: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      code: data.current.weathercode,
      wind: data.current.wind_speed_10m,
      uv: data.current.uv_index,
      timezone: data.timezone || "UTC",
      timestamp: Date.now(),
    };

    cache.write(cacheKey, result);
    return result;
  } catch (err) {
    console.error("Weather fetch failed: " + err.message);
    return null;
  }
}

async function fetchEvents() {
  try {
    const calendars = await Calendar.forEvents();
    if (!calendars || calendars.length === 0) return [];

    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const events = await CalendarEvent.between(now, endOfDay, calendars);
    if (!events) return [];

    return events
      .filter(e => !e.isAllDay) 
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, CONFIG.maxEventsLarge);
  } catch (err) {
    console.error("Calendar fetch failed: " + err.message);
    return [];
  }
}

async function fetchReminders() {
  try {
    const calendars = await Calendar.forReminders();
    if (!calendars || calendars.length === 0) return [];

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const reminders = await Reminder.allDueBetween(new Date(0), endOfDay, calendars);
    if (!reminders) return [];

    return reminders
      .filter(r => !r.isCompleted)
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      })
      .slice(0, CONFIG.maxRemindersLarge);
  } catch (err) {
    console.error("Reminders fetch failed: " + err.message);
    return [];
  }
}

async function fetchQuote() {
  
  try {
    const req = new Request("https://api.quotable.io/random?maxLength=120");
    req.timeoutInterval = 3;
    const data = await req.loadJSON();
    if (data && data.content && data.author) {
      return { text: data.content, author: data.author };
    }
  } catch {
    
  }

  
  const idx = Math.floor(Math.random() * LOCAL_QUOTES.length);
  return LOCAL_QUOTES[idx];
}

function fmtTemp(temp) {
  if (temp === undefined || temp === null) return "--°";
  const unit = CONFIG.useMetric ? "°C" : "°F";
  
  const value = CONFIG.useMetric ? temp : (temp * 9/5) + 32;
  return Math.round(value) + unit;
}

function fmtWind(kmh) {
  if (kmh === undefined || kmh === null) return "--";
  if (CONFIG.useMetric) return Math.round(kmh) + " km/h";
  return Math.round(kmh * 0.621371) + " mph";
}

function fmtTime(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return "";
  const df = new DateFormatter();
  df.useShortTimeStyle();
  return df.string(date);
}

function fmtHour(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return "";
  
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function fmtDurationMinutes(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getGradient(weatherCode, date) {
  const hour = date ? date.getHours() : new Date().getHours();
  const isNight = hour < 6 || hour >= 20;
  const code = weatherCode !== undefined ? weatherCode : 0;

  
  if (code >= 95) return C.gradientRain;       
  if (code >= 71) return C.gradientSnow;        
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return C.gradientRain; 
  if ((code >= 45 && code <= 48)) return C.gradientRain; 

  if (isNight) return C.gradientNight;
  if (hour >= 6 && hour < 12) return C.gradientMorning;
  if (hour >= 12 && hour < 18) return C.gradientAfternoon;
  return C.gradientEvening;
}

function shortenTitle(title, maxLen) {
  if (!title) return "Sin título";
  if (title.length <= maxLen) return title;
  return title.substring(0, maxLen - 1) + "…";
}

function getWeatherInfo(code) {
  return WMO_MAP[code] || WMO_DEFAULT;
}

function createErrorWidget(message) {
  const widget = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [new Color("#1a1b2e"), new Color("#0a0a14")];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;

  const stack = widget.addStack();
  stack.layoutVertically();
  stack.centerAlignContent();
  stack.setPadding(16, 16, 16, 16);

  const icon = stack.addText("⚠️");
  icon.font = Font.systemFont(32);

  stack.addSpacer(8);

  const msg = stack.addText(shortenTitle(message, 80));
  msg.font = Font.systemFont(13);
  msg.textColor = C.textDim;
  msg.centerAlignText();

  stack.addSpacer(4);

  const retry = stack.addText("Toca para reintentar");
  retry.font = Font.systemFont(11);
  retry.textColor = C.textMuted;
  retry.centerAlignText();

  widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + 600000); 
  return widget;
}

function buildSmall(widget, weather, events, reminders, quote, locationName) {
  const bg = getGradient(weather?.code, new Date());
  const grad = new LinearGradient();
  grad.colors = bg;
  grad.locations = [0, 1];
  widget.backgroundGradient = grad;

  
  const header = widget.addStack();
  header.layoutHorizontally();
  header.addSpacer();

  const monthSym = header.addText(getMonthEmoji());
  monthSym.font = Font.systemFont(28);

  header.addSpacer(6);

  const dateStack = header.addStack();
  dateStack.layoutVertically();

  const dayNum = dateStack.addText(String(new Date().getDate()));
  dayNum.font = Font.boldSystemFont(26);
  dayNum.textColor = C.text;

  const dayName = dateStack.addText(getWeekdayName());
  dayName.font = Font.systemFont(11);
  dayName.textColor = C.textDim;

  header.addSpacer();

  widget.addSpacer(10);

  
  if (events && events.length > 0) {
    const ev = events[0];
    const evStack = widget.addStack();
    evStack.layoutHorizontally();
    evStack.centerAlignContent();
    evStack.backgroundColor = C.cardBg;
    evStack.cornerRadius = 10;
    evStack.setPadding(8, 10, 8, 10);
    evStack.addSpacer(4);

    const dot = evStack.addText("●");
    dot.font = Font.systemFont(8);
    dot.textColor = C.accentBlue;

    evStack.addSpacer(6);

    const evInfo = evStack.addStack();
    evInfo.layoutVertically();

    const evTitle = evInfo.addText(shortenTitle(ev.title, 18));
    evTitle.font = Font.systemFont(12);
    evTitle.textColor = C.text;

    const evTime = evInfo.addText(fmtHour(ev.startDate));
    evTime.font = Font.systemFont(10);
    evTime.textColor = C.textDim;

    evStack.addSpacer(4);
  }

  widget.addSpacer(6);

  
  if (weather) {
    const wi = getWeatherInfo(weather.code);
    const wStack = widget.addStack();
    wStack.layoutHorizontally();
    wStack.centerAlignContent();
    wStack.backgroundColor = C.cardBg;
    wStack.cornerRadius = 10;
    wStack.setPadding(8, 10, 8, 10);

    const wIcon = wStack.addText(getSFSymbol(wi.sym, 22));
    wIcon.textColor = wi.color;
    wIcon.font = Font.systemFont(22);

    wStack.addSpacer(8);

    const wInfo = wStack.addStack();
    wInfo.layoutVertically();

    const wTemp = wInfo.addText(fmtTemp(weather.temp));
    wTemp.font = Font.boldSystemFont(16);
    wTemp.textColor = C.text;

    const wLabel = wInfo.addText(wi.label);
    wLabel.font = Font.systemFont(9);
    wLabel.textColor = C.textDim;

    wStack.addSpacer(4);
  }

  
  widget.addSpacer(4);
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.addSpacer();
  const updated = footer.addText("↻");
  updated.font = Font.systemFont(8);
  updated.textColor = C.textUltraMuted;
  footer.addSpacer();
}

function buildMedium(widget, weather, events, reminders, quote, locationName) {
  const bg = getGradient(weather?.code, new Date());
  const grad = new LinearGradient();
  grad.colors = bg;
  grad.locations = [0, 1];
  widget.backgroundGradient = grad;
  widget.setPadding(14, 14, 14, 14);

  
  const topRow = widget.addStack();
  topRow.layoutHorizontally();
  topRow.centerAlignContent();

  
  const dateStack = topRow.addStack();
  dateStack.layoutVertically();

  const fullDate = dateStack.addText(getFullDateString());
  fullDate.font = Font.boldSystemFont(18);
  fullDate.textColor = C.text;

  const dayLabel = dateStack.addText(getWeekdayName() + "  •  " + getMonthDayString());
  dayLabel.font = Font.systemFont(10);
  dayLabel.textColor = C.textDim;

  topRow.addSpacer();

  
  if (weather) {
    const wi = getWeatherInfo(weather.code);
    const wStack = topRow.addStack();
    wStack.layoutHorizontally();
    wStack.centerAlignContent();
    wStack.backgroundColor = C.cardBg;
    wStack.cornerRadius = 12;
    wStack.setPadding(6, 10, 6, 10);

    const wIcon = wStack.addText(getSFSymbol(wi.sym, 24));
    wIcon.textColor = wi.color;
    wIcon.font = Font.systemFont(24);

    wStack.addSpacer(8);

    const wInfo = wStack.addStack();
    wInfo.layoutVertically();

    const wTemp = wInfo.addText(fmtTemp(weather.temp));
    wTemp.font = Font.boldSystemFont(15);
    wTemp.textColor = C.text;

    const wSub = wInfo.addText(wi.label);
    wSub.font = Font.systemFont(9);
    wSub.textColor = C.textDim;
  }

  widget.addSpacer(10);

  
  if (events && events.length > 0) {
    const evSection = widget.addStack();
    evSection.layoutVertically();

    for (let i = 0; i < Math.min(events.length, CONFIG.maxEventsMedium); i++) {
      const ev = events[i];
      const evRow = evSection.addStack();
      evRow.layoutHorizontally();
      evRow.centerAlignContent();
      evRow.backgroundColor = C.cardBg;
      evRow.cornerRadius = 8;
      evRow.setPadding(6, 10, 6, 10);

      
      const dot = evRow.addText("●");
      dot.font = Font.systemFont(9);
      dot.textColor = ev.calendar?.color || C.accentBlue;

      evRow.addSpacer(8);

      const evContent = evRow.addStack();
      evContent.layoutVertically();
      

      
      const titleRow = evContent.addStack();
      titleRow.layoutHorizontally();

      
      const title = titleRow.addText(shortenTitle(ev.title, 22));
      title.font = Font.systemFont(12);
      title.textColor = C.text;
      title.lineLimit = 1;

      titleRow.addSpacer();

      const t = titleRow.addText(fmtHour(ev.startDate));
      t.font = Font.systemFont(10);
      t.textColor = C.textDim;

      evRow.addSpacer(4);

      if (i < Math.min(events.length, CONFIG.maxEventsMedium) - 1) {
        evSection.addSpacer(4);
      }
    }
  }

  widget.addSpacer(6);

  
  if (quote) {
    const qStack = widget.addStack();
    qStack.layoutHorizontally();
    qStack.centerAlignContent();
    qStack.backgroundColor = C.accentBlueDim;
    qStack.cornerRadius = 8;
    qStack.setPadding(6, 10, 6, 10);

    const qIcon = qStack.addText(getSFSymbol("quote.opening", 12));
    qIcon.textColor = C.accentBlue;
    qIcon.font = Font.systemFont(12);

    qStack.addSpacer(6);

    const qText = qStack.addText(shortenTitle(quote.text, 55));
    qText.font = Font.italicSystemFont(10);
    qText.textColor = C.textDim;
    qText.lineLimit = 1;

    qStack.addSpacer(4);
  }

  
  widget.refreshAfterDate = new Date(Date.now() + 1800000); 
}

function buildLarge(widget, weather, events, reminders, quote, locationName) {
  const bg = getGradient(weather?.code, new Date());
  const grad = new LinearGradient();
  grad.colors = bg;
  grad.locations = [0, 1];
  widget.backgroundGradient = grad;
  widget.setPadding(14, 14, 14, 14);

  
  
  
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const dateBlock = header.addStack();
  dateBlock.layoutVertically();

  const dateBig = dateBlock.addText(getFullDateString());
  dateBig.font = Font.boldSystemFont(22);
  dateBig.textColor = C.text;

  const dateSub = dateBlock.addText(getWeekdayName() + "  ·  " + getMonthDayString());
  dateSub.font = Font.systemFont(11);
  dateSub.textColor = C.textDim;

  header.addSpacer();

  
  if (weather) {
    const wi = getWeatherInfo(weather.code);
    const wBlock = header.addStack();
    wBlock.layoutHorizontally();
    wBlock.centerAlignContent();
    wBlock.backgroundColor = C.cardBg;
    wBlock.cornerRadius = 14;
    wBlock.setPadding(8, 14, 8, 14);

    const wIcon = wBlock.addText(getSFSymbol(wi.sym, 28));
    wIcon.textColor = wi.color;
    wIcon.font = Font.systemFont(28);

    wBlock.addSpacer(10);

    const wInfo = wBlock.addStack();
    wInfo.layoutVertically();

    const wTemp = wInfo.addText(fmtTemp(weather.temp));
    wTemp.font = Font.boldSystemFont(22);
    wTemp.textColor = C.text;

    const wSub = wInfo.addText("Sensación " + fmtTemp(weather.feelsLike));
    wSub.font = Font.systemFont(9);
    wSub.textColor = C.textDim;

    wBlock.addSpacer(6);

    
    const wExtra = wBlock.addStack();
    wExtra.layoutVertically();
    wExtra.centerAlignContent();

    const wWind = wExtra.addText("💨 " + fmtWind(weather.wind));
    wWind.font = Font.systemFont(9);
    wWind.textColor = C.textDim;

    if (weather.uv !== undefined) {
      const wUV = wExtra.addText("☀️ UV " + weather.uv.toFixed(1));
      wUV.font = Font.systemFont(9);
      wUV.textColor = C.textDim;
    }
  }

  widget.addSpacer(12);

  
  
  
  if (events && events.length > 0) {
    const secHeader = widget.addStack();
    secHeader.layoutHorizontally();
    secHeader.centerAlignContent();

    const secIcon = secHeader.addText(getSFSymbol("calendar", 13));
    secIcon.font = Font.systemFont(13);
    secIcon.textColor = C.accentBlue;

    secHeader.addSpacer(6);

    const secLabel = secHeader.addText("Próximos eventos");
    secLabel.font = Font.boldSystemFont(12);
    secLabel.textColor = C.text;

    secHeader.addSpacer();

    const countLabel = secHeader.addText(`${events.length} hoy`);
    countLabel.font = Font.systemFont(10);
    countLabel.textColor = C.textMuted;

    widget.addSpacer(6);

    for (let i = 0; i < Math.min(events.length, CONFIG.maxEventsLarge); i++) {
      const ev = events[i];
      const evRow = widget.addStack();
      evRow.layoutHorizontally();
      evRow.centerAlignContent();
      evRow.backgroundColor = C.cardBg;
      evRow.cornerRadius = 9;
      evRow.setPadding(7, 10, 7, 10);

      
      const bar = evRow.addStack();
      bar.size = new Size(3, 24);
      bar.backgroundColor = ev.calendar?.color || C.accentBlue;
      bar.cornerRadius = 1.5;

      evRow.addSpacer(8);

      const evContent = evRow.addStack();
      evContent.layoutVertically();

      const evTitle = evContent.addText(shortenTitle(ev.title, 30));
      evTitle.font = Font.systemFont(12);
      evTitle.textColor = C.text;
      evTitle.lineLimit = 1;

      const evMeta = evContent.addText(formatEventTime(ev));
      evMeta.font = Font.systemFont(9);
      evMeta.textColor = C.textDim;

      evRow.addSpacer();

      const dur = evRow.addText(formatEventDuration(ev));
      dur.font = Font.systemFont(9);
      dur.textColor = C.textMuted;

      if (i < Math.min(events.length, CONFIG.maxEventsLarge) - 1) {
        widget.addSpacer(4);
      }
    }
  } else {
    const noEv = widget.addText("No hay eventos programados");
    noEv.font = Font.systemFont(11);
    noEv.textColor = C.textMuted;
  }

  widget.addSpacer(8);

  
  
  
  if (reminders && reminders.length > 0) {
    const secHeader2 = widget.addStack();
    secHeader2.layoutHorizontally();
    secHeader2.centerAlignContent();

    const secIcon2 = secHeader2.addText(getSFSymbol("list.bullet.rectangle", 13));
    secIcon2.font = Font.systemFont(13);
    secIcon2.textColor = C.accentOrange;

    secHeader2.addSpacer(6);

    const secLabel2 = secHeader2.addText("Recordatorios");
    secLabel2.font = Font.boldSystemFont(12);
    secLabel2.textColor = C.text;

    secHeader2.addSpacer();

    const countLabel2 = secHeader2.addText(`${reminders.length} pendientes`);
    countLabel2.font = Font.systemFont(10);
    countLabel2.textColor = C.textMuted;

    widget.addSpacer(6);

    for (let i = 0; i < Math.min(reminders.length, CONFIG.maxRemindersLarge); i++) {
      const r = reminders[i];
      const rRow = widget.addStack();
      rRow.layoutHorizontally();
      rRow.centerAlignContent();
      rRow.backgroundColor = C.cardBg;
      rRow.cornerRadius = 8;
      rRow.setPadding(6, 10, 6, 10);

      const rIcon = rRow.addText(getSFSymbol("circle", 12));
      rIcon.font = Font.systemFont(12);
      rIcon.textColor = C.accentOrange;

      rRow.addSpacer(8);

      const rContent = rRow.addStack();
      rContent.layoutVertically();

      const rTitle = rContent.addText(shortenTitle(r.title, 35));
      rTitle.font = Font.systemFont(11);
      rTitle.textColor = C.text;
      rTitle.lineLimit = 1;

      if (r.dueDate) {
        const rDue = rContent.addText("Vence: " + fmtTime(r.dueDate));
        rDue.font = Font.systemFont(9);
        rDue.textColor = C.textDim;
      }

      
      if (r.priority && r.priority > 0) {
        rRow.addSpacer();
        const prio = rRow.addText(r.priority >= 2 ? "‼️" : "❗");
        prio.font = Font.systemFont(11);
      }

      if (i < Math.min(reminders.length, CONFIG.maxRemindersLarge) - 1) {
        widget.addSpacer(3);
      }
    }
  }

  widget.addSpacer(8);

  
  
  
  if (quote) {
    const qCard = widget.addStack();
    qCard.layoutHorizontally();
    qCard.centerAlignContent();
    qCard.backgroundColor = C.accentBlueDim;
    qCard.cornerRadius = 10;
    qCard.setPadding(8, 12, 8, 12);

    const qIcon = qCard.addText(getSFSymbol("quote.opening", 14));
    qIcon.textColor = C.accentBlue;
    qIcon.font = Font.systemFont(14);

    qCard.addSpacer(8);

    const qContent = qCard.addStack();
    qContent.layoutVertically();

    const qText = qContent.addText(quote.text);
    qText.font = Font.italicSystemFont(10);
    qText.textColor = C.textDim;
    qText.lineLimit = 3;

    if (quote.author) {
      qCard.addSpacer(4);
      const dash = qCard.addText("— ");
      dash.font = Font.systemFont(8);
      dash.textColor = C.textMuted;

      const qAuthor = qCard.addText(quote.author);
      qAuthor.font = Font.systemFont(9);
      qAuthor.textColor = C.textMuted;
    }

    qCard.addSpacer(4);
  }

  
  widget.addSpacer(6);
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();

  const locIcon = footer.addText(getSFSymbol("location", 8));
  locIcon.font = Font.systemFont(8);
  locIcon.textColor = C.textUltraMuted;

  footer.addSpacer(4);

  const locLabel = footer.addText(locationName || "Actualizando…");
  locLabel.font = Font.systemFont(8);
  locLabel.textColor = C.textUltraMuted;

  footer.addSpacer();

  const timeLabel = footer.addText("↻ " + fmtTime(new Date()));
  timeLabel.font = Font.systemFont(8);
  timeLabel.textColor = C.textUltraMuted;

  widget.refreshAfterDate = new Date(Date.now() + 1800000); 
}

function getFullDateString() {
  const df = new DateFormatter();
  df.dateFormat = "EEEE d";
  df.useNoTimeStyle();
  return capitalize(df.string(new Date()));
}

function getWeekdayName() {
  const df = new DateFormatter();
  df.dateFormat = "EEEE";
  const name = df.string(new Date());
  return capitalize(name);
}

function getMonthDayString() {
  const df = new DateFormatter();
  df.dateFormat = "MMMM yyyy";
  return capitalize(df.string(new Date()));
}

function getMonthEmoji() {
  const month = new Date().getMonth();
  const emojis = ["❄️","💕","🌸","🌷","🌺","🌻","🍂","🍁","🍃","🎃","🍂","❄️"];
  return emojis[month] || "📅";
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatEventTime(event) {
  if (!event) return "";
  const start = fmtHour(event.startDate);

  if (event.isAllDay) return "Todo el día";
  if (!event.endDate) return start;

  const end = fmtHour(event.endDate);
  return `${start} – ${end}`;
}

function formatEventDuration(event) {
  if (!event || !event.startDate || !event.endDate) return "";
  if (event.isAllDay) return "";
  const ms = event.endDate.getTime() - event.startDate.getTime();
  return fmtDurationMinutes(ms);
}

function getSFSymbol(name, size) {
  
  
  
  
  
  const fallback = {
    "sun.max.fill": "☀️",
    "sun.min.fill": "🌤️",
    "cloud.sun.fill": "⛅",
    "cloud.fill": "☁️",
    "cloud.fog.fill": "🌫️",
    "cloud.drizzle.fill": "🌦️",
    "cloud.sleet.fill": "🌧️",
    "cloud.rain.fill": "🌧️",
    "cloud.heavyrain.fill": "🌧️",
    "cloud.snow.fill": "❄️",
    "cloud.hail.fill": "🌨️",
    "cloud.sun.rain.fill": "🌦️",
    "cloud.bolt.fill": "⛈️",
    "cloud.bolt.rain.fill": "⛈️",
    "calendar": "📅",
    "list.bullet.rectangle": "📋",
    "quote.opening": "💬",
    "location": "📍",
    "circle": "○",
    "checkmark.circle.fill": "✅",
    "exclamationmark.circle": "⚠️",
  };
  return fallback[name] || "●";
}

async function run() {
  const widget = new ListWidget();
  const params = (args.widgetParameter || "").trim();
  const family = config.widgetFamily || "medium";

  try {
    
    const loc = await getLocation(params);
    const locationName = loc.source === "param"
      ? params.split("|")[0].trim()
      : `${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}`;

    
    const cache = new CacheManager("daily-hub");
    const [weather, events, reminders, quote] = await Promise.all([
      fetchWeather(loc.latitude, loc.longitude, cache),
      fetchEvents(),
      fetchReminders(),
      fetchQuote(),
    ]);

    
    switch (family) {
      case "small":
        buildSmall(widget, weather, events, reminders, quote, locationName);
        break;
      case "medium":
        buildMedium(widget, weather, events, reminders, quote, locationName);
        break;
      case "large":
        buildLarge(widget, weather, events, reminders, quote, locationName);
        break;
      default:
        buildMedium(widget, weather, events, reminders, quote, locationName);
    }

    
    
    widget.url = "calshow://";

  } catch (err) {
    console.error("Daily Hub fatal: " + err.message);
    console.error(err.stack || "No stack trace");
    return createErrorWidget(err.message);
  }

  
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    widget.presentMedium();
  }
}

await run();
Script.complete();
