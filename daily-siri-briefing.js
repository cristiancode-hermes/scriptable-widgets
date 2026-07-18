const CACHE_KEY = "dailyBriefing";
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const LAT = "41.38";
const LON = "2.18";

const WEATHER_SYMBOLS = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌦️",
  56: "🌧️",
  57: "🌧️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  66: "🌧️",
  67: "🌧️",
  71: "❄️",
  73: "❄️",
  75: "❄️",
  77: "❄️",
  80: "🌦️",
  81: "🌦️",
  82: "🌦️",
  85: "❄️",
  86: "❄️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️",
};

const WEATHER_LABELS = {
  0: "Clear",
  1: "Mostly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  56: "Freezing Drizzle",
  57: "Freezing Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  66: "Freezing Rain",
  67: "Freezing Rain",
  71: "Light Snow",
  73: "Snow",
  75: "Heavy Snow",
  77: "Snow Grains",
  80: "Light Showers",
  81: "Showers",
  82: "Heavy Showers",
  85: "Light Snow Showers",
  86: "Snow Showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm with Hail",
};

function derivePeriod() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function computeGreeting(period) {
  const map = { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", night: "Good night" };
  return map[period] || "Hello";
}

async function loadWeather() {
  const url = `${OPEN_METEO_BASE}?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weathercode,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto`;
  const req = new Request(url);
  req.timeoutInterval = 10;
  return await req.loadJSON();
}

async function loadTodaysEvents() {
  try {
    const calendars = await Calendar.forEvents();
    if (!calendars || calendars.length === 0) return [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const events = await CalendarEvent.between(start, end, calendars);
    return (events || []).filter(e => e && e.startDate && !e.isAllDay).sort((a, b) => a.startDate - b.startDate);
  } catch {
    return [];
  }
}

async function loadAllDayEvents() {
  try {
    const calendars = await Calendar.forEvents();
    if (!calendars || calendars.length === 0) return [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const events = await CalendarEvent.between(start, end, calendars);
    return (events || []).filter(e => e && e.isAllDay);
  } catch {
    return [];
  }
}

async function loadTodaysReminders() {
  try {
    const calendars = await Calendar.forReminders();
    if (!calendars || calendars.length === 0) return [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const items = await Reminder.allDueBetween(start, end, calendars);
    return (items || []).filter(r => r && !r.isCompleted).sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });
  } catch {
    return [];
  }
}

function clockFormat(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function describeWeather(raw) {
  const current = raw.current;
  const code = current.weathercode;
  const symbol = WEATHER_SYMBOLS[code] || "🌤️";
  const label = WEATHER_LABELS[code] || "Unknown";
  const temp = Math.round(current.temperature_2m);
  const feels = Math.round(current.apparent_temperature);
  const humidity = current.relative_humidity_2m;
  const wind = Math.round(current.wind_speed_10m);
  return `${symbol} ${temp}°C (feels ${feels}°C) · ${label} · 💧${humidity}% · 💨${wind} km/h`;
}

function describeForecast(raw) {
  const daily = raw.daily;
  if (!daily || !daily.temperature_2m_max) return "";
  const high = Math.round(daily.temperature_2m_max[0]);
  const low = Math.round(daily.temperature_2m_min[0]);
  const precip = Math.round(daily.precipitation_sum[0] || 0);
  return `High ${high}°C  Low ${low}°C  🌧️${precip}mm`;
}

function assemble(weather, timed, allDay, reminders, greeting) {
  const now = new Date();
  const dateLine = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const parts = [];
  parts.push(`${greeting}! Today is ${dateLine}.`);
  parts.push("");
  parts.push(`🌡️ ${describeWeather(weather)}`);
  const fc = describeForecast(weather);
  if (fc) parts.push(`   ${fc}`);
  parts.push("");

  if (allDay.length > 0) {
    parts.push("📅  All Day:");
    allDay.forEach(e => parts.push(`   · ${e.title}`));
    parts.push("");
  }

  if (timed.length > 0) {
    parts.push("📅  Events:");
    timed.forEach(e => parts.push(`   · ${clockFormat(e.startDate)}  ${e.title}`));
    parts.push("");
  } else {
    parts.push("📅  No events scheduled today.");
    parts.push("");
  }

  if (reminders.length > 0) {
    parts.push("✅  Reminders:");
    reminders.forEach(r => {
      const due = r.dueDate ? ` [${clockFormat(r.dueDate)}]` : "";
      parts.push(`   · ${r.title}${due}`);
    });
    parts.push("");
  } else {
    parts.push("✅  No reminders due today.");
    parts.push("");
  }

  parts.push(`✨ Have a great ${derivePeriod()}!`);

  return parts.join("\n");
}

function persist(briefing, weather, timed, allDay, reminders) {
  const fm = FileManager.local();
  const dir = fm.joinPath(fm.documentsDirectory(), "caches", "dailyBriefing");
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);

  const data = {
    briefing,
    weather: {
      temp: Math.round(weather.current.temperature_2m),
      feels: Math.round(weather.current.apparent_temperature),
      symbol: WEATHER_SYMBOLS[weather.current.weathercode] || "🌤️",
      label: WEATHER_LABELS[weather.current.weathercode] || "",
      high: Math.round((weather.daily?.temperature_2m_max?.[0]) || 0),
      low: Math.round((weather.daily?.temperature_2m_min?.[0]) || 0),
      humidity: weather.current.relative_humidity_2m,
      wind: Math.round(weather.current.wind_speed_10m),
    },
    events: timed.slice(0, 5).map(e => ({ title: e.title, time: clockFormat(e.startDate) })),
    allDay: allDay.map(e => e.title),
    reminders: reminders.slice(0, 8).map(r => ({ title: r.title, due: r.dueDate ? clockFormat(r.dueDate) : "" })),
    updatedAt: new Date().toISOString(),
  };

  fm.writeString(fm.joinPath(dir, "briefing.json"), JSON.stringify(data));
}

async function notify(briefing) {
  try {
    const n = new Notification();
    n.title = "🌅 Daily Briefing";
    const preview = briefing.split("\n").slice(0, 2).join(" · ");
    n.body = preview.length > 150 ? preview.slice(0, 147) + "..." : preview;
    n.sound = "default";
    n.scriptName = Script.name();
    await n.schedule();
  } catch {}
}

async function sendErrorNotification(msg) {
  try {
    const n = new Notification();
    n.title = "⚠️ Briefing Error";
    n.body = msg || "Unknown error";
    await n.schedule();
  } catch {}
}

async function buildErrorWidget(msg) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#1C1C1E");
  const icon = w.addText("⚠️");
  icon.font = Font.boldSystemFont(20);
  w.addSpacer(4);
  const label = w.addText("Briefing Error");
  label.font = Font.mediumSystemFont(13);
  label.textColor = new Color("#FF453A");
  w.addSpacer(2);
  const detail = w.addText(msg || "Unknown error");
  detail.font = Font.systemFont(10);
  detail.textColor = new Color("#8E8E93");
  w.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  w.refreshAfterDate = new Date(Date.now() + 600000);
  return w;
}

async function buildBriefingWidget(weather, timed, reminders, period) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#1C1C1E");
  w.setPadding(12, 14, 12, 14);

  const periodIcons = { morning: "🌅", afternoon: "☀️", evening: "🌆", night: "🌙" };
  const titleLine = w.addText(`${periodIcons[period] || "✨"} Daily Briefing`);
  titleLine.font = Font.boldSystemFont(14);
  titleLine.textColor = new Color("#FFFFFF");
  w.addSpacer(4);

  const weatherSummary = describeWeather(weather);
  const weatherLine = w.addText(weatherSummary);
  weatherLine.font = Font.systemFont(11);
  weatherLine.textColor = new Color("#A0A0A0");
  w.addSpacer(6);

  if (timed.length > 0) {
    const eventHeader = w.addText("📅 Events");
    eventHeader.font = Font.boldSystemFont(11);
    eventHeader.textColor = new Color("#CCCCCC");
    const maxEvents = timed.length > 2 ? 2 : timed.length;
    for (let i = 0; i < maxEvents; i++) {
      const line = w.addText(`  ${clockFormat(timed[i].startDate)} ${timed[i].title}`);
      line.font = Font.systemFont(10);
      line.textColor = new Color("#A0A0A0");
    }
    w.addSpacer(4);
  }

  if (reminders.length > 0) {
    const remHeader = w.addText("✅ Reminders");
    remHeader.font = Font.boldSystemFont(11);
    remHeader.textColor = new Color("#CCCCCC");
    const maxRem = reminders.length > 3 ? 3 : reminders.length;
    for (let i = 0; i < maxRem; i++) {
      const due = reminders[i].dueDate ? ` · ${clockFormat(reminders[i].dueDate)}` : "";
      const line = w.addText(`  ${reminders[i].title}${due}`);
      line.font = Font.systemFont(10);
      line.textColor = new Color("#A0A0A0");
    }
  }

  w.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  w.refreshAfterDate = new Date(Date.now() + 1800000);
  return w;
}

async function run() {
  try {
    const period = derivePeriod();
    const greeting = computeGreeting(period);

    const [weather, timed, allDay, reminders] = await Promise.all([
      loadWeather(),
      loadTodaysEvents(),
      loadAllDayEvents(),
      loadTodaysReminders(),
    ]);

    const briefing = assemble(weather, timed, allDay, reminders, greeting);

    persist(briefing, weather, timed, allDay, reminders);
    await notify(briefing);

    if (config.runsInWidget) {
      const widget = await buildBriefingWidget(weather, timed, reminders, period);
      Script.setWidget(widget);
    } else {
      const shortcutParam = args.shortcutParameter;
      const shouldSpeak = shortcutParam && String(shortcutParam).toLowerCase() === "speak";

      if (shouldSpeak) {
        Speech.speak(briefing);
      } else {
        const dialog = new Alert();
        dialog.title = "🌅 Daily Briefing";
        dialog.message = briefing;
        dialog.addAction("Read aloud");
        dialog.addCancelAction("Dismiss");
        const choice = await dialog.present();
        if (choice === 0) {
          Speech.speak(briefing);
        }
      }
    }

    Script.complete();
  } catch (err) {
    const errMsg = err.message || "Unknown error";
    const errorWidget = await buildErrorWidget(errMsg);
    await sendErrorNotification(errMsg);

    if (config.runsInWidget) {
      Script.setWidget(errorWidget);
    }

    Script.complete();
  }
}

await run();
