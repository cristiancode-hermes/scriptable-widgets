const STORE_KEY = 'cue-dispatcher.json'
const fm = FileManager.local()
const storePath = fm.joinPath(fm.documentsDirectory(), STORE_KEY)

const C = {
  bgTop: new Color('#100818'),
  bgBottom: new Color('#1C1230'),
  card: new Color('#241836'),
  surface: new Color('#2E2144'),
  text: new Color('#F4EEFF'),
  secondary: new Color('#B8A8D4'),
  muted: new Color('#7A6B94'),
  accent: new Color('#C084FC'),
  warning: new Color('#FBBF24'),
  danger: new Color('#F87171'),
  success: new Color('#4ADE80'),
  leave: new Color('#38BDF8'),
  arrive: new Color('#4ADE80'),
  focus: new Color('#F472B6'),
  wrap: new Color('#A78BFA'),
}

const CONFIG = {
  refreshMinutes: 30,
  retryMinutes: 8,
  batteryFloor: 0.2,
  eventWindowMinutes: 45,
  maxHistory: 30,
  locationTtlMs: 3600000,
  focusMinutes: 50,
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

const CUES = {
  leave: {
    key: 'leave',
    label: 'Salida',
    emoji: '🚪',
    symbol: 'figure.walk',
    color: C.leave,
    speechName: 'salida',
  },
  arrive: {
    key: 'arrive',
    label: 'Llegada',
    emoji: '🏡',
    symbol: 'house.fill',
    color: C.arrive,
    speechName: 'llegada',
  },
  focus: {
    key: 'focus',
    label: 'Foco',
    emoji: '🎯',
    symbol: 'target',
    color: C.focus,
    speechName: 'foco',
  },
  wrap: {
    key: 'wrap',
    label: 'Cierre',
    emoji: '🌙',
    symbol: 'moon.fill',
    color: C.wrap,
    speechName: 'cierre',
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
  cue: 'status',
  pista: 'status',
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
  leave: 'leave',
  salir: 'leave',
  salida: 'leave',
  marcha: 'leave',
  arrive: 'arrive',
  llegar: 'arrive',
  llegada: 'arrive',
  casa: 'arrive',
  focus: 'focus',
  foco: 'focus',
  concentrar: 'focus',
  wrap: 'wrap',
  cierre: 'wrap',
  noche: 'wrap',
  winddown: 'wrap',
}

function emptyStore() {
  return {
    coordinates: null,
    history: [],
    plannedCues: [],
    lastCue: null,
    lastCueAt: null,
    lastSnapshotAt: null,
  }
}

function loadStore() {
  try {
    if (fm.fileExists(storePath)) {
      const parsed = JSON.parse(fm.readString(storePath))
      if (parsed && typeof parsed === 'object') {
        return {
          coordinates: parsed.coordinates || null,
          history: Array.isArray(parsed.history) ? parsed.history : [],
          plannedCues: Array.isArray(parsed.plannedCues) ? parsed.plannedCues : [],
          lastCue: parsed.lastCue || null,
          lastCueAt: parsed.lastCueAt || null,
          lastSnapshotAt: parsed.lastSnapshotAt || null,
        }
      }
    }
  } catch (_) {}
  return emptyStore()
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
  if (Number.isNaN(date.getTime())) return '--:--'
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

function logHistory(command, ok) {
  try {
    store.history = store.history || []
    store.history.unshift({
      time: new Date().toISOString(),
      command,
      ok: Boolean(ok),
    })
    if (store.history.length > CONFIG.maxHistory) store.history.length = CONFIG.maxHistory
    saveStore()
  } catch (_) {}
}

function stampCue(key) {
  try {
    store.lastCue = key
    store.lastCueAt = new Date().toISOString()
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

function weatherEntry(code) {
  const key = String(code ?? '')
  return WMO[key] || ['🌡️', 'sin datos']
}

function isPrecipCode(code) {
  const n = Number(code)
  if (Number.isNaN(n)) return false
  return n >= 51
}

function readBattery() {
  try {
    const raw = Device.batteryLevel()
    const level = typeof raw === 'number' ? raw : -1
    let charging = false
    try {
      charging = Boolean(Device.isCharging())
    } catch (_) {}
    return { level, charging }
  } catch (_) {
    return { level: -1, charging: false }
  }
}

function batteryLine(battery) {
  if (!battery || battery.level < 0) return 'batería no disponible'
  const pct = Math.round(battery.level * 100)
  return battery.charging ? `${pct}% cargando` : `${pct}%`
}

function deviceWifi() {
  try {
    return Device.wifiNetwork() || 'sin wifi'
  } catch (_) {
    return 'sin wifi'
  }
}

function deviceName() {
  try {
    return Device.name() || Device.model() || 'iPhone'
  } catch (_) {
    try {
      return Device.model() || 'iPhone'
    } catch (__) {
      return 'iPhone'
    }
  }
}

function currentCueMeta() {
  const key = store.lastCue
  if (key && CUES[key]) return CUES[key]
  return {
    key: 'idle',
    label: 'En espera',
    emoji: '🎚️',
    symbol: 'slider.horizontal.3',
    color: C.accent,
    speechName: 'en espera',
  }
}

async function resolveCoordinates() {
  const cached = store.coordinates
  if (cached && Date.now() - cached.recordedAt < CONFIG.locationTtlMs) return cached
  try {
    Location.setAccuracyToThreeKilometers()
    const location = await Promise.race([
      Location.current(),
      new Promise(resolve => setTimeout(() => resolve(null), 8000)),
    ])
    if (location && location.latitude !== undefined && location.longitude !== undefined) {
      store.coordinates = {
        lat: location.latitude,
        lon: location.longitude,
        recordedAt: Date.now(),
      }
      saveStore()
      return store.coordinates
    }
  } catch (_) {}
  try {
    const request = new Request('https://ip-api.com/json?fields=lat,lon')
    request.timeoutInterval = 8
    const data = await request.loadJSON()
    if (data && typeof data.lat === 'number' && typeof data.lon === 'number') {
      store.coordinates = { lat: data.lat, lon: data.lon, recordedAt: Date.now() }
      saveStore()
      return store.coordinates
    }
  } catch (_) {}
  return null
}

async function fetchWeather() {
  try {
    const coords = await resolveCoordinates()
    if (!coords) return null
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,apparent_temperature,weathercode,wind_speed_10m,relative_humidity_2m&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`
    const request = new Request(url)
    request.timeoutInterval = 10
    const data = await request.loadJSON()
    if (!data || !data.current) return null
    return data
  } catch (_) {
    return null
  }
}

async function fetchUpcomingEvents() {
  try {
    const calendars = await Calendar.forEvents()
    const start = new Date()
    const end = new Date()
    end.setDate(end.getDate() + 2)
    const events = await CalendarEvent.between(start, end, calendars)
    return (events || []).slice().sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
  } catch (_) {
    return []
  }
}

async function fetchOpenReminders() {
  try {
    const start = new Date()
    start.setDate(start.getDate() - 14)
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setDate(end.getDate() + 1)
    end.setHours(23, 59, 59, 999)
    const due = await Reminder.allDueBetween(start, end)
    return due || []
  } catch (_) {
    try {
      const incomplete = await Reminder.allIncomplete()
      return incomplete || []
    } catch (__) {
      return []
    }
  }
}

function weatherLine(weather) {
  if (!weather || !weather.current) return 'clima no disponible'
  const current = weather.current
  const code = current.weathercode ?? current.weather_code
  const entry = weatherEntry(code)
  const temp = Math.round(current.temperature_2m)
  return `${entry[0]} ${temp}° ${entry[1]}`
}

function nextEventInfo(events) {
  const now = Date.now()
  const upcoming = (events || []).find(event => {
    if (!event || !event.startDate) return false
    return new Date(event.startDate).getTime() >= now - 60000
  })
  if (!upcoming) return { label: 'sin eventos próximos', minutes: null, title: null, alert: false }
  const minutes = Math.round((new Date(upcoming.startDate).getTime() - now) / 60000)
  const title = upcoming.title || 'Evento'
  const when = minutes <= 0 ? 'ahora' : minutes < 60 ? `en ${minutes} min` : `a las ${formatTime(upcoming.startDate)}`
  return {
    label: `${title} ${when}`,
    minutes,
    title,
    alert: minutes >= 0 && minutes <= CONFIG.eventWindowMinutes,
  }
}

function reminderInfo(reminders) {
  const now = Date.now()
  const open = (reminders || []).filter(item => !item.isCompleted)
  const overdue = open.filter(item => item.dueDate && new Date(item.dueDate).getTime() < now)
  if (overdue.length > 0) {
    return { label: `${overdue.length} vencido${overdue.length === 1 ? '' : 's'}`, alert: true, overdue: overdue.length, open: open.length }
  }
  if (open.length > 0) {
    return { label: `${open.length} pendiente${open.length === 1 ? '' : 's'}`, alert: false, overdue: 0, open: open.length }
  }
  return { label: 'sin pendientes', alert: false, overdue: 0, open: 0 }
}

async function gatherSnapshot() {
  const [weather, events, reminders] = await Promise.all([
    fetchWeather().catch(() => null),
    fetchUpcomingEvents().catch(() => []),
    fetchOpenReminders().catch(() => []),
  ])
  const battery = readBattery()
  const event = nextEventInfo(events)
  const reminder = reminderInfo(reminders)
  const rainAlert = Boolean(weather && isPrecipCode(weather.current?.weathercode ?? weather.current?.weather_code))
  const batteryAlert = battery.level >= 0 && battery.level < CONFIG.batteryFloor && !battery.charging
  const lanes = [
    {
      key: 'battery',
      label: 'Batería',
      emoji: '🔋',
      symbol: 'battery.100',
      alert: batteryAlert,
      line: batteryLine(battery),
    },
    {
      key: 'weather',
      label: 'Clima',
      emoji: '🌤️',
      symbol: 'cloud.sun.fill',
      alert: rainAlert,
      line: weatherLine(weather),
    },
    {
      key: 'event',
      label: 'Agenda',
      emoji: '📅',
      symbol: 'calendar',
      alert: event.alert,
      line: event.label,
    },
    {
      key: 'reminders',
      label: 'Pendientes',
      emoji: '☑️',
      symbol: 'checklist',
      alert: reminder.alert,
      line: reminder.label,
    },
  ]
  store.lastSnapshotAt = new Date().toISOString()
  saveStore()
  return { weather, events, reminders, battery, event, reminder, lanes, rainAlert, batteryAlert }
}

function cueHeadline() {
  const meta = currentCueMeta()
  if (meta.key === 'idle') {
    return {
      emoji: meta.emoji,
      text: 'Sin cue activa',
      speech: 'No hay ninguna cue activa. Di salir, llegar, foco o cierre.',
    }
  }
  return {
    emoji: meta.emoji,
    text: `${meta.label} · ${formatAgo(store.lastCueAt)}`,
    speech: `Cue de ${meta.speechName} desde ${formatAgo(store.lastCueAt)}.`,
  }
}

async function handleBattery() {
  const battery = readBattery()
  const line = batteryLine(battery)
  const alert = battery.level >= 0 && battery.level < CONFIG.batteryFloor && !battery.charging
  return {
    output: `🔋 Batería\n${line}${alert ? '\n⚠️ Por debajo del 20%' : ''}`,
    speech: alert ? `Batería baja, ${line}` : `Batería al ${line}`,
  }
}

async function handleWeather() {
  const weather = await fetchWeather()
  if (!weather) {
    return { output: '🌤️ Clima no disponible', speech: 'No pude consultar el clima' }
  }
  const line = weatherLine(weather)
  const rain = isPrecipCode(weather.current?.weathercode ?? weather.current?.weather_code)
  const max = weather.daily?.temperature_2m_max?.[0]
  const min = weather.daily?.temperature_2m_min?.[0]
  const range = (typeof max === 'number' && typeof min === 'number') ? `\nMáx ${Math.round(max)}° · mín ${Math.round(min)}°` : ''
  return {
    output: `🌤️ Clima\n${line}${range}${rain ? '\n⚠️ Precipitación prevista' : ''}`,
    speech: rain ? `${line}. Lleva paraguas.` : line,
  }
}

async function handleNext() {
  const events = await fetchUpcomingEvents()
  const event = nextEventInfo(events)
  if (!event.title) {
    return { output: '📅 Sin eventos próximos', speech: 'No hay eventos próximos en la agenda' }
  }
  return {
    output: `📅 Próximo evento\n${event.label}${event.alert ? '\n⚠️ En menos de 45 minutos' : ''}`,
    speech: event.alert ? `Atención. ${event.label}` : `El próximo evento es ${event.label}`,
  }
}

async function handleStatus() {
  const snapshot = await gatherSnapshot()
  const headline = cueHeadline()
  const wifi = deviceWifi()
  const name = deviceName()
  const laneLines = snapshot.lanes.map(lane => `${lane.alert ? '⚠️' : '✅'} ${lane.label}: ${lane.line}`)
  return {
    output: `🎚️ Cue Dispatcher\n${headline.emoji} ${headline.text}\n📱 ${name}\n📶 ${wifi}\n${laneLines.join('\n')}`,
    speech: `${headline.speech} Dispositivo ${name}. Wifi ${wifi}.`,
  }
}

async function handleBriefing() {
  const snapshot = await gatherSnapshot()
  const headline = cueHeadline()
  const laneLines = snapshot.lanes.map(lane => `${lane.alert ? '⚠️' : '✅'} ${lane.emoji} ${lane.label}: ${lane.line}`)
  return {
    output: `🌅 Briefing cues · ${formatToday()}\n${headline.emoji} ${headline.text}\n${laneLines.join('\n')}`,
    speech: `Briefing de ${formatToday()}. ${headline.speech} ${snapshot.lanes.map(lane => `${lane.label}: ${lane.line}`).join('. ')}`,
  }
}

async function handleHistory() {
  const entries = (store.history || []).slice(0, 10)
  if (entries.length === 0) {
    return { output: '📜 Sin ejecuciones todavía', speech: 'Aún no hay historial de automatizaciones' }
  }
  const lines = entries.map(entry => `${entry.ok ? '✅' : '❌'} ${entry.command} · ${formatAgo(entry.time)}`)
  return {
    output: `📜 Últimas ejecuciones\n${lines.join('\n')}`,
    speech: `Últimas ${entries.length} ejecuciones registradas`,
  }
}

function handleHelp() {
  return {
    output: '🎚️ Cue Dispatcher\nComandos: briefing, tiempo, siguiente, batería, estado, capturar, programar, historial, ayuda.\nCues: salir, llegar, foco, cierre.\nAtajo Siri o Shortcuts pasa la cue; el widget muestra la pista activa.',
    speech: 'Cue Dispatcher. Puedo dar un briefing, el tiempo, el siguiente evento, la batería, el estado, capturar una nota, programar avisos, leer el historial o disparar cues de salida, llegada, foco y cierre.',
  }
}

async function captureNote(text) {
  const title = String(text || '').trim() || 'Nota rápida'
  try {
    const reminder = new Reminder()
    reminder.title = title
    reminder.notes = `Capturado ${new Date().toLocaleString('es-ES')} vía Cue Dispatcher`
    await reminder.save()
    return {
      output: `📌 Capturado: ${title}`,
      speech: `He guardado el recordatorio ${title}`,
    }
  } catch (_) {
    return {
      output: `📌 No pude guardar: ${title}`,
      speech: 'No pude guardar el recordatorio',
    }
  }
}

function tomorrowAt(hours, minutes) {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function scheduleNotification(title, body, date, kind) {
  try {
    const notif = new Notification()
    notif.title = title
    notif.body = body
    notif.sound = 'default'
    notif.scriptName = Script.name()
    notif.setTriggerDate(date)
    await notif.schedule()
    return { kind, at: date.toISOString() }
  } catch (_) {
    return null
  }
}

async function handleSchedule() {
  const morning = tomorrowAt(8, 0)
  const evening = tomorrowAt(22, 0)
  const planned = []
  const morningJob = await scheduleNotification(
    '🎚️ Cue de mañana',
    'Toca para ejecutar el briefing de cues',
    morning,
    'morning',
  )
  const eveningJob = await scheduleNotification(
    '🌙 Cue de cierre',
    'Toca para ejecutar el cierre del día',
    evening,
    'evening',
  )
  if (morningJob) planned.push(morningJob)
  if (eveningJob) planned.push(eveningJob)
  store.plannedCues = planned
  saveStore()
  return {
    output: `⏰ Cues armadas\n🌅 Briefing ${formatTime(morning)}\n🌙 Cierre ${formatTime(evening)}`,
    speech: `He programado el briefing a las ${formatTime(morning)} y el cierre a las ${formatTime(evening)}`,
  }
}

async function handleLeave() {
  const snapshot = await gatherSnapshot()
  stampCue('leave')
  const warnings = []
  if (snapshot.batteryAlert) warnings.push('carga el teléfono')
  if (snapshot.rainAlert) warnings.push('lleva paraguas')
  if (snapshot.event.alert) warnings.push(snapshot.event.label)
  const warnLine = warnings.length > 0 ? `\n⚠️ ${warnings.join(' · ')}` : '\n✅ Listo para salir'
  const speechWarn = warnings.length > 0 ? `Antes de salir, ${warnings.join(', ')}.` : 'Todo listo para salir.'
  return {
    output: `🚪 Cue de salida\n${snapshot.lanes.map(lane => `${lane.emoji} ${lane.line}`).join('\n')}${warnLine}`,
    speech: `Cue de salida. ${speechWarn} Clima ${snapshot.lanes[1].line}. Agenda ${snapshot.event.label}.`,
  }
}

async function handleArrive() {
  const snapshot = await gatherSnapshot()
  stampCue('arrive')
  return {
    output: `🏡 Cue de llegada\n☑️ ${snapshot.reminder.label}\n📅 ${snapshot.event.label}\n🔋 ${batteryLine(snapshot.battery)}`,
    speech: `Cue de llegada. ${snapshot.reminder.label}. Próximo: ${snapshot.event.label}.`,
  }
}

async function handleFocus() {
  const snapshot = await gatherSnapshot()
  stampCue('focus')
  const end = new Date(Date.now() + CONFIG.focusMinutes * 60000)
  await scheduleNotification(
    '🎯 Foco cumplido',
    `Han pasado ${CONFIG.focusMinutes} minutos. Toca para el siguiente cue.`,
    end,
    'focus',
  )
  return {
    output: `🎯 Cue de foco\n⏱️ ${CONFIG.focusMinutes} min hasta ${formatTime(end)}\n📅 ${snapshot.event.label}\n🔋 ${batteryLine(snapshot.battery)}`,
    speech: `Cue de foco de ${CONFIG.focusMinutes} minutos. Te aviso a las ${formatTime(end)}. ${snapshot.event.label}.`,
  }
}

async function handleWrap() {
  const snapshot = await gatherSnapshot()
  stampCue('wrap')
  const cue = currentCueMeta()
  return {
    output: `🌙 Cue de cierre · ${formatToday()}\n🎚️ Última pista: ${cue.label}\n☑️ ${snapshot.reminder.label}\n📅 ${snapshot.event.label}\n🔋 ${batteryLine(snapshot.battery)}`,
    speech: `Cierre del día. Última cue ${cue.speechName}. ${snapshot.reminder.label}. Mañana: ${snapshot.event.label}.`,
  }
}

async function executeRoute(route, note) {
  if (route === 'battery') return handleBattery()
  if (route === 'weather') return handleWeather()
  if (route === 'next') return handleNext()
  if (route === 'status') return handleStatus()
  if (route === 'briefing') return handleBriefing()
  if (route === 'history') return handleHistory()
  if (route === 'help') return handleHelp()
  if (route === 'schedule') return handleSchedule()
  if (route === 'leave') return handleLeave()
  if (route === 'arrive') return handleArrive()
  if (route === 'focus') return handleFocus()
  if (route === 'wrap') return handleWrap()
  if (route === 'capture') return captureNote(note)
  return captureNote(note || route)
}

function applyBackground(widget) {
  const gradient = new LinearGradient()
  gradient.colors = [C.bgTop, C.bgBottom]
  gradient.locations = [0, 1]
  widget.backgroundGradient = gradient
  widget.setPadding(12, 14, 12, 14)
}

function addSymbol(stack, name, color, size) {
  try {
    const symbol = SFSymbol.named(name)
    symbol.applyFont(Font.systemFont(size))
    const image = stack.addImage(symbol.image)
    image.tintColor = color
    image.imageSize = new Size(size, size)
  } catch (_) {
    const fallback = stack.addText('●')
    fallback.font = Font.systemFont(size)
    fallback.textColor = color
  }
}

function addHeader(parent) {
  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  addSymbol(row, 'slider.horizontal.3', C.accent, 14)
  row.addSpacer(6)
  const title = row.addText('CUE')
  title.font = Font.boldSystemFont(11)
  title.textColor = C.accent
  row.addSpacer()
  const dateLabel = row.addText(formatToday())
  dateLabel.font = Font.systemFont(10)
  dateLabel.textColor = C.secondary
}

function addLaneChip(parent, lane) {
  const chip = parent.addStack()
  chip.layoutHorizontally()
  chip.centerAlignContent()
  chip.backgroundColor = lane.alert ? new Color('#FBBF24', 0.18) : C.surface
  chip.cornerRadius = 8
  chip.setPadding(5, 8, 5, 8)
  const mark = chip.addText(lane.alert ? '⚠️' : lane.emoji)
  mark.font = Font.systemFont(11)
  chip.addSpacer(4)
  const label = chip.addText(lane.label)
  label.font = Font.mediumSystemFont(10)
  label.textColor = lane.alert ? C.warning : C.text
}

function addLaneCard(parent, lane) {
  const card = parent.addStack()
  card.layoutHorizontally()
  card.centerAlignContent()
  card.backgroundColor = lane.alert ? new Color('#FBBF24', 0.16) : C.card
  card.cornerRadius = 10
  card.setPadding(8, 10, 8, 10)
  const emoji = card.addText(lane.alert ? '⚠️' : lane.emoji)
  emoji.font = Font.systemFont(16)
  card.addSpacer(8)
  const col = card.addStack()
  col.layoutVertically()
  const title = col.addText(lane.label)
  title.font = Font.boldSystemFont(12)
  title.textColor = C.text
  const line = col.addText(lane.line)
  line.font = Font.systemFont(10)
  line.textColor = lane.alert ? C.warning : C.secondary
  line.lineLimit = 1
  card.addSpacer()
  const badge = card.addText(lane.alert ? 'AVISO' : 'OK')
  badge.font = Font.boldSystemFont(9)
  badge.textColor = lane.alert ? C.warning : C.success
}

function addHeadlineCard(parent, snapshot) {
  const headline = cueHeadline()
  const meta = currentCueMeta()
  const card = parent.addStack()
  card.layoutVertically()
  card.backgroundColor = new Color('#C084FC', 0.14)
  card.cornerRadius = 12
  card.setPadding(10, 12, 10, 12)
  const top = card.addText(`${headline.emoji}  ${headline.text}`)
  top.font = Font.boldSystemFont(16)
  top.textColor = meta.color
  const sub = card.addText(`${batteryLine(snapshot.battery)} · ${snapshot.event.label}`)
  sub.font = Font.systemFont(11)
  sub.textColor = C.secondary
  sub.lineLimit = 1
}

function addCueStrip(parent) {
  const row = parent.addStack()
  row.layoutHorizontally()
  const keys = ['leave', 'arrive', 'focus', 'wrap']
  keys.forEach((key, index) => {
    if (index > 0) row.addSpacer(4)
    const cue = CUES[key]
    const active = store.lastCue === key
    const chip = row.addStack()
    chip.layoutHorizontally()
    chip.centerAlignContent()
    chip.backgroundColor = active ? new Color('#C084FC', 0.28) : C.surface
    chip.cornerRadius = 8
    chip.setPadding(4, 7, 4, 7)
    const mark = chip.addText(cue.emoji)
    mark.font = Font.systemFont(11)
  })
}

async function buildSmall(snapshot) {
  const widget = new ListWidget()
  applyBackground(widget)
  addHeader(widget)
  widget.addSpacer(8)
  addHeadlineCard(widget, snapshot)
  widget.addSpacer(8)
  addCueStrip(widget)
  widget.addSpacer()
  const foot = widget.addText(formatAgo(store.lastSnapshotAt))
  foot.font = Font.systemFont(9)
  foot.textColor = C.muted
  return widget
}

async function buildMedium(snapshot) {
  const widget = new ListWidget()
  applyBackground(widget)
  addHeader(widget)
  widget.addSpacer(8)
  addHeadlineCard(widget, snapshot)
  widget.addSpacer(8)
  const grid = widget.addStack()
  grid.layoutHorizontally()
  const left = grid.addStack()
  left.layoutVertically()
  addLaneCard(left, snapshot.lanes[0])
  left.addSpacer(6)
  addLaneCard(left, snapshot.lanes[2])
  grid.addSpacer(6)
  const right = grid.addStack()
  right.layoutVertically()
  addLaneCard(right, snapshot.lanes[1])
  right.addSpacer(6)
  addLaneCard(right, snapshot.lanes[3])
  return widget
}

async function buildLarge(snapshot) {
  const widget = new ListWidget()
  applyBackground(widget)
  addHeader(widget)
  widget.addSpacer(8)
  addHeadlineCard(widget, snapshot)
  widget.addSpacer(8)
  addCueStrip(widget)
  widget.addSpacer(10)
  for (const lane of snapshot.lanes) {
    addLaneCard(widget, lane)
    widget.addSpacer(6)
  }
  widget.addSpacer(4)
  const histTitle = widget.addText('Últimas cues')
  histTitle.font = Font.boldSystemFont(11)
  histTitle.textColor = C.secondary
  widget.addSpacer(4)
  const entries = (store.history || []).slice(0, 4)
  if (entries.length === 0) {
    const empty = widget.addText('Sin ejecuciones todavía')
    empty.font = Font.systemFont(10)
    empty.textColor = C.muted
  } else {
    for (const entry of entries) {
      const row = widget.addStack()
      row.layoutHorizontally()
      row.centerAlignContent()
      const mark = row.addText(entry.ok ? '✅' : '❌')
      mark.font = Font.systemFont(10)
      row.addSpacer(6)
      const cmd = row.addText(entry.command)
      cmd.font = Font.mediumSystemFont(11)
      cmd.textColor = C.text
      row.addSpacer()
      const ago = row.addText(formatAgo(entry.time))
      ago.font = Font.systemFont(10)
      ago.textColor = C.muted
      widget.addSpacer(3)
    }
  }
  if ((store.plannedCues || []).length > 0) {
    widget.addSpacer(6)
    const plan = widget.addText(`Avisos: ${store.plannedCues.map(item => `${item.kind} ${formatTime(item.at)}`).join(' · ')}`)
    plan.font = Font.systemFont(10)
    plan.textColor = C.accent
    plan.lineLimit = 1
  }
  return widget
}

function renderErrorWidget() {
  const widget = new ListWidget()
  applyBackground(widget)
  const title = widget.addText('⚠️ Cue Error')
  title.font = Font.boldSystemFont(14)
  title.textColor = C.danger
  const hint = widget.addText('Toca para reintentar')
  hint.font = Font.systemFont(11)
  hint.textColor = C.secondary
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.retryMinutes * 60000)
  Script.setWidget(widget)
}

async function runAsWidget() {
  const snapshot = await gatherSnapshot()
  const family = config.widgetFamily || 'medium'
  let widget
  if (family === 'small') widget = await buildSmall(snapshot)
  else if (family === 'large') widget = await buildLarge(snapshot)
  else widget = await buildMedium(snapshot)
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000)
  Script.setWidget(widget)
  Script.complete()
}

async function presentResult(title, result) {
  const alert = new Alert()
  alert.title = title
  alert.message = result.output
  alert.addCancelAction('Cerrar')
  await alert.present()
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
    await presentResult('📌 Captura', await captureNote(value))
  }
}

async function runAsUtility() {
  const menu = new Alert()
  menu.title = '🎚️ Cue Dispatcher'
  menu.message = 'Cues de transición para Shortcuts y Siri'
  menu.addAction('🌅 Briefing')
  menu.addAction('📊 Estado')
  menu.addAction('🚪 Salida')
  menu.addAction('🏡 Llegada')
  menu.addAction('🎯 Foco')
  menu.addAction('🌙 Cierre')
  menu.addAction('🌤️ Tiempo')
  menu.addAction('📅 Próximo evento')
  menu.addAction('🔋 Batería')
  menu.addAction('📌 Capturar nota')
  menu.addAction('⏰ Programar avisos')
  menu.addAction('📜 Historial')
  menu.addAction('❓ Ayuda')
  menu.addCancelAction('✖️ Cerrar')
  const choice = await menu.presentSheet()
  if (choice === 0) await presentResult('🌅 Briefing', await handleBriefing())
  else if (choice === 1) await presentResult('📊 Estado', await handleStatus())
  else if (choice === 2) await presentResult('🚪 Salida', await handleLeave())
  else if (choice === 3) await presentResult('🏡 Llegada', await handleArrive())
  else if (choice === 4) await presentResult('🎯 Foco', await handleFocus())
  else if (choice === 5) await presentResult('🌙 Cierre', await handleWrap())
  else if (choice === 6) await presentResult('🌤️ Tiempo', await handleWeather())
  else if (choice === 7) await presentResult('📅 Evento', await handleNext())
  else if (choice === 8) await presentResult('🔋 Batería', await handleBattery())
  else if (choice === 9) await promptCapture()
  else if (choice === 10) await presentResult('⏰ Avisos', await handleSchedule())
  else if (choice === 11) await presentResult('📜 Historial', await handleHistory())
  else if (choice === 12) await presentResult('❓ Ayuda', handleHelp())
}

async function deliverAutomation(result) {
  try {
    Script.setShortcutOutput(result.output)
  } catch (_) {}
  try {
    await Speech.speak(result.speech)
  } catch (_) {}
}

async function runAsAutomation() {
  const param = args.shortcutParameter
  const note = args.plainTexts && args.plainTexts[0] ? String(args.plainTexts[0]).trim() : ''
  const route = resolveRoute(param, note)
  const payload = route === 'capture' ? (note || String(param || '').trim()) : note
  const result = await executeRoute(route, payload)
  logHistory(route, true)
  await deliverAutomation(result)
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
      await Speech.speak('La automatización de cues falló')
    } catch (_) {}
  }
}
