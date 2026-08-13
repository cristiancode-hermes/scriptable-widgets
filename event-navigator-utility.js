const THEME = {
  bgTop: '#0E1428',
  bgBottom: '#1B2440',
  surface: '#1E2746',
  text: '#F2F4FA',
  textMuted: '#9AA3C0',
  accent: '#5E9BFF',
  success: '#34C759',
};

const CONFIG = {
  maxEventsPerDay: 6,
  refreshMinutes: 15,
  reminderOffsets: [5, 15, 30, 60],
  retryMinutes: 10,
};

const EVENT_DOTS = ['🔵', '🟣', '🟠', '🟢', '🔴', '🟡'];

const CATEGORY_LINKS = [
  { name: '🍽️ Restaurantes', query: 'Restaurants near me' },
  { name: '☕ Cafés', query: 'Cafes near me' },
  { name: '🛍️ Compras', query: 'Shopping near me' },
  { name: '🏥 Salud', query: 'Pharmacy hospital near me' },
  { name: '⛽ Gasolinera', query: 'Gas station near me' },
  { name: '🏨 Hoteles', query: 'Hotels near me' },
  { name: '🌳 Parques', query: 'Parks near me' },
  { name: '🚇 Transporte', query: 'Transit station near me' },
  { name: '🎬 Ocio', query: 'Movies theater near me' },
  { name: '📚 Educación', query: 'Library near me' },
];

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function tomorrowStart(date) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + 1);
  return copy;
}

function formatTime(date) {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatTimeRange(event) {
  if (event.isAllDay) return 'Todo el día';
  return `${formatTime(event.startDate)} – ${formatTime(event.endDate)}`;
}

function formatCountdown(target) {
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return 'ahora';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) return remainder > 0 ? `${hours} h ${remainder} m` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d ${hours % 24} h`;
}

function eventLocation(event) {
  return (event.location || '').trim();
}

function calendarDot(event) {
  const calendarName = (event.calendar && event.calendar.title) || '';
  let hash = 0;
  for (let i = 0; i < calendarName.length; i++) {
    hash = calendarName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return EVENT_DOTS[Math.abs(hash) % EVENT_DOTS.length];
}

function eventSubtitle(event) {
  const parts = [formatTimeRange(event)];
  const location = eventLocation(event);
  if (location) parts.push(location);
  return parts.join(' · ');
}

function eventBodyText(event) {
  const lines = [formatTimeRange(event)];
  const location = eventLocation(event);
  if (location) lines.push(location);
  const notes = (event.notes || '').trim();
  if (notes) lines.push(notes);
  return lines.join('\n');
}

function coordinateLabel(latitude, longitude) {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lngDir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(6)}° ${latDir}, ${Math.abs(longitude).toFixed(6)}° ${lngDir}`;
}

function makeGradient() {
  const gradient = new LinearGradient();
  gradient.colors = [new Color(THEME.bgTop), new Color(THEME.bgBottom)];
  gradient.locations = [0, 1];
  return gradient;
}

async function loadEvents(rangeStart, rangeEnd) {
  try {
    const events = await CalendarEvent.between(rangeStart, rangeEnd);
    return events
      .filter(event => event.startDate && event.startDate.getTime() >= rangeStart.getTime())
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, CONFIG.maxEventsPerDay);
  } catch (error) {
    return [];
  }
}

async function currentLocation() {
  try {
    Location.setAccuracyToThreeKilometers();
    return await Location.current();
  } catch (error) {
    const alert = new Alert();
    alert.title = '📍 Ubicación no disponible';
    alert.message = 'Concede acceso a la ubicación en Ajustes > Scriptable para usar esta función.';
    alert.addAction('OK');
    await alert.present();
    return null;
  }
}

async function reverseGeocodeLabel(latitude, longitude) {
  try {
    const results = await Location.reverseGeocode(latitude, longitude, 'es');
    if (results && results.length > 0) {
      const placemark = results[0];
      const parts = [];
      if (placemark.subThoroughfare) parts.push(placemark.subThoroughfare);
      if (placemark.thoroughfare) parts.push(placemark.thoroughfare);
      if (placemark.locality) parts.push(placemark.locality);
      if (placemark.administrativeArea) parts.push(placemark.administrativeArea);
      if (placemark.postalCode) parts.push(placemark.postalCode);
      if (placemark.country) parts.push(placemark.country);
      return parts.join(', ') || 'Dirección desconocida';
    }
    return 'Dirección no encontrada';
  } catch (error) {
    return 'Geocodificación fallida';
  }
}

async function showError(error) {
  const alert = new Alert();
  alert.title = '⚠️ Error';
  alert.message = error && error.message ? error.message : 'Algo salió mal.';
  alert.addAction('OK');
  await alert.present();
}

async function scheduleReminder(event) {
  if (!event.startDate) {
    await showError(new Error('El evento no tiene fecha de inicio.'));
    return;
  }
  const picker = new Alert();
  picker.title = '🔔 Recordatorio';
  picker.message = '¿Cuánto antes quieres que te avise?';
  for (const minutes of CONFIG.reminderOffsets) picker.addAction(`⏱️ ${minutes} min`);
  picker.addCancelAction('✖️ Cancelar');
  const choice = await picker.present();
  if (choice < 0 || choice >= CONFIG.reminderOffsets.length) return;
  const offsetMinutes = CONFIG.reminderOffsets[choice];
  const triggerDate = new Date(event.startDate.getTime() - offsetMinutes * 60000);
  const notification = new Notification();
  notification.title = `🔔 ${event.title || 'Evento'}`;
  const location = eventLocation(event);
  notification.body = `Empieza en ${offsetMinutes} min${location ? ' · ' + location : ''}`;
  notification.sound = 'default';
  notification.scriptName = Script.name();
  notification.setTriggerDate(triggerDate);
  await notification.schedule();
  const done = new Alert();
  done.title = '✅ Recordatorio programado';
  done.message = `${event.title || 'Evento'} a las ${formatTime(event.startDate)} (aviso ${offsetMinutes} min antes)`;
  done.addAction('OK');
  await done.present();
}

function shareEvent(event) {
  ShareSheet.open([`${event.title || 'Evento'}`, eventBodyText(event)]);
}

async function presentEventActions(event) {
  const location = eventLocation(event);
  const actions = [];
  if (location) actions.push({ label: '🗺️ Indicaciones en Mapas', run: () => Maps.search(location) });
  actions.push({ label: '🔔 Recordatorio antes', run: () => scheduleReminder(event) });
  if (location) actions.push({ label: '📋 Copiar dirección', run: () => Pasteboard.copy(location) });
  actions.push({ label: '📤 Compartir evento', run: () => shareEvent(event) });
  actions.push({ label: '✉️ Enviar por Mail', run: () => Mail.open({ subject: event.title || 'Evento', body: eventBodyText(event) }) });
  const alert = new Alert();
  alert.title = `${calendarDot(event)} ${event.title || 'Sin título'}`;
  alert.message = `${formatTimeRange(event)}${location ? '\n' + location : ''}`;
  for (const action of actions) alert.addAction(action.label);
  alert.addCancelAction('✖️ Cerrar');
  const choice = await alert.presentSheet();
  if (choice >= 0 && choice < actions.length) {
    try {
      await actions[choice].run();
    } catch (error) {
      await showError(error);
    }
  }
}

function addEventsSection(table, title, events) {
  const section = new UITableSection(title);
  table.addSection(section);
  if (events.length === 0) {
    const emptyRow = new UITableRow();
    emptyRow.height = 48;
    emptyRow.addText('🎉 Sin eventos', 'Nada programado');
    section.addRow(emptyRow);
    return;
  }
  for (const event of events) {
    const row = new UITableRow();
    row.dismissOnSelect = false;
    row.height = 60;
    const mainCell = row.addText(`${calendarDot(event)} ${event.title || 'Sin título'}`, eventSubtitle(event));
    mainCell.widthWeight = 74;
    mainCell.titleColor = new Color(THEME.text);
    mainCell.subtitleColor = new Color(THEME.textMuted);
    const timeCell = row.addText(formatCountdown(event.startDate), '');
    timeCell.widthWeight = 26;
    timeCell.titleColor = new Color(THEME.accent);
    row.onSelect = () => presentEventActions(event);
    section.addRow(row);
  }
}

async function showCurrentLocation() {
  const location = await currentLocation();
  if (!location) return;
  const address = await reverseGeocodeLabel(location.latitude, location.longitude);
  const alert = new Alert();
  alert.title = '📍 Mi ubicación';
  alert.message = `${address}\n\n${coordinateLabel(location.latitude, location.longitude)}`;
  alert.addAction('🗺️ Abrir en Mapas');
  alert.addAction('📋 Copiar coordenadas');
  alert.addAction('📤 Compartir');
  alert.addCancelAction('✖️ Cerrar');
  const choice = await alert.presentSheet();
  if (choice === 0) Maps.openMaps(location.latitude, location.longitude);
  else if (choice === 1) Pasteboard.copy(coordinateLabel(location.latitude, location.longitude));
  else if (choice === 2) ShareSheet.open([address, coordinateLabel(location.latitude, location.longitude)]);
}

async function showNearbyCategories() {
  const table = new UITable();
  const section = new UITableSection('🧭 Buscar cerca');
  table.addSection(section);
  for (const category of CATEGORY_LINKS) {
    const row = new UITableRow();
    row.dismissOnSelect = true;
    row.height = 52;
    row.addText(category.name, 'Abrir en Mapas');
    row.onSelect = () => Maps.search(category.query);
    section.addRow(row);
  }
  await table.present();
}

async function openCalendarApp() {
  try {
    Safari.open('calshow://');
  } catch (error) {
    await showError(error);
  }
}

function addActionRow(section, title, subtitle, handler) {
  const row = new UITableRow();
  row.dismissOnSelect = false;
  row.height = 56;
  row.addText(title, subtitle);
  row.onSelect = handler;
  section.addRow(row);
}

async function presentMainTable() {
  const now = new Date();
  const todayEvents = await loadEvents(now, endOfDay(now));
  const tomorrowEvents = await loadEvents(tomorrowStart(now), endOfDay(tomorrowStart(now)));
  const table = new UITable();
  const header = new UITableSection('⏭️ Event Navigator');
  table.addSection(header);
  const titleRow = new UITableRow();
  titleRow.height = 44;
  titleRow.addText('🗓️ Navega a tu próximo evento', 'Calendar · Mapas · Recordatorios');
  header.addRow(titleRow);
  addEventsSection(table, `⏭️ Hoy · ${todayEvents.length} evento${todayEvents.length === 1 ? '' : 's'}`, todayEvents);
  addEventsSection(table, `🌅 Mañana · ${tomorrowEvents.length} evento${tomorrowEvents.length === 1 ? '' : 's'}`, tomorrowEvents);
  const actionSection = new UITableSection('⚡ Acciones');
  table.addSection(actionSection);
  addActionRow(actionSection, '📍 Mi ubicación', 'Obtener dirección y abrir en Mapas', showCurrentLocation);
  addActionRow(actionSection, '🧭 Buscar cerca', 'Restaurantes, cafés, farmacias…', showNearbyCategories);
  addActionRow(actionSection, '🗓️ Abrir Calendario', 'Ir a la app Calendario', openCalendarApp);
  await table.present();
}

function buildSmall(widget, events) {
  const next = events[0];
  if (!next) {
    widget.addText('📅');
    widget.addSpacer(4);
    const empty = widget.addText('Sin eventos hoy');
    empty.font = Font.systemFont(12);
    empty.textColor = new Color(THEME.textMuted);
    return;
  }
  widget.addText('📅');
  widget.addSpacer(6);
  const countdown = widget.addText(formatCountdown(next.startDate));
  countdown.font = Font.boldSystemFont(24);
  countdown.textColor = new Color(THEME.accent);
  widget.addSpacer(4);
  const title = widget.addText(next.title || 'Evento');
  title.font = Font.mediumSystemFont(13);
  title.textColor = new Color(THEME.text);
  widget.addSpacer(4);
  const time = widget.addText(formatTimeRange(next));
  time.font = Font.systemFont(11);
  time.textColor = new Color(THEME.textMuted);
}

function addNextEventCard(parent, event) {
  const card = parent.addStack();
  card.layoutHorizontally();
  card.centerAlignContent();
  card.backgroundColor = new Color('#FFFFFF', 0.07);
  card.cornerRadius = 10;
  card.setPadding(8, 12, 8, 12);
  const dot = card.addText(calendarDot(event));
  dot.font = Font.systemFont(18);
  card.addSpacer(10);
  const info = card.addStack();
  info.layoutVertically();
  const title = info.addText(event.title || 'Evento');
  title.font = Font.mediumSystemFont(14);
  title.textColor = new Color(THEME.text);
  const meta = info.addText(eventSubtitle(event));
  meta.font = Font.systemFont(10);
  meta.textColor = new Color(THEME.textMuted);
  card.addSpacer(null);
  const countdown = card.addText(formatCountdown(event.startDate));
  countdown.font = Font.boldSystemFont(15);
  countdown.textColor = new Color(THEME.accent);
}

function addCompactRow(parent, event, showLocation) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = new Color('#FFFFFF', 0.05);
  row.cornerRadius = 8;
  row.setPadding(5, 9, 5, 9);
  const dot = row.addText(calendarDot(event));
  dot.font = Font.systemFont(12);
  row.addSpacer(8);
  const column = row.addStack();
  column.layoutVertically();
  const title = column.addText(event.title || 'Evento');
  title.font = Font.mediumSystemFont(12);
  title.textColor = new Color(THEME.text);
  const location = eventLocation(event);
  const subtitle = column.addText(showLocation && location ? `${formatTime(event.startDate)} · ${location}` : formatTime(event.startDate));
  subtitle.font = Font.systemFont(9);
  subtitle.textColor = new Color(THEME.textMuted);
  row.addSpacer(null);
  const timeLeft = row.addText(formatCountdown(event.startDate));
  timeLeft.font = Font.boldSystemFont(11);
  timeLeft.textColor = new Color(THEME.accent);
}

function buildMedium(widget, events) {
  const header = widget.addText('📅 Agenda de hoy');
  header.font = Font.boldSystemFont(14);
  header.textColor = new Color(THEME.text);
  widget.addSpacer(8);
  if (events.length === 0) {
    const empty = widget.addText('🎉 Sin eventos programados');
    empty.font = Font.systemFont(12);
    empty.textColor = new Color(THEME.textMuted);
    return;
  }
  addNextEventCard(widget, events[0]);
  widget.addSpacer(8);
  for (const event of events.slice(1, 3)) {
    addCompactRow(widget, event, false);
    widget.addSpacer(5);
  }
}

function buildLarge(widget, events) {
  const header = widget.addText('📅 Agenda de hoy');
  header.font = Font.boldSystemFont(16);
  header.textColor = new Color(THEME.text);
  widget.addSpacer(10);
  if (events.length === 0) {
    const empty = widget.addText('🎉 Sin eventos programados');
    empty.font = Font.systemFont(13);
    empty.textColor = new Color(THEME.textMuted);
    return;
  }
  addNextEventCard(widget, events[0]);
  widget.addSpacer(10);
  for (const event of events.slice(1, 5)) {
    addCompactRow(widget, event, true);
    widget.addSpacer(6);
  }
}

async function renderWidget() {
  const now = new Date();
  const events = await loadEvents(now, endOfDay(now));
  const widget = new ListWidget();
  widget.backgroundGradient = makeGradient();
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  const family = config.widgetFamily;
  if (family === 'small') buildSmall(widget, events);
  else if (family === 'medium') buildMedium(widget, events);
  else buildLarge(widget, events);
  Script.setWidget(widget);
}

async function main() {
  if (config.runsInWidget) {
    await renderWidget();
  } else {
    await presentMainTable();
  }
}

try {
  await main();
} catch (error) {
  if (config.runsInWidget) {
    const fallback = new ListWidget();
    fallback.backgroundGradient = makeGradient();
    const warning = fallback.addText('⚠️ Error');
    warning.font = Font.boldSystemFont(16);
    warning.textColor = new Color(THEME.text);
    fallback.addSpacer(4);
    const retry = fallback.addText('Toca para reintentar');
    retry.font = Font.systemFont(12);
    retry.textColor = new Color(THEME.textMuted);
    fallback.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
    fallback.refreshAfterDate = new Date(Date.now() + CONFIG.retryMinutes * 60000);
    Script.setWidget(fallback);
  } else {
    await showError(error);
  }
}
Script.complete();
