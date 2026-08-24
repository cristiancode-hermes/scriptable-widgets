const CONFIG = {
  defaultLatitude: 40.4168,
  defaultLongitude: -3.7038,
  defaultCity: 'Madrid',
  defaultTimezone: 'Europe/Madrid',
  locationTimeoutSeconds: 8,
  apiTimeoutSeconds: 8,
  cacheMinutes: 30,
  refreshMinutes: 15,
  retryMinutes: 10,
  maxPhotoEvents: 4,
};

const COLORS = {
  text: '#EEF2FF',
  muted: '#A8B0C8',
  faint: '#6E768E',
  accent: '#FFB86B',
  blueHour: '#82B1FF',
  golden: '#FFD166',
  warning: '#FF6B6B',
  surface: '#FFFFFF',
};

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const RAD = Math.PI / 180;
const MS_DAY = 86400000;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function solarDeclination(date) {
  const dayOfYear = (date - new Date(date.getFullYear(), 0, 0)) / MS_DAY;
  const julian = 2451549.5 + dayOfYear;
  const meanAnomaly = (357.5291 + 0.98560028 * (julian - 2451545)) * RAD;
  const equationOfCenter = 1.9148 * RAD * Math.sin(meanAnomaly)
    + 0.02 * RAD * Math.sin(2 * meanAnomaly)
    + 0.0003 * RAD * Math.sin(3 * meanAnomaly);
  const eclipticLongitude = (meanAnomaly + equationOfCenter + 282.937 * RAD) % (2 * Math.PI);
  const obliquity = (23.4393 - 0.00000036 * (julian - 2451545)) * RAD;
  return Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
}

function sunPosition(latitude, longitude, date) {
  const declination = solarDeclination(date);
  const utcHours = date.getUTCHours()
    + date.getUTCMinutes() / 60
    + date.getUTCSeconds() / 3600
    + date.getUTCMilliseconds() / 3600000;
  const hourAngle = (utcHours + longitude / 15 - 12) * 15 * RAD;
  const latitudeRad = latitude * RAD;
  const altitude = Math.asin(clamp(
    Math.sin(latitudeRad) * Math.sin(declination) + Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle),
    -1,
    1
  )) / RAD;
  const azimuth = (
    Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(latitudeRad) - Math.tan(declination) * Math.cos(latitudeRad)
    ) + Math.PI
  ) / RAD;
  return { altitude, azimuth };
}

function sunCrossing(latitude, longitude, date, elevationDeg) {
  const dayOfYear = (date - new Date(date.getFullYear(), 0, 0)) / MS_DAY;
  const julian = 2451549.5 + dayOfYear;
  const meanAnomaly = (357.5291 + 0.98560028 * (julian - 2451545)) * RAD;
  const equationOfCenter = 1.9148 * RAD * Math.sin(meanAnomaly)
    + 0.02 * RAD * Math.sin(2 * meanAnomaly)
    + 0.0003 * RAD * Math.sin(3 * meanAnomaly);
  const eclipticLongitude = (meanAnomaly + equationOfCenter + 282.937 * RAD) % (2 * Math.PI);
  const obliquity = (23.4393 - 0.00000036 * (julian - 2451545)) * RAD;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const latitudeRad = latitude * RAD;
  const cosHourAngle = (
    Math.sin(-elevationDeg * RAD) - Math.sin(latitudeRad) * Math.sin(declination)
  ) / (Math.cos(latitudeRad) * Math.cos(declination));
  if (Math.abs(cosHourAngle) > 1) {
    return { rise: null, set: null, polar: cosHourAngle > 1 ? 'night' : 'day' };
  }
  const hourAngle = Math.acos(cosHourAngle);
  const riseHour = 12 - hourAngle * 180 / Math.PI / 15 - longitude / 15;
  const setHour = 12 + hourAngle * 180 / Math.PI / 15 - longitude / 15;
  const buildInstant = (hourValue) => {
    const base = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return new Date(base + hourValue * 3600000);
  };
  try {
    return { rise: buildInstant(riseHour), set: buildInstant(setHour), polar: null };
  } catch (error) {
    return { rise: null, set: null, polar: null };
  }
}

function formatClock(date, timeZone) {
  if (!date) return '--:--';
  try {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    });
  } catch (error) {
    return '--:--';
  }
}

function formatCountdown(from, to) {
  if (!to) return '--';
  const delta = to.getTime() - from.getTime();
  if (delta <= 0) return 'ahora';
  const totalMinutes = Math.round(delta / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return minutes + ' min';
  return hours + ' h ' + String(minutes).padStart(2, '0') + ' m';
}

function formatDuration(start, end) {
  if (!start || !end) return '--';
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return rest + ' min';
  return hours + ' h ' + String(rest).padStart(2, '0') + ' m';
}

function buildDaylightMap(latitude, longitude, date) {
  const horizon = sunCrossing(latitude, longitude, date, 0.833);
  const civil = sunCrossing(latitude, longitude, date, 6);
  const nautical = sunCrossing(latitude, longitude, date, 12);
  const astronomical = sunCrossing(latitude, longitude, date, 18);
  const golden = sunCrossing(latitude, longitude, date, -6);
  return {
    sunrise: horizon.rise,
    sunset: horizon.set,
    polar: horizon.polar,
    civilDawn: civil.rise,
    civilDusk: civil.set,
    nauticalDawn: nautical.rise,
    nauticalDusk: nautical.set,
    astronomicalDawn: astronomical.rise,
    astronomicalDusk: astronomical.set,
    goldenMorningEnd: golden.rise,
    goldenEveningStart: golden.set,
  };
}

function resolvePhase(now, sun, daylight) {
  const altitude = sun.altitude;
  const afterNoon = daylight.sunrise && daylight.sunset
    ? now.getTime() >= (daylight.sunrise.getTime() + daylight.sunset.getTime()) / 2
    : altitude < 0 ? true : false;
  if (altitude >= 6) {
    return {
      id: 'day',
      emoji: '☀️',
      symbol: 'sun.max.fill',
      label: 'Día pleno',
      hint: 'Luz dura · espera la hora dorada',
      accent: '#7DD3FC',
    };
  }
  if (altitude >= -0.833) {
    return {
      id: 'golden',
      emoji: '✨',
      symbol: 'camera.fill',
      label: afterNoon ? 'Hora dorada PM' : 'Hora dorada AM',
      hint: 'Luz cálida para retrato y paisaje',
      accent: COLORS.golden,
    };
  }
  if (altitude >= -6) {
    return {
      id: 'civil',
      emoji: '💙',
      symbol: 'moon.haze.fill',
      label: afterNoon ? 'Hora azul PM' : 'Hora azul AM',
      hint: 'Crepúsculo civil · skyline y neones',
      accent: COLORS.blueHour,
    };
  }
  if (altitude >= -12) {
    return {
      id: 'nautical',
      emoji: '🌊',
      symbol: 'water.waves',
      label: afterNoon ? 'Crepúsculo náutico' : 'Alba náutica',
      hint: 'Horizonte visible · siluetas',
      accent: '#9B8CFF',
    };
  }
  if (altitude >= -18) {
    return {
      id: 'astro',
      emoji: '🌌',
      symbol: 'sparkles',
      label: afterNoon ? 'Crepúsculo astronómico' : 'Alba astronómica',
      hint: 'Primeras o últimas estrellas',
      accent: '#C4B5FD',
    };
  }
  return {
    id: 'night',
    emoji: '🌙',
    symbol: 'moon.stars.fill',
    label: 'Noche astronómica',
    hint: 'Oscuridad total · cielo profundo',
    accent: '#A5B4FC',
  };
}

function nextTransition(now, daylight) {
  const sequence = [
    { at: daylight.astronomicalDawn, label: 'Alba astronómica' },
    { at: daylight.nauticalDawn, label: 'Alba náutica' },
    { at: daylight.civilDawn, label: 'Hora azul AM' },
    { at: daylight.sunrise, label: 'Amanecer' },
    { at: daylight.goldenMorningEnd, label: 'Fin hora dorada' },
    { at: daylight.goldenEveningStart, label: 'Hora dorada PM' },
    { at: daylight.sunset, label: 'Atardecer' },
    { at: daylight.civilDusk, label: 'Fin hora azul' },
    { at: daylight.nauticalDusk, label: 'Noche náutica' },
    { at: daylight.astronomicalDusk, label: 'Noche astronómica' },
  ];
  for (const item of sequence) {
    if (item.at && item.at.getTime() > now.getTime()) return item;
  }
  return { at: null, label: 'Mañana' };
}

function photoWindows(daylight) {
  return [
    {
      id: 'blue-am',
      emoji: '💙',
      title: 'Azul AM',
      start: daylight.civilDawn,
      end: daylight.sunrise,
    },
    {
      id: 'gold-am',
      emoji: '✨',
      title: 'Dorada AM',
      start: daylight.sunrise,
      end: daylight.goldenMorningEnd,
    },
    {
      id: 'gold-pm',
      emoji: '🌇',
      title: 'Dorada PM',
      start: daylight.goldenEveningStart,
      end: daylight.sunset,
    },
    {
      id: 'blue-pm',
      emoji: '🌃',
      title: 'Azul PM',
      start: daylight.sunset,
      end: daylight.civilDusk,
    },
  ];
}

function activeWindow(now, windows) {
  return windows.find((window) => (
    window.start && window.end
    && now.getTime() >= window.start.getTime()
    && now.getTime() < window.end.getTime()
  )) || null;
}

function gradientForPhase(phaseId) {
  const map = {
    night: ['#050510', '#0B1020', '#12182C'],
    astro: ['#070614', '#14102A', '#1C1638'],
    nautical: ['#0B0820', '#1A1440', '#2A1B4E'],
    civil: ['#120E2A', '#2A1858', '#4A2060'],
    golden: ['#1A1020', '#4A2040', '#C45C28'],
    day: ['#0B1E3A', '#123C6D', '#1A5A8A'],
  };
  return map[phaseId] || map.night;
}

function applyBackground(widget, phaseId) {
  const stops = gradientForPhase(phaseId);
  const gradient = new LinearGradient();
  gradient.colors = stops.map((hex) => new Color(hex));
  gradient.locations = [0, 0.55, 1];
  widget.backgroundGradient = gradient;
}

function addSymbol(parent, name, size, tint) {
  try {
    const symbol = SFSymbol.named(name);
    symbol.applyFont(Font.systemFont(size));
    const image = parent.addImage(symbol.image);
    image.imageSize = new Size(size, size);
    image.tintColor = tint;
    return image;
  } catch (error) {
    const fallback = parent.addText('•');
    fallback.font = Font.systemFont(size);
    fallback.textColor = tint;
    return fallback;
  }
}

function addLabel(parent, text, font, color) {
  const label = parent.addText(text);
  label.font = font;
  label.textColor = color;
  label.lineLimit = 1;
  return label;
}

function addProgressBar(parent, value, fillColor) {
  const track = parent.addStack();
  track.layoutHorizontally();
  track.backgroundColor = new Color('#FFFFFF', 0.12);
  track.cornerRadius = 3;
  track.size = new Size(0, 6);
  const fill = track.addStack();
  fill.backgroundColor = fillColor;
  fill.cornerRadius = 3;
  fill.size = new Size(0, 6);
  const percent = Math.round(clamp(value, 0, 1) * 100);
  if (percent > 0) fill.addSpacer(percent);
  track.addSpacer(null);
  return track;
}

function eventOverlaps(event, start, end) {
  if (!start || !end || !event) return false;
  try {
    const eventStart = new Date(event.startDate);
    const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
    return eventStart.getTime() < end.getTime() && eventEnd.getTime() > start.getTime();
  } catch (error) {
    return false;
  }
}

function shortenTitle(title, maxLength) {
  const value = String(title || 'Evento').trim();
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 1) + '…';
}

function photoScore(cloudCover) {
  if (cloudCover === null || cloudCover === undefined || Number.isNaN(cloudCover)) {
    return { label: 'Sin nubes', detail: 'solo astronomía', color: COLORS.muted, value: null };
  }
  if (cloudCover <= 20) return { label: 'Cielo limpio', detail: cloudCover + '% nubes', color: '#34D399', value: cloudCover };
  if (cloudCover <= 55) return { label: 'Parcial', detail: cloudCover + '% nubes', color: '#FBBF24', value: cloudCover };
  if (cloudCover <= 80) return { label: 'Cubierto suave', detail: cloudCover + '% nubes', color: '#FB923C', value: cloudCover };
  return { label: 'Muy cubierto', detail: cloudCover + '% nubes', color: '#F87171', value: cloudCover };
}

class SkyCache {
  constructor() {
    this.fm = FileManager.local();
    this.dir = this.fm.joinPath(this.fm.documentsDirectory(), 'twilight-atlas-cache');
    this.file = this.fm.joinPath(this.dir, 'sky.json');
  }

  read() {
    try {
      if (!this.fm.fileExists(this.file)) return null;
      const ageMinutes = (Date.now() - this.fm.modificationDate(this.file).getTime()) / 60000;
      if (ageMinutes > CONFIG.cacheMinutes) return null;
      return JSON.parse(this.fm.readString(this.file));
    } catch (error) {
      return null;
    }
  }

  write(payload) {
    try {
      if (!this.fm.fileExists(this.dir)) this.fm.createDirectory(this.dir, true);
      this.fm.writeString(this.file, JSON.stringify(payload));
    } catch (error) {
      return false;
    }
    return true;
  }
}

async function resolveLocation() {
  try {
    Location.setAccuracyToThreeKilometers();
    const located = await Promise.race([
      Location.current(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), CONFIG.locationTimeoutSeconds * 1000);
      }),
    ]);
    if (located && Number.isFinite(located.latitude) && Number.isFinite(located.longitude)) {
      return {
        name: 'Aquí',
        latitude: located.latitude,
        longitude: located.longitude,
        timeZone: CONFIG.defaultTimezone,
        usingDefault: false,
      };
    }
  } catch (error) {
  }
  return {
    name: CONFIG.defaultCity,
    latitude: CONFIG.defaultLatitude,
    longitude: CONFIG.defaultLongitude,
    timeZone: CONFIG.defaultTimezone,
    usingDefault: true,
  };
}

async function fetchSkyCover(latitude, longitude) {
  const cache = new SkyCache();
  const cached = cache.read();
  if (cached && Number.isFinite(cached.cloudCover)) return cached;
  try {
    const query = [
      'latitude=' + encodeURIComponent(latitude),
      'longitude=' + encodeURIComponent(longitude),
      'current=' + encodeURIComponent('cloud_cover,visibility,weather_code'),
      'timezone=auto',
      'forecast_days=1',
    ].join('&');
    const request = new Request('https://api.open-meteo.com/v1/forecast?' + query);
    request.timeoutInterval = CONFIG.apiTimeoutSeconds;
    const json = await request.loadJSON();
    const current = json.current || json.current_weather || {};
    const cloudCover = Number(current.cloud_cover ?? current.cloudcover);
    const payload = {
      cloudCover: Number.isFinite(cloudCover) ? Math.round(cloudCover) : null,
      visibility: Number.isFinite(Number(current.visibility)) ? Number(current.visibility) : null,
    };
    cache.write(payload);
    return payload;
  } catch (error) {
    return { cloudCover: null, visibility: null };
  }
}

async function loadTodayEvents() {
  try {
    const calendars = await Calendar.forEvents();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const events = await CalendarEvent.between(startOfDay, endOfDay, calendars);
    return events.sort((left, right) => new Date(left.startDate) - new Date(right.startDate)).slice(0, 10);
  } catch (error) {
    return [];
  }
}

function eventsInWindows(events, windows) {
  const matches = [];
  for (const event of events) {
    for (const window of windows) {
      if (eventOverlaps(event, window.start, window.end)) {
        matches.push({ event, window });
        break;
      }
    }
  }
  return matches.slice(0, CONFIG.maxPhotoEvents);
}

function dayProgress(now, daylight) {
  if (!daylight.sunrise || !daylight.sunset) return 0;
  return clamp(
    (now.getTime() - daylight.sunrise.getTime()) / (daylight.sunset.getTime() - daylight.sunrise.getTime()),
    0,
    1
  );
}

function buildSmall(widget, snapshot) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  addSymbol(header, snapshot.phase.symbol, 13, new Color(snapshot.phase.accent));
  header.addSpacer(5);
  addLabel(header, 'CREPÚSCULO', Font.boldSystemFont(9), new Color(COLORS.faint));
  header.addSpacer(null);
  addLabel(header, snapshot.phase.emoji, Font.systemFont(12), new Color(COLORS.text));
  widget.addSpacer(6);
  addLabel(widget, snapshot.phase.label, Font.boldSystemFont(16), new Color(COLORS.text));
  widget.addSpacer(3);
  addLabel(
    widget,
    snapshot.next.at ? snapshot.next.label + ' · ' + formatClock(snapshot.next.at, snapshot.location.timeZone) : 'Sin tránsito',
    Font.systemFont(11),
    new Color(snapshot.phase.accent)
  );
  widget.addSpacer(6);
  addProgressBar(widget, snapshot.progress, new Color(snapshot.phase.accent));
  widget.addSpacer(6);
  const meta = widget.addStack();
  meta.layoutHorizontally();
  addLabel(meta, '☉ ' + snapshot.sun.altitude.toFixed(1) + '°', Font.mediumSystemFont(10), new Color(COLORS.muted));
  meta.addSpacer(null);
  addLabel(meta, snapshot.location.name, Font.systemFont(10), new Color(COLORS.faint));
}

function buildMedium(widget, snapshot) {
  const top = widget.addStack();
  top.layoutHorizontally();

  const left = top.addStack();
  left.layoutVertically();
  left.size = new Size(150, 0);
  const titleRow = left.addStack();
  titleRow.layoutHorizontally();
  titleRow.centerAlignContent();
  addSymbol(titleRow, snapshot.phase.symbol, 14, new Color(snapshot.phase.accent));
  titleRow.addSpacer(5);
  addLabel(titleRow, snapshot.phase.label, Font.boldSystemFont(13), new Color(COLORS.text));
  left.addSpacer(4);
  addLabel(left, snapshot.phase.hint, Font.systemFont(10), new Color(COLORS.muted));
  left.addSpacer(8);
  addLabel(
    left,
    snapshot.next.at ? 'Siguiente · ' + snapshot.next.label : 'Sin más tránsitos hoy',
    Font.systemFont(10),
    new Color(COLORS.faint)
  );
  addLabel(
    left,
    snapshot.next.at ? formatClock(snapshot.next.at, snapshot.location.timeZone) + '  (' + formatCountdown(snapshot.now, snapshot.next.at) + ')' : '--',
    Font.boldSystemFont(16),
    new Color(snapshot.phase.accent)
  );
  left.addSpacer(8);
  addProgressBar(left, snapshot.progress, new Color(snapshot.phase.accent));
  left.addSpacer(4);
  addLabel(
    left,
    '☉ ' + snapshot.sun.altitude.toFixed(1) + '° · ' + snapshot.score.label,
    Font.systemFont(10),
    new Color(snapshot.score.color)
  );

  top.addSpacer(10);
  const divider = top.addText('│');
  divider.font = Font.systemFont(46);
  divider.textColor = new Color(snapshot.phase.accent, 0.28);
  top.addSpacer(10);

  const right = top.addStack();
  right.layoutVertically();
  const marks = [
    { emoji: '💙', title: 'Azul AM', at: snapshot.daylight.civilDawn },
    { emoji: '🌅', title: 'Amanecer', at: snapshot.daylight.sunrise },
    { emoji: '🌇', title: 'Atardecer', at: snapshot.daylight.sunset },
    { emoji: '🌃', title: 'Azul PM', at: snapshot.daylight.civilDusk },
  ];
  for (let index = 0; index < marks.length; index += 1) {
    const mark = marks[index];
    const row = right.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    addLabel(row, mark.emoji, Font.systemFont(11), new Color(COLORS.text));
    row.addSpacer(6);
    addLabel(row, mark.title, Font.systemFont(11), new Color(COLORS.muted));
    row.addSpacer(null);
    addLabel(row, formatClock(mark.at, snapshot.location.timeZone), Font.mediumSystemFont(12), new Color(COLORS.text));
    if (index < marks.length - 1) right.addSpacer(5);
  }

  widget.addSpacer(8);
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  addLabel(
    footer,
    WEEKDAYS_SHORT[snapshot.now.getDay()] + ' ' + snapshot.now.getDate() + ' ' + MONTHS_SHORT[snapshot.now.getMonth()],
    Font.systemFont(9),
    new Color(COLORS.faint)
  );
  footer.addSpacer(null);
  const cityNote = snapshot.location.usingDefault ? snapshot.location.name + ' · pred.' : snapshot.location.name;
  addLabel(footer, cityNote, Font.systemFont(9), new Color(COLORS.faint));
}

function addWindowCard(parent, window, timeZone, isActive) {
  const card = parent.addStack();
  card.layoutVertically();
  card.backgroundColor = new Color(isActive ? COLORS.golden : COLORS.surface, isActive ? 0.16 : 0.07);
  card.cornerRadius = 10;
  card.setPadding(7, 8, 7, 8);
  addLabel(card, window.emoji + ' ' + window.title, Font.boldSystemFont(10), new Color(isActive ? COLORS.golden : COLORS.text));
  card.addSpacer(3);
  addLabel(
    card,
    formatClock(window.start, timeZone) + '–' + formatClock(window.end, timeZone),
    Font.mediumSystemFont(11),
    new Color(COLORS.text)
  );
  card.addSpacer(2);
  addLabel(card, formatDuration(window.start, window.end), Font.systemFont(9), new Color(COLORS.faint));
  return card;
}

function buildLarge(widget, snapshot) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  addSymbol(header, snapshot.phase.symbol, 16, new Color(snapshot.phase.accent));
  header.addSpacer(6);
  const titles = header.addStack();
  titles.layoutVertically();
  addLabel(titles, 'Twilight Atlas', Font.boldSystemFont(16), new Color(COLORS.text));
  addLabel(
    titles,
    WEEKDAYS[snapshot.now.getDay()] + ', ' + snapshot.now.getDate() + ' de ' + MONTHS[snapshot.now.getMonth()],
    Font.systemFont(11),
    new Color(COLORS.muted)
  );
  header.addSpacer(null);
  const badge = header.addStack();
  badge.layoutVertically();
  addLabel(badge, snapshot.phase.emoji + ' ' + snapshot.phase.label, Font.boldSystemFont(12), new Color(snapshot.phase.accent));
  addLabel(badge, snapshot.location.name, Font.systemFont(10), new Color(COLORS.faint));

  widget.addSpacer(10);
  addLabel(widget, snapshot.phase.hint, Font.systemFont(11), new Color(COLORS.muted));
  widget.addSpacer(6);
  addProgressBar(widget, snapshot.progress, new Color(snapshot.phase.accent));
  widget.addSpacer(8);

  const stats = widget.addStack();
  stats.layoutHorizontally();
  const statItems = [
    { k: 'Altitud', v: snapshot.sun.altitude.toFixed(1) + '°' },
    { k: 'Azimut', v: Math.round(snapshot.sun.azimuth) + '°' },
    { k: 'Luz diurna', v: formatDuration(snapshot.daylight.sunrise, snapshot.daylight.sunset) },
    { k: 'Cielo', v: snapshot.score.label },
  ];
  for (let index = 0; index < statItems.length; index += 1) {
    const item = statItems[index];
    const card = stats.addStack();
    card.layoutVertically();
    card.backgroundColor = new Color(COLORS.surface, 0.07);
    card.cornerRadius = 8;
    card.setPadding(6, 8, 6, 8);
    addLabel(card, item.k, Font.systemFont(8), new Color(COLORS.faint));
    card.addSpacer(2);
    addLabel(card, item.v, Font.boldSystemFont(12), new Color(COLORS.text));
    if (index < statItems.length - 1) stats.addSpacer(6);
  }

  widget.addSpacer(10);
  addLabel(widget, 'VENTANAS FOTO', Font.boldSystemFont(9), new Color(COLORS.faint));
  widget.addSpacer(6);
  const windowRow = widget.addStack();
  windowRow.layoutHorizontally();
  snapshot.windows.forEach((window, index) => {
    addWindowCard(windowRow, window, snapshot.location.timeZone, snapshot.active && snapshot.active.id === window.id);
    if (index < snapshot.windows.length - 1) windowRow.addSpacer(6);
  });

  widget.addSpacer(10);
  addLabel(widget, 'LÍNEA DE LUZ', Font.boldSystemFont(9), new Color(COLORS.faint));
  widget.addSpacer(6);
  const timeline = [
    { t: 'Astro', a: snapshot.daylight.astronomicalDawn, b: snapshot.daylight.astronomicalDusk },
    { t: 'Náutico', a: snapshot.daylight.nauticalDawn, b: snapshot.daylight.nauticalDusk },
    { t: 'Civil', a: snapshot.daylight.civilDawn, b: snapshot.daylight.civilDusk },
    { t: 'Sol', a: snapshot.daylight.sunrise, b: snapshot.daylight.sunset },
  ];
  for (const item of timeline) {
    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    const name = row.addText(item.t);
    name.font = Font.mediumSystemFont(11);
    name.textColor = new Color(COLORS.muted);
    name.lineLimit = 1;
    row.addSpacer(null);
    addLabel(
      row,
      formatClock(item.a, snapshot.location.timeZone) + '  →  ' + formatClock(item.b, snapshot.location.timeZone),
      Font.systemFont(11),
      new Color(COLORS.text)
    );
    widget.addSpacer(3);
  }

  widget.addSpacer(8);
  const nextRow = widget.addStack();
  nextRow.layoutHorizontally();
  nextRow.centerAlignContent();
  addLabel(nextRow, 'Siguiente tránsito', Font.systemFont(10), new Color(COLORS.faint));
  nextRow.addSpacer(null);
  addLabel(
    nextRow,
    snapshot.next.at ? snapshot.next.label + ' · ' + formatClock(snapshot.next.at, snapshot.location.timeZone) + ' · ' + formatCountdown(snapshot.now, snapshot.next.at) : 'Mañana',
    Font.mediumSystemFont(11),
    new Color(snapshot.phase.accent)
  );

  widget.addSpacer(10);
  addLabel(widget, 'AGENDA EN VENTANA', Font.boldSystemFont(9), new Color(COLORS.faint));
  widget.addSpacer(6);
  if (snapshot.photoEvents.length === 0) {
    const empty = widget.addStack();
    empty.layoutHorizontally();
    empty.backgroundColor = new Color(COLORS.surface, 0.07);
    empty.cornerRadius = 8;
    empty.setPadding(8, 10, 8, 10);
    addLabel(empty, 'Sin eventos en hora azul o dorada', Font.systemFont(11), new Color(COLORS.muted));
  } else {
    snapshot.photoEvents.forEach((item, index) => {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.backgroundColor = new Color(COLORS.surface, 0.07);
      row.cornerRadius = 8;
      row.setPadding(6, 8, 6, 8);
      addLabel(row, item.window.emoji, Font.systemFont(12), new Color(COLORS.text));
      row.addSpacer(6);
      addLabel(row, shortenTitle(item.event.title, 28), Font.mediumSystemFont(12), new Color(COLORS.text));
      row.addSpacer(null);
      addLabel(row, formatClock(new Date(item.event.startDate), snapshot.location.timeZone), Font.systemFont(11), new Color(COLORS.muted));
      if (index < snapshot.photoEvents.length - 1) widget.addSpacer(4);
    });
  }

  widget.addSpacer(8);
  const footer = widget.addStack();
  footer.layoutHorizontally();
  addLabel(footer, snapshot.score.detail, Font.systemFont(8), new Color(COLORS.faint));
  footer.addSpacer(null);
  addLabel(footer, 'Toca para abrir en Scriptable', Font.systemFont(8), new Color(COLORS.faint));
}

function buildErrorWidget(message) {
  const fallback = new ListWidget();
  applyBackground(fallback, 'night');
  fallback.setPadding(14, 14, 14, 14);
  fallback.addSpacer();
  const title = fallback.addText('⚠️ Twilight Atlas');
  title.font = Font.boldSystemFont(14);
  title.textColor = new Color(COLORS.warning);
  fallback.addSpacer(4);
  const body = fallback.addText(message || 'Toca para reintentar');
  body.font = Font.systemFont(11);
  body.textColor = new Color(COLORS.muted);
  fallback.addSpacer();
  fallback.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
  fallback.refreshAfterDate = new Date(Date.now() + CONFIG.retryMinutes * 60000);
  return fallback;
}

async function createSnapshot() {
  const now = new Date();
  const location = await resolveLocation();
  const [sky, events] = await Promise.all([
    fetchSkyCover(location.latitude, location.longitude).catch(() => ({ cloudCover: null, visibility: null })),
    loadTodayEvents().catch(() => []),
  ]);
  const daylight = buildDaylightMap(location.latitude, location.longitude, now);
  const sun = sunPosition(location.latitude, location.longitude, now);
  const phase = resolvePhase(now, sun, daylight);
  const next = nextTransition(now, daylight);
  const windows = photoWindows(daylight);
  const active = activeWindow(now, windows);
  const score = photoScore(sky ? sky.cloudCover : null);
  return {
    now,
    location,
    daylight,
    sun,
    phase,
    next,
    windows,
    active,
    score,
    progress: dayProgress(now, daylight),
    photoEvents: eventsInWindows(events, windows),
  };
}

async function createWidget() {
  try {
    const snapshot = await createSnapshot();
    const widget = new ListWidget();
    applyBackground(widget, snapshot.phase.id);
    widget.setPadding(14, 14, 14, 14);
    const family = config.widgetFamily || 'medium';
    if (family === 'small') {
      buildSmall(widget, snapshot);
    } else if (family === 'medium') {
      buildMedium(widget, snapshot);
    } else {
      buildLarge(widget, snapshot);
    }
    widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
    widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
    return widget;
  } catch (error) {
    return buildErrorWidget('No se pudo calcular el crepúsculo');
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
  Script.setWidget(buildErrorWidget('Toca para reintentar'));
}
Script.complete();
