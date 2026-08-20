const THEME = {
  bgTop: '#0A1020',
  bgBottom: '#152038',
  surface: '#1A243C',
  surfaceAlt: '#24304C',
  text: '#F2F5FC',
  textMuted: '#93A0BC',
  textDim: '#6B7794',
  accent: '#5B9DFF',
  success: '#30D158',
  warning: '#FFD60A',
  danger: '#FF453A',
  chip: '#2A3554',
};

const CONFIG = {
  storeFile: 'geo-pin-board.json',
  refreshMinutes: 20,
  retryMinutes: 10,
  maxWidgetPins: 6,
  earthRadiusKm: 6371,
};

const PIN_CATEGORIES = [
  { key: 'home', label: 'Casa', emoji: '🏠' },
  { key: 'work', label: 'Trabajo', emoji: '💼' },
  { key: 'parking', label: 'Parking', emoji: '🅿️' },
  { key: 'cafe', label: 'Café', emoji: '☕' },
  { key: 'shop', label: 'Tienda', emoji: '🛒' },
  { key: 'gym', label: 'Gimnasio', emoji: '🏋️' },
  { key: 'friend', label: 'Amigo', emoji: '👥' },
  { key: 'favorite', label: 'Favorito', emoji: '⭐' },
  { key: 'other', label: 'Otro', emoji: '📍' },
];

class GeoPin {
  constructor(name, latitude, longitude, category = 'other', notes = '', address = '') {
    this.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.name = name;
    this.latitude = latitude;
    this.longitude = longitude;
    this.category = category;
    this.notes = notes;
    this.address = address;
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
    this.visitCount = 0;
    this.lastVisitedAt = null;
  }
}

class AppState {
  constructor() {
    this.pins = [];
    this.lastLocation = null;
  }
}

const Store = {
  _fm: FileManager.local(),

  get path() {
    return this._fm.joinPath(this._fm.documentsDirectory(), CONFIG.storeFile);
  },

  load() {
    try {
      if (this._fm.fileExists(this.path)) {
        const parsed = JSON.parse(this._fm.readString(this.path));
        if (parsed && Array.isArray(parsed.pins)) return parsed;
      }
    } catch (error) {}
    return new AppState();
  },

  save(data) {
    try {
      this._fm.writeString(this.path, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      return false;
    }
  },
};

const Board = {
  _data: null,

  get data() {
    if (!this._data) this._data = Store.load();
    return this._data;
  },

  persist() {
    return Store.save(this.data);
  },

  get pins() {
    return this.data.pins || [];
  },

  addPin(pin) {
    this.data.pins.unshift(pin);
    this.persist();
    return pin;
  },

  updatePin(pinId, fields) {
    const pin = this.pins.find((item) => item.id === pinId);
    if (!pin) return null;
    Object.assign(pin, fields, { updatedAt: new Date().toISOString() });
    this.persist();
    return pin;
  },

  removePin(pinId) {
    const before = this.pins.length;
    this.data.pins = this.pins.filter((item) => item.id !== pinId);
    this.persist();
    return this.pins.length < before;
  },

  markVisited(pinId) {
    const pin = this.pins.find((item) => item.id === pinId);
    if (!pin) return null;
    pin.visitCount = (pin.visitCount || 0) + 1;
    pin.lastVisitedAt = new Date().toISOString();
    pin.updatedAt = pin.lastVisitedAt;
    this.persist();
    return pin;
  },

  cacheLocation(location) {
    if (!location) return;
    this.data.lastLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      capturedAt: new Date().toISOString(),
    };
    this.persist();
  },
};

function categoryMeta(key) {
  return PIN_CATEGORIES.find((item) => item.key === key) || PIN_CATEGORIES[PIN_CATEGORIES.length - 1];
}

function pinEmoji(pin) {
  return categoryMeta(pin.category).emoji;
}

function pinLabel(pin) {
  return `${pinEmoji(pin)} ${pin.name}`;
}

function coordinateLabel(latitude, longitude) {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lngDir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(6)}° ${latDir}, ${Math.abs(longitude).toFixed(6)}° ${lngDir}`;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return CONFIG.earthRadiusKm * c;
}

function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function formatShortDate(iso) {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return '—';
  }
}

function pinShareText(pin) {
  const lines = [
    pinLabel(pin),
    pin.address || coordinateLabel(pin.latitude, pin.longitude),
    coordinateLabel(pin.latitude, pin.longitude),
  ];
  if (pin.notes) lines.push(pin.notes);
  lines.push(`https://maps.apple.com/?ll=${pin.latitude},${pin.longitude}&q=${encodeURIComponent(pin.name)}`);
  return lines.join('\n');
}

function makeGradient() {
  const gradient = new LinearGradient();
  gradient.colors = [new Color(THEME.bgTop), new Color(THEME.bgBottom)];
  gradient.locations = [0, 1];
  return gradient;
}

function applyWidgetChrome(widget) {
  widget.backgroundGradient = makeGradient();
  widget.setPadding(12, 14, 12, 14);
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60 * 1000);
}

async function currentLocation() {
  try {
    Location.setAccuracyToHundredMeters();
  } catch (error) {}
  try {
    const location = await Location.current();
    if (location && typeof location.latitude === 'number') {
      Board.cacheLocation(location);
      return location;
    }
  } catch (error) {}
  return Board.data.lastLocation || null;
}

async function reverseGeocode(latitude, longitude) {
  try {
    const results = await Location.reverseGeocode(latitude, longitude, 'es');
    if (!results || !results.length) return '';
    const place = results[0];
    const parts = [];
    if (place.subThoroughfare) parts.push(place.subThoroughfare);
    if (place.thoroughfare) parts.push(place.thoroughfare);
    if (place.locality) parts.push(place.locality);
    if (place.administrativeArea) parts.push(place.administrativeArea);
    if (place.postalCode) parts.push(place.postalCode);
    if (place.country) parts.push(place.country);
    return parts.join(', ');
  } catch (error) {
    return '';
  }
}

function pinsWithDistance(origin) {
  const list = Board.pins.map((pin) => {
    const clone = { ...pin };
    if (origin) {
      clone.distanceKm = distanceKm(
        origin.latitude,
        origin.longitude,
        pin.latitude,
        pin.longitude
      );
    } else {
      clone.distanceKm = null;
    }
    return clone;
  });
  list.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) {
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    }
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
  return list;
}

function categoryCounts() {
  const counts = {};
  for (const category of PIN_CATEGORIES) counts[category.key] = 0;
  for (const pin of Board.pins) {
    const key = categoryMeta(pin.category).key;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

async function openPinInMaps(pin) {
  try {
    Maps.openMaps(pin.latitude, pin.longitude);
    Board.markVisited(pin.id);
  } catch (error) {
    try {
      Safari.open(`https://maps.apple.com/?ll=${pin.latitude},${pin.longitude}&q=${encodeURIComponent(pin.name)}`);
    } catch (fallbackError) {}
  }
}

async function openDirectionsToPin(pin, origin) {
  try {
    if (origin) {
      Maps.openMaps(pin.latitude, pin.longitude, {
        from: new Maps.Point(origin.latitude, origin.longitude),
      });
    } else {
      Maps.openMaps(pin.latitude, pin.longitude);
    }
    Board.markVisited(pin.id);
  } catch (error) {
    await openPinInMaps(pin);
  }
}

async function sharePin(pin) {
  try {
    await ShareSheet.open([pinShareText(pin)]);
  } catch (error) {
    try {
      Pasteboard.copy(pinShareText(pin));
      const alert = new Alert();
      alert.title = 'Copiado';
      alert.message = 'El pin se copió al portapapeles.';
      alert.addAction('OK');
      await alert.present();
    } catch (copyError) {}
  }
}

async function copyPin(pin) {
  try {
    Pasteboard.copy(pinShareText(pin));
    const alert = new Alert();
    alert.title = 'Copiado';
    alert.message = pinLabel(pin);
    alert.addAction('OK');
    await alert.present();
  } catch (error) {}
}

async function schedulePinReminder(pin) {
  try {
    const alert = new Alert();
    alert.title = 'Recordatorio';
    alert.message = `Avisar sobre ${pin.name}`;
    const offsets = [
      { label: 'En 15 min', minutes: 15 },
      { label: 'En 1 hora', minutes: 60 },
      { label: 'En 3 horas', minutes: 180 },
      { label: 'Mañana 09:00', minutes: null },
    ];
    for (const option of offsets) alert.addAction(option.label);
    alert.addCancelAction('Cancelar');
    const choice = await alert.presentSheet();
    if (choice < 0 || choice >= offsets.length) return;

    let trigger;
    if (offsets[choice].minutes == null) {
      trigger = new Date();
      trigger.setDate(trigger.getDate() + 1);
      trigger.setHours(9, 0, 0, 0);
    } else {
      trigger = new Date(Date.now() + offsets[choice].minutes * 60 * 1000);
    }

    const notification = new Notification();
    notification.title = `${pinEmoji(pin)} ${pin.name}`;
    notification.body = pin.address || coordinateLabel(pin.latitude, pin.longitude);
    notification.sound = 'default';
    notification.scriptName = Script.name();
    notification.setTriggerDate(trigger);
    await notification.schedule();

    const done = new Alert();
    done.title = 'Programado';
    done.message = `Aviso a las ${trigger.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    done.addAction('OK');
    await done.present();
  } catch (error) {
    const fail = new Alert();
    fail.title = 'Error';
    fail.message = 'No se pudo programar el recordatorio.';
    fail.addAction('OK');
    await fail.present();
  }
}

async function presentMessage(title, message) {
  const alert = new Alert();
  alert.title = title;
  alert.message = message;
  alert.addAction('OK');
  await alert.present();
}

async function pickCategory(defaultKey = 'other') {
  const alert = new Alert();
  alert.title = 'Categoría';
  alert.message = 'Elige el tipo de pin';
  for (const category of PIN_CATEGORIES) {
    const marker = category.key === defaultKey ? '✓ ' : '';
    alert.addAction(`${marker}${category.emoji} ${category.label}`);
  }
  alert.addCancelAction('Cancelar');
  const choice = await alert.presentSheet();
  if (choice < 0 || choice >= PIN_CATEGORIES.length) return null;
  return PIN_CATEGORIES[choice].key;
}

async function createPinFromLocation(location) {
  if (!location) {
    await presentMessage('Sin ubicación', 'Activa Localización para Scriptable en Ajustes.');
    return null;
  }

  const address = await reverseGeocode(location.latitude, location.longitude);
  const nameAlert = new Alert();
  nameAlert.title = 'Nuevo pin';
  nameAlert.message = address || coordinateLabel(location.latitude, location.longitude);
  nameAlert.addTextField('Nombre', address ? address.split(',')[0].slice(0, 40) : 'Mi pin');
  nameAlert.addTextField('Notas (opcional)', '');
  nameAlert.addAction('Continuar');
  nameAlert.addCancelAction('Cancelar');
  const nameChoice = await nameAlert.present();
  if (nameChoice !== 0) return null;

  const name = nameAlert.textFieldValue(0).trim() || 'Mi pin';
  const notes = nameAlert.textFieldValue(1).trim();
  const category = await pickCategory('favorite');
  if (!category) return null;

  const pin = new GeoPin(
    name,
    location.latitude,
    location.longitude,
    category,
    notes,
    address
  );
  Board.addPin(pin);
  await presentMessage('Guardado', pinLabel(pin));
  return pin;
}

async function editPin(pin) {
  const alert = new Alert();
  alert.title = 'Editar pin';
  alert.message = coordinateLabel(pin.latitude, pin.longitude);
  alert.addTextField('Nombre', pin.name || '');
  alert.addTextField('Notas', pin.notes || '');
  alert.addAction('Guardar');
  alert.addAction('Cambiar categoría');
  alert.addCancelAction('Cancelar');
  const choice = await alert.present();
  if (choice === -1) return pin;

  if (choice === 0) {
    const name = alert.textFieldValue(0).trim() || pin.name;
    const notes = alert.textFieldValue(1).trim();
    return Board.updatePin(pin.id, { name, notes }) || pin;
  }

  if (choice === 1) {
    const category = await pickCategory(pin.category);
    if (!category) return pin;
    const name = alert.textFieldValue(0).trim() || pin.name;
    const notes = alert.textFieldValue(1).trim();
    return Board.updatePin(pin.id, { name, notes, category }) || pin;
  }

  return pin;
}

async function showPinActions(pin, origin) {
  const distance = origin
    ? formatDistance(distanceKm(origin.latitude, origin.longitude, pin.latitude, pin.longitude))
    : 'sin GPS';

  const actions = [
    {
      label: '🗺️ Abrir en Mapas',
      run: async () => openPinInMaps(pin),
    },
    {
      label: '🧭 Cómo llegar',
      run: async () => openDirectionsToPin(pin, origin),
    },
    {
      label: '📤 Compartir',
      run: async () => sharePin(pin),
    },
    {
      label: '📋 Copiar',
      run: async () => copyPin(pin),
    },
    {
      label: '🔔 Recordatorio',
      run: async () => schedulePinReminder(pin),
    },
    {
      label: '✏️ Editar',
      run: async () => {
        await editPin(pin);
      },
    },
    {
      label: '🗑️ Eliminar',
      run: async () => {
        const confirm = new Alert();
        confirm.title = 'Eliminar pin';
        confirm.message = pinLabel(pin);
        confirm.addDestructiveAction('Eliminar');
        confirm.addCancelAction('Cancelar');
        const result = await confirm.presentSheet();
        if (result === 0) Board.removePin(pin.id);
      },
    },
  ];

  const alert = new Alert();
  alert.title = pinLabel(pin);
  const details = [
    pin.address || coordinateLabel(pin.latitude, pin.longitude),
    `Distancia: ${distance}`,
    `Visitas: ${pin.visitCount || 0}`,
    `Actualizado: ${formatShortDate(pin.updatedAt)}`,
  ];
  if (pin.notes) details.push(pin.notes);
  alert.message = details.join('\n');
  for (const action of actions) alert.addAction(action.label);
  alert.addCancelAction('Cerrar');

  const tapped = await alert.presentSheet();
  if (tapped >= 0 && tapped < actions.length) {
    try {
      await actions[tapped].run();
    } catch (error) {
      await presentMessage('Error', error && error.message ? error.message : 'Acción fallida');
    }
  }
}

async function browsePins() {
  const origin = await currentLocation();
  const ranked = pinsWithDistance(origin);
  if (!ranked.length) {
    await presentMessage('Sin pines', 'Guarda tu primera ubicación con «Nuevo pin aquí».');
    return;
  }

  const alert = new Alert();
  alert.title = `Pines (${ranked.length})`;
  alert.message = origin
    ? 'Ordenados por distancia a tu ubicación'
    : 'Sin GPS · orden por actualización';
  const visible = ranked.slice(0, 12);
  for (const pin of visible) {
    const distance = formatDistance(pin.distanceKm);
    alert.addAction(`${pinEmoji(pin)} ${pin.name} · ${distance}`);
  }
  alert.addCancelAction('Cerrar');
  const choice = await alert.presentSheet();
  if (choice >= 0 && choice < visible.length) {
    await showPinActions(visible[choice], origin);
  }
}

async function showStats() {
  const origin = await currentLocation();
  const ranked = pinsWithDistance(origin);
  const counts = categoryCounts();
  const lines = [
    `Total: ${Board.pins.length}`,
    origin ? `GPS: ${coordinateLabel(origin.latitude, origin.longitude)}` : 'GPS: no disponible',
  ];
  if (ranked[0] && ranked[0].distanceKm != null) {
    lines.push(`Más cercano: ${ranked[0].name} (${formatDistance(ranked[0].distanceKm)})`);
  }
  const topCategories = PIN_CATEGORIES
    .filter((category) => counts[category.key] > 0)
    .sort((a, b) => counts[b.key] - counts[a.key])
    .slice(0, 5)
    .map((category) => `${category.emoji} ${category.label}: ${counts[category.key]}`);
  if (topCategories.length) {
    lines.push('');
    lines.push(...topCategories);
  }
  await presentMessage('Resumen', lines.join('\n'));
}

async function exportPins() {
  try {
    if (!Board.pins.length) {
      await presentMessage('Vacío', 'No hay pines para exportar.');
      return;
    }
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        count: Board.pins.length,
        pins: Board.pins,
      },
      null,
      2
    );
    const fm = FileManager.local();
    const exportPath = fm.joinPath(fm.temporaryDirectory(), 'geo-pin-board-export.json');
    fm.writeString(exportPath, payload);
    await ShareSheet.open([exportPath]);
  } catch (error) {
    try {
      Pasteboard.copy(JSON.stringify(Board.pins, null, 2));
      await presentMessage('Exportado', 'JSON copiado al portapapeles.');
    } catch (copyError) {
      await presentMessage('Error', 'No se pudo exportar.');
    }
  }
}

async function dropPinHere() {
  const location = await currentLocation();
  await createPinFromLocation(location);
}

async function openNearestPin() {
  const origin = await currentLocation();
  const ranked = pinsWithDistance(origin);
  if (!ranked.length) {
    await presentMessage('Sin pines', 'Aún no hay ubicaciones guardadas.');
    return;
  }
  await showPinActions(ranked[0], origin);
}

async function runAsUtility() {
  let keepGoing = true;
  while (keepGoing) {
    const origin = await currentLocation();
    const ranked = pinsWithDistance(origin);
    const nearest = ranked[0];
    const alert = new Alert();
    alert.title = '📍 Geo Pin Board';
    const statusLines = [`${Board.pins.length} pines guardados`];
    if (nearest) {
      statusLines.push(
        `Cercano: ${nearest.name} · ${formatDistance(nearest.distanceKm)}`
      );
    } else if (!origin) {
      statusLines.push('GPS no disponible');
    }
    alert.message = statusLines.join('\n');
    alert.addAction('📌 Nuevo pin aquí');
    alert.addAction('📂 Ver pines');
    alert.addAction('🧭 Abrir el más cercano');
    alert.addAction('📊 Resumen');
    alert.addAction('📤 Exportar');
    alert.addCancelAction('Cerrar');

    const choice = await alert.presentSheet();
    switch (choice) {
      case 0:
        await dropPinHere();
        break;
      case 1:
        await browsePins();
        break;
      case 2:
        await openNearestPin();
        break;
      case 3:
        await showStats();
        break;
      case 4:
        await exportPins();
        break;
      default:
        keepGoing = false;
        break;
    }
  }
}

function addHeaderRow(parent, title, subtitle) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const titleText = row.addText(title);
  titleText.font = Font.boldSystemFont(13);
  titleText.textColor = new Color(THEME.text);
  row.addSpacer();
  if (subtitle) {
    const sub = row.addText(subtitle);
    sub.font = Font.mediumSystemFont(11);
    sub.textColor = new Color(THEME.accent);
  }
}

function addPinRow(parent, pin, compact = false) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = new Color(THEME.surface, 0.92);
  row.cornerRadius = 10;
  row.setPadding(compact ? 6 : 8, 10, compact ? 6 : 8, 10);
  row.url = `https://maps.apple.com/?ll=${pin.latitude},${pin.longitude}&q=${encodeURIComponent(pin.name)}`;

  const emoji = row.addText(pinEmoji(pin));
  emoji.font = Font.systemFont(compact ? 14 : 16);
  row.addSpacer(8);

  const info = row.addStack();
  info.layoutVertically();
  const name = info.addText(pin.name);
  name.font = Font.semiboldSystemFont(compact ? 11 : 13);
  name.textColor = new Color(THEME.text);
  name.lineLimit = 1;
  if (!compact) {
    const detail = info.addText(pin.address || coordinateLabel(pin.latitude, pin.longitude));
    detail.font = Font.systemFont(10);
    detail.textColor = new Color(THEME.textMuted);
    detail.lineLimit = 1;
  }

  row.addSpacer();
  const distance = row.addText(formatDistance(pin.distanceKm));
  distance.font = Font.boldSystemFont(compact ? 11 : 12);
  distance.textColor = new Color(THEME.accent);
}

function addChip(parent, label, colorHex) {
  const chip = parent.addStack();
  chip.layoutHorizontally();
  chip.centerAlignContent();
  chip.backgroundColor = new Color(THEME.chip);
  chip.cornerRadius = 7;
  chip.setPadding(4, 7, 4, 7);
  const text = chip.addText(label);
  text.font = Font.mediumSystemFont(10);
  text.textColor = new Color(colorHex || THEME.text);
}

function buildErrorWidget(message) {
  const widget = new ListWidget();
  applyWidgetChrome(widget);
  const title = widget.addText('📍 Geo Pin Board');
  title.font = Font.boldSystemFont(14);
  title.textColor = new Color(THEME.text);
  widget.addSpacer(6);
  const body = widget.addText(message || 'Error · toca para reintentar');
  body.font = Font.systemFont(12);
  body.textColor = new Color(THEME.warning);
  body.lineLimit = 4;
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.retryMinutes * 60 * 1000);
  return widget;
}

async function buildSmallWidget(ranked, origin) {
  const widget = new ListWidget();
  applyWidgetChrome(widget);
  addHeaderRow(widget, '📍 Pines', `${Board.pins.length}`);
  widget.addSpacer(8);
  if (!ranked.length) {
    const empty = widget.addText('Sin pines aún');
    empty.font = Font.systemFont(12);
    empty.textColor = new Color(THEME.textMuted);
    widget.addSpacer();
    const hint = widget.addText('Toca para añadir');
    hint.font = Font.mediumSystemFont(11);
    hint.textColor = new Color(THEME.accent);
    return widget;
  }
  const nearest = ranked[0];
  const emoji = widget.addText(pinEmoji(nearest));
  emoji.font = Font.systemFont(22);
  widget.addSpacer(4);
  const name = widget.addText(nearest.name);
  name.font = Font.boldSystemFont(15);
  name.textColor = new Color(THEME.text);
  name.lineLimit = 2;
  widget.addSpacer(4);
  const distance = widget.addText(formatDistance(nearest.distanceKm));
  distance.font = Font.semiboldSystemFont(13);
  distance.textColor = new Color(THEME.accent);
  widget.addSpacer();
  const footer = widget.addText(origin ? 'más cercano' : 'sin GPS');
  footer.font = Font.systemFont(10);
  footer.textColor = new Color(THEME.textDim);
  return widget;
}

async function buildMediumWidget(ranked, origin) {
  const widget = new ListWidget();
  applyWidgetChrome(widget);
  addHeaderRow(
    widget,
    '📍 Geo Pin Board',
    origin ? 'por distancia' : `${Board.pins.length} pines`
  );
  widget.addSpacer(8);
  if (!ranked.length) {
    const empty = widget.addText('Guarda tu primera ubicación abriendo el script.');
    empty.font = Font.systemFont(12);
    empty.textColor = new Color(THEME.textMuted);
    empty.lineLimit = 3;
    return widget;
  }
  const visible = ranked.slice(0, 3);
  for (let index = 0; index < visible.length; index++) {
    addPinRow(widget, visible[index], true);
    if (index < visible.length - 1) widget.addSpacer(6);
  }
  return widget;
}

async function buildLargeWidget(ranked, origin) {
  const widget = new ListWidget();
  applyWidgetChrome(widget);
  addHeaderRow(widget, '📍 Geo Pin Board', `${Board.pins.length} total`);
  widget.addSpacer(8);

  const chips = widget.addStack();
  chips.layoutHorizontally();
  addChip(chips, origin ? 'GPS OK' : 'Sin GPS', origin ? THEME.success : THEME.warning);
  chips.addSpacer(6);
  if (ranked[0]) {
    addChip(chips, `Cercano ${formatDistance(ranked[0].distanceKm)}`, THEME.accent);
  }
  chips.addSpacer();

  widget.addSpacer(10);
  if (!ranked.length) {
    const empty = widget.addText('Aún no hay pines. Abre el script y pulsa «Nuevo pin aquí».');
    empty.font = Font.systemFont(13);
    empty.textColor = new Color(THEME.textMuted);
    empty.lineLimit = 4;
    return widget;
  }

  const visible = ranked.slice(0, CONFIG.maxWidgetPins);
  for (let index = 0; index < visible.length; index++) {
    addPinRow(widget, visible[index], false);
    if (index < visible.length - 1) widget.addSpacer(6);
  }

  widget.addSpacer(10);
  const counts = categoryCounts();
  const active = PIN_CATEGORIES.filter((category) => counts[category.key] > 0).slice(0, 6);
  if (active.length) {
    const catRow = widget.addStack();
    catRow.layoutHorizontally();
    for (let index = 0; index < active.length; index++) {
      const category = active[index];
      addChip(catRow, `${category.emoji} ${counts[category.key]}`, THEME.textMuted);
      if (index < active.length - 1) catRow.addSpacer(5);
    }
  }
  return widget;
}

async function runAsWidget() {
  try {
    const origin = await currentLocation();
    const ranked = pinsWithDistance(origin);
    const family = config.widgetFamily || 'medium';
    let widget;
    if (family === 'small') {
      widget = await buildSmallWidget(ranked, origin);
    } else if (family === 'large') {
      widget = await buildLargeWidget(ranked, origin);
    } else {
      widget = await buildMediumWidget(ranked, origin);
    }
    Script.setWidget(widget);
  } catch (error) {
    const fallback = buildErrorWidget(error && error.message ? error.message : 'Error inesperado');
    Script.setWidget(fallback);
  }
}

async function run() {
  try {
    if (config.runsInWidget) {
      await runAsWidget();
    } else {
      await runAsUtility();
    }
  } catch (error) {
    if (config.runsInWidget) {
      Script.setWidget(buildErrorWidget(error && error.message ? error.message : 'Error'));
    } else {
      try {
        const alert = new Alert();
        alert.title = 'Error';
        alert.message = error && error.message ? error.message : 'Error inesperado';
        alert.addCancelAction('Cerrar');
        await alert.present();
      } catch (alertError) {}
    }
  }
  Script.complete();
}

await run();
