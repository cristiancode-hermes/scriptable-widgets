const CONFIG = {
  refreshMinutes: 15,
  retryMinutes: 10,
  workStartHour: 9,
  workStartMinute: 0,
  workEndHour: 18,
  workEndMinute: 0,
};

const COLORS = {
  bgTop: '#121428',
  bgBottom: '#07080F',
  text: '#F2F3F7',
  muted: '#9BA1B4',
  faint: '#6E7388',
  card: '#FFFFFF',
  cardAlpha: 0.07,
  track: '#FFFFFF',
  trackAlpha: 0.08,
  work: '#64D2FF',
  week: '#5E5CE6',
  month: '#30D158',
  quarter: '#FFD60A',
  payday: '#FF9F0A',
  weekend: '#BF5AF2',
  error: '#FF6B6B',
};

const WEEKDAY_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WEEKDAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const WORKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAY_MS = 86400000;
const MINUTE_MS = 60000;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function isWorkday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function workStartMinutes() {
  return CONFIG.workStartHour * 60 + CONFIG.workStartMinute;
}

function workEndMinutes() {
  return CONFIG.workEndHour * 60 + CONFIG.workEndMinute;
}

function workdayLengthMinutes() {
  return Math.max(1, workEndMinutes() - workStartMinutes());
}

function remainingWorkMinutesToday(now) {
  if (!isWorkday(now)) return 0;
  const current = minutesSinceMidnight(now);
  const start = workStartMinutes();
  const end = workEndMinutes();
  if (current >= end) return 0;
  if (current <= start) return end - start;
  return end - current;
}

function elapsedWorkMinutesToday(now) {
  if (!isWorkday(now)) return 0;
  const current = minutesSinceMidnight(now);
  const start = workStartMinutes();
  const end = workEndMinutes();
  if (current <= start) return 0;
  if (current >= end) return end - start;
  return current - start;
}

function nextWorkStart(now) {
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    CONFIG.workStartHour,
    CONFIG.workStartMinute,
    0,
    0,
  );
  if (isWorkday(now) && now.getTime() < todayStart.getTime()) return todayStart;
  let cursor = startOfDay(now);
  for (let offset = 1; offset <= 10; offset += 1) {
    cursor = addDays(startOfDay(now), offset);
    if (isWorkday(cursor)) {
      return new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate(),
        CONFIG.workStartHour,
        CONFIG.workStartMinute,
        0,
        0,
      );
    }
  }
  return todayStart;
}

function minutesUntil(target, now) {
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / MINUTE_MS));
}

function countWorkdaysInclusive(start, endInclusive) {
  let count = 0;
  const cursor = startOfDay(start);
  const last = startOfDay(endInclusive);
  while (cursor.getTime() <= last.getTime()) {
    if (isWorkday(cursor)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function remainingWorkdaysThisWeek(now) {
  const dow = now.getDay();
  if (dow === 0 || dow === 6) return 0;
  let remaining = 0;
  for (let day = dow; day <= 5; day += 1) {
    if (day === dow) {
      if (remainingWorkMinutesToday(now) > 0) remaining += 1;
    } else {
      remaining += 1;
    }
  }
  return remaining;
}

function remainingWorkMinutesThisWeek(now) {
  const todayLeft = remainingWorkMinutesToday(now);
  const dow = now.getDay();
  if (dow === 0 || dow === 6) return 0;
  let extraDays = 0;
  for (let day = dow + 1; day <= 5; day += 1) extraDays += 1;
  return todayLeft + extraDays * workdayLengthMinutes();
}

function lastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function remainingWorkdaysThisMonth(now) {
  const last = lastDayOfMonth(now);
  let start = startOfDay(now);
  if (remainingWorkMinutesToday(now) <= 0) start = addDays(start, 1);
  if (start.getTime() > startOfDay(last).getTime()) return 0;
  return countWorkdaysInclusive(start, last);
}

function totalWorkdaysThisMonth(now) {
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return countWorkdaysInclusive(first, lastDayOfMonth(now));
}

function lastFridayOfMonth(year, monthIndex) {
  const last = new Date(year, monthIndex + 1, 0);
  const mondayBased = (last.getDay() + 6) % 7;
  const daysBack = (mondayBased - 4 + 7) % 7;
  last.setDate(last.getDate() - daysBack);
  return startOfDay(last);
}

function nextPayday(now) {
  const today = startOfDay(now);
  let payday = lastFridayOfMonth(now.getFullYear(), now.getMonth());
  if (today.getTime() > payday.getTime()) {
    const monthIndex = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    payday = lastFridayOfMonth(year, monthIndex);
  }
  const days = Math.round((payday.getTime() - today.getTime()) / DAY_MS);
  return { date: payday, days };
}

function getIsoWeek(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

function getQuarterSnapshot(now) {
  const index = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), index * 3, 1);
  const end = new Date(now.getFullYear(), index * 3 + 3, 1);
  const progress = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - startOfDay(now).getTime()) / DAY_MS));
  return {
    index: index + 1,
    label: `T${index + 1}`,
    year: now.getFullYear(),
    progress: Math.max(0, Math.min(1, progress)),
    daysLeft,
  };
}

function weekStripStates(now) {
  const dow = now.getDay();
  return WORKDAY_LETTERS.map((letter, index) => {
    const dayNumber = index + 1;
    let state = 'future';
    if (dow === 0) {
      state = 'done';
    } else if (dow === 6) {
      state = 'done';
    } else if (dayNumber < dow) {
      state = 'done';
    } else if (dayNumber === dow) {
      state = remainingWorkMinutesToday(now) > 0 ? 'now' : 'done';
    }
    return { letter, state };
  });
}

function formatClock(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatPercent(fraction) {
  return `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
}

function formatDuration(totalMinutes) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest} m`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} m`;
}

function formatShortDate(date) {
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

function formatDays(days) {
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `${days} días`;
}

function getHorizonSnapshot(now) {
  const remainingToday = remainingWorkMinutesToday(now);
  const elapsedToday = elapsedWorkMinutesToday(now);
  const length = workdayLengthMinutes();
  const nextStart = nextWorkStart(now);
  const untilNextStart = minutesUntil(nextStart, now);
  const payday = nextPayday(now);
  const quarter = getQuarterSnapshot(now);
  const remainingWeekDays = remainingWorkdaysThisWeek(now);
  const remainingWeekMinutes = remainingWorkMinutesThisWeek(now);
  const remainingMonthDays = remainingWorkdaysThisMonth(now);
  const monthTotal = totalWorkdaysThisMonth(now);
  const monthDone = Math.max(0, monthTotal - remainingMonthDays);
  const monthProgress = monthTotal > 0 ? monthDone / monthTotal : 1;
  const weekCapacity = 5 * length;
  const weekProgress = weekCapacity > 0 ? 1 - remainingWeekMinutes / weekCapacity : 1;
  const dayProgress = remainingToday > 0 ? elapsedToday / length : isWorkday(now) ? 1 : 0;
  const weekend = !isWorkday(now) || remainingToday <= 0;
  const phase = remainingToday > 0
    ? (elapsedToday <= 0 ? 'before' : 'work')
    : (isWorkday(now) ? 'after' : 'weekend');
  const heroValue = remainingToday > 0 ? formatDuration(remainingToday) : formatDuration(untilNextStart);
  const heroLabel = remainingToday > 0
    ? (phase === 'before' ? 'Hasta el cierre' : 'Jornada restante')
    : (isWorkday(now) ? 'Hasta la próxima jornada' : 'Hasta el lunes');
  const heroColor = remainingToday > 0 ? COLORS.work : COLORS.weekend;
  return {
    remainingToday,
    elapsedToday,
    length,
    nextStart,
    untilNextStart,
    payday,
    quarter,
    remainingWeekDays,
    remainingWeekMinutes,
    remainingMonthDays,
    monthTotal,
    monthProgress,
    weekProgress,
    dayProgress,
    weekend,
    phase,
    heroValue,
    heroLabel,
    heroColor,
    isoWeek: getIsoWeek(now),
    strip: weekStripStates(now),
  };
}

function applyBackground(widget) {
  const gradient = new LinearGradient();
  gradient.colors = [new Color(COLORS.bgTop), new Color(COLORS.bgBottom)];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
}

function addGlyph(stack, symbolName, emoji, size, color) {
  try {
    const symbol = SFSymbol.named(symbolName);
    try {
      symbol.applyFont(Font.systemFont(size));
    } catch {}
    const image = stack.addImage(symbol.image);
    image.imageSize = new Size(size, size);
    image.tintColor = color;
  } catch {
    const label = stack.addText(emoji);
    label.font = Font.systemFont(size);
    label.textColor = color;
  }
}

function addProgressBar(parent, fraction, colorHex) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const track = parent.addStack();
  track.backgroundColor = new Color(COLORS.track, COLORS.trackAlpha);
  track.cornerRadius = 3;
  track.size = new Size(0, 6);
  const fill = track.addStack();
  fill.backgroundColor = new Color(colorHex);
  fill.cornerRadius = 3;
  fill.size = new Size(0, 6);
  fill.addSpacer(Math.round(clamped * 100));
  track.addSpacer(null);
}

function addCard(parent) {
  const card = parent.addStack();
  card.layoutVertically();
  card.backgroundColor = new Color(COLORS.card, COLORS.cardAlpha);
  card.cornerRadius = 10;
  card.setPadding(8, 10, 8, 10);
  return card;
}

function addMetricRow(parent, label, value, fraction, colorHex) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const nameLabel = row.addText(label);
  nameLabel.font = Font.mediumSystemFont(11);
  nameLabel.textColor = new Color(COLORS.text);
  row.addSpacer(null);
  const valueLabel = row.addText(value);
  valueLabel.font = Font.systemFont(11);
  valueLabel.textColor = new Color(colorHex);
  parent.addSpacer(4);
  addProgressBar(parent, fraction, colorHex);
}

function buildSmall(widget, now, snapshot) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  addGlyph(header, snapshot.weekend ? 'moon.zzz.fill' : 'briefcase.fill', snapshot.weekend ? '🌙' : '💼', 12, new Color(snapshot.heroColor));
  header.addSpacer(5);
  const title = header.addText('Horizonte');
  title.font = Font.mediumSystemFont(11);
  title.textColor = new Color(COLORS.muted);
  header.addSpacer(null);
  const clock = header.addText(formatClock(now));
  clock.font = Font.mediumSystemFont(11);
  clock.textColor = new Color(COLORS.muted);

  widget.addSpacer(8);
  const hero = widget.addText(snapshot.heroValue);
  hero.font = Font.boldSystemFont(26);
  hero.textColor = new Color(snapshot.heroColor);
  const subtitle = widget.addText(snapshot.heroLabel);
  subtitle.font = Font.systemFont(10);
  subtitle.textColor = new Color(COLORS.muted);

  widget.addSpacer(8);
  addProgressBar(widget, snapshot.weekend ? 1 - Math.min(1, snapshot.untilNextStart / (2.5 * 24 * 60)) : snapshot.dayProgress, snapshot.heroColor);

  widget.addSpacer(8);
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const quarterLabel = footer.addText(`${snapshot.quarter.label} ${formatPercent(snapshot.quarter.progress)}`);
  quarterLabel.font = Font.systemFont(10);
  quarterLabel.textColor = new Color(COLORS.quarter);
  footer.addSpacer(null);
  const paydayLabel = footer.addText(`Nómina ${formatDays(snapshot.payday.days)}`);
  paydayLabel.font = Font.systemFont(10);
  paydayLabel.textColor = new Color(COLORS.payday);
}

function buildMedium(widget, now, snapshot) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  addGlyph(header, 'briefcase.fill', '💼', 14, new Color(COLORS.work));
  header.addSpacer(6);
  const titleCol = header.addStack();
  titleCol.layoutVertically();
  const title = titleCol.addText('Horizonte laboral');
  title.font = Font.boldSystemFont(14);
  title.textColor = new Color(COLORS.text);
  const meta = titleCol.addText(`${WEEKDAY_LONG[now.getDay()]} · semana ${snapshot.isoWeek}`);
  meta.font = Font.systemFont(10);
  meta.textColor = new Color(COLORS.muted);
  header.addSpacer(null);
  const clock = header.addText(formatClock(now));
  clock.font = Font.boldSystemFont(18);
  clock.textColor = new Color(COLORS.text);

  widget.addSpacer(10);
  const columns = widget.addStack();
  columns.layoutHorizontally();

  const left = addCard(columns);
  const leftTitle = left.addText(snapshot.heroLabel);
  leftTitle.font = Font.systemFont(10);
  leftTitle.textColor = new Color(COLORS.muted);
  left.addSpacer(2);
  const leftValue = left.addText(snapshot.heroValue);
  leftValue.font = Font.boldSystemFont(18);
  leftValue.textColor = new Color(snapshot.heroColor);
  left.addSpacer(6);
  addProgressBar(left, snapshot.weekend ? Math.max(0, 1 - snapshot.untilNextStart / (3 * 24 * 60)) : snapshot.dayProgress, snapshot.heroColor);

  columns.addSpacer(8);

  const right = addCard(columns);
  const rightTitle = right.addText('Semana');
  rightTitle.font = Font.systemFont(10);
  rightTitle.textColor = new Color(COLORS.muted);
  right.addSpacer(2);
  const rightValue = right.addText(`${snapshot.remainingWeekDays} días`);
  rightValue.font = Font.boldSystemFont(18);
  rightValue.textColor = new Color(COLORS.week);
  right.addSpacer(2);
  const rightSub = right.addText(formatDuration(snapshot.remainingWeekMinutes));
  rightSub.font = Font.systemFont(10);
  rightSub.textColor = new Color(COLORS.muted);
  right.addSpacer(6);
  addProgressBar(right, snapshot.weekProgress, COLORS.week);

  widget.addSpacer(8);
  addMetricRow(widget, `${snapshot.quarter.label} ${snapshot.quarter.year}`, formatPercent(snapshot.quarter.progress), snapshot.quarter.progress, COLORS.quarter);
  widget.addSpacer(6);
  const paydayRow = widget.addStack();
  paydayRow.layoutHorizontally();
  paydayRow.centerAlignContent();
  const paydayName = paydayRow.addText('Nómina');
  paydayName.font = Font.mediumSystemFont(11);
  paydayName.textColor = new Color(COLORS.text);
  paydayRow.addSpacer(null);
  const paydayValue = paydayRow.addText(`${formatDays(snapshot.payday.days)} · ${formatShortDate(snapshot.payday.date)}`);
  paydayValue.font = Font.systemFont(11);
  paydayValue.textColor = new Color(COLORS.payday);
}

function buildLarge(widget, now, snapshot) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  addGlyph(header, 'briefcase.fill', '💼', 16, new Color(COLORS.work));
  header.addSpacer(8);
  const titleCol = header.addStack();
  titleCol.layoutVertically();
  const title = titleCol.addText('Horizonte laboral');
  title.font = Font.boldSystemFont(16);
  title.textColor = new Color(COLORS.text);
  const meta = titleCol.addText(`${WEEKDAY_LONG[now.getDay()]} ${now.getDate()} ${MONTH_SHORT[now.getMonth()]} · S${snapshot.isoWeek}`);
  meta.font = Font.systemFont(11);
  meta.textColor = new Color(COLORS.muted);
  header.addSpacer(null);
  const clock = header.addText(formatClock(now));
  clock.font = Font.boldSystemFont(22);
  clock.textColor = new Color(COLORS.text);

  widget.addSpacer(12);
  const heroCard = addCard(widget);
  const heroHead = heroCard.addStack();
  heroHead.layoutHorizontally();
  heroHead.centerAlignContent();
  const heroTitle = heroHead.addText(snapshot.heroLabel);
  heroTitle.font = Font.mediumSystemFont(12);
  heroTitle.textColor = new Color(COLORS.muted);
  heroHead.addSpacer(null);
  const phaseLabel = heroHead.addText(snapshot.phase === 'work' ? 'En jornada' : snapshot.phase === 'before' ? 'Antes de entrar' : snapshot.phase === 'after' ? 'Jornada cerrada' : 'Fin de semana');
  phaseLabel.font = Font.systemFont(11);
  phaseLabel.textColor = new Color(snapshot.heroColor);
  heroCard.addSpacer(4);
  const heroValue = heroCard.addText(snapshot.heroValue);
  heroValue.font = Font.boldSystemFont(28);
  heroValue.textColor = new Color(snapshot.heroColor);
  heroCard.addSpacer(8);
  addProgressBar(heroCard, snapshot.weekend ? Math.max(0, 1 - snapshot.untilNextStart / (3 * 24 * 60)) : snapshot.dayProgress, snapshot.heroColor);

  widget.addSpacer(10);
  const weekCard = addCard(widget);
  const weekHead = weekCard.addStack();
  weekHead.layoutHorizontally();
  weekHead.centerAlignContent();
  const weekTitle = weekHead.addText('Semana laboral');
  weekTitle.font = Font.mediumSystemFont(12);
  weekTitle.textColor = new Color(COLORS.text);
  weekHead.addSpacer(null);
  const weekMeta = weekHead.addText(`${snapshot.remainingWeekDays} días · ${formatDuration(snapshot.remainingWeekMinutes)}`);
  weekMeta.font = Font.systemFont(10);
  weekMeta.textColor = new Color(COLORS.week);
  weekCard.addSpacer(8);
  const strip = weekCard.addStack();
  strip.layoutHorizontally();
  snapshot.strip.forEach((cell, index) => {
    const chip = strip.addStack();
    chip.layoutHorizontally();
    chip.centerAlignContent();
    chip.setPadding(4, 8, 4, 8);
    chip.cornerRadius = 6;
    const active = cell.state === 'now';
    const done = cell.state === 'done';
    chip.backgroundColor = new Color(active ? COLORS.work : COLORS.card, active ? 0.22 : 0.06);
    const letter = chip.addText(cell.letter);
    letter.font = Font.boldSystemFont(12);
    letter.textColor = new Color(active ? COLORS.work : done ? COLORS.month : COLORS.faint);
    if (index < snapshot.strip.length - 1) strip.addSpacer(6);
  });
  weekCard.addSpacer(8);
  addProgressBar(weekCard, snapshot.weekProgress, COLORS.week);

  widget.addSpacer(10);
  addMetricRow(widget, `Mes · ${snapshot.remainingMonthDays} laborables`, formatPercent(snapshot.monthProgress), snapshot.monthProgress, COLORS.month);
  widget.addSpacer(8);
  addMetricRow(widget, `${snapshot.quarter.label} ${snapshot.quarter.year} · ${snapshot.quarter.daysLeft} días`, formatPercent(snapshot.quarter.progress), snapshot.quarter.progress, COLORS.quarter);

  widget.addSpacer(10);
  const paydayCard = addCard(widget);
  const paydayRow = paydayCard.addStack();
  paydayRow.layoutHorizontally();
  paydayRow.centerAlignContent();
  addGlyph(paydayRow, 'banknote.fill', '💶', 14, new Color(COLORS.payday));
  paydayRow.addSpacer(8);
  const paydayCol = paydayRow.addStack();
  paydayCol.layoutVertically();
  const paydayTitle = paydayCol.addText('Próxima nómina');
  paydayTitle.font = Font.mediumSystemFont(12);
  paydayTitle.textColor = new Color(COLORS.text);
  const paydaySub = paydayCol.addText(`Último viernes · ${WEEKDAY_SHORT[snapshot.payday.date.getDay()]} ${formatShortDate(snapshot.payday.date)}`);
  paydaySub.font = Font.systemFont(10);
  paydaySub.textColor = new Color(COLORS.muted);
  paydayRow.addSpacer(null);
  const paydayDays = paydayRow.addText(formatDays(snapshot.payday.days));
  paydayDays.font = Font.boldSystemFont(14);
  paydayDays.textColor = new Color(COLORS.payday);

  widget.addSpacer(10);
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const nextLabel = footer.addText(`Siguiente entrada ${formatClock(snapshot.nextStart)} · ${formatShortDate(snapshot.nextStart)}`);
  nextLabel.font = Font.systemFont(10);
  nextLabel.textColor = new Color(COLORS.faint);
  footer.addSpacer(null);
  const hint = footer.addText('Toca para abrir');
  hint.font = Font.systemFont(10);
  hint.textColor = new Color(COLORS.faint);
}

function buildWidget() {
  const now = new Date();
  const family = config.widgetFamily || 'medium';
  const snapshot = getHorizonSnapshot(now);
  const widget = new ListWidget();
  applyBackground(widget);
  widget.setPadding(14, 14, 14, 14);

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
  applyBackground(fallback);
  fallback.addSpacer();
  const errorLabel = fallback.addText('⚠️ Error en el widget');
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
  } catch {
    Script.setWidget(buildErrorWidget());
  }
  Script.complete();
}

await run();
