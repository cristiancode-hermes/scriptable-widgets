const CONFIG = {
  storeFile: 'camera-roll-atlas.json',
  recentLimit: 40,
  clusterMeters: 250,
  refreshMinutes: 20,
  retryMinutes: 10,
  maxMenuPlaces: 8,
  earthRadiusM: 6371000,
};

const THEME = {
  bgTop: '#0B121C',
  bgBottom: '#163044',
  surface: '#1C2A3A',
  text: '#F3F7FB',
  textMuted: '#8FA3B8',
  accent: '#7DD3FC',
  success: '#34D399',
  warning: '#FBBF24',
};

const Store = {
  _fm: FileManager.local(),

  get path() {
    return this._fm.joinPath(this._fm.documentsDirectory(), CONFIG.storeFile);
  },

  empty() {
    return {
      clusters: [],
      lastScanAt: null,
      scannedCount: 0,
      geotaggedCount: 0,
    };
  },

  load() {
    try {
      if (this._fm.fileExists(this.path)) {
        const parsed = JSON.parse(this._fm.readString(this.path));
        if (parsed && Array.isArray(parsed.clusters)) {
          return {
            clusters: parsed.clusters,
            lastScanAt: parsed.lastScanAt || null,
            scannedCount: Number(parsed.scannedCount) || 0,
            geotaggedCount: Number(parsed.geotaggedCount) || 0,
          };
        }
      }
    } catch (error) {}
    return this.empty();
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

function color(hex, alpha) {
  try {
    return alpha === undefined ? new Color(hex) : new Color(hex, alpha);
  } catch (error) {
    return new Color('#FFFFFF');
  }
}

function toRad(degrees) {
  return degrees * Math.PI / 180;
}

function haversineMeters(aLat, aLng, bLat, bLng) {
  try {
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat
      + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;
    return 2 * CONFIG.earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)));
  } catch (error) {
    return Number.POSITIVE_INFINITY;
  }
}

function coordinateLabel(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'O';
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}

function assetCoords(asset) {
  try {
    const loc = asset && asset.location;
    if (!loc) return null;
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  } catch (error) {
    return null;
  }
}

function clusterId(lat, lng) {
  return `c-${lat.toFixed(4)}-${lng.toFixed(4)}`;
}

function formatWhen(iso) {
  try {
    if (!iso) return '—';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `hace ${days} d`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  } catch (error) {
    return '—';
  }
}

function uniqueCities(clusters) {
  const names = new Set();
  for (const cluster of clusters) {
    const city = (cluster.city || '').trim();
    if (city) names.add(city);
  }
  return names.size;
}

function latestCluster(clusters) {
  if (!clusters || clusters.length === 0) return null;
  return clusters.slice().sort((a, b) => {
    const aTime = new Date(a.lastTakenAt || 0).getTime();
    const bTime = new Date(b.lastTakenAt || 0).getTime();
    return bTime - aTime;
  })[0];
}

function placeTitle(cluster) {
  return (cluster.city || cluster.address || coordinateLabel(cluster.lat, cluster.lng)).trim();
}

function placeBody(cluster) {
  const lines = [];
  if (cluster.address) lines.push(cluster.address);
  lines.push(coordinateLabel(cluster.lat, cluster.lng));
  lines.push(`${cluster.photoCount || 1} foto${cluster.photoCount === 1 ? '' : 's'}`);
  if (cluster.lastTakenAt) lines.push(formatWhen(cluster.lastTakenAt));
  return lines.join('\n');
}

function shareText(cluster) {
  const title = placeTitle(cluster);
  return `📍 ${title}\n${cluster.address || ''}\n${coordinateLabel(cluster.lat, cluster.lng)}`.trim();
}

function findCluster(clusters, lat, lng) {
  for (const cluster of clusters) {
    if (haversineMeters(cluster.lat, cluster.lng, lat, lng) <= CONFIG.clusterMeters) {
      return cluster;
    }
  }
  return null;
}

async function reversePlace(lat, lng) {
  try {
    if (typeof Location === 'undefined' || typeof Location.reverseGeocode !== 'function') {
      return { address: coordinateLabel(lat, lng), city: '' };
    }
    const results = await Location.reverseGeocode(lat, lng, 'es');
    if (!results || results.length === 0) {
      return { address: coordinateLabel(lat, lng), city: '' };
    }
    const placemark = results[0];
    const parts = [];
    if (placemark.subThoroughfare) parts.push(placemark.subThoroughfare);
    if (placemark.thoroughfare) parts.push(placemark.thoroughfare);
    if (placemark.locality) parts.push(placemark.locality);
    if (placemark.administrativeArea) parts.push(placemark.administrativeArea);
    if (placemark.postalCode) parts.push(placemark.postalCode);
    if (placemark.country) parts.push(placemark.country);
    const city = placemark.locality || placemark.subLocality || placemark.administrativeArea || '';
    return {
      address: parts.join(', ') || coordinateLabel(lat, lng),
      city: String(city),
    };
  } catch (error) {
    return { address: coordinateLabel(lat, lng), city: '' };
  }
}

async function loadRecentAssets() {
  try {
    if (typeof Photos === 'undefined' || typeof Photos.getRecentPhotos !== 'function') {
      return [];
    }
    const assets = await Photos.getRecentPhotos(CONFIG.recentLimit);
    return Array.isArray(assets) ? assets : [];
  } catch (error) {
    return [];
  }
}

async function scanCameraRoll() {
  const assets = await loadRecentAssets();
  const clusters = [];
  let geotagged = 0;
  for (const asset of assets) {
    try {
      if (asset && asset.isVideo) continue;
      const coords = assetCoords(asset);
      if (!coords) continue;
      geotagged += 1;
      const takenAt = asset.creationDate
        ? new Date(asset.creationDate).toISOString()
        : new Date().toISOString();
      const filename = asset.filename || '';
      let cluster = findCluster(clusters, coords.lat, coords.lng);
      if (!cluster) {
        cluster = {
          id: clusterId(coords.lat, coords.lng),
          lat: coords.lat,
          lng: coords.lng,
          address: '',
          city: '',
          photoCount: 0,
          lastTakenAt: takenAt,
          filenames: [],
        };
        clusters.push(cluster);
      }
      cluster.photoCount += 1;
      if (filename && cluster.filenames.length < 6) cluster.filenames.push(filename);
      if (new Date(takenAt).getTime() >= new Date(cluster.lastTakenAt || 0).getTime()) {
        cluster.lastTakenAt = takenAt;
        cluster.lat = coords.lat;
        cluster.lng = coords.lng;
      }
    } catch (error) {}
  }
  for (const cluster of clusters) {
    const place = await reversePlace(cluster.lat, cluster.lng);
    cluster.address = place.address;
    cluster.city = place.city;
  }
  clusters.sort((a, b) => new Date(b.lastTakenAt || 0) - new Date(a.lastTakenAt || 0));
  return {
    clusters,
    lastScanAt: new Date().toISOString(),
    scannedCount: assets.length,
    geotaggedCount: geotagged,
  };
}

async function currentLocation() {
  try {
    if (typeof Location === 'undefined' || typeof Location.current !== 'function') {
      return null;
    }
    if (typeof Location.setAccuracyToThreeKilometers === 'function') {
      Location.setAccuracyToThreeKilometers();
    }
    return await Location.current();
  } catch (error) {
    return null;
  }
}

async function openInMaps(lat, lng) {
  try {
    if (typeof Maps !== 'undefined' && typeof Maps.openMaps === 'function') {
      Maps.openMaps(lat, lng);
      return;
    }
    if (typeof Maps !== 'undefined' && typeof Maps.search === 'function') {
      Maps.search(coordinateLabel(lat, lng));
    }
  } catch (error) {}
}

async function openDirections(lat, lng) {
  try {
    const origin = await currentLocation();
    if (
      origin
      && typeof Maps !== 'undefined'
      && typeof Maps.openMaps === 'function'
      && Maps.Point
    ) {
      Maps.openMaps(lat, lng, {
        from: new Maps.Point(origin.latitude, origin.longitude),
      });
      return;
    }
    await openInMaps(lat, lng);
  } catch (error) {
    await openInMaps(lat, lng);
  }
}

async function sendMessage(cluster) {
  try {
    if (typeof Messages === 'undefined' || typeof Messages.send !== 'function') return;
    await Messages.send({ recipients: [], body: shareText(cluster) });
  } catch (error) {}
}

async function sendMail(cluster) {
  try {
    if (typeof Mail === 'undefined' || typeof Mail.open !== 'function') return;
    await Mail.open({
      subject: `Lugar del carrete: ${placeTitle(cluster)}`,
      body: shareText(cluster),
    });
  } catch (error) {}
}

async function sharePlace(cluster) {
  try {
    if (typeof ShareSheet !== 'undefined' && typeof ShareSheet.open === 'function') {
      await ShareSheet.open([shareText(cluster)]);
    }
  } catch (error) {}
}

function copyPlace(cluster) {
  try {
    if (typeof Pasteboard !== 'undefined' && typeof Pasteboard.copy === 'function') {
      Pasteboard.copy(shareText(cluster));
    }
  } catch (error) {}
}

async function showNotice(title, message) {
  try {
    const alert = new Alert();
    alert.title = title;
    alert.message = message;
    alert.addAction('OK');
    alert.addCancelAction('Cerrar');
    await alert.presentSheet();
  } catch (error) {}
}

async function presentMainMenu(data) {
  const alert = new Alert();
  alert.title = '📷 Atlas del carrete';
  const latest = latestCluster(data.clusters);
  const latestLine = latest ? placeTitle(latest) : 'Sin lugares todavía';
  alert.message = `${data.clusters.length} sitios · ${data.geotaggedCount} fotos con GPS\n${latestLine}`;
  alert.addAction('🔎 Escanear carrete');
  alert.addAction('🗺️ Ver lugares');
  alert.addAction('📍 Abrir último en Mapas');
  alert.addAction('💬 Enviar último por Mensajes');
  alert.addAction('📤 Compartir último');
  alert.addAction('📋 Copiar último');
  alert.addAction('🗑️ Vaciar atlas');
  alert.addCancelAction('Cerrar');
  return await alert.presentSheet();
}

async function presentClusterActions(cluster) {
  const actions = [
    { label: '🗺️ Abrir en Mapas', run: () => openInMaps(cluster.lat, cluster.lng) },
    { label: '🧭 Indicaciones', run: () => openDirections(cluster.lat, cluster.lng) },
    { label: '💬 Mensajes', run: () => sendMessage(cluster) },
    { label: '✉️ Mail', run: () => sendMail(cluster) },
    { label: '📤 Compartir', run: () => sharePlace(cluster) },
    { label: '📋 Copiar', run: () => { copyPlace(cluster); } },
  ];
  const alert = new Alert();
  alert.title = placeTitle(cluster);
  alert.message = placeBody(cluster);
  for (const action of actions) alert.addAction(action.label);
  alert.addCancelAction('Atrás');
  const tapped = await alert.presentSheet();
  if (tapped >= 0 && tapped < actions.length) {
    try {
      await actions[tapped].run();
    } catch (error) {
      await showNotice('Acción no disponible', error && error.message ? error.message : 'No se pudo completar.');
    }
  }
}

async function presentPlaces(data) {
  if (!data.clusters.length) {
    await showNotice('Sin lugares', 'Escanea el carrete para agrupar fotos con GPS.');
    return;
  }
  const slice = data.clusters.slice(0, CONFIG.maxMenuPlaces);
  const alert = new Alert();
  alert.title = '🗺️ Lugares del carrete';
  alert.message = `${data.clusters.length} sitios agrupados a ${CONFIG.clusterMeters} m`;
  for (const cluster of slice) {
    alert.addAction(`${placeTitle(cluster)} · ${cluster.photoCount}`);
  }
  alert.addCancelAction('Atrás');
  const tapped = await alert.presentSheet();
  if (tapped >= 0 && tapped < slice.length) {
    await presentClusterActions(slice[tapped]);
  }
}

async function handleScan() {
  const scanned = await scanCameraRoll();
  Store.save(scanned);
  await showNotice(
    'Escaneo listo',
    `${scanned.scannedCount} fotos · ${scanned.geotaggedCount} con GPS · ${scanned.clusters.length} sitios`,
  );
  return scanned;
}

function applyGradient(widget) {
  const bg = new LinearGradient();
  bg.colors = [color(THEME.bgTop), color(THEME.bgBottom)];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
}

function addSymbol(stack, name, tint, size) {
  try {
    const symbol = SFSymbol.named(name);
    symbol.applyFont(Font.systemFont(size));
    const image = stack.addImage(symbol.image);
    image.tintColor = tint;
    image.imageSize = new Size(size, size);
  } catch (error) {
    const fallback = stack.addText('📍');
    fallback.font = Font.systemFont(size);
    fallback.textColor = tint;
  }
}

function addChip(parent, label, tintHex) {
  const chip = parent.addStack();
  chip.layoutHorizontally();
  chip.centerAlignContent();
  chip.backgroundColor = color(tintHex, 0.18);
  chip.cornerRadius = 6;
  chip.setPadding(3, 7, 3, 7);
  const text = chip.addText(label);
  text.font = Font.mediumSystemFont(10);
  text.textColor = color(tintHex);
  return chip;
}

function addHeader(widget, family) {
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  addSymbol(row, 'camera.viewfinder', color(THEME.accent), family === 'small' ? 14 : 16);
  row.addSpacer(6);
  const title = row.addText('Atlas del carrete');
  title.font = Font.boldSystemFont(family === 'small' ? 13 : 15);
  title.textColor = color(THEME.text);
  row.addSpacer();
}

function addClusterRow(parent, cluster, compact) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = color('#FFFFFF', 0.07);
  row.cornerRadius = 10;
  row.setPadding(compact ? 6 : 8, 10, compact ? 6 : 8, 10);
  const pin = row.addText('📍');
  pin.font = Font.systemFont(compact ? 12 : 14);
  row.addSpacer(8);
  const col = row.addStack();
  col.layoutVertically();
  const name = col.addText(placeTitle(cluster));
  name.font = Font.mediumSystemFont(compact ? 11 : 13);
  name.textColor = color(THEME.text);
  name.lineLimit = 1;
  if (!compact && cluster.address) {
    const sub = col.addText(cluster.address);
    sub.font = Font.systemFont(10);
    sub.textColor = color(THEME.textMuted);
    sub.lineLimit = 1;
  }
  row.addSpacer();
  const meta = row.addStack();
  meta.layoutVertically();
  const count = meta.addText(String(cluster.photoCount || 1));
  count.font = Font.boldSystemFont(compact ? 12 : 14);
  count.textColor = color(THEME.accent);
  const when = meta.addText(formatWhen(cluster.lastTakenAt));
  when.font = Font.systemFont(9);
  when.textColor = color(THEME.textMuted);
}

function buildWidget(data, family) {
  const widget = new ListWidget();
  applyGradient(widget);
  widget.setPadding(12, 14, 12, 14);
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  addHeader(widget, family);
  widget.addSpacer(8);
  const latest = latestCluster(data.clusters);
  if (family === 'small') {
    const focus = widget.addText(latest ? placeTitle(latest) : 'Sin lugares');
    focus.font = Font.boldSystemFont(16);
    focus.textColor = color(THEME.text);
    focus.lineLimit = 2;
    widget.addSpacer(6);
    const stats = widget.addText(
      latest
        ? `${data.clusters.length} sitios · ${data.geotaggedCount} GPS`
        : 'Abre el script y escanea el carrete',
    );
    stats.font = Font.systemFont(11);
    stats.textColor = color(THEME.textMuted);
    stats.lineLimit = 2;
    return widget;
  }
  const chips = widget.addStack();
  chips.layoutHorizontally();
  addChip(chips, `${data.clusters.length} sitios`, THEME.accent);
  chips.addSpacer(6);
  addChip(chips, `${data.geotaggedCount} GPS`, THEME.success);
  chips.addSpacer(6);
  addChip(chips, `${uniqueCities(data.clusters)} ciudades`, THEME.warning);
  widget.addSpacer(10);
  const limit = family === 'large' ? 6 : 3;
  const rows = data.clusters.slice(0, limit);
  if (rows.length === 0) {
    const empty = widget.addText('No hay fotos geotagged. Ejecuta el script y pulsa Escanear carrete.');
    empty.font = Font.systemFont(12);
    empty.textColor = color(THEME.textMuted);
    empty.lineLimit = 4;
    return widget;
  }
  for (let i = 0; i < rows.length; i++) {
    addClusterRow(widget, rows[i], family !== 'large');
    if (i < rows.length - 1) widget.addSpacer(6);
  }
  if (family === 'large') {
    widget.addSpacer();
    const footer = widget.addText(
      data.lastScanAt ? `Último escaneo ${formatWhen(data.lastScanAt)}` : 'Aún no se ha escaneado el carrete',
    );
    footer.font = Font.systemFont(10);
    footer.textColor = color(THEME.textMuted);
  }
  return widget;
}

function buildErrorWidget() {
  const widget = new ListWidget();
  applyGradient(widget);
  const title = widget.addText('⚠️ Atlas del carrete');
  title.font = Font.boldSystemFont(14);
  title.textColor = color(THEME.text);
  widget.addSpacer(6);
  const body = widget.addText('Toca para reintentar');
  body.font = Font.systemFont(12);
  body.textColor = color(THEME.textMuted);
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.retryMinutes * 60000);
  return widget;
}

async function runAsWidget() {
  try {
    const data = Store.load();
    const family = config.widgetFamily || 'medium';
    Script.setWidget(buildWidget(data, family));
  } catch (error) {
    Script.setWidget(buildErrorWidget());
  }
}

async function runAsUtility() {
  let data = Store.load();
  let running = true;
  while (running) {
    const choice = await presentMainMenu(data);
    if (choice < 0) {
      running = false;
      continue;
    }
    const latest = latestCluster(data.clusters);
    if (choice === 0) {
      data = await handleScan();
    } else if (choice === 1) {
      await presentPlaces(data);
    } else if (choice === 2) {
      if (!latest) await showNotice('Sin lugares', 'Escanea el carrete primero.');
      else await openInMaps(latest.lat, latest.lng);
    } else if (choice === 3) {
      if (!latest) await showNotice('Sin lugares', 'Escanea el carrete primero.');
      else await sendMessage(latest);
    } else if (choice === 4) {
      if (!latest) await showNotice('Sin lugares', 'Escanea el carrete primero.');
      else await sharePlace(latest);
    } else if (choice === 5) {
      if (!latest) await showNotice('Sin lugares', 'Escanea el carrete primero.');
      else {
        copyPlace(latest);
        await showNotice('Copiado', shareText(latest));
      }
    } else if (choice === 6) {
      data = Store.empty();
      Store.save(data);
      await showNotice('Atlas vacío', 'Se han borrado los lugares guardados.');
    }
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
      Script.setWidget(buildErrorWidget());
    } else {
      const alert = new Alert();
      alert.title = 'Error';
      alert.message = (error && error.message) || 'Error inesperado.';
      alert.addCancelAction('Cerrar');
      await alert.present();
    }
  }
  Script.complete();
}

await run();
