const STORE_KEY = 'siri-voice-commander-store.json'
const fm = FileManager.local()
const storePath = fm.joinPath(fm.documentsDirectory(), STORE_KEY)

const C = {
  background: new Color('#1C1C1E'),
  backgroundDeep: new Color('#0A0A0B'),
  card: new Color('#2C2C2E'),
  text: new Color('#FFFFFF'),
  secondary: new Color('#8E8E93'),
  accent: new Color('#0A84FF'),
  success: new Color('#30D158'),
  warning: new Color('#FF9F0A'),
  error: new Color('#FF453A'),
  muted: new Color('#636366')
}

const WMO_MAP = {
  0: ['☀️', 'despejado'],
  1: ['🌤️', 'mayormente despejado'],
  2: ['⛅', 'parcialmente nublado'],
  3: ['☁️', 'nublado'],
  45: ['🌫️', 'niebla'],
  48: ['🌫️', 'niebla con escarcha'],
  51: ['🌦️', 'llovizna ligera'],
  53: ['🌦️', 'llovizna'],
  55: ['🌧️', 'llovizna densa'],
  56: ['🌧️', 'llovizna helada ligera'],
  57: ['🌧️', 'llovizna helada'],
  61: ['🌧️', 'lluvia ligera'],
  63: ['🌧️', 'lluvia'],
  65: ['🌧️', 'lluvia fuerte'],
  66: ['🌨️', 'lluvia helada ligera'],
  67: ['🌨️', 'lluvia helada'],
  71: ['🌨️', 'nevada ligera'],
  73: ['🌨️', 'nevada'],
  75: ['❄️', 'nevada fuerte'],
  77: ['❄️', 'granos de nieve'],
  80: ['🌦️', 'chubascos ligeros'],
  81: ['🌧️', 'chubascos'],
  82: ['⛈️', 'chubascos violentos'],
  85: ['🌨️', 'chubascos de nieve'],
  86: ['❄️', 'chubascos de nieve fuertes'],
  95: ['⛈️', 'tormenta'],
  96: ['⛈️', 'tormenta con granizo'],
  99: ['⛈️', 'tormenta con granizo fuerte']
}

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DAY_NAMES_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MONTH_NAMES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function loadStore() {
  try {
    if (fm.fileExists(storePath)) {
      return JSON.parse(fm.readString(storePath))
    }
  } catch (_) {}
  return { location: null, runs: [] }
}

function saveStore(data) {
  try {
    fm.writeString(storePath, JSON.stringify(data, null, 2))
  } catch (_) {}
}

function logRun(command, ok) {
  try {
    const store = loadStore()
    store.runs = store.runs || []
    store.runs.push({ time: new Date().toLocaleString('es-ES'), command, ok })
    if (store.runs.length > 30) store.runs = store.runs.slice(-30)
    saveStore(store)
  } catch (_) {}
}

function formatTime(date) {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function formatDateLong(date) {
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`
}

function formatDateShort(date) {
  return `${DAY_NAMES_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]}`
}

function formatDateTime(date) {
  return `${formatDateShort(date)} ${formatTime(date)}`
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ])
}

function normalizeCommand(raw) {
  return String(raw || '').toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u')
    .trim()
}

function resolveCommand(raw) {
  const cmd = normalizeCommand(raw)
  if (['briefing', 'resumen', 'resumen del dia', 'buenos dias'].includes(cmd)) return 'briefing'
  if (['weather', 'tiempo', 'clima', 'que tiempo hace'].includes(cmd)) return 'weather'
  if (['next', 'next-event', 'siguiente', 'siguiente evento', 'proximo evento', 'evento'].includes(cmd)) return 'next'
  if (['battery', 'bateria', 'nivel de bateria'].includes(cmd)) return 'battery'
  if (['status', 'estado', 'dispositivo', 'estado del dispositivo'].includes(cmd)) return 'status'
  if (['capture', 'capturar', 'recordatorio', 'nota', 'crear recordatorio'].includes(cmd)) return 'capture'
  if (['schedule', 'programar', 'notificacion', 'programar notificacion'].includes(cmd)) return 'schedule'
  if (['history', 'historial', 'ultimas ejecuciones'].includes(cmd)) return 'history'
  if (['help', 'ayuda', 'comandos', 'que puedes hacer', 'hola', 'hello', 'hey', 'buenas', 'siri'].includes(cmd)) return 'help'
  return 'capture'
}

function automationRequest() {
  const param = args.shortcutParameter
  const texts = args.plainTexts ?? []
  const paramText = param === null || param === undefined ? '' : String(param).trim()
  const firstText = texts.length > 0 ? String(texts[0]).trim() : ''
  if (!paramText && !firstText) return { command: 'help', note: '' }
  const resolvedParam = resolveCommand(paramText)
  if (resolvedParam === 'help' && firstText) {
    const resolvedText = resolveCommand(firstText)
    if (resolvedText === 'capture') return { command: 'capture', note: firstText }
    return { command: resolvedText, note: firstText }
  }
  if (resolvedParam === 'capture') {
    return { command: 'capture', note: firstText || paramText }
  }
  if (resolvedParam === 'schedule') {
    return { command: 'schedule', note: firstText || paramText }
  }
  return { command: resolvedParam, note: firstText }
}

async function getCoordinates() {
  const store = loadStore()
  if (store.location && Date.now() - store.location.timestamp < 3600000) {
    return { lat: store.location.lat, lon: store.location.lon }
  }
  try {
    Location.setAccuracyToThreeKilometers()
    const location = await withTimeout(Location.current(), 8000)
    if (location && typeof location.latitude === 'number') {
      store.location = { lat: location.latitude, lon: location.longitude, timestamp: Date.now() }
      saveStore(store)
      return { lat: location.latitude, lon: location.longitude }
    }
  } catch (_) {}
  try {
    const request = new Request('https://ip-api.com/json?fields=lat,lon')
    request.timeoutInterval = 8
    const data = await request.loadJSON()
    if (data && typeof data.lat === 'number') {
      store.location = { lat: data.lat, lon: data.lon, timestamp: Date.now() }
      saveStore(store)
      return { lat: data.lat, lon: data.lon }
    }
  } catch (_) {}
  return null
}

async function fetchWeatherBrief() {
  const coords = await getCoordinates()
  if (!coords) return null
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,apparent_temperature,weathercode,wind_speed_10m,relative_humidity_2m&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`
  const request = new Request(url)
  request.timeoutInterval = 10
  const data = await request.loadJSON()
  if (!data || !data.current) return null
  return { current: data.current, daily: data.daily, coords }
}

async function fetchTodayEvents() {
  const calendars = await Calendar.forEvents()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const events = await CalendarEvent.between(start, end, calendars)
  return events.sort((a, b) => a.startDate - b.startDate)
}

async function fetchNextEvent() {
  const calendars = await Calendar.forEvents()
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 7)
  const events = await CalendarEvent.between(start, end, calendars)
  if (events.length === 0) return null
  return events.sort((a, b) => a.startDate - b.startDate)[0]
}

async function fetchReminderStats() {
  const reminders = await Reminder.allIncomplete()
  const now = new Date()
  const overdue = reminders.filter(r => r.dueDate && r.dueDate < now)
  return { total: reminders.length, overdue: overdue.length }
}

function readBattery() {
  const level = Device.batteryLevel()
  const charging = Device.isCharging()
  const percent = level >= 0 ? Math.round(level * 100) : null
  return { percent, charging }
}

function batteryDisplayLine(battery) {
  const emoji = battery.percent === null ? '🔋' : battery.percent > 20 ? '🔋' : '🪫'
  const percentText = battery.percent === null ? 'n/d' : `${battery.percent}%`
  return `${emoji} Batería ${percentText}${battery.charging ? ' ⚡' : ''}`
}

function weatherDisplayLine(weather) {
  if (!weather) return '🌤️ Tiempo no disponible'
  const entry = WMO_MAP[weather.current.weathercode] || ['🌤️', 'despejado']
  const temp = Math.round(weather.current.temperature_2m)
  const max = Math.round(weather.daily.temperature_2m_max[0])
  const min = Math.round(weather.daily.temperature_2m_min[0])
  return `${entry[0]} ${temp}° ${entry[1]}, máx ${max}° / mín ${min}°`
}

function weatherSpeechLine(weather) {
  if (!weather) return 'No he podido obtener el tiempo.'
  const entry = WMO_MAP[weather.current.weathercode] || ['🌤️', 'despejado']
  const temp = Math.round(weather.current.temperature_2m)
  const feels = Math.round(weather.current.apparent_temperature)
  const max = Math.round(weather.daily.temperature_2m_max[0])
  const min = Math.round(weather.daily.temperature_2m_min[0])
  return `El tiempo: ahora hay ${temp} grados, ${entry[1]}, con sensación de ${feels}. Máxima de ${max} grados y mínima de ${min}.`
}

function errorResult(command, error) {
  const message = `No he podido ejecutar ${command}: ${error?.message || 'error desconocido'}`
  return { output: `error: ${message}`, speech: message }
}

async function handleBriefing() {
  try {
    const [events, reminderStats, weather] = await Promise.all([
      fetchTodayEvents().catch(() => []),
      fetchReminderStats().catch(() => ({ total: 0, overdue: 0 })),
      fetchWeatherBrief().catch(() => null)
    ])
    const now = new Date()
    const lines = [`📋 Briefing — ${formatDateLong(now)}`, '', `🕘 Son las ${formatTime(now)}`]
    const spoken = [`Buenos días. Son las ${formatTime(now)}.`]
    lines.push(weatherDisplayLine(weather))
    spoken.push(weatherSpeechLine(weather))
    lines.push('')
    if (events.length === 0) {
      lines.push('📭 Sin eventos hoy')
      spoken.push('No tienes eventos programados hoy.')
    } else {
      lines.push(`📆 ${events.length} evento(s):`)
      for (const event of events.slice(0, 5)) {
        const when = event.isAllDay ? 'todo el día' : formatTime(event.startDate)
        lines.push(`  ${when} ${event.title}`)
      }
      const firstEvent = events[0]
      spoken.push(`Tienes ${events.length} eventos hoy. El primero, ${firstEvent.title}, a las ${formatTime(firstEvent.startDate)}.`)
    }
    lines.push('')
    lines.push(`📝 ${reminderStats.total} recordatorio(s) pendiente(s)${reminderStats.overdue > 0 ? `, ${reminderStats.overdue} atrasado(s)` : ''}`)
    spoken.push(`Tienes ${reminderStats.total} recordatorios pendientes${reminderStats.overdue > 0 ? `, ${reminderStats.overdue} de ellos atrasados` : ''}.`)
    return { output: lines.join('\n'), speech: spoken.join(' ') }
  } catch (e) {
    return errorResult('briefing', e)
  }
}

async function handleWeather() {
  try {
    const weather = await fetchWeatherBrief()
    if (!weather) {
      return { output: '🌤️ Tiempo no disponible', speech: 'No he podido obtener el tiempo. Revisa tu conexión o los permisos de localización.' }
    }
    const entry = WMO_MAP[weather.current.weathercode] || ['🌤️', 'despejado']
    const humidity = weather.current.relative_humidity_2m
    const wind = Math.round(weather.current.wind_speed_10m)
    const lines = [
      '🌤️ Tiempo actual',
      `${entry[0]} ${entry[1]}`,
      `🌡️ ${Math.round(weather.current.temperature_2m)}° (sensación ${Math.round(weather.current.apparent_temperature)}°)`,
      `📉 Máx ${Math.round(weather.daily.temperature_2m_max[0])}° / mín ${Math.round(weather.daily.temperature_2m_min[0])}°`,
      `💧 ${humidity}% humedad`,
      `💨 ${wind} km/h viento`
    ]
    const speech = `${weatherSpeechLine(weather)} Humedad del ${humidity} por ciento y viento de ${wind} kilómetros por hora.`
    return { output: lines.join('\n'), speech }
  } catch (e) {
    return errorResult('tiempo', e)
  }
}

async function handleNextEvent() {
  try {
    const event = await fetchNextEvent()
    if (!event) {
      return { output: '📭 Sin eventos próximos', speech: 'No tienes eventos programados en los próximos siete días.' }
    }
    const when = event.isAllDay ? 'todo el día' : `${formatDateLong(event.startDate)} a las ${formatTime(event.startDate)}`
    const lines = ['📅 Próximo evento', event.title, `🕘 ${when}`]
    if (event.location) lines.push(`📍 ${event.location}`)
    const speech = `Tu próximo evento es ${event.title}, ${when}.`
    return { output: lines.join('\n'), speech }
  } catch (e) {
    return errorResult('próximo evento', e)
  }
}

async function handleBattery() {
  try {
    const battery = readBattery()
    if (battery.percent === null) {
      return { output: '🔋 Batería no disponible', speech: 'No he podido leer el nivel de batería.' }
    }
    const lines = [batteryDisplayLine(battery)]
    if (battery.charging) {
      lines.push('⚡ Conectado a la corriente')
    } else if (battery.percent <= 20) {
      lines.push('⚠️ Considera conectar el cargador')
    }
    const stateSpeech = battery.charging ? 'y se está cargando' : battery.percent <= 20 ? 'batería baja, considera conectar el cargador' : 'y no está cargando'
    const speech = `La batería está al ${battery.percent} por ciento, ${stateSpeech}.`
    return { output: lines.join('\n'), speech }
  } catch (e) {
    return errorResult('batería', e)
  }
}

async function handleStatus() {
  try {
    const battery = readBattery()
    const wifi = Device.wifiNetwork()
    const brightness = Math.round(Device.screenBrightness() * 100)
    const volume = Math.round(Device.volume() * 100)
    const lines = [
      `📱 ${Device.name()}`,
      `🍎 ${Device.model()}`,
      `📲 iOS ${Device.systemVersion()}`,
      batteryDisplayLine(battery),
      `📶 WiFi: ${wifi || 'no conectada'}`,
      `💡 Brillo ${brightness}% · 🔊 Volumen ${volume}%`
    ]
    const batterySpeech = battery.percent === null ? 'nivel desconocido' : `${battery.percent} por ciento`
    const wifiSpeech = wifi ? `Conectada a la red wifi ${wifi}` : 'Sin conexión wifi'
    const speech = `${Device.name()}, modelo ${Device.model()}, con iOS ${Device.systemVersion()}. Batería al ${batterySpeech}. ${wifiSpeech}.`
    return { output: lines.join('\n'), speech }
  } catch (e) {
    return errorResult('estado', e)
  }
}

async function handleCapture(note) {
  try {
    const text = String(note || '').trim()
    if (!text) {
      return { output: 'error: no hay texto para capturar', speech: 'No he recibido ningún texto para capturar.' }
    }
    const reminder = new Reminder()
    reminder.title = text
    reminder.notes = `Capturado por voz el ${new Date().toLocaleString('es-ES')}`
    await reminder.save()
    return { output: `✅ Recordatorio creado: ${text}`, speech: `Listo. He creado el recordatorio: ${text}.` }
  } catch (e) {
    return errorResult('captura', e)
  }
}

async function handleSchedule(kind) {
  try {
    const isNight = String(kind || '').includes('noche') || String(kind || '').includes('night')
    const target = isNight
      ? { title: '🌙 Recordatorio nocturno', body: 'Revisa tus pendientes del día y prepárate para descansar.', hour: 22, minute: 0 }
      : { title: '📋 Briefing matutino', body: 'Tu resumen del día te espera. Abre Siri Voice Commander.', hour: 8, minute: 0 }
    const trigger = new Date()
    trigger.setDate(trigger.getDate() + 1)
    trigger.setHours(target.hour, target.minute, 0, 0)
    const notif = new Notification()
    notif.title = target.title
    notif.body = target.body
    notif.sound = 'default'
    notif.scriptName = Script.name()
    notif.setTriggerDate(trigger)
    await notif.schedule()
    const timeText = `${target.hour.toString().padStart(2, '0')}:${target.minute.toString().padStart(2, '0')}`
    const timeSpeech = target.minute === 0 ? `a las ${target.hour} en punto` : `a las ${target.hour} y ${target.minute}`
    const lines = ['⏰ Notificación programada', target.title, `📅 Mañana ${timeText}`]
    const speech = `He programado ${isNight ? 'el recordatorio nocturno' : 'el briefing matutino'} para mañana ${timeSpeech}.`
    return { output: lines.join('\n'), speech }
  } catch (e) {
    return errorResult('programación', e)
  }
}

async function handleHistory() {
  try {
    const store = loadStore()
    const runs = store.runs || []
    if (runs.length === 0) {
      return { output: '🕘 Sin ejecuciones registradas', speech: 'Aún no hay ejecuciones registradas.' }
    }
    const lines = ['🕘 Últimas ejecuciones']
    for (const run of runs.slice(-10).reverse()) {
      const timePart = String(run.time).split(',')[1]?.trim() || run.time
      lines.push(`  ${timePart} ${run.command} ${run.ok ? '✅' : '❌'}`)
    }
    return { output: lines.join('\n'), speech: `Últimas ${Math.min(runs.length, 10)} ejecuciones registradas.` }
  } catch (e) {
    return errorResult('historial', e)
  }
}

async function handleHelp() {
  const lines = [
    '🤖 Siri Voice Commander',
    'Comandos para Shortcuts:',
    '  briefing — resumen del día',
    '  weather — tiempo actual',
    '  next — próximo evento',
    '  battery — nivel de batería',
    '  status — estado del dispositivo',
    '  capture — crea un recordatorio',
    '  schedule — programa notificación',
    '  history — últimas ejecuciones',
    '  Cualquier otro texto se captura como recordatorio'
  ]
  const speech = 'Puedes pedirme: briefing, para el resumen del día. Tiempo, para el clima. Próximo evento. Batería. Estado del dispositivo. Capturar, seguido del texto, para crear un recordatorio. Programar, para agendar una notificación. E historial.'
  return { output: lines.join('\n'), speech }
}

async function dispatch(command, note) {
  switch (command) {
    case 'briefing': return await handleBriefing()
    case 'weather': return await handleWeather()
    case 'next': return await handleNextEvent()
    case 'battery': return await handleBattery()
    case 'status': return await handleStatus()
    case 'capture': return await handleCapture(note)
    case 'schedule': return await handleSchedule(note)
    case 'history': return await handleHistory()
    case 'help': return await handleHelp()
    default: return await handleHelp()
  }
}

async function speakSafely(text) {
  try {
    await Speech.speak(text)
  } catch (_) {}
}

async function executeAutomationCommand() {
  const request = automationRequest()
  const result = await dispatch(request.command, request.note)
  Script.setShortcutOutput(result.output)
  logRun(request.command, !String(result.output).startsWith('error'))
  await speakSafely(result.speech)
}

function widgetHeader(widget, title, subtitle) {
  const row = widget.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  const titleLabel = row.addText(title)
  titleLabel.font = Font.boldSystemFont(13)
  titleLabel.textColor = C.text
  row.addSpacer(null)
  const subLabel = row.addText(subtitle)
  subLabel.font = Font.systemFont(10)
  subLabel.textColor = C.secondary
  widget.addSpacer(6)
}

function addInfoRow(parent, text, fontSize) {
  const row = parent.addStack()
  row.layoutHorizontally()
  const label = row.addText(text)
  label.font = Font.mediumSystemFont(fontSize || 11)
  label.textColor = C.text
  return row
}

function addCard(parent, title, lines) {
  const card = parent.addStack()
  card.layoutVertically()
  card.backgroundColor = C.card
  card.cornerRadius = 12
  card.setPadding(8, 10, 8, 10)
  const titleLabel = card.addText(title)
  titleLabel.font = Font.boldSystemFont(10)
  titleLabel.textColor = C.accent
  card.addSpacer(4)
  for (const line of lines) {
    const label = card.addText(line)
    label.font = Font.systemFont(10)
    label.textColor = C.text
    card.addSpacer(2)
  }
  parent.addSpacer(8)
}

function buildSmallWidget(data) {
  const widget = new ListWidget()
  const bg = new LinearGradient()
  bg.colors = [C.background, C.backgroundDeep]
  bg.locations = [0, 1]
  widget.backgroundGradient = bg
  widgetHeader(widget, '🤖 Comandos', formatTime(new Date()))
  widget.addSpacer(2)
  addInfoRow(widget, batteryDisplayLine(data.battery))
  widget.addSpacer(4)
  addInfoRow(widget, `📝 ${data.reminderStats.total} pendiente(s)`)
  widget.addSpacer(4)
  if (data.nextEvent) {
    addInfoRow(widget, `📅 ${formatTime(data.nextEvent.startDate)} ${data.nextEvent.title.slice(0, 18)}`)
  } else {
    addInfoRow(widget, '📭 Sin eventos próximos')
  }
  widget.addSpacer(null)
  const footer = widget.addText('Toca para abrir')
  footer.font = Font.systemFont(9)
  footer.textColor = C.muted
  footer.centerAlignText()
  return widget
}

function buildMediumWidget(data) {
  const widget = new ListWidget()
  const bg = new LinearGradient()
  bg.colors = [C.background, new Color('#14141A')]
  bg.locations = [0, 1]
  widget.backgroundGradient = bg
  widgetHeader(widget, '🤖 Voice Commander', formatDateShort(new Date()))
  addInfoRow(widget, batteryDisplayLine(data.battery))
  widget.addSpacer(2)
  addInfoRow(widget, weatherDisplayLine(data.weather))
  widget.addSpacer(4)
  const eventLines = data.nextEvent
    ? [data.nextEvent.title, `🕘 ${formatDateTime(data.nextEvent.startDate)}`]
    : ['Sin eventos próximos']
  addCard(widget, '📅 Próximo evento', eventLines)
  const reminderLines = [
    `${data.reminderStats.total} pendiente(s)`,
    data.reminderStats.overdue > 0 ? `⚠️ ${data.reminderStats.overdue} atrasado(s)` : '✅ Al día'
  ]
  addCard(widget, '📝 Recordatorios', reminderLines)
  return widget
}

function buildLargeWidget(data) {
  const widget = new ListWidget()
  const bg = new LinearGradient()
  bg.colors = [C.background, new Color('#14141A')]
  bg.locations = [0, 1]
  widget.backgroundGradient = bg
  widgetHeader(widget, '🤖 Voice Commander', Device.name())
  addInfoRow(widget, batteryDisplayLine(data.battery))
  widget.addSpacer(2)
  addInfoRow(widget, weatherDisplayLine(data.weather))
  widget.addSpacer(4)
  const eventLines = data.nextEvent
    ? [data.nextEvent.title, `🕘 ${formatDateTime(data.nextEvent.startDate)}`, data.nextEvent.location ? `📍 ${data.nextEvent.location}` : '']
    : ['Sin eventos próximos']
  addCard(widget, '📅 Próximo evento', eventLines.filter(Boolean))
  const reminderLines = [
    `${data.reminderStats.total} recordatorio(s) pendiente(s)`,
    data.reminderStats.overdue > 0 ? `⚠️ ${data.reminderStats.overdue} atrasado(s)` : '✅ Al día'
  ]
  addCard(widget, '📝 Recordatorios', reminderLines)
  const store = loadStore()
  const runs = (store.runs || []).slice(-3).reverse()
  const runLines = runs.length > 0
    ? runs.map(r => `${String(r.time).split(',')[1]?.trim() || r.time} ${r.command} ${r.ok ? '✅' : '❌'}`)
    : ['Aún sin ejecuciones']
  addCard(widget, '🕘 Últimas ejecuciones', runLines)
  return widget
}

function buildErrorWidget(error) {
  const widget = new ListWidget()
  const bg = new LinearGradient()
  bg.colors = [new Color('#2D0A0A'), C.background]
  bg.locations = [0, 1]
  widget.backgroundGradient = bg
  const title = widget.addText('⚠️ Error')
  title.font = Font.boldSystemFont(14)
  title.textColor = C.error
  widget.addSpacer(4)
  const message = widget.addText(String(error?.message || 'desconocido').slice(0, 80))
  message.font = Font.systemFont(10)
  message.textColor = C.secondary
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  widget.refreshAfterDate = new Date(Date.now() + 600000)
  return widget
}

async function buildWidget() {
  const data = await Promise.all([
    fetchReminderStats().catch(() => ({ total: 0, overdue: 0 })),
    fetchNextEvent().catch(() => null),
    fetchWeatherBrief().catch(() => null),
    Promise.resolve(readBattery())
  ])
  const payload = {
    reminderStats: data[0],
    nextEvent: data[1],
    weather: data[2],
    battery: data[3]
  }
  const family = config.widgetFamily
  if (family === 'small') return buildSmallWidget(payload)
  if (family === 'medium') return buildMediumWidget(payload)
  return buildLargeWidget(payload)
}

async function presentResult(result) {
  const alert = new Alert()
  alert.title = '🤖 Siri Voice Commander'
  alert.message = result.output
  alert.addAction('🔊 Escuchar')
  alert.addCancelAction('Cerrar')
  const choice = await alert.present()
  if (choice === 0) await speakSafely(result.speech)
}

async function presentCaptureDialog() {
  const alert = new Alert()
  alert.title = '➕ Capturar nota'
  alert.message = 'Texto del recordatorio:'
  alert.addTextField('Ej: Comprar leche mañana')
  alert.addAction('Guardar')
  alert.addCancelAction('Cancelar')
  const choice = await alert.present()
  if (choice === 0) {
    const text = alert.textFieldValue(0)
    await presentResult(await handleCapture(text))
  }
}

async function presentScheduleMenu() {
  const alert = new Alert()
  alert.title = '⏰ Programar notificación'
  alert.message = 'Elige qué notificación programar para mañana:'
  alert.addAction('📋 Briefing matutino (08:00)')
  alert.addAction('🌙 Recordatorio nocturno (22:00)')
  alert.addCancelAction('Cancelar')
  const choice = await alert.presentSheet()
  if (choice === 0) await presentResult(await handleSchedule('morning'))
  if (choice === 1) await presentResult(await handleSchedule('night'))
}

async function showInteractiveMenu() {
  const alert = new Alert()
  alert.title = '🤖 Siri Voice Commander'
  alert.message = 'Asistente por voz para Shortcuts. Elige una acción:'
  alert.addAction('📋 Briefing')
  alert.addAction('🌤️ Tiempo')
  alert.addAction('📅 Próximo evento')
  alert.addAction('🔋 Batería')
  alert.addAction('📱 Estado')
  alert.addAction('➕ Capturar nota')
  alert.addAction('⏰ Programar')
  alert.addAction('🕘 Historial')
  alert.addAction('❓ Ayuda')
  alert.addCancelAction('✖️ Cerrar')
  const choice = await alert.presentSheet()
  switch (choice) {
    case 0: await presentResult(await handleBriefing()); break
    case 1: await presentResult(await handleWeather()); break
    case 2: await presentResult(await handleNextEvent()); break
    case 3: await presentResult(await handleBattery()); break
    case 4: await presentResult(await handleStatus()); break
    case 5: await presentCaptureDialog(); break
    case 6: await presentScheduleMenu(); break
    case 7: await presentResult(await handleHistory()); break
    case 8: await presentResult(await handleHelp()); break
    default: break
  }
}

function isAutomationInvocation() {
  if (config.runsInWidget) return false
  if (config.runsInApp === true) {
    const param = args.shortcutParameter
    const texts = args.plainTexts ?? []
    return (param !== null && param !== undefined) || texts.length > 0
  }
  return true
}

async function run() {
  try {
    if (config.runsInWidget) {
      const widget = await buildWidget()
      widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
      widget.refreshAfterDate = new Date(Date.now() + 1800000)
      Script.setWidget(widget)
      Script.complete()
      return
    }
    if (isAutomationInvocation()) {
      await executeAutomationCommand()
    } else {
      await showInteractiveMenu()
    }
  } catch (e) {
    const message = `Error: ${e?.message || 'desconocido'}`
    Script.setShortcutOutput(message)
    await speakSafely(message)
  }
}

await run()
Script.complete()
