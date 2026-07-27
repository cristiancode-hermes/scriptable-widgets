const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

async function createWidget() {
  try {
    const widget = new ListWidget();
    const today = new Date();
    const dayName = WEEKDAY_NAMES[today.getDay()];
    const dayNumber = today.getDate();
    const monthName = MONTH_NAMES[today.getMonth()];
    const year = today.getFullYear();

    const events = await loadTodayEvents();
    const reminders = await loadAllReminders();

    if (config.widgetFamily === 'small') {
      buildSmallLayout(widget, dayName, dayNumber, monthName, events, reminders);
    } else if (config.widgetFamily === 'medium') {
      buildMediumLayout(widget, dayName, dayNumber, monthName, year, events, reminders);
    } else {
      buildLargeLayout(widget, dayName, dayNumber, monthName, year, events, reminders);
    }

    widget.url = 'scriptable:///open';
    return widget;
  } catch (err) {
    const fallback = new ListWidget();
    fallback.addSpacer();
    const msg = fallback.addText('Error al cargar el widget');
    msg.font = Font.systemFont(14);
    msg.textColor = new Color('#ff6b6b');
    msg.centerAlignText();
    fallback.addSpacer();
    return fallback;
  }
}

async function loadTodayEvents() {
  try {
    const calendars = await Calendar.forEvents();
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    const allEvents = [];

    for (const cal of calendars) {
      if (!cal.allowsContentModifications) continue;
      const calEvents = await CalendarEvent.between(startOfDay, endOfDay, [cal]);
      for (const ev of calEvents) {
        allEvents.push(ev);
      }
    }

    allEvents.sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return a.startDate - b.startDate;
    });
    return allEvents.slice(0, 8);
  } catch (err) {
    return [];
  }
}

async function loadAllReminders() {
  try {
    const lists = await Reminder.allLists();
    const allReminders = [];

    for (const list of lists) {
      const items = await Reminder.allDueToday([list]);
      for (const item of items) {
        if (item.isCompleted) continue;
        allReminders.push(item);
      }
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);

    allReminders.sort((a, b) => {
      const aDue = a.dueDate || todayStart;
      const bDue = b.dueDate || todayStart;
      return aDue - bDue;
    });
    return allReminders.slice(0, 12);
  } catch (err) {
    return [];
  }
}

function applyDarkGradient(widget, colors) {
  const gradient = new LinearGradient();
  gradient.locations = [0, 1];
  gradient.colors = colors.map(c => new Color(c));
  widget.backgroundGradient = gradient;
}

function buildSmallLayout(widget, dayName, dayNumber, monthName, events, reminders) {
  applyDarkGradient(widget, ['#0a192f', '#112240']);
  widget.setPadding(16, 16, 16, 16);

  const dayLabel = widget.addText(dayName.toUpperCase());
  dayLabel.font = Font.boldSystemFont(11);
  dayLabel.textColor = new Color('#64ffda');
  dayLabel.lineLimit = 1;

  const dateLabel = widget.addText(`${dayNumber}`);
  dateLabel.font = Font.boldSystemFont(36);
  dateLabel.textColor = new Color('#ffffff');

  const monthLabel = widget.addText(monthName);
  monthLabel.font = Font.systemFont(13);
  monthLabel.textColor = new Color('#8892b0');
  monthLabel.lineLimit = 1;

  widget.addSpacer(8);

  const divider = widget.addText('─'.repeat(10));
  divider.font = Font.systemFont(8);
  divider.textColor = new Color('#64ffda', 0.3);
  divider.lineLimit = 1;

  widget.addSpacer(6);

  const eventRow = widget.addStack();
  eventRow.layoutHorizontally();
  eventRow.addSpacer(2);
  const eventDot = eventRow.addText('●');
  eventDot.font = Font.systemFont(10);
  eventDot.textColor = new Color('#64ffda');
  eventRow.addSpacer(4);
  const eventCount = eventRow.addText(`${events.length}`);
  eventCount.font = Font.boldSystemFont(14);
  eventCount.textColor = new Color('#ffffff');
  const eventLabel = eventRow.addText(' eventos');
  eventLabel.font = Font.systemFont(10);
  eventLabel.textColor = new Color('#8892b0');

  const remRow = widget.addStack();
  remRow.layoutHorizontally();
  remRow.addSpacer(2);
  const remDot = remRow.addText('○');
  remDot.font = Font.systemFont(10);
  remDot.textColor = new Color('#ff6b6b');
  remRow.addSpacer(4);
  const remCount = remRow.addText(`${reminders.length}`);
  remCount.font = Font.boldSystemFont(14);
  remCount.textColor = new Color('#ffffff');
  const remLabel = remRow.addText(' pendientes');
  remLabel.font = Font.systemFont(10);
  remLabel.textColor = new Color('#8892b0');
}

function buildMediumLayout(widget, dayName, dayNumber, monthName, year, events, reminders) {
  applyDarkGradient(widget, ['#0a192f', '#112240', '#1a1a2e']);
  widget.setPadding(16, 20, 16, 20);

  const mainStack = widget.addStack();
  mainStack.layoutHorizontally();

  const leftCol = mainStack.addStack();
  leftCol.layoutVertically();

  const dayLabel = leftCol.addText(dayName.toUpperCase());
  dayLabel.font = Font.boldSystemFont(12);
  dayLabel.textColor = new Color('#64ffda');
  dayLabel.lineLimit = 1;

  const dateLabel = leftCol.addText(`${dayNumber}`);
  dateLabel.font = Font.boldSystemFont(48);
  dateLabel.textColor = new Color('#ffffff');
  dateLabel.lineLimit = 1;

  const monthYearLabel = leftCol.addText(`${monthName} ${year}`);
  monthYearLabel.font = Font.systemFont(13);
  monthYearLabel.textColor = new Color('#8892b0');
  monthYearLabel.lineLimit = 1;

  leftCol.addSpacer(8);

  const todayReminders = reminders.filter(r => {
    if (!r.dueDate) return false;
    const today = new Date();
    return r.dueDate.getDate() === today.getDate() &&
           r.dueDate.getMonth() === today.getMonth() &&
           r.dueDate.getFullYear() === today.getFullYear();
  });

  for (const rem of todayReminders.slice(0, 3)) {
    const remItem = leftCol.addStack();
    remItem.layoutHorizontally();
    const dot = remItem.addText('· ');
    dot.font = Font.systemFont(10);
    dot.textColor = new Color('#ff6b6b');
    const title = remItem.addText(rem.title || 'Recordatorio');
    title.font = Font.systemFont(10);
    title.textColor = new Color('#ccd6f6');
    title.lineLimit = 1;
  }

  if (todayReminders.length === 0) {
    const emptyMsg = leftCol.addText('Sin recordatorios pendientes');
    emptyMsg.font = Font.systemFont(10);
    emptyMsg.textColor = new Color('#495670');
  }

  mainStack.addSpacer(12);

  const divider = mainStack.addText('│');
  divider.font = Font.systemFont(48);
  divider.textColor = new Color('#64ffda', 0.25);

  mainStack.addSpacer(12);

  const rightCol = mainStack.addStack();
  rightCol.layoutVertically();

  const eventsHeader = rightCol.addText('EVENTOS');
  eventsHeader.font = Font.boldSystemFont(9);
  eventsHeader.textColor = new Color('#64ffda');

  rightCol.addSpacer(4);

  if (events.length === 0) {
    const noEvents = rightCol.addText('Sin eventos programados');
    noEvents.font = Font.systemFont(10);
    noEvents.textColor = new Color('#495670');
  }

  const timeFormatter = new DateFormatter();
  timeFormatter.useShortTimeFormat();

  for (const ev of events.slice(0, 4)) {
    const evItem = rightCol.addStack();
    evItem.layoutHorizontally();

    const timeStr = ev.startDate ? timeFormatter.string(ev.startDate) : '--:--';
    const timeLabel = evItem.addText(timeStr);
    timeLabel.font = Font.systemFont(9);
    timeLabel.textColor = new Color('#64ffda', 0.8);
    timeLabel.lineLimit = 1;

    evItem.addSpacer(6);

    const evTitle = evItem.addText(ev.title || 'Sin título');
    evTitle.font = Font.systemFont(10);
    evTitle.textColor = new Color('#ccd6f6');
    evTitle.lineLimit = 1;

    rightCol.addSpacer(3);
  }
}

function buildLargeLayout(widget, dayName, dayNumber, monthName, year, events, reminders) {
  applyDarkGradient(widget, ['#0a192f', '#112240', '#1a1a2e']);
  widget.setPadding(20, 24, 16, 24);

  const headerRow = widget.addStack();
  headerRow.layoutHorizontally();

  const dateCol = headerRow.addStack();
  dateCol.layoutVertically();
  const dayLabel = dateCol.addText(dayName.toUpperCase());
  dayLabel.font = Font.boldSystemFont(14);
  dayLabel.textColor = new Color('#64ffda');
  const dateBig = dateCol.addText(`${dayNumber} ${monthName} ${year}`);
  dateBig.font = Font.boldSystemFont(26);
  dateBig.textColor = new Color('#ffffff');

  headerRow.addSpacer();

  const rightBadge = headerRow.addStack();
  rightBadge.layoutVertically();
  rightBadge.setPadding(6, 0, 0, 0);

  const eventsBadge = rightBadge.addText(`📅 ${events.length} eventos`);
  eventsBadge.font = Font.systemFont(11);
  eventsBadge.textColor = new Color('#64ffda');

  const remindersBadge = rightBadge.addText(`✓ ${reminders.length} pendientes`);
  remindersBadge.font = Font.systemFont(11);
  remindersBadge.textColor = new Color('#ff6b6b');

  widget.addSpacer(10);

  const mainDivider = widget.addText('─'.repeat(42));
  mainDivider.font = Font.systemFont(8);
  mainDivider.textColor = new Color('#64ffda', 0.2);
  mainDivider.lineLimit = 1;

  widget.addSpacer(10);

  const contentRow = widget.addStack();
  contentRow.layoutHorizontally();

  const leftPanel = contentRow.addStack();
  leftPanel.layoutVertically();

  const eventsTitle = leftPanel.addText('EVENTOS DE HOY');
  eventsTitle.font = Font.boldSystemFont(10);
  eventsTitle.textColor = new Color('#64ffda');
  eventsTitle.lineLimit = 1;

  leftPanel.addSpacer(6);

  if (events.length === 0) {
    const noEv = leftPanel.addText('No hay eventos programados para hoy');
    noEv.font = Font.systemFont(10);
    noEv.textColor = new Color('#495670');
    noEv.lineLimit = 1;
  }

  const timeFormatter = new DateFormatter();
  timeFormatter.useShortTimeFormat();

  for (const ev of events.slice(0, 5)) {
    const evItem = leftPanel.addStack();
    evItem.layoutHorizontally();

    const timeStr = ev.startDate ? timeFormatter.string(ev.startDate) : '--:--';
    const timeLabel = evItem.addText(timeStr);
    timeLabel.font = Font.systemFont(10);
    timeLabel.textColor = new Color('#64ffda', 0.8);
    timeLabel.lineLimit = 1;
    timeLabel.size = new Size(42, 0);

    evItem.addSpacer(6);

    const evName = evItem.addText(ev.title || 'Sin título');
    evName.font = Font.systemFont(11);
    evName.textColor = new Color('#ccd6f6');
    evName.lineLimit = 1;

    leftPanel.addSpacer(4);
  }

  contentRow.addSpacer(8);

  const midDivider = contentRow.addText('│');
  midDivider.font = Font.systemFont(56);
  midDivider.textColor = new Color('#64ffda', 0.15);
  midDivider.lineLimit = 1;

  contentRow.addSpacer(8);

  const rightPanel = contentRow.addStack();
  rightPanel.layoutVertically();

  const remTitle = rightPanel.addText('RECORDATORIOS');
  remTitle.font = Font.boldSystemFont(10);
  remTitle.textColor = new Color('#ff6b6b');
  remTitle.lineLimit = 1;

  rightPanel.addSpacer(6);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const dueReminders = reminders.filter(r => {
    if (!r.dueDate) return false;
    return r.dueDate >= todayStart;
  });

  const overdueReminders = reminders.filter(r => {
    if (!r.dueDate) return false;
    return r.dueDate < todayStart;
  });

  if (dueReminders.length === 0 && overdueReminders.length === 0) {
    const noRem = rightPanel.addText('No hay recordatorios pendientes');
    noRem.font = Font.systemFont(10);
    noRem.textColor = new Color('#495670');
    noRem.lineLimit = 1;
  }

  if (overdueReminders.length > 0) {
    const overdueHeader = rightPanel.addText(`⚠ ${overdueReminders.length} vencidos`);
    overdueHeader.font = Font.boldSystemFont(9);
    overdueHeader.textColor = new Color('#ff6b6b');
    overdueHeader.lineLimit = 1;
    rightPanel.addSpacer(2);

    for (const rem of overdueReminders.slice(0, 2)) {
      const remItem = rightPanel.addStack();
      remItem.layoutHorizontally();
      const cross = remItem.addText('✗ ');
      cross.font = Font.systemFont(10);
      cross.textColor = new Color('#ff6b6b');
      const rTitle = remItem.addText(rem.title || 'Sin título');
      rTitle.font = Font.systemFont(10);
      rTitle.textColor = new Color('#ff6b6b', 0.7);
      rTitle.lineLimit = 1;
      rightPanel.addSpacer(2);
    }
    rightPanel.addSpacer(4);
  }

  for (const rem of dueReminders.slice(0, 4)) {
    const remItem = rightPanel.addStack();
    remItem.layoutHorizontally();
    const check = remItem.addText('○ ');
    check.font = Font.systemFont(10);
    check.textColor = new Color('#64ffda');
    const rTitle = remItem.addText(rem.title || 'Sin título');
    rTitle.font = Font.systemFont(10);
    rTitle.textColor = new Color('#ccd6f6');
    rTitle.lineLimit = 1;
    rightPanel.addSpacer(3);
  }

  widget.addSpacer(8);

  const footerRow = widget.addStack();
  footerRow.layoutHorizontally();
  footerRow.addSpacer();
  const footerText = footerRow.addText('Toque para abrir en Scriptable');
  footerText.font = Font.systemFont(8);
  footerText.textColor = new Color('#495670');
  footerText.lineLimit = 1;
  footerRow.addSpacer();
}

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
  Script.complete();
} else {
  widget.presentMedium();
}
