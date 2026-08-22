const STORE_KEY = 'presence-scene-hub.json'
const fm = FileManager.local()
const storePath = fm.joinPath(fm.documentsDirectory(), STORE_KEY)

const C = {
  background: new Color('#0A1014'),
  backgroundDeep: new Color('#122026'),
  card: new Color('#1A2830'),
  surface: new Color('#24343C'),
  text: new Color('#E8F1F2'),
  secondary: new Color('#8BA3A8'),
  muted: new Color('#5C7378'),
  accent: new Color('#2DD4BF'),
  success: new Color('#17C964'),
  warning: new Color('#F5A524'),
  error: new Color('#F31260'),
}

const WMO = {
  '0': ['☀️', 'despejado'],
  '1': ['🌤️', 'mayormente despejado'],
  '2': ['⛅', 'parcialmente nublado'],
  '3': ['☁️', 'nublado'],
  '45': ['🌫️', 'niebla'],
  '48': ['🌫️', 'niebla helada'],
  '51': ['🌦️', 'llovizna ligera'],
  '53': ['🌦️', 'llovizna'],
  '55': ['🌧️', 'llovizna densa'],
  '61': ['🌧️', 'lluvia ligera'],
  '63': ['🌧️', 'lluvia'],
  '65': ['🌧️', 'lluvia fuerte'],
  '71': ['🌨️', 'nieve ligera'],
  '73': ['🌨️', 'nieve'],
  '75': ['❄️', 'nieve fuerte'],
  '80': ['🌦️', 'chubascos ligeros'],
  '81': ['🌧️', 'chubascos'],
  '82': ['⛈️', 'chubascos fuertes'],
  '95': ['⛈️', 'tormenta'],
  '96': ['⛈️', 'tormenta con granizo'],
  '99': ['⛈️', 'tormenta con granizo'],
}

const SCENES = {
  arrive: {
    key: 'arrive',
    label: 'Casa',
    emoji: '🏠',
    symbol: 'house.fill',
    greeting: 'Modo casa activado',
  },
  leave: {
    key: 'leave',
    label: 'Salida',
    emoji: '🚪',
    symbol: 'figure.walk.departure',
    greeting: 'Modo salida activado',
  },
  commute: {
    key: 'commute',
    label: 'Trayecto',
    emoji: '🚇',
    symbol: 'tram.fill',
    greeting: 'Buen trayecto',
  },
  focus: {
    key: 'focus',
    label: 'Foco',
    emoji: '🎯',
    symbol: 'target',
    greeting: 'Sesión de foco lista',
  },
  meeting: {
    key: 'meeting',
    label: 'Reunión',
    emoji: '📅',
    symbol: 'calendar.badge.clock',
    greeting: 'Preparando la reunión',
  },
  rest: {
    key: 'rest',
    label: 'Descanso',
    emoji: '🌙',
    symbol: 'moon.stars.fill',
    greeting: 'Modo descanso activado',
  },
}

const COMMAND_ROUTES = {
  battery: 'battery',
  bateria: 'battery',
  briefing: 'briefing',
  resumen: 'briefing',
  manana: 'briefing',
  morning: 'briefing',
  buenosdias: 'briefing',
  next: 'next',
  siguiente: 'next',
  evento: 'next',
  proximoevento: 'next',
  weather: 'weather',
  tiempo: 'weather',
  clima: 'weather',
  status: 'status',
  estado: 'status',
  dispositivo: 'status',
  schedule: 'schedule',
  programar: 'schedule',
  plan: 'schedule',
  planificar: 'schedule',
  history: 'history',
  historial: 'history',
  log: 'history',
  capture: 'capture',
  capturar: 'capture',
  captura: 'capture',
  nota: 'capture',
  note: 'capture',
  help: 'help',
  ayuda: 'help',
  lista: 'help',
  list: 'help',
  casa: 'arrive',
  home: 'arrive',
  llego: 'arrive',
  llegada: 'arrive',
  arrive: 'arrive',
  salgo: 'leave',
  leave: 'leave',
  salida: 'leave',
  away: 'leave',
  trayecto: 'commute',
  commute: 'commute',
  voy: 'commute',
  camino: 'commute',
  foco: 'focus',
  focus: 'focus',
  concentracion: 'focus',
  reunion: 'meeting',
  meeting: 'meeting',
  junta: 'meeting',
  descanso: 'rest',
  rest: 'rest',
  sleep: 'rest',
  noche: 'rest',
}

function loadStore() {
  try {
    if (fm.fileExists(storePath)) {
      const parsed = JSON.parse(fm.readString(storePath))
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch (_) {}
  return {
    currentScene: null,
    lastSceneAt: null,
    coordinates: null,
    history: [],
    plannedTriggers: [],
  }
}

function saveStore() {
  try {
    fm.writeString(storePath, JSON.stringify(store, null, 2))
  } catch (_) {}
}

const store = loadStore()

function normalizeCommand(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function formatTime(value) {
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatAgo(isoString) {
  if (!isoString) return 'nunca'
  const minutes = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)
  if (Number.isNaN(minutes) || minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

function formatToday() {
  const now = new Date()
  const weekdays = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${weekdays[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`
}

function hourContext() {
  const hour = new Date().getHours()
  if (hour < 6) return { key: 'night', label: 'Madrugada', emoji: '🌌' }
  if (hour < 12) return { key: 'morning', label: 'Mañana', emoji: '🌅' }
  if (hour < 18) return { key: 'day', label: 'Tarde', emoji: '☀️' }
  if (hour < 22) return { key: 'evening', label: 'Atardecer', emoji: '🌇' }
  return { key: 'night', label: 'Noche', emoji: '🌙' }
}

function suggestedScene() {
  const hour = new Date().getHours()
  if (hour < 7 || hour >= 22) return 'rest'
  if (hour < 9) return 'commute'
  if (hour < 13) return 'focus'
  if (hour < 18) return 'meeting'
  if (hour < 20) return 'commute'
  return 'arrive'
}

function logHistory(command, ok) {
  try {
    store.history = store.history || []
    store.history.unshift({
      time: new Date().toISOString(),
      command,
      ok: Boolean(ok),
    })
    if (store.history.length > 30) store.history.length = 30
    saveStore()
  } catch (_) {}
}

function resolveRoute(param, note) {
  if (param !== null && param !== undefined && String(param).trim() !== '') {
    const key = normalizeCommand(param)
    return COMMAND_ROUTES[key] || 'capture'
  }
  if (note) return 'capture'
  return 'help'
}

async function resolveCoordinates() {
  const cached = store.coordinates
  if (cached && Date.now() - cached.recordedAt < 3600000) return cached
  try {
    Location.setAccuracyToThreeKilometers()
    const location = await Promise.race([
      Location.current(),
      new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ])
    if (location && location.latitude !== undefined && location.longitude !== undefined) {
      const fresh = {
        latitude: location.latitude,
        longitude: location.longitude,
        recordedAt: Date.now(),
      }
      store.coordinates = fresh
      saveStore()
      return fresh
    }
  } catch (_) {}
  try {
    const request = new Request('http://ip-api.com/json?fields=lat,lon')
    request.timeoutInterval = 8
    const data = await request.loadJSON()
    if (data && data.lat !== undefined && data.lon !== undefined) {
      const fresh = { latitude: data.lat, longitude: data.lon, recordedAt: Date.now() }
      store.coordinates = fresh
      saveStore()
      return fresh
    }
  } catch (_) {}
  return { latitude: 40.4168, longitude: -3.7038, recordedAt: Date.now() }
}

async function loadWeather() {
  try {
    const coordinates = await resolveCoordinates()
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&current=temperature_2m,apparent_temperature,weather_code,weathercode,relative_humidity_2m,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=2&timezone=auto`
    const request = new Request(url)
    request.timeoutInterval = 10
    const data = await request.loadJSON()
    const current = data.current || {}
    const temp = Math.round(current.temperature_2m ?? 21)
    const code = current.weather_code ?? current.weathercode ?? 0
    const pair = WMO[String(code)] || WMO['0']
    const daily = data.daily || {}
    const maxTemp = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : null
    const minTemp = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : null
    const rain = daily.precipitation_probability_max ? Math.round(daily.precipitation_probability_max[0]) : null
    const rangeText = maxTemp !== null && minTemp !== null ? ` · ${minTemp}°/${maxTemp}°` : ''
    const rainText = rain !== null ? ` · 💧${rain}%` : ''
    return {
      emoji: pair[0],
      title: 'Clima',
      line: `${temp}° ${pair[1]}${rangeText}${rainText}`,
      speech: `${pair[1]}, ${temp} grados${maxTemp !== null ? `, máxima ${maxTemp}` : ''}`,
      temp,
    }
  } catch (_) {
    return { emoji: '🌡️', title: 'Clima', line: 'Sin datos', speech: 'No pude obtener el clima', temp: null }
  }
}

async function loadNextEvent() {
  try {
    const start = new Date()
    const end = new Date()
    end.setDate(end.getDate() + 1)
    end.setHours(23, 59, 59)
    const events = await CalendarEvent.between(start, end)
    const upcoming = (events || [])
      .filter((event) => new Date(event.startDate).getTime() >= Date.now())
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    const next = upcoming[0]
    if (!next) {
      return { emoji: '📅', title: 'Siguiente evento', line: 'Ninguno próximo', speech: 'No hay eventos próximos', event: null }
    }
    return {
      emoji: '📅',
      title: 'Siguiente evento',
      line: `${formatTime(next.startDate)} ${next.title}`,
      speech: `Siguiente evento a las ${formatTime(next.startDate)}: ${next.title}`,
      event: next,
    }
  } catch (_) {
    return { emoji: '📅', title: 'Siguiente evento', line: 'No disponible', speech: 'No pude leer el calendario', event: null }
  }
}

async function loadRemindersSummary() {
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const dueToday = await Reminder.allDueBetween(start, end)
    const openAll = await Reminder.allIncomplete()
    const count = (openAll || []).length
    const titles = (dueToday || []).slice(0, 3).map((item) => item.title).filter(Boolean)
    if (count === 0 && titles.length === 0) {
      return { emoji: '📌', title: 'Recordatorios', line: 'Nada pendiente', speech: 'No tienes recordatorios pendientes', count: 0 }
    }
    const line = titles.length > 0 ? titles.join(' · ') : `${count} abiertos`
    return {
      emoji: '📌',
      title: 'Recordatorios',
      line,
      speech: `${count} recordatorios pendientes`,
      count,
    }
  } catch (_) {
    return { emoji: '📌', title: 'Recordatorios', line: 'No disponible', speech: 'No pude leer los recordatorios', count: null }
  }
}

async function loadBattery() {
  try {
    const level = Device.batteryLevel()
    const charging = Device.isCharging()
    if (level < 0) {
      return { emoji: '🔋', title: 'Batería', line: 'No disponible', speech: 'Nivel de batería no disponible', percent: null, charging: false }
    }
    const percent = Math.round(level * 100)
    const emoji = percent > 70 ? '🟢' : percent > 30 ? '🟡' : '🔴'
    const state = charging ? 'cargando' : 'batería'
    return {
      emoji,
      title: 'Batería',
      line: `${percent}% · ${state}`,
      speech: `Batería al ${percent} por ciento${charging ? ', cargando' : ''}`,
      percent,
      charging,
    }
  } catch (_) {
    return { emoji: '🔋', title: 'Batería', line: 'No disponible', speech: 'Batería no disponible', percent: null, charging: false }
  }
}

async function loadDeviceStatus() {
  try {
    const wifi = Device.wifiNetwork()
    const model = Device.model()
    const version = Device.systemVersion()
    const name = Device.name()
    return {
      wifi: wifi || 'sin wifi',
      model: model || 'iOS',
      version: version || '',
      name: name || 'iPhone',
    }
  } catch (_) {
    return { wifi: 'sin wifi', model: 'iOS', version: '', name: 'iPhone' }
  }
}

function packResult(lines, speeches) {
  return {
    output: lines.filter(Boolean).join('\n'),
    speech: speeches.filter(Boolean).join('. '),
  }
}

async function runBatteryReport() {
  const battery = await loadBattery()
  return packResult(
    [`${battery.emoji} ${battery.title}: ${battery.line}`],
    [battery.speech],
  )
}

async function runWeatherReport() {
  const weather = await loadWeather()
  return packResult(
    [`${weather.emoji} ${weather.title}: ${weather.line}`],
    [weather.speech],
  )
}

async function runNextReport() {
  const next = await loadNextEvent()
  return packResult(
    [`${next.emoji} ${next.title}: ${next.line}`],
    [next.speech],
  )
}

async function runBriefingReport() {
  const context = hourContext()
  const [weather, next, reminders, battery] = await Promise.all([
    loadWeather().catch(() => null),
    loadNextEvent().catch(() => null),
    loadRemindersSummary().catch(() => null),
    loadBattery().catch(() => null),
  ])
  const lines = [`${context.emoji} Briefing ${context.label} · ${formatToday()}`]
  const speeches = [`Briefing de ${context.label.toLowerCase()}`]
  for (const block of [weather, next, reminders, battery]) {
    if (!block) continue
    lines.push(`${block.emoji} ${block.title}: ${block.line}`)
    speeches.push(block.speech)
  }
  return packResult(lines, speeches)
}

async function runStatusReport() {
  const context = hourContext()
  const scene = SCENES[store.currentScene]
  const [battery, next, reminders, device] = await Promise.all([
    loadBattery().catch(() => null),
    loadNextEvent().catch(() => null),
    loadRemindersSummary().catch(() => null),
    loadDeviceStatus().catch(() => null),
  ])
  const sceneLine = scene
    ? `${scene.emoji} Escena: ${scene.label} (${formatAgo(store.lastSceneAt)})`
    : '⚪ Sin escena activa'
  const lines = [
    `📊 Estado · ${context.emoji} ${context.label}`,
    sceneLine,
    device ? `📱 ${device.name} · ${device.model} · iOS ${device.version}` : null,
    device ? `📡 ${device.wifi}` : null,
    battery ? `${battery.emoji} ${battery.line}` : null,
    next ? `${next.emoji} ${next.line}` : null,
    reminders ? `${reminders.emoji} ${reminders.line}` : null,
  ]
  const speeches = [
    `Estado del dispositivo. ${scene ? `Escena ${scene.label}` : 'Sin escena activa'}`,
    battery ? battery.speech : null,
    next ? next.speech : null,
    reminders ? reminders.speech : null,
  ]
  return packResult(lines, speeches)
}

async function runHistoryReport() {
  const entries = store.history || []
  if (entries.length === 0) {
    return packResult(['📜 Historial vacío'], ['No hay ejecuciones recientes'])
  }
  const shown = entries.slice(0, 10)
  const lines = ['📜 Últimas ejecuciones', ...shown.map((entry) => `${entry.ok ? '✅' : '❌'} ${formatTime(entry.time)} ${entry.command}`)]
  const speeches = [`Hay ${entries.length} ejecuciones. La última fue ${shown[0].command}`]
  return packResult(lines, speeches)
}

function runHelpReport() {
  const lines = [
    '🎛️ Presence Scene Hub',
    'Escenas: casa, salgo, trayecto, foco, reunión, descanso',
    'Consultas: briefing, tiempo, siguiente, batería, estado',
    'Acciones: capturar, programar, historial',
  ]
  const speech = 'Puedes pedir casa, salgo, trayecto, foco, reunión, descanso, briefing, tiempo, siguiente evento, batería, estado, capturar una nota, programar avisos o ver el historial'
  return packResult(lines, [speech])
}

async function captureNote(note) {
  const title = (note && String(note).trim()) || 'Nota rápida'
  try {
    const reminder = new Reminder()
    reminder.title = title
    reminder.notes = `Capturado ${new Date().toLocaleString('es-ES')} vía Presence Scene Hub`
    await reminder.save()
    return packResult(
      [`✅ Capturado: ${title}`],
      [`He guardado el recordatorio ${title}`],
    )
  } catch (_) {
    return packResult(
      [`⚠️ No pude guardar: ${title}`],
      ['No pude guardar el recordatorio'],
    )
  }
}

function tomorrowAt(hours, minutes) {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function scheduleSceneNotifications() {
  const planned = []
  try {
    const morning = tomorrowAt(8, 0)
    const evening = tomorrowAt(22, 0)
    const briefingNote = new Notification()
    briefingNote.title = '🌅 Briefing de presencia'
    briefingNote.body = 'Toca para ejecutar el briefing de la mañana'
    briefingNote.sound = 'default'
    briefingNote.scriptName = Script.name()
    briefingNote.setTriggerDate(morning)
    await briefingNote.schedule()
    planned.push({ scene: 'briefing', date: morning.toISOString() })
    const restNote = new Notification()
    restNote.title = '🌙 Modo descanso'
    restNote.body = 'Toca para cerrar el día'
    restNote.sound = 'default'
    restNote.scriptName = Script.name()
    restNote.setTriggerDate(evening)
    await restNote.schedule()
    planned.push({ scene: 'rest', date: evening.toISOString() })
    store.plannedTriggers = planned
    saveStore()
    return packResult(
      ['⏰ Avisos programados', `08:00 briefing · 22:00 descanso`],
      ['He programado el briefing de las ocho y el descanso de las diez de la noche'],
    )
  } catch (_) {
    return packResult(['⚠️ No pude programar avisos'], ['No pude programar las notificaciones'])
  }
}

async function activateScene(sceneKey) {
  const scene = SCENES[sceneKey]
  if (!scene) return runHelpReport()
  store.currentScene = sceneKey
  store.lastSceneAt = new Date().toISOString()
  saveStore()
  const [weather, next, reminders, battery] = await Promise.all([
    loadWeather().catch(() => null),
    loadNextEvent().catch(() => null),
    loadRemindersSummary().catch(() => null),
    loadBattery().catch(() => null),
  ])
  const lines = [`${scene.emoji} ${scene.label}`, scene.greeting]
  const speeches = [scene.greeting]
  if (sceneKey === 'arrive' && reminders) {
    lines.push(`${reminders.emoji} ${reminders.line}`)
    speeches.push(reminders.speech)
    if (battery) {
      lines.push(`${battery.emoji} ${battery.line}`)
      speeches.push(battery.speech)
    }
  } else if (sceneKey === 'leave') {
    if (next) {
      lines.push(`${next.emoji} ${next.line}`)
      speeches.push(next.speech)
    }
    if (battery) {
      lines.push(`${battery.emoji} ${battery.line}`)
      speeches.push(battery.percent !== null && battery.percent < 25 ? `Batería baja al ${battery.percent} por ciento` : battery.speech)
    }
  } else if (sceneKey === 'commute') {
    if (weather) {
      lines.push(`${weather.emoji} ${weather.line}`)
      speeches.push(weather.speech)
    }
    if (next) {
      lines.push(`${next.emoji} ${next.line}`)
      speeches.push(next.speech)
    }
  } else if (sceneKey === 'focus') {
    if (reminders) {
      lines.push(`${reminders.emoji} ${reminders.line}`)
      speeches.push(reminders.speech)
    }
    try {
      const endFocus = new Notification()
      endFocus.title = '🎯 Fin de foco'
      endFocus.body = '50 minutos de concentración. Toca para cambiar de escena'
      endFocus.sound = 'default'
      endFocus.scriptName = Script.name()
      endFocus.setTriggerDate(new Date(Date.now() + 50 * 60 * 1000))
      await endFocus.schedule()
      lines.push('⏰ Aviso de foco en 50 min')
      speeches.push('Te aviso en cincuenta minutos')
    } catch (_) {}
  } else if (sceneKey === 'meeting') {
    if (next && next.event) {
      lines.push(`${next.emoji} ${next.line}`)
      speeches.push(next.speech)
    } else if (next) {
      lines.push(`${next.emoji} Sin reunión próxima`)
      speeches.push('No hay una reunión inmediata en el calendario')
    }
    if (battery) {
      lines.push(`${battery.emoji} ${battery.line}`)
      speeches.push(battery.speech)
    }
  } else if (sceneKey === 'rest') {
    if (next) {
      lines.push(`Mañana · ${next.line}`)
      speeches.push(`Mañana: ${next.speech}`)
    }
    if (reminders) {
      lines.push(`${reminders.emoji} ${reminders.line}`)
      speeches.push(reminders.speech)
    }
  }
  return packResult(lines, speeches)
}

async function executeRoute(route, note) {
  if (route === 'battery') return runBatteryReport()
  if (route === 'weather') return runWeatherReport()
  if (route === 'next') return runNextReport()
  if (route === 'briefing') return runBriefingReport()
  if (route === 'status') return runStatusReport()
  if (route === 'history') return runHistoryReport()
  if (route === 'help') return runHelpReport()
  if (route === 'capture') return captureNote(note)
  if (route === 'schedule') return scheduleSceneNotifications()
  if (SCENES[route]) return activateScene(route)
  return runHelpReport()
}

function addSymbol(stack, name, color, size) {
  try {
    const symbol = SFSymbol.named(name)
    if (symbol && typeof symbol.applyFont === 'function') {
      symbol.applyFont(Font.systemFont(size))
    }
    const image = stack.addImage(symbol.image)
    image.tintColor = color
    image.imageSize = new Size(size, size)
  } catch (_) {
    const fallback = stack.addText('●')
    fallback.font = Font.boldSystemFont(size)
    fallback.textColor = color
  }
}

function applyBackground(widget) {
  const background = new LinearGradient()
  background.colors = [C.background, C.backgroundDeep]
  background.locations = [0, 1]
  widget.backgroundGradient = background
  widget.setPadding(12, 14, 12, 14)
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000)
}

function addHeader(widget, title) {
  const row = widget.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  addSymbol(row, 'point.3.filled.connected.trianglepath.dotted', C.accent, 14)
  row.addSpacer(6)
  const label = row.addText(title)
  label.font = Font.boldSystemFont(13)
  label.textColor = C.text
  row.addSpacer()
  const stamp = row.addText(formatTime(new Date()))
  stamp.font = Font.mediumSystemFont(11)
  stamp.textColor = C.secondary
}

function addCard(parent, emoji, title, line, color) {
  const card = parent.addStack()
  card.layoutHorizontally()
  card.centerAlignContent()
  card.backgroundColor = C.card
  card.cornerRadius = 10
  card.setPadding(7, 9, 7, 9)
  const mark = card.addText(emoji)
  mark.font = Font.systemFont(14)
  card.addSpacer(8)
  const col = card.addStack()
  col.layoutVertically()
  const heading = col.addText(title)
  heading.font = Font.mediumSystemFont(10)
  heading.textColor = color || C.accent
  const body = col.addText(line)
  body.font = Font.systemFont(11)
  body.textColor = C.text
  body.lineLimit = 1
  return card
}

function addChip(parent, text, color) {
  const chip = parent.addStack()
  chip.layoutHorizontally()
  chip.centerAlignContent()
  chip.backgroundColor = C.surface
  chip.cornerRadius = 7
  chip.setPadding(4, 7, 4, 7)
  const label = chip.addText(text)
  label.font = Font.mediumSystemFont(9)
  label.textColor = color || C.text
  return chip
}

function buildSmallWidget(widget, battery, nextEvent) {
  const scene = SCENES[store.currentScene] || SCENES[suggestedScene()]
  const context = hourContext()
  addHeader(widget, 'Presencia')
  widget.addSpacer(8)
  const hero = widget.addStack()
  hero.layoutVertically()
  const emoji = hero.addText(scene.emoji)
  emoji.font = Font.systemFont(26)
  const name = hero.addText(scene.label)
  name.font = Font.boldSystemFont(16)
  name.textColor = C.text
  const meta = hero.addText(`${context.emoji} ${context.label}`)
  meta.font = Font.systemFont(10)
  meta.textColor = C.secondary
  widget.addSpacer()
  const chips = widget.addStack()
  chips.layoutHorizontally()
  if (battery) addChip(chips, battery.line, battery.percent !== null && battery.percent < 25 ? C.warning : C.success)
  chips.addSpacer(4)
  if (nextEvent) addChip(chips, nextEvent.event ? formatTime(nextEvent.event.startDate) : '—', C.accent)
}

function buildMediumWidget(widget, battery, nextEvent, reminders) {
  const scene = SCENES[store.currentScene]
  const context = hourContext()
  addHeader(widget, 'Presence Hub')
  widget.addSpacer(8)
  const top = widget.addStack()
  top.layoutHorizontally()
  top.centerAlignContent()
  const hero = top.addStack()
  hero.layoutVertically()
  const title = hero.addText(scene ? `${scene.emoji} ${scene.label}` : `${context.emoji} ${context.label}`)
  title.font = Font.boldSystemFont(16)
  title.textColor = C.text
  const sub = hero.addText(scene ? formatAgo(store.lastSceneAt) : `Sugerida: ${SCENES[suggestedScene()].label}`)
  sub.font = Font.systemFont(10)
  sub.textColor = C.secondary
  top.addSpacer()
  if (battery) addChip(top, battery.line, C.success)
  widget.addSpacer(8)
  const chips = widget.addStack()
  chips.layoutHorizontally()
  const keys = ['arrive', 'leave', 'commute', 'focus']
  keys.forEach((key, index) => {
    const item = SCENES[key]
    addChip(chips, `${item.emoji} ${item.label}`, store.currentScene === key ? C.accent : C.text)
    if (index < keys.length - 1) chips.addSpacer(4)
  })
  widget.addSpacer(8)
  if (nextEvent) addCard(widget, nextEvent.emoji, nextEvent.title, nextEvent.line, C.accent)
  if (reminders) {
    widget.addSpacer(6)
    addCard(widget, reminders.emoji, reminders.title, reminders.line, C.warning)
  }
}

function buildLargeWidget(widget, battery, nextEvent, reminders) {
  const context = hourContext()
  addHeader(widget, 'Presence Scene Hub')
  widget.addSpacer(8)
  const intro = widget.addText(`${context.emoji} ${context.label} · escena sugerida ${SCENES[suggestedScene()].label}`)
  intro.font = Font.systemFont(11)
  intro.textColor = C.secondary
  widget.addSpacer(8)
  const grid = widget.addStack()
  grid.layoutHorizontally()
  const left = grid.addStack()
  left.layoutVertically()
  const right = grid.addStack()
  right.layoutVertically()
  const keys = Object.keys(SCENES)
  keys.forEach((key, index) => {
    const scene = SCENES[key]
    const last = (store.history || []).find((entry) => entry.command === key)
    const target = index % 2 === 0 ? left : right
    addCard(
      target,
      scene.emoji,
      scene.label,
      last ? `${last.ok ? '✅' : '❌'} ${formatAgo(last.time)}` : 'sin usar',
      store.currentScene === key ? C.accent : C.secondary,
    )
    target.addSpacer(6)
  })
  grid.addSpacer()
  widget.addSpacer(4)
  if (nextEvent) addCard(widget, nextEvent.emoji, nextEvent.title, nextEvent.line, C.accent)
  widget.addSpacer(6)
  const bottom = widget.addStack()
  bottom.layoutHorizontally()
  if (battery) {
    addCard(bottom, battery.emoji, battery.title, battery.line, C.success)
    bottom.addSpacer(6)
  }
  if (reminders) addCard(bottom, reminders.emoji, reminders.title, reminders.line, C.warning)
  const recent = (store.history || []).slice(0, 3)
  if (recent.length > 0) {
    widget.addSpacer(8)
    const footer = widget.addText(recent.map((entry) => `${entry.ok ? '✅' : '❌'} ${entry.command}`).join('   '))
    footer.font = Font.systemFont(10)
    footer.textColor = C.muted
    footer.lineLimit = 1
  }
}

function renderErrorWidget() {
  const widget = new ListWidget()
  const background = new LinearGradient()
  background.colors = [new Color('#1A1A2E'), new Color('#0F0C29')]
  background.locations = [0, 1]
  widget.backgroundGradient = background
  const title = widget.addText('⚠️ Presence Hub')
  title.font = Font.boldSystemFont(14)
  title.textColor = C.text
  const message = widget.addText('Error al renderizar. Toca para reintentar')
  message.font = Font.systemFont(10)
  message.textColor = C.secondary
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  widget.refreshAfterDate = new Date(Date.now() + 600000)
  Script.setWidget(widget)
  Script.complete()
}

async function runAsWidget() {
  const widget = new ListWidget()
  applyBackground(widget)
  const [battery, nextEvent, reminders] = await Promise.all([
    loadBattery().catch(() => null),
    loadNextEvent().catch(() => null),
    loadRemindersSummary().catch(() => null),
  ])
  const family = config.widgetFamily
  if (family === 'small') {
    buildSmallWidget(widget, battery, nextEvent)
  } else if (family === 'medium') {
    buildMediumWidget(widget, battery, nextEvent, reminders)
  } else {
    buildLargeWidget(widget, battery, nextEvent, reminders)
  }
  Script.setWidget(widget)
  Script.complete()
}

async function showResult(title, result) {
  const alert = new Alert()
  alert.title = title
  alert.message = result.output
  alert.addAction('🔊 Leer')
  alert.addCancelAction('Cerrar')
  const choice = await alert.present()
  if (choice === 0) {
    try {
      await Speech.speak(result.speech)
    } catch (_) {}
  }
}

async function promptCapture() {
  const alert = new Alert()
  alert.title = '📌 Capturar nota'
  alert.message = 'Texto para el recordatorio'
  alert.addTextField('Comprar leche…')
  alert.addAction('Guardar')
  alert.addCancelAction('Cancelar')
  const choice = await alert.present()
  if (choice === 0) {
    const value = alert.textFieldValue(0)
    await showResult('📌 Captura', await captureNote(value))
  }
}

async function runAsUtility() {
  const menu = new Alert()
  menu.title = '🎛️ Presence Scene Hub'
  menu.message = 'Activa una escena o lanza una automatización Siri / Shortcuts'
  menu.addAction('🏠 Casa')
  menu.addAction('🚪 Salida')
  menu.addAction('🚇 Trayecto')
  menu.addAction('🎯 Foco')
  menu.addAction('📅 Reunión')
  menu.addAction('🌙 Descanso')
  menu.addAction('🌅 Briefing')
  menu.addAction('📊 Estado')
  menu.addAction('📌 Capturar nota')
  menu.addAction('⏰ Programar avisos')
  menu.addAction('📜 Historial')
  menu.addCancelAction('✖️ Cerrar')
  const choice = await menu.presentSheet()
  if (choice === 0) await showResult('🏠 Casa', await activateScene('arrive'))
  else if (choice === 1) await showResult('🚪 Salida', await activateScene('leave'))
  else if (choice === 2) await showResult('🚇 Trayecto', await activateScene('commute'))
  else if (choice === 3) await showResult('🎯 Foco', await activateScene('focus'))
  else if (choice === 4) await showResult('📅 Reunión', await activateScene('meeting'))
  else if (choice === 5) await showResult('🌙 Descanso', await activateScene('rest'))
  else if (choice === 6) await showResult('🌅 Briefing', await runBriefingReport())
  else if (choice === 7) await showResult('📊 Estado', await runStatusReport())
  else if (choice === 8) await promptCapture()
  else if (choice === 9) await showResult('⏰ Avisos', await scheduleSceneNotifications())
  else if (choice === 10) await showResult('📜 Historial', await runHistoryReport())
}

async function runAsAutomation() {
  const param = args.shortcutParameter
  const note = args.plainTexts && args.plainTexts[0] ? String(args.plainTexts[0]).trim() : ''
  const route = resolveRoute(param, note)
  const result = await executeRoute(route, note)
  logHistory(route, true)
  try {
    Script.setShortcutOutput(result.output)
  } catch (_) {}
  try {
    await Speech.speak(result.speech)
  } catch (_) {}
}

try {
  if (config.runsInWidget) {
    await runAsWidget()
  } else if (config.runsInApp !== false) {
    await runAsUtility()
  } else {
    await runAsAutomation()
  }
} catch (error) {
  if (config.runsInWidget) {
    renderErrorWidget()
  } else if (config.runsInApp !== false) {
    try {
      const alert = new Alert()
      alert.title = 'Error'
      alert.message = (error && error.message) || 'Error inesperado'
      alert.addCancelAction('Cerrar')
      await alert.present()
    } catch (_) {}
  } else {
    try {
      Script.setShortcutOutput('error: ' + ((error && error.message) || 'fallo'))
      await Speech.speak('La automatización falló')
    } catch (_) {}
  }
}
