const CONFIG = {
  refreshMinutes: 60,
  retryMinutes: 10,
  includeMadrid: true,
  includeTraslado: true,
};

const COLORS = {
  bgTop: '#141428',
  bgBottom: '#0A0A16',
  text: '#F2F3F7',
  muted: '#9BA1B4',
  faint: '#6E7388',
  card: '#FFFFFF',
  cardAlpha: 0.07,
  track: '#FFFFFF',
  trackAlpha: 0.08,
  accent: '#FFD60A',
  puente: '#64D2FF',
  today: '#30D158',
  error: '#FF6B6B',
};

const WEEKDAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const WEEKDAY_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const NATIONAL_FIXED = [
  { name: 'Año Nuevo', emoji: '🎆', month: 1, day: 1, accent: '#FFD60A' },
  { name: 'Reyes', emoji: '👑', month: 1, day: 6, accent: '#64D2FF' },
  { name: 'Día del Trabajo', emoji: '🛠️', month: 5, day: 1, accent: '#FF9F0A' },
  { name: 'Asunción', emoji: '✨', month: 8, day: 15, accent: '#BF5AF2' },
  { name: 'Fiesta Nacional', emoji: '🇪🇸', month: 10, day: 12, accent: '#FF453A' },
  { name: 'Todos los Santos', emoji: '🕯️', month: 11, day: 1, accent: '#AEAEB2' },
  { name: 'Constitución', emoji: '📜', month: 12, day: 6, accent: '#0A84FF' },
  { name: 'Inmaculada', emoji: '🤍', month: 12, day: 8, accent: '#64D2FF' },
  { name: 'Navidad', emoji: '🎄', month: 12, day: 25, accent: '#30D158' },
];

const MADRID_FIXED = [
  { name: 'Dos de Mayo', emoji: '🏰', month: 5, day: 2, accent: '#FF9F0A' },
  { name: 'San Isidro', emoji: '🌹', month: 5, day: 15, accent: '#FF375F' },
];

const DAY_MS = 86400000;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function isSameDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function daysBetween(from, to) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

function dateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatShortDate(date) {
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

function formatLongDate(date) {
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function formatCountdown(days) {
  if (days === 0) return '¡Hoy!';
  if (days === 1) return 'Mañana';
  return `${days} días`;
}

function easterSunday(year) {
  try {
    const golden = year % 19;
    const century = Math.floor(year / 100);
    const yearOfCentury = year % 100;
    const centuryLeap = Math.floor(century / 4);
    const centuryRemainder = century % 4;
    const cycle = Math.floor((century + 8) / 25);
    const skip = Math.floor((century - cycle + 1) / 3);
    const epact = (19 * golden + century - centuryLeap - skip + 15) % 30;
    const yearLeap = Math.floor(yearOfCentury / 4);
    const yearRemainder = yearOfCentury % 4;
    const weekdayAdjust = (32 + 2 * centuryRemainder + 2 * yearLeap - epact - yearRemainder) % 7;
    const correction = Math.floor((golden + 11 * epact + 22 * weekdayAdjust) / 451);
    const month = Math.floor((epact + weekdayAdjust - 7 * correction + 114) / 31);
    const day = ((epact + weekdayAdjust - 7 * correction + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  } catch (error) {
    return new Date(year, 3, 12);
  }
}

function makeHoliday(name, emoji, date, accent, kind) {
  return {
    name,
    emoji,
    date: startOfDay(date),
    accent,
    kind,
    weekday: startOfDay(date).getDay(),
  };
}

function holidaysForYear(year) {
  try {
    const items = [];
    for (const entry of NATIONAL_FIXED) {
      items.push(makeHoliday(entry.name, entry.emoji, new Date(year, entry.month - 1, entry.day), entry.accent, 'nacional'));
    }
    if (CONFIG.includeMadrid) {
      for (const entry of MADRID_FIXED) {
        items.push(makeHoliday(entry.name, entry.emoji, new Date(year, entry.month - 1, entry.day), entry.accent, 'madrid'));
      }
    }
    const easter = easterSunday(year);
    items.push(makeHoliday('Jueves Santo', '🍞', addDays(easter, -3), '#FF9F0A', 'movible'));
    items.push(makeHoliday('Viernes Santo', '✝️', addDays(easter, -2), '#BF5AF2', 'movible'));
    const seen = new Set();
    const unique = [];
    for (const holiday of items.sort((a, b) => a.date.getTime() - b.date.getTime())) {
      const key = dateKey(holiday.date);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(holiday);
    }
    if (CONFIG.includeTraslado) {
      const extra = [];
      for (const holiday of unique) {
        if (holiday.weekday !== 0) continue;
        const monday = addDays(holiday.date, 1);
        if (seen.has(dateKey(monday))) continue;
        seen.add(dateKey(monday));
        extra.push(makeHoliday(`Traslado ${holiday.name}`, holiday.emoji, monday, holiday.accent, 'traslado'));
      }
      unique.push(...extra);
      unique.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    return unique;
  } catch (error) {
    return [];
  }
}

function longWeekendFor(holiday) {
  const weekday = holiday.weekday;
  if (weekday === 1) {
    return { start: addDays(holiday.date, -2), end: holiday.date, kind: 'finde', label: 'Finde largo' };
  }
  if (weekday === 5) {
    return { start: holiday.date, end: addDays(holiday.date, 2), kind: 'finde', label: 'Finde largo' };
  }
  if (weekday === 2) {
    return { start: addDays(holiday.date, -3), end: holiday.date, kind: 'puente', label: 'Puente' };
  }
  if (weekday === 4) {
    return { start: holiday.date, end: addDays(holiday.date, 3), kind: 'puente', label: 'Puente' };
  }
  return null;
}

function mergeWindows(windows) {
  if (windows.length === 0) return [];
  const sorted = [...windows].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged = [{ ...sorted[0], names: [sorted[0].holidayName] }];
  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const last = merged[merged.length - 1];
    if (current.start.getTime() <= addDays(last.end, 1).getTime()) {
      if (current.end.getTime() > last.end.getTime()) last.end = current.end;
      if (current.start.getTime() < last.start.getTime()) last.start = current.start;
      last.names.push(current.holidayName);
      if (current.kind === 'puente') last.kind = 'puente';
      last.label = last.kind === 'puente' ? 'Puente' : 'Finde largo';
    } else {
      merged.push({ ...current, names: [current.holidayName] });
    }
  }
  return merged.map((window) => ({
    ...window,
    days: daysBetween(window.start, window.end) + 1,
    holidayName: [...new Set(window.names)].join(' · '),
  }));
}

function decorateHoliday(holiday, now) {
  const days = daysBetween(now, holiday.date);
  const weekend = longWeekendFor(holiday);
  return {
    ...holiday,
    days,
    isToday: days === 0,
    isPast: days < 0,
    weekdayLabel: WEEKDAY_LONG[holiday.weekday],
    weekend,
  };
}

function getAtlasSnapshot(now) {
  try {
    const today = startOfDay(now);
    const thisYear = holidaysForYear(today.getFullYear()).map((holiday) => decorateHoliday(holiday, today));
    const nextYear = holidaysForYear(today.getFullYear() + 1).map((holiday) => decorateHoliday(holiday, today));
    const upcoming = [...thisYear, ...nextYear].filter((holiday) => holiday.days >= 0);
    const remainingThisYear = thisYear.filter((holiday) => holiday.days >= 0);
    const celebrated = thisYear.filter((holiday) => holiday.days < 0);
    const windows = mergeWindows(
      upcoming
        .map((holiday) => {
          if (!holiday.weekend) return null;
          return {
            ...holiday.weekend,
            holidayName: holiday.name,
            accent: holiday.accent,
            emoji: holiday.emoji,
          };
        })
        .filter(Boolean)
        .filter((window) => daysBetween(today, window.end) >= 0),
    ).map((window) => ({
      ...window,
      daysUntil: Math.max(0, daysBetween(today, window.start)),
      inProgress: daysBetween(today, window.start) <= 0 && daysBetween(today, window.end) >= 0,
    }));
    return {
      today,
      upcoming,
      remainingThisYear,
      celebrated,
      totalThisYear: thisYear.length,
      nextHoliday: upcoming[0] || null,
      nextWindow: windows[0] || null,
      windows,
      year: today.getFullYear(),
    };
  } catch (error) {
    return {
      today: startOfDay(now),
      upcoming: [],
      remainingThisYear: [],
      celebrated: [],
      totalThisYear: 0,
      nextHoliday: null,
      nextWindow: null,
      windows: [],
      year: now.getFullYear(),
    };
  }
}

function applyBackground(widget) {
  const gradient = new LinearGradient();
  gradient.colors = [new Color(COLORS.bgTop), new Color(COLORS.bgBottom)];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
}

function addSymbol(stack, name, size, color) {
  try {
    const symbol = SFSymbol.named(name);
    symbol.applyFont(Font.systemFont(size));
    const image = stack.addImage(symbol.image);
    image.imageSize = new Size(size, size);
    image.tintColor = color;
  } catch (error) {
    const fallback = stack.addText('•');
    fallback.font = Font.systemFont(size);
    fallback.textColor = color;
  }
}

function addProgressBar(parent, fraction, color, height) {
  const barHeight = height || 5;
  const track = parent.addStack();
  track.layoutHorizontally();
  track.backgroundColor = new Color(COLORS.track, COLORS.trackAlpha);
  track.cornerRadius = barHeight / 2;
  track.size = new Size(0, barHeight);
  const fill = track.addStack();
  fill.backgroundColor = color;
  fill.cornerRadius = barHeight / 2;
  fill.size = new Size(0, barHeight);
  fill.addSpacer(Math.round(Math.min(1, Math.max(0, fraction)) * 100));
  track.addSpacer(null);
}

function addHeader(widget, title, trailing) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  addSymbol(header, 'calendar', 13, new Color(COLORS.accent));
  header.addSpacer(6);
  const titleLabel = header.addText(title);
  titleLabel.font = Font.boldSystemFont(13);
  titleLabel.textColor = new Color(COLORS.text);
  header.addSpacer(null);
  if (trailing) {
    const trailingLabel = header.addText(trailing);
    trailingLabel.font = Font.mediumSystemFont(9);
    trailingLabel.textColor = new Color(COLORS.muted);
  }
}

function addHolidayCard(parent, holiday, compact) {
  const card = parent.addStack();
  card.layoutVertically();
  card.backgroundColor = new Color(COLORS.card, COLORS.cardAlpha);
  card.cornerRadius = 10;
  card.setPadding(compact ? 6 : 8, 10, compact ? 6 : 8, 10);

  const top = card.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  const glyph = top.addText(holiday.emoji);
  glyph.font = Font.systemFont(compact ? 14 : 18);
  top.addSpacer(8);
  const info = top.addStack();
  info.layoutVertically();
  const name = info.addText(holiday.name);
  name.font = Font.mediumSystemFont(compact ? 11 : 13);
  name.textColor = new Color(COLORS.text);
  const when = info.addText(`${WEEKDAY_SHORT[holiday.weekday]} ${formatLongDate(holiday.date)}`);
  when.font = Font.systemFont(compact ? 8 : 9);
  when.textColor = new Color(COLORS.muted);
  top.addSpacer(null);
  const countdown = top.addText(formatCountdown(holiday.days));
  countdown.font = Font.boldSystemFont(compact ? 13 : 16);
  countdown.textColor = new Color(holiday.isToday ? COLORS.today : holiday.accent);

  if (holiday.weekend && !compact) {
    card.addSpacer(4);
    const badge = card.addStack();
    badge.layoutHorizontally();
    badge.centerAlignContent();
    const badgeText = badge.addText(`${holiday.weekend.label} · ${formatShortDate(holiday.weekend.start)}–${formatShortDate(holiday.weekend.end)}`);
    badgeText.font = Font.systemFont(9);
    badgeText.textColor = new Color(COLORS.puente);
  }
}

function addWindowCard(parent, window) {
  const card = parent.addStack();
  card.layoutHorizontally();
  card.centerAlignContent();
  card.backgroundColor = new Color(COLORS.card, COLORS.cardAlpha);
  card.cornerRadius = 10;
  card.setPadding(7, 10, 7, 10);
  addSymbol(card, 'sun.max.fill', 12, new Color(COLORS.puente));
  card.addSpacer(8);
  const info = card.addStack();
  info.layoutVertically();
  const title = info.addText(window.inProgress ? `${window.label} en curso` : `Próximo ${window.label.toLowerCase()}`);
  title.font = Font.mediumSystemFont(11);
  title.textColor = new Color(COLORS.text);
  const span = info.addText(`${formatShortDate(window.start)} – ${formatShortDate(window.end)} · ${window.days} días`);
  span.font = Font.systemFont(9);
  span.textColor = new Color(COLORS.muted);
  card.addSpacer(null);
  const wait = card.addText(window.inProgress ? 'Ahora' : formatCountdown(window.daysUntil));
  wait.font = Font.boldSystemFont(13);
  wait.textColor = new Color(COLORS.puente);
}

function addHolidayRow(parent, holiday) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const glyph = row.addText(holiday.emoji);
  glyph.font = Font.systemFont(12);
  row.addSpacer(6);
  const name = row.addText(holiday.name);
  name.font = Font.mediumSystemFont(11);
  name.textColor = new Color(COLORS.text);
  name.lineLimit = 1;
  row.addSpacer(null);
  const meta = row.addText(`${formatShortDate(holiday.date)} · ${formatCountdown(holiday.days)}`);
  meta.font = Font.systemFont(9);
  meta.textColor = new Color(holiday.isToday ? COLORS.today : COLORS.muted);
}

function buildSmall(widget, snapshot) {
  const holiday = snapshot.nextHoliday;
  if (!holiday) {
    const empty = widget.addText('Sin festivos');
    empty.font = Font.mediumSystemFont(12);
    empty.textColor = new Color(COLORS.muted);
    return;
  }
  const glyph = widget.addText(holiday.emoji);
  glyph.font = Font.systemFont(28);
  widget.addSpacer(4);
  const name = widget.addText(holiday.name);
  name.font = Font.mediumSystemFont(12);
  name.textColor = new Color(COLORS.text);
  name.lineLimit = 2;
  widget.addSpacer(6);
  const headline = widget.addText(formatCountdown(holiday.days));
  headline.font = Font.boldSystemFont(26);
  headline.textColor = new Color(holiday.isToday ? COLORS.today : holiday.accent);
  const subline = widget.addText(`${WEEKDAY_SHORT[holiday.weekday]} ${formatShortDate(holiday.date)}`);
  subline.font = Font.systemFont(10);
  subline.textColor = new Color(COLORS.muted);
  widget.addSpacer(8);
  if (holiday.weekend) {
    const badge = widget.addText(`${holiday.weekend.label} ${holiday.weekend.days}d`);
    badge.font = Font.mediumSystemFont(10);
    badge.textColor = new Color(COLORS.puente);
  } else {
    const rest = widget.addText(`${snapshot.remainingThisYear.length} restan ${snapshot.year}`);
    rest.font = Font.systemFont(9);
    rest.textColor = new Color(COLORS.faint);
  }
}

function buildMedium(widget, snapshot) {
  addHeader(widget, 'Festivo Atlas', `${snapshot.remainingThisYear.length} restan`);
  widget.addSpacer(8);
  if (snapshot.nextHoliday) {
    addHolidayCard(widget, snapshot.nextHoliday, false);
  }
  widget.addSpacer(6);
  if (snapshot.nextWindow) {
    addWindowCard(widget, snapshot.nextWindow);
  }
  const extras = snapshot.upcoming.slice(1, 3);
  if (extras.length > 0) {
    widget.addSpacer(6);
    for (const holiday of extras) {
      addHolidayRow(widget, holiday);
      widget.addSpacer(3);
    }
  }
}

function buildLarge(widget, snapshot) {
  addHeader(widget, 'Festivo Atlas', formatLongDate(snapshot.today));
  widget.addSpacer(10);
  if (snapshot.nextHoliday) {
    addHolidayCard(widget, snapshot.nextHoliday, false);
  }
  widget.addSpacer(6);
  if (snapshot.nextWindow) {
    addWindowCard(widget, snapshot.nextWindow);
  }
  widget.addSpacer(10);
  const yearCard = widget.addStack();
  yearCard.layoutVertically();
  yearCard.backgroundColor = new Color(COLORS.card, COLORS.cardAlpha);
  yearCard.cornerRadius = 10;
  yearCard.setPadding(8, 10, 8, 10);
  const yearHeader = yearCard.addStack();
  yearHeader.layoutHorizontally();
  yearHeader.centerAlignContent();
  const yearTitle = yearHeader.addText(`Calendario ${snapshot.year}`);
  yearTitle.font = Font.mediumSystemFont(12);
  yearTitle.textColor = new Color(COLORS.text);
  yearHeader.addSpacer(null);
  const yearCount = yearHeader.addText(`${snapshot.celebrated.length}/${snapshot.totalThisYear}`);
  yearCount.font = Font.systemFont(10);
  yearCount.textColor = new Color(COLORS.muted);
  yearCard.addSpacer(6);
  const yearFraction = snapshot.totalThisYear === 0 ? 0 : snapshot.celebrated.length / snapshot.totalThisYear;
  addProgressBar(yearCard, yearFraction, new Color(COLORS.accent), 5);
  yearCard.addSpacer(8);
  const list = snapshot.remainingThisYear.length > 0
    ? snapshot.remainingThisYear
    : snapshot.upcoming.slice(0, 8);
  for (let index = 0; index < Math.min(list.length, 8); index += 1) {
    addHolidayRow(yearCard, list[index]);
    if (index < Math.min(list.length, 8) - 1) yearCard.addSpacer(4);
  }
  widget.addSpacer(10);
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const hint = footer.addText('Nacional + Madrid · computus gregoriano');
  hint.font = Font.systemFont(8);
  hint.textColor = new Color(COLORS.faint);
  footer.addSpacer(null);
  const tap = footer.addText('Toca para abrir');
  tap.font = Font.systemFont(8);
  tap.textColor = new Color(COLORS.faint);
}

function buildWidget() {
  const now = new Date();
  const family = config.widgetFamily || 'medium';
  const snapshot = getAtlasSnapshot(now);
  const widget = new ListWidget();
  applyBackground(widget);
  widget.setPadding(12, 14, 12, 14);
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
}

function buildErrorWidget() {
  const fallback = new ListWidget();
  applyBackground(fallback);
  fallback.addSpacer();
  const errorLabel = fallback.addText('⚠️ Error en Festivo Atlas');
  errorLabel.font = Font.mediumSystemFont(13);
  errorLabel.textColor = new Color(COLORS.error);
  fallback.addSpacer(4);
  const retryLabel = fallback.addText('Toca para reintentar');
  retryLabel.font = Font.systemFont(10);
  retryLabel.textColor = new Color(COLORS.muted);
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
