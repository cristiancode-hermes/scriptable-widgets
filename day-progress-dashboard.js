const CONFIG = {
  refreshMinutes: 15,
  retryMinutes: 10,
  dayBarColor: '#FFD60A',
  weekBarColor: '#5E5CE6',
  yearBarColor: '#30D158',
  moonColor: '#CFD7FF',
  seasonColor: '#FF9F0A',
  textColor: '#F2F3F7',
  mutedColor: '#9BA1B4',
  faintColor: '#6E7388',
  errorColor: '#FF6B6B',
  cardAlpha: 0.06,
  trackColor: '#FFFFFF',
  trackAlpha: 0.08,
};

const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WEEKDAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MOON_GLYPHS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
const MOON_NAMES = ['Luna nueva', 'Luna creciente', 'Cuarto creciente', 'Gibosa creciente', 'Luna llena', 'Gibosa menguante', 'Cuarto menguante', 'Luna menguante'];

const SEASONS = [
  { name: 'Primavera', emoji: '🌱', startMonth: 3, startDay: 20 },
  { name: 'Verano', emoji: '☀️', startMonth: 6, startDay: 21 },
  { name: 'Otoño', emoji: '🍂', startMonth: 9, startDay: 23 },
  { name: 'Invierno', emoji: '❄️', startMonth: 12, startDay: 21 },
];

const MONTH_PALETTES = [
  ['#1a1a3e', '#0d0d1a'],
  ['#1e1e3a', '#0d0d1a'],
  ['#1a2a3e', '#0d0d1a'],
  ['#1a2e3a', '#0d0d1a'],
  ['#1a2a2e', '#0d0d1a'],
  ['#1a1a2e', '#0d0d1a'],
  ['#1e1e3e', '#0d0d1a'],
  ['#1a1a3a', '#0d0d1a'],
  ['#1e2a1e', '#0d0d1a'],
  ['#1e2e2e', '#0d0d1a'],
  ['#1e1e2e', '#0d0d1a'],
  ['#1a1a3e', '#0d0d1a'],
];

const DAY_MS = 86400000;
const MOON_CYCLE_DAYS = 29.5305882;

function getDayOfYear(date) {
  const yearStart = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - yearStart.getTime()) / DAY_MS);
}

function getDaysInYear(date) {
  const year = date.getFullYear();
  const yearEnd = new Date(year, 11, 31);
  const yearStart = new Date(year, 0, 0);
  return Math.floor((yearEnd.getTime() - yearStart.getTime()) / DAY_MS);
}

function getYearProgress(date) {
  return getDayOfYear(date) / getDaysInYear(date);
}

function getDayProgress(date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  return (date.getTime() - dayStart.getTime()) / (dayEnd.getTime() - dayStart.getTime());
}

function getWeekNumber(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

function getWeekProgress(date) {
  const day = date.getDay();
  return day === 0 ? 1 : day / 7;
}

function getMoonInfo(date) {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();
  if (month < 3) {
    year -= 1;
    month += 12;
  }
  month += 1;
  let julianDay = 365.25 * year + 30.6 * month + day - 694039.09;
  julianDay /= MOON_CYCLE_DAYS;
  const fraction = julianDay - Math.floor(julianDay);
  const phase = Math.round(fraction * 8) % 8;
  return {
    phase,
    age: fraction * MOON_CYCLE_DAYS,
    glyph: MOON_GLYPHS[phase],
    name: MOON_NAMES[phase],
  };
}

function daysUntilFullMoon(moonAge) {
  return (MOON_CYCLE_DAYS / 2 - moonAge + MOON_CYCLE_DAYS) % MOON_CYCLE_DAYS;
}

function getSeason(date) {
  const monthDay = date.getMonth() * 100 + date.getDate();
  if (monthDay >= 1121 || monthDay < 220) return SEASONS[3];
  if (monthDay < 521) return SEASONS[0];
  if (monthDay < 823) return SEASONS[1];
  return SEASONS[2];
}

function getSeasonProgress(date, season) {
  const seasonIndex = SEASONS.indexOf(season);
  const nextSeason = SEASONS[(seasonIndex + 1) % SEASONS.length];
  let start = new Date(date.getFullYear(), season.startMonth - 1, season.startDay);
  let end = new Date(date.getFullYear(), nextSeason.startMonth - 1, nextSeason.startDay);
  if (end.getTime() <= start.getTime()) end.setFullYear(end.getFullYear() + 1);
  const total = end.getTime() - start.getTime();
  const elapsed = date.getTime() - start.getTime();
  return Math.max(0, Math.min(1, elapsed / total));
}

function getCalendarSnapshot(date) {
  const season = getSeason(date);
  const moon = getMoonInfo(date);
  const dayOfYear = getDayOfYear(date);
  return {
    dayOfYear,
    daysInYear: getDaysInYear(date),
    daysLeft: getDaysInYear(date) - dayOfYear,
    dayProgress: getDayProgress(date),
    weekNumber: getWeekNumber(date),
    weekProgress: getWeekProgress(date),
    yearProgress: getYearProgress(date),
    season,
    seasonProgress: getSeasonProgress(date, season),
    moon,
    daysUntilFullMoon: daysUntilFullMoon(moon.age),
  };
}

function formatClock(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatShortDate(date) {
  return `${WEEKDAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

function formatLongDate(date) {
  return `${WEEKDAY_NAMES[date.getDay()]}, ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
}

function formatPercent(fraction) {
  return `${Math.round(fraction * 100)}%`;
}

function formatDays(days) {
  const rounded = Math.round(days);
  return rounded <= 1 ? '1 día' : `${rounded} días`;
}

function addProgressBar(parent, fraction, color) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const track = parent.addStack();
  track.backgroundColor = new Color(CONFIG.trackColor, CONFIG.trackAlpha);
  track.cornerRadius = 3;
  track.size = new Size(0, 6);
  const fill = track.addStack();
  fill.backgroundColor = color;
  fill.cornerRadius = 3;
  fill.size = new Size(0, 6);
  fill.addSpacer(Math.round(clamped * 100));
  track.addSpacer(null);
}

function addMetricRow(parent, label, value, fraction, accentHex) {
  const labelRow = parent.addStack();
  labelRow.layoutHorizontally();
  labelRow.centerAlignContent();
  const nameLabel = labelRow.addText(label);
  nameLabel.font = Font.mediumSystemFont(11);
  nameLabel.textColor = new Color(CONFIG.mutedColor);
  labelRow.addSpacer(null);
  const valueLabel = labelRow.addText(value);
  valueLabel.font = Font.mediumSystemFont(11);
  valueLabel.textColor = new Color(accentHex);
  parent.addSpacer(3);
  addProgressBar(parent, fraction, new Color(accentHex));
}

function buildSmall(widget, now, snapshot) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const moonGlyph = header.addText(snapshot.moon.glyph);
  moonGlyph.font = Font.systemFont(14);
  header.addSpacer(6);
  const clockLabel = header.addText(formatClock(now));
  clockLabel.font = Font.boldSystemFont(18);
  clockLabel.textColor = new Color(CONFIG.textColor);
  header.addSpacer(null);
  const weekBadge = header.addText(`S${snapshot.weekNumber}`);
  weekBadge.font = Font.systemFont(10);
  weekBadge.textColor = new Color(CONFIG.mutedColor);

  widget.addSpacer(8);

  const dayLabel = widget.addText(`Día ${formatPercent(snapshot.dayProgress)}`);
  dayLabel.font = Font.mediumSystemFont(13);
  dayLabel.textColor = new Color(CONFIG.dayBarColor);

  widget.addSpacer(4);
  addProgressBar(widget, snapshot.dayProgress, new Color(CONFIG.dayBarColor));
  widget.addSpacer(6);

  const yearLabel = widget.addText(`Año ${formatPercent(snapshot.yearProgress)}`);
  yearLabel.font = Font.systemFont(11);
  yearLabel.textColor = new Color(CONFIG.yearBarColor);

  widget.addSpacer(4);
  addProgressBar(widget, snapshot.yearProgress, new Color(CONFIG.yearBarColor));
  widget.addSpacer(8);

  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const seasonLabel = footer.addText(`${snapshot.season.emoji} ${snapshot.season.name}`);
  seasonLabel.font = Font.systemFont(10);
  seasonLabel.textColor = new Color(CONFIG.mutedColor);
  footer.addSpacer(null);
  const moonLabel = footer.addText(snapshot.moon.name);
  moonLabel.font = Font.systemFont(10);
  moonLabel.textColor = new Color(CONFIG.moonColor);
}

function buildMedium(widget, now, snapshot) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const dateLabel = header.addText(`📅 ${formatShortDate(now)}`);
  dateLabel.font = Font.mediumSystemFont(13);
  dateLabel.textColor = new Color(CONFIG.textColor);
  header.addSpacer(null);
  const clockLabel = header.addText(formatClock(now));
  clockLabel.font = Font.boldSystemFont(16);
  clockLabel.textColor = new Color(CONFIG.textColor);

  widget.addSpacer(10);
  addMetricRow(widget, 'Día', formatPercent(snapshot.dayProgress), snapshot.dayProgress, CONFIG.dayBarColor);
  widget.addSpacer(6);
  addMetricRow(widget, 'Semana', formatPercent(snapshot.weekProgress), snapshot.weekProgress, CONFIG.weekBarColor);
  widget.addSpacer(6);
  addMetricRow(widget, 'Año', formatPercent(snapshot.yearProgress), snapshot.yearProgress, CONFIG.yearBarColor);
  widget.addSpacer(10);

  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const moonLabel = footer.addText(`${snapshot.moon.glyph} ${snapshot.moon.name}`);
  moonLabel.font = Font.systemFont(10);
  moonLabel.textColor = new Color(CONFIG.moonColor);
  footer.addSpacer(null);
  const dayCounter = footer.addText(`Día ${snapshot.dayOfYear}/${snapshot.daysInYear}`);
  dayCounter.font = Font.systemFont(10);
  dayCounter.textColor = new Color(CONFIG.mutedColor);
}

function buildLarge(widget, now, snapshot) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const clockLabel = header.addText(formatClock(now));
  clockLabel.font = Font.boldSystemFont(28);
  clockLabel.textColor = new Color(CONFIG.textColor);
  header.addSpacer(8);
  const dateColumn = header.addStack();
  dateColumn.layoutVertically();
  const dateLabel = dateColumn.addText(formatLongDate(now));
  dateLabel.font = Font.mediumSystemFont(12);
  dateLabel.textColor = new Color(CONFIG.textColor);
  const metaLabel = dateColumn.addText(`Día ${snapshot.dayOfYear} · Semana ${snapshot.weekNumber}`);
  metaLabel.font = Font.systemFont(10);
  metaLabel.textColor = new Color(CONFIG.mutedColor);

  widget.addSpacer(12);
  addMetricRow(widget, 'Progreso del día', formatPercent(snapshot.dayProgress), snapshot.dayProgress, CONFIG.dayBarColor);
  widget.addSpacer(6);
  addMetricRow(widget, 'Progreso de la semana', formatPercent(snapshot.weekProgress), snapshot.weekProgress, CONFIG.weekBarColor);
  widget.addSpacer(6);
  addMetricRow(widget, 'Progreso del año', formatPercent(snapshot.yearProgress), snapshot.yearProgress, CONFIG.yearBarColor);

  widget.addSpacer(12);

  const seasonCard = widget.addStack();
  seasonCard.layoutVertically();
  seasonCard.backgroundColor = new Color(CONFIG.trackColor, CONFIG.cardAlpha);
  seasonCard.cornerRadius = 10;
  seasonCard.setPadding(8, 10, 8, 10);
  const seasonHeader = seasonCard.addStack();
  seasonHeader.layoutHorizontally();
  seasonHeader.centerAlignContent();
  const seasonTitle = seasonHeader.addText(`${snapshot.season.emoji} ${snapshot.season.name}`);
  seasonTitle.font = Font.mediumSystemFont(12);
  seasonTitle.textColor = new Color(CONFIG.seasonColor);
  seasonHeader.addSpacer(null);
  const seasonPercent = seasonHeader.addText(formatPercent(snapshot.seasonProgress));
  seasonPercent.font = Font.systemFont(10);
  seasonPercent.textColor = new Color(CONFIG.mutedColor);
  seasonCard.addSpacer(4);
  addProgressBar(seasonCard, snapshot.seasonProgress, new Color(CONFIG.seasonColor));

  widget.addSpacer(8);

  const moonCard = widget.addStack();
  moonCard.layoutVertically();
  moonCard.backgroundColor = new Color(CONFIG.trackColor, CONFIG.cardAlpha);
  moonCard.cornerRadius = 10;
  moonCard.setPadding(8, 10, 8, 10);
  const moonHeader = moonCard.addStack();
  moonHeader.layoutHorizontally();
  moonHeader.centerAlignContent();
  const moonTitle = moonHeader.addText(`${snapshot.moon.glyph} ${snapshot.moon.name}`);
  moonTitle.font = Font.mediumSystemFont(12);
  moonTitle.textColor = new Color(CONFIG.moonColor);
  moonHeader.addSpacer(null);
  const moonAge = moonHeader.addText(`Edad ${snapshot.moon.age.toFixed(1)} d`);
  moonAge.font = Font.systemFont(10);
  moonAge.textColor = new Color(CONFIG.mutedColor);
  moonCard.addSpacer(3);
  const fullMoonLabel = moonCard.addText(`🌕 Luna llena en ~${formatDays(snapshot.daysUntilFullMoon)}`);
  fullMoonLabel.font = Font.systemFont(10);
  fullMoonLabel.textColor = new Color(CONFIG.mutedColor);

  widget.addSpacer(10);

  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const daysLeftLabel = footer.addText(`Quedan ${snapshot.daysLeft} días de ${now.getFullYear()}`);
  daysLeftLabel.font = Font.systemFont(10);
  daysLeftLabel.textColor = new Color(CONFIG.faintColor);
  footer.addSpacer(null);
  const tapHint = footer.addText('Toca para abrir');
  tapHint.font = Font.systemFont(10);
  tapHint.textColor = new Color(CONFIG.faintColor);
}

function buildWidget() {
  const now = new Date();
  const family = config.widgetFamily || 'medium';
  const snapshot = getCalendarSnapshot(now);
  const widget = new ListWidget();
  const palette = MONTH_PALETTES[now.getMonth()];
  const gradient = new LinearGradient();
  gradient.colors = [new Color(palette[0]), new Color(palette[1])];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;

  if (family === 'small') {
    buildSmall(widget, now, snapshot);
  } else if (family === 'medium') {
    buildMedium(widget, now, snapshot);
  } else {
    buildLarge(widget, now, snapshot);
  }

  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function buildErrorWidget() {
  const fallback = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [new Color('#1a1a2e'), new Color('#0f0c29')];
  gradient.locations = [0, 1];
  fallback.backgroundGradient = gradient;
  fallback.addSpacer();
  const errorLabel = fallback.addText('⚠️ Error en el widget');
  errorLabel.font = Font.mediumSystemFont(13);
  errorLabel.textColor = new Color(CONFIG.errorColor);
  fallback.addSpacer(4);
  const retryLabel = fallback.addText('Toca para reintentar');
  retryLabel.font = Font.systemFont(10);
  retryLabel.textColor = new Color(CONFIG.mutedColor);
  fallback.addSpacer();
  fallback.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
  fallback.refreshAfterDate = new Date(Date.now() + CONFIG.retryMinutes * 60000);
  return fallback;
}

async function run() {
  try {
    const widget = buildWidget();
    Script.setWidget(widget);
    if (!config.runsInWidget) {
      await widget.presentLarge();
    }
  } catch (error) {
    Script.setWidget(buildErrorWidget());
  }
  Script.complete();
}

await run();
