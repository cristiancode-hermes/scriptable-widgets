const STORE_FILE = 'on-my-way-relay.json';

const C = {
  bgTop: new Color('#07141A'),
  bgBottom: new Color('#12323A'),
  surface: new Color('#ffffff', 0.07),
  surfaceHot: new Color('#3EE0C4', 0.18),
  surfaceWarn: new Color('#FFB020', 0.18),
  text: new Color('#EEF7F6'),
  textMuted: new Color('#8AA3A8'),
  accent: new Color('#3EE0C4'),
  warning: new Color('#FFB020'),
  danger: new Color('#FF6B57'),
  success: new Color('#4ADE80'),
  track: new Color('#1C343C'),
};

const CONFIG = {
  refreshMinutes: 15,
  retryMinutes: 8,
  maxTrips: 40,
  maxDestinations: 24,
  urbanKmh: 30,
  earthRadiusKm: 6371,
};

class Destination {
  constructor(name, address, latitude, longitude, phone) {
    this.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.name = name;
    this.address = address || '';
    this.latitude = typeof latitude === 'number' ? latitude : null;
    this.longitude = typeof longitude === 'number' ? longitude : null;
    this.phone = phone || '';
    this.createdAt = new Date().toISOString();
    this.visitCount = 0;
    this.lastUsedAt = null;
  }
}

class Trip {
  constructor(destinationId, destinationName, etaMinutes, address) {
    this.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.destinationId = destinationId || '';
    this.destinationName = destinationName;
    this.address = address || '';
    this.startedAt = new Date().toISOString();
    this.etaMinutes = etaMinutes || 0;
    this.status = 'en-camino';
  }
}

class AppState {
  constructor() {
    this.destinations = [];
    this.trips = [];
    this.lastCheckIn = null;
    this.notificationsEnabled = true;
  }
}

const Store = {
  _fm: FileManager.local(),

  get path() {
    return this._fm.joinPath(this._fm.documentsDirectory(), STORE_FILE);
  },

  load() {
    try {
      if (this._fm.fileExists(this.path)) {
        const parsed = JSON.parse(this._fm.readString(this.path));
        if (parsed && Array.isArray(parsed.destinations) && Array.isArray(parsed.trips)) {
          return parsed;
        }
      }
    } catch (error) {}
    return new AppState();
  },

  save(data) {
    try {
      this._fm.writeString(this.path, JSON.stringify(data));
      return true;
    } catch (error) {
      return false;
    }
  },
};

function pad2(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateKey(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function prettyTime(date) {
  return pad2(date.getHours()) + ':' + pad2(date.getMinutes());
}

function prettyStamp(iso) {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return pad2(date.getDate()) + '/' + pad2(date.getMonth() + 1) + ' ' + prettyTime(date);
  } catch (error) {
    return '—';
  }
}

function todayTrips(state) {
  const today = dateKey(new Date());
  return (state.trips || []).filter((trip) => {
    try {
      return dateKey(new Date(trip.startedAt)) === today;
    } catch (error) {
      return false;
    }
  });
}

function latestTrip(state) {
  const list = state.trips || [];
  return list.length ? list[0] : null;
}

function sortedDestinations(state) {
  return (state.destinations || []).slice().sort((a, b) => {
    const ta = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
    const tb = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
    return tb - ta;
  });
}

function toRad(degrees) {
  return degrees * Math.PI / 180;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  try {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return CONFIG.earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  } catch (error) {
    return 0;
  }
}

function etaMinutesForKm(km) {
  if (!km || km <= 0) return 8;
  return Math.max(4, Math.round((km / CONFIG.urbanKmh) * 60));
}

function formatKm(km) {
  if (km < 1) return Math.round(km * 1000) + ' m';
  return km.toFixed(1) + ' km';
}

function formatEta(minutes) {
  if (minutes < 60) return minutes + ' min';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? hours + ' h ' + rest + ' m' : hours + ' h';
}

function coordinateLabel(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return Math.abs(lat).toFixed(5) + '° ' + latDir + ', ' + Math.abs(lng).toFixed(5) + '° ' + lngDir;
}

function appleMapsLink(lat, lng, query) {
  const label = query ? encodeURIComponent(query) : lat + ',' + lng;
  return 'https://maps.apple.com/?ll=' + lat + ',' + lng + '&q=' + label;
}

function destinationLine(destination) {
  const extra = destination.address ? ' · ' + destination.address : '';
  return destination.name + extra;
}

function checkInLine(checkIn) {
  if (!checkIn) return 'Sin check-in';
  const where = checkIn.address || coordinateLabel(checkIn.latitude, checkIn.longitude);
  return prettyStamp(checkIn.at) + ' · ' + where;
}

async function currentLocation() {
  try {
    return await Location.current();
  } catch (error) {
    return null;
  }
}

async function reverseAddress(lat, lng) {
  try {
    const results = await Location.reverseGeocode(lat, lng, 'es');
    if (results && results.length > 0) {
      const place = results[0];
      const parts = [
        place.subThoroughfare,
        place.thoroughfare,
        place.locality,
        place.administrativeArea,
        place.postalCode,
        place.country,
      ].filter((part) => part);
      return parts.join(', ') || 'Dirección desconocida';
    }
  } catch (error) {}
  return 'Sin geocodificar';
}

function distanceFromCheckIn(state, destination) {
  const checkIn = state.lastCheckIn;
  if (!checkIn || destination.latitude == null || destination.longitude == null) return null;
  return haversineKm(checkIn.latitude, checkIn.longitude, destination.latitude, destination.longitude);
}

async function openMapsForDestination(destination) {
  try {
    if (destination.latitude != null && destination.longitude != null) {
      Maps.openMaps(destination.latitude, destination.longitude);
      return;
    }
    if (destination.address) {
      Maps.search(destination.address);
      return;
    }
    Maps.search(destination.name);
  } catch (error) {}
}

async function sendMessage(phone, body) {
  try {
    if (phone) {
      await Messages.send({ recipients: [phone], body: body });
    } else {
      await Messages.send({ recipients: [], body: body });
    }
  } catch (error) {}
}

async function openMail(subject, body) {
  try {
    await Mail.open({ subject: subject, body: body });
  } catch (error) {}
}

async function shareItems(items) {
  try {
    await ShareSheet.open(items);
  } catch (error) {}
}

async function copyText(text) {
  try {
    Pasteboard.copy(text);
  } catch (error) {}
}

async function scheduleArrivalPing(destination, etaMinutes) {
  try {
    const notification = new Notification();
    notification.title = '🚗 Llegada: ' + destination.name;
    notification.body = 'ETA ' + formatEta(etaMinutes) + (destination.address ? ' · ' + destination.address : '');
    notification.sound = 'default';
    notification.scriptName = Script.name();
    notification.setTriggerDate(new Date(Date.now() + etaMinutes * 60 * 1000));
    await notification.schedule();
  } catch (error) {}
}

function buildWidgetBase() {
  const widget = new ListWidget();
  const gradient = new LinearGradient();
  gradient.colors = [C.bgTop, C.bgBottom];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60 * 1000);
  return widget;
}

function addChip(parent, label, color, background) {
  const chip = parent.addStack();
  chip.layoutHorizontally();
  chip.centerAlignContent();
  chip.backgroundColor = background;
  chip.cornerRadius = 6;
  chip.setPadding(3, 7, 3, 7);
  const text = chip.addText(label);
  text.font = Font.mediumSystemFont(10);
  text.textColor = color;
  return chip;
}

function addProgressBar(parent, fraction) {
  const track = parent.addStack();
  track.backgroundColor = C.track;
  track.cornerRadius = 4;
  track.size = new Size(0, 6);
  const fill = track.addStack();
  fill.backgroundColor = C.accent;
  fill.cornerRadius = 4;
  fill.size = new Size(0, 6);
  fill.addSpacer(Math.max(1, fraction * 100));
  track.addSpacer(null);
}

function addTripRow(parent, trip, compact) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = C.surface;
  row.cornerRadius = 8;
  row.setPadding(6, 8, 6, 8);
  const mark = row.addText('🚗');
  mark.font = Font.systemFont(12);
  row.addSpacer(6);
  const col = row.addStack();
  col.layoutVertically();
  const title = col.addText(trip.destinationName);
  title.font = Font.mediumSystemFont(compact ? 11 : 13);
  title.textColor = C.text;
  title.lineLimit = 1;
  const meta = col.addText(prettyStamp(trip.startedAt) + ' · ETA ' + formatEta(trip.etaMinutes));
  meta.font = Font.systemFont(10);
  meta.textColor = C.textMuted;
  meta.lineLimit = 1;
}

function buildErrorWidget() {
  const widget = buildWidgetBase();
  widget.setPadding(14, 14, 14, 14);
  const title = widget.addText('⚠️ On My Way');
  title.font = Font.boldSystemFont(14);
  title.textColor = C.danger;
  widget.addSpacer(6);
  const body = widget.addText('Toca para reintentar');
  body.font = Font.systemFont(12);
  body.textColor = C.textMuted;
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.retryMinutes * 60 * 1000);
  return widget;
}

function buildSmallWidget(state) {
  const widget = buildWidgetBase();
  widget.setPadding(12, 14, 12, 14);
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const brand = header.addText('ON MY WAY');
  brand.font = Font.boldSystemFont(11);
  brand.textColor = C.accent;
  header.addSpacer(null);
  const count = header.addText(String(todayTrips(state).length));
  count.font = Font.boldSystemFont(16);
  count.textColor = C.text;
  widget.addSpacer(8);
  const checkIn = state.lastCheckIn;
  const where = widget.addText(checkIn ? (checkIn.address || 'Check-in activo') : 'Sin check-in');
  where.font = Font.mediumSystemFont(13);
  where.textColor = C.text;
  where.lineLimit = 2;
  widget.addSpacer(4);
  const trip = latestTrip(state);
  const footer = widget.addText(trip ? '🚗 ' + trip.destinationName : 'Ningún viaje hoy');
  footer.font = Font.systemFont(11);
  footer.textColor = C.textMuted;
  footer.lineLimit = 1;
  return widget;
}

function buildMediumWidget(state) {
  const widget = buildWidgetBase();
  widget.setPadding(12, 14, 12, 14);
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const brand = header.addText('🚗 On My Way');
  brand.font = Font.boldSystemFont(14);
  brand.textColor = C.text;
  header.addSpacer(null);
  addChip(header, todayTrips(state).length + ' hoy', C.accent, C.surfaceHot);
  header.addSpacer(6);
  addChip(header, (state.destinations || []).length + ' destinos', C.warning, C.surfaceWarn);
  widget.addSpacer(8);
  const checkCard = widget.addStack();
  checkCard.layoutVertically();
  checkCard.backgroundColor = C.surface;
  checkCard.cornerRadius = 10;
  checkCard.setPadding(8, 10, 8, 10);
  const checkTitle = checkCard.addText('Último check-in');
  checkTitle.font = Font.systemFont(10);
  checkTitle.textColor = C.textMuted;
  const checkBody = checkCard.addText(checkInLine(state.lastCheckIn));
  checkBody.font = Font.mediumSystemFont(12);
  checkBody.textColor = C.text;
  checkBody.lineLimit = 2;
  widget.addSpacer(8);
  const trip = latestTrip(state);
  if (trip) {
    addTripRow(widget, trip, true);
  } else {
    const empty = widget.addText('Empieza un viaje desde la app.');
    empty.font = Font.systemFont(12);
    empty.textColor = C.textMuted;
  }
  return widget;
}

function buildLargeWidget(state) {
  const widget = buildWidgetBase();
  widget.setPadding(14, 16, 14, 16);
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const brand = header.addText('🚗 On My Way Relay');
  brand.font = Font.boldSystemFont(16);
  brand.textColor = C.text;
  header.addSpacer(null);
  const stamp = header.addText(prettyTime(new Date()));
  stamp.font = Font.systemFont(11);
  stamp.textColor = C.textMuted;
  widget.addSpacer(10);
  const stats = widget.addStack();
  stats.layoutHorizontally();
  const today = todayTrips(state).length;
  const destCount = (state.destinations || []).length;
  const total = (state.trips || []).length;
  const cards = [
    { label: 'Hoy', value: String(today), color: C.accent },
    { label: 'Destinos', value: String(destCount), color: C.warning },
    { label: 'Viajes', value: String(total), color: C.success },
  ];
  for (let i = 0; i < cards.length; i++) {
    const card = stats.addStack();
    card.layoutVertically();
    card.backgroundColor = C.surface;
    card.cornerRadius = 10;
    card.setPadding(8, 10, 8, 10);
    const value = card.addText(cards[i].value);
    value.font = Font.boldSystemFont(18);
    value.textColor = cards[i].color;
    const label = card.addText(cards[i].label);
    label.font = Font.systemFont(9);
    label.textColor = C.textMuted;
    if (i < cards.length - 1) stats.addSpacer(6);
  }
  widget.addSpacer(10);
  addProgressBar(widget, Math.min(1, today / 4));
  widget.addSpacer(10);
  const checkTitle = widget.addText('Check-in');
  checkTitle.font = Font.boldSystemFont(12);
  checkTitle.textColor = C.accent;
  widget.addSpacer(4);
  const checkBody = widget.addText(checkInLine(state.lastCheckIn));
  checkBody.font = Font.systemFont(12);
  checkBody.textColor = C.text;
  checkBody.lineLimit = 2;
  widget.addSpacer(10);
  const tripTitle = widget.addText('Últimos viajes');
  tripTitle.font = Font.boldSystemFont(12);
  tripTitle.textColor = C.accent;
  widget.addSpacer(6);
  const trips = (state.trips || []).slice(0, 4);
  if (trips.length === 0) {
    const empty = widget.addText('Aún no hay viajes. Abre el script y pulsa Voy de camino.');
    empty.font = Font.systemFont(12);
    empty.textColor = C.textMuted;
    empty.lineLimit = 2;
  } else {
    for (let i = 0; i < trips.length; i++) {
      addTripRow(widget, trips[i], false);
      if (i < trips.length - 1) widget.addSpacer(5);
    }
  }
  widget.addSpacer(10);
  const destTitle = widget.addText('Destinos');
  destTitle.font = Font.boldSystemFont(12);
  destTitle.textColor = C.accent;
  widget.addSpacer(4);
  const dests = sortedDestinations(state).slice(0, 4);
  if (dests.length === 0) {
    const none = widget.addText('Guarda casa, trabajo o un pin de foto.');
    none.font = Font.systemFont(12);
    none.textColor = C.textMuted;
  } else {
    const names = dests.map((item) => item.name).join('  ·  ');
    const list = widget.addText(names);
    list.font = Font.systemFont(12);
    list.textColor = C.textMuted;
    list.lineLimit = 2;
  }
  return widget;
}

async function presentInfo(title, message) {
  const alert = new Alert();
  alert.title = title;
  alert.message = message;
  alert.addCancelAction('Cerrar');
  await alert.present();
}

async function presentShareSheet(title, body, phone) {
  const alert = new Alert();
  alert.title = title;
  alert.message = body;
  alert.addAction('💬 Mensajes');
  alert.addAction('✉️ Mail');
  alert.addAction('📤 Compartir');
  alert.addAction('📋 Copiar');
  alert.addCancelAction('Cerrar');
  const choice = await alert.presentSheet();
  if (choice === 0) await sendMessage(phone, body);
  else if (choice === 1) await openMail(title, body);
  else if (choice === 2) await shareItems([body]);
  else if (choice === 3) await copyText(body);
}

async function presentAddDestination(state, preset) {
  const alert = new Alert();
  alert.title = '➕ Nuevo destino';
  alert.message = 'Nombre y dirección o coordenadas.';
  alert.addTextField('Nombre', preset && preset.name ? preset.name : '');
  alert.addTextField('Dirección', preset && preset.address ? preset.address : '');
  alert.addTextField('Teléfono (opcional)', preset && preset.phone ? preset.phone : '');
  alert.addAction('Guardar');
  alert.addCancelAction('Cancelar');
  const choice = await alert.present();
  if (choice !== 0) return null;
  const name = alert.textFieldValue(0).trim();
  const address = alert.textFieldValue(1).trim();
  const phone = alert.textFieldValue(2).trim();
  if (!name) {
    await presentInfo('Falta el nombre', 'Escribe un nombre para el destino.');
    return null;
  }
  const destination = new Destination(
    name,
    address,
    preset && typeof preset.latitude === 'number' ? preset.latitude : null,
    preset && typeof preset.longitude === 'number' ? preset.longitude : null,
    phone
  );
  state.destinations.unshift(destination);
  if (state.destinations.length > CONFIG.maxDestinations) {
    state.destinations = state.destinations.slice(0, CONFIG.maxDestinations);
  }
  Store.save(state);
  return destination;
}

async function presentCheckIn(state) {
  const location = await currentLocation();
  if (!location) {
    await presentInfo('Ubicación no disponible', 'Concede acceso a Localización en Ajustes > Scriptable.');
    return;
  }
  const address = await reverseAddress(location.latitude, location.longitude);
  state.lastCheckIn = {
    latitude: location.latitude,
    longitude: location.longitude,
    address: address,
    at: new Date().toISOString(),
  };
  Store.save(state);
  const body = '📍 Estoy aquí\n' + address + '\n' + coordinateLabel(location.latitude, location.longitude)
    + '\n' + appleMapsLink(location.latitude, location.longitude, address);
  const sheet = new Alert();
  sheet.title = '📍 Check-in guardado';
  sheet.message = address + '\n' + coordinateLabel(location.latitude, location.longitude);
  sheet.addAction('🗺️ Abrir en Mapas');
  sheet.addAction('📤 Compartir');
  sheet.addAction('💾 Guardar como destino');
  sheet.addCancelAction('Listo');
  const choice = await sheet.presentSheet();
  if (choice === 0) {
    try {
      Maps.openMaps(location.latitude, location.longitude);
    } catch (error) {}
  } else if (choice === 1) {
    await presentShareSheet('Check-in', body, '');
  } else if (choice === 2) {
    await presentAddDestination(state, {
      name: address.split(',')[0] || 'Check-in',
      address: address,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }
}

async function presentPickDestination(state) {
  const list = sortedDestinations(state);
  if (list.length === 0) {
    const created = await presentAddDestination(state, null);
    return created;
  }
  const alert = new Alert();
  alert.title = '🚗 ¿A dónde vas?';
  alert.message = 'Elige un destino guardado.';
  for (const destination of list) {
    const km = distanceFromCheckIn(state, destination);
    const extra = km != null ? ' · ' + formatKm(km) : '';
    alert.addAction(destination.name + extra);
  }
  alert.addAction('➕ Nuevo destino');
  alert.addCancelAction('Cancelar');
  const choice = await alert.presentSheet();
  if (choice < 0) return null;
  if (choice === list.length) return await presentAddDestination(state, null);
  return list[choice];
}

async function presentOnMyWay(state) {
  const destination = await presentPickDestination(state);
  if (!destination) return;
  const km = distanceFromCheckIn(state, destination);
  const eta = etaMinutesForKm(km || 0);
  destination.lastUsedAt = new Date().toISOString();
  destination.visitCount = (destination.visitCount || 0) + 1;
  const trip = new Trip(destination.id, destination.name, eta, destination.address);
  state.trips.unshift(trip);
  if (state.trips.length > CONFIG.maxTrips) state.trips = state.trips.slice(0, CONFIG.maxTrips);
  Store.save(state);
  if (state.notificationsEnabled) await scheduleArrivalPing(destination, eta);
  const mapsQuery = destination.address || destination.name;
  const link = destination.latitude != null && destination.longitude != null
    ? appleMapsLink(destination.latitude, destination.longitude, mapsQuery)
    : '';
  const body = '🚗 Voy de camino a ' + destination.name
    + (destination.address ? '\n' + destination.address : '')
    + '\nETA ' + formatEta(eta)
    + (link ? '\n' + link : '');
  const sheet = new Alert();
  sheet.title = '🚗 En camino';
  sheet.message = destination.name + '\nETA ' + formatEta(eta);
  sheet.addAction('🗺️ Indicaciones');
  sheet.addAction('💬 Avisar');
  sheet.addAction('✉️ Mail');
  sheet.addAction('📤 Compartir');
  sheet.addCancelAction('Listo');
  const choice = await sheet.presentSheet();
  if (choice === 0) await openMapsForDestination(destination);
  else if (choice === 1) await sendMessage(destination.phone, body);
  else if (choice === 2) await openMail('Voy de camino a ' + destination.name, body);
  else if (choice === 3) await shareItems([body]);
}

async function presentPhotoWaypoint(state) {
  let assets = [];
  try {
    assets = await Photos.getRecentPhotos(10);
  } catch (error) {
    await presentInfo('Fotos no disponibles', 'Concede acceso a Fotos en Ajustes > Scriptable.');
    return;
  }
  const geoAssets = (assets || []).filter((asset) => asset && asset.location && asset.location.latitude != null);
  if (geoAssets.length === 0) {
    await presentInfo('Sin GPS en fotos', 'Ninguna foto reciente tiene ubicación embebida.');
    return;
  }
  const alert = new Alert();
  alert.title = '📷 Waypoint de foto';
  alert.message = 'Fotos recientes con GPS.';
  for (const asset of geoAssets) {
    const stamp = asset.creationDate ? prettyStamp(asset.creationDate.toISOString()) : 'foto';
    alert.addAction((asset.filename || 'Foto') + ' · ' + stamp);
  }
  alert.addCancelAction('Cancelar');
  const choice = await alert.presentSheet();
  if (choice < 0 || choice >= geoAssets.length) return;
  const asset = geoAssets[choice];
  const loc = asset.location;
  const address = await reverseAddress(loc.latitude, loc.longitude);
  const created = await presentAddDestination(state, {
    name: asset.filename || address.split(',')[0] || 'Foto',
    address: address,
    latitude: loc.latitude,
    longitude: loc.longitude,
  });
  if (!created) return;
  const sheet = new Alert();
  sheet.title = '📷 Destino de foto';
  sheet.message = created.name + '\n' + address;
  sheet.addAction('🗺️ Abrir en Mapas');
  sheet.addAction('🚗 Voy de camino');
  sheet.addCancelAction('Listo');
  const next = await sheet.presentSheet();
  if (next === 0) await openMapsForDestination(created);
  else if (next === 1) await presentOnMyWayFrom(state, created);
}

async function presentOnMyWayFrom(state, destination) {
  const km = distanceFromCheckIn(state, destination);
  const eta = etaMinutesForKm(km || 0);
  destination.lastUsedAt = new Date().toISOString();
  destination.visitCount = (destination.visitCount || 0) + 1;
  const trip = new Trip(destination.id, destination.name, eta, destination.address);
  state.trips.unshift(trip);
  if (state.trips.length > CONFIG.maxTrips) state.trips = state.trips.slice(0, CONFIG.maxTrips);
  Store.save(state);
  if (state.notificationsEnabled) await scheduleArrivalPing(destination, eta);
  await openMapsForDestination(destination);
  const mapsQuery = destination.address || destination.name;
  const link = destination.latitude != null && destination.longitude != null
    ? appleMapsLink(destination.latitude, destination.longitude, mapsQuery)
    : '';
  const body = '🚗 Voy de camino a ' + destination.name
    + (destination.address ? '\n' + destination.address : '')
    + '\nETA ' + formatEta(eta)
    + (link ? '\n' + link : '');
  await sendMessage(destination.phone, body);
}

async function presentSavedDestinations(state) {
  const list = sortedDestinations(state);
  if (list.length === 0) {
    await presentInfo('Sin destinos', 'Añade casa, trabajo o un pin de foto.');
    return;
  }
  const alert = new Alert();
  alert.title = '📌 Destinos';
  for (const destination of list) {
    alert.addAction(destinationLine(destination));
  }
  alert.addCancelAction('Cerrar');
  const choice = await alert.presentSheet();
  if (choice < 0) return;
  const destination = list[choice];
  const km = distanceFromCheckIn(state, destination);
  const sheet = new Alert();
  sheet.title = destination.name;
  sheet.message = (destination.address || 'Sin dirección')
    + (km != null ? '\n' + formatKm(km) : '')
    + (destination.phone ? '\n☎ ' + destination.phone : '');
  sheet.addAction('🚗 Voy de camino');
  sheet.addAction('🗺️ Mapas');
  sheet.addAction('💬 Mensaje');
  sheet.addAction('🗑️ Quitar');
  sheet.addCancelAction('Cerrar');
  const next = await sheet.presentSheet();
  if (next === 0) await presentOnMyWayFrom(state, destination);
  else if (next === 1) await openMapsForDestination(destination);
  else if (next === 2) {
    const body = '📌 ' + destination.name + (destination.address ? '\n' + destination.address : '');
    await sendMessage(destination.phone, body);
  } else if (next === 3) {
    state.destinations = state.destinations.filter((item) => item.id !== destination.id);
    Store.save(state);
  }
}

async function presentShareLastLocation(state) {
  const checkIn = state.lastCheckIn;
  if (!checkIn) {
    await presentCheckIn(state);
    return;
  }
  const body = '📍 Estoy aquí\n' + (checkIn.address || '') + '\n'
    + coordinateLabel(checkIn.latitude, checkIn.longitude) + '\n'
    + appleMapsLink(checkIn.latitude, checkIn.longitude, checkIn.address || 'Ubicación');
  await presentShareSheet('Última ubicación', body, '');
}

async function presentHistory(state) {
  const trips = state.trips || [];
  const lines = [
    'Viajes hoy: ' + todayTrips(state).length,
    'Total: ' + trips.length,
    'Destinos: ' + (state.destinations || []).length,
    'Avisos: ' + (state.notificationsEnabled ? 'ON' : 'OFF'),
  ];
  if (state.lastCheckIn) lines.push('Check-in: ' + checkInLine(state.lastCheckIn));
  if (trips.length) {
    lines.push('');
    lines.push('Recientes:');
    trips.slice(0, 6).forEach((trip) => {
      lines.push('• ' + trip.destinationName + ' · ' + prettyStamp(trip.startedAt));
    });
  }
  await presentInfo('📊 Historial On My Way', lines.join('\n'));
}

async function presentMainMenu(state) {
  const alert = new Alert();
  alert.title = '🚗 On My Way Relay';
  alert.message = todayTrips(state).length + ' viajes hoy · '
    + (state.destinations || []).length + ' destinos · '
    + (state.lastCheckIn ? 'check-in ' + prettyStamp(state.lastCheckIn.at) : 'sin check-in');
  alert.addAction('📍 Check-in ahora');
  alert.addAction('🚗 Voy de camino');
  alert.addAction('📷 Destino desde foto');
  alert.addAction('📌 Destinos guardados');
  alert.addAction('➕ Añadir destino');
  alert.addAction('📤 Compartir ubicación');
  alert.addAction('📊 Historial');
  alert.addAction('🔔 Avisos: ' + (state.notificationsEnabled ? 'ON' : 'OFF'));
  alert.addCancelAction('✖️ Cerrar');
  const choice = await alert.presentSheet();
  if (choice === 0) await presentCheckIn(state);
  else if (choice === 1) await presentOnMyWay(state);
  else if (choice === 2) await presentPhotoWaypoint(state);
  else if (choice === 3) await presentSavedDestinations(state);
  else if (choice === 4) await presentAddDestination(state, null);
  else if (choice === 5) await presentShareLastLocation(state);
  else if (choice === 6) await presentHistory(state);
  else if (choice === 7) {
    state.notificationsEnabled = !state.notificationsEnabled;
    Store.save(state);
  } else {
    return false;
  }
  return true;
}

async function runAsWidget() {
  try {
    const state = Store.load();
    const family = config.widgetFamily || 'medium';
    let widget;
    if (family === 'small') widget = buildSmallWidget(state);
    else if (family === 'large') widget = buildLargeWidget(state);
    else widget = buildMediumWidget(state);
    Script.setWidget(widget);
  } catch (error) {
    Script.setWidget(buildErrorWidget());
  }
}

async function runAsUtility() {
  const state = Store.load();
  let keepOpen = true;
  while (keepOpen) {
    keepOpen = await presentMainMenu(state);
  }
}

try {
  if (config.runsInWidget) {
    await runAsWidget();
  } else {
    await runAsUtility();
  }
} catch (error) {
  if (config.runsInWidget) {
    try {
      Script.setWidget(buildErrorWidget());
    } catch (inner) {}
  } else {
    const alert = new Alert();
    alert.title = 'Error';
    alert.message = error && error.message ? error.message : 'Error inesperado';
    alert.addCancelAction('Cerrar');
    await alert.present();
  }
}
Script.complete();
