const STORE_KEY = 'routine-runner-state.json'
const fm = FileManager.local()
const storePath = fm.joinPath(fm.documentsDirectory(), STORE_KEY)

const C = {
  background: new Color('#0B0B12'),
  card: new Color('#16161F'),
  surface: new Color('#23232E'),
  text: new Color('#F2F2F7'),
  secondary: new Color('#AEAEB2'),
  muted: new Color('#636366'),
  accent: new Color('#0A84FF'),
  success: new Color('#30D158'),
  warning: new Color('#FF9F0A'),
  error: new Color('#FF453A'),
}

const WMO = {
  '0': ['☀️', 'Despejado'],
  '1': ['🌤️', 'Mayormente despejado'],
  '2': ['⛅', 'Parcialmente nublado'],
  '3': ['☁️', 'Nublado'],
  '45': ['🌫️', 'Niebla'],
  '48': ['🌫️', 'Niebla helada'],
  '51': ['🌦️', 'Llovizna ligera'],
  '53': ['🌦️', 'Llovizna'],
  '55': ['🌧️', 'Llovizna densa'],
  '56': ['🌧️', 'Llovizna helada'],
  '57': ['🌧️', 'Llovizna helada'],
  '61': ['🌧️', 'Lluvia ligera'],
  '63': ['🌧️', 'Lluvia'],
  '65': ['🌧️', 'Lluvia fuerte'],
  '66': ['🌧️', 'Lluvia helada'],
  '67': ['🌧️', 'Lluvia helada'],
  '71': ['🌨️', 'Nieve ligera'],
  '73': ['🌨️', 'Nieve'],
  '75': ['❄️', 'Nieve fuerte'],
  '77': ['🌨️', 'Granos de nieve'],
  '80': ['🌦️', 'Chubascos ligeros'],
  '81': ['🌧️', 'Chubascos'],
  '82': ['⛈️', 'Chubascos fuertes'],
  '85': ['🌨️', 'Chubascos de nieve'],
  '86': ['🌨️', 'Chubascos de nieve'],
  '95': ['⛈️', 'Tormenta'],
  '96': ['⛈️', 'Tormenta con granizo'],
  '99': ['⛈️', 'Tormenta con granizo'],
}

const FALLBACK_QUOTES = [
  'El éxito es la suma de pequeños esfuerzos repetidos día tras día. — R. Collier',
  'No cuentes los días, haz que los días cuenten. — Muhammad Ali',
  'La disciplina es el puente entre metas y logros. — Jim Rohn',
  'Haz hoy lo que otros no hacen para lograr mañana lo que otros no logran.',
  'La constancia vence lo que la fuerza no puede.',
  'Cada día es una nueva oportunidad para cambiar tu vida.',
]

const ROUTINES = {
  morning: {
    label: 'Rutina mañana',
    emoji: '🌅',
    description: 'Clima, agenda, recordatorios, batería y cita',
    steps: [
      () => runWeatherStep(0),
      () => runAgendaStep(0),
      () => runRemindersStep(0),
      () => runBatteryStep(),
      () => runQuoteStep(),
    ],
  },
  work: {
    label: 'Rutina trabajo',
    emoji: '💼',
    description: 'Agenda, recordatorios y batería',
    steps: [
      () => runAgendaStep(0),
      () => runRemindersStep(0),
      () => runBatteryStep(),
    ],
  },
  evening: {
    label: 'Rutina noche',
    emoji: '🌙',
    description: 'Clima y agenda de mañana, pendientes y resumen',
    steps: [
      () => runWeatherStep(1),
      () => runAgendaStep(1),
      () => runRemindersStep(0),
      () => runRecapStep(),
    ],
  },
  quick: {
    label: 'Rutina rápida',
    emoji: '⚡',
    description: 'Batería, siguiente evento y pendientes',
    steps: [
      () => runBatteryStep(),
      () => runNextEventStep(),
      () => runRemindersStep(0),
    ],
  },
}

const COMMAND_ROUTES = {
  manana: 'morning',
  morning: 'morning',
  resumen: 'morning',
  briefing: 'morning',
  buenosdias: 'morning',
  trabajo: 'work',
  work: 'work',
  jornada: 'work',
  noche: 'evening',
  evening: 'evening',
  cierre: 'evening',
  resumendia: 'evening',
  rapida: 'quick',
  quick: 'quick',
  bateria: 'quick',
  battery: 'quick',
  siguiente: 'quick',
  next: 'quick',
  tiempo: 'weather',
  weather: 'weather',
  clima: 'weather',
  estado: 'status',
  status: 'status',
  programar: 'schedule',
  schedule: 'schedule',
  plan: 'schedule',
  planificar: 'schedule',
  cancelar: 'cancel',
  cancel: 'cancel',
  limpiar: 'cancel',
  historial: 'history',
  history: 'history',
  log: 'history',
  capturar: 'capture',
  captura: 'capture',
  nota: 'capture',
  note: 'capture',
  ayuda: 'help',
  help: 'help',
  lista: 'help',
  list: 'help',
}

function loadStore() {
  try {
    if (fm.fileExists(storePath)) {
      const parsed = JSON.parse(fm.readString(storePath))
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch (_) {}
  return { coordinates: null, lastRuns: {}, history: [], plannedRoutines: [] }
}

function saveStore() {
  try {
    fm.writeString(storePath, JSON.stringify(store, null, 2))
  } catch (_) {}
}

const store = loadStore()

function formatTime(date) {
  const value = new Date(date)
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
}

function formatAgo(isoString) {
  if (!isoString) return 'nunca'
  const minutes = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)
  if (minutes < 1) return 'ahora'
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

function formatDateTime(isoString) {
  const date = new Date(isoString)
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} ${formatTime(date)}`
}

function todayKeyString() {
  return new Date().toISOString().split('T')[0]
}

function normalizeCommand(text) {
  return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
}

function dailyHash() {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  let hash = ((seed >> 16) ^ seed) * 0x45d9f3b
  hash = ((hash >> 16) ^ hash) * 0x45d9f3b
  hash = (hash >> 16) ^ hash
  return Math.abs(hash)
}

async function resolveCoordinates() {
  const cached = store.coordinates
  if (cached && Date.now() - cached.recordedAt < 3600000) return cached
  try {
    Location.setAccuracyToThreeKilometers()
    const location = await Promise.race([
      Location.current(),
      new Promise(resolve => setTimeout(() => resolve(null), 8000)),
    ])
    if (location && location.latitude !== undefined && location.longitude !== undefined) {
      const fresh = { latitude: location.latitude, longitude: location.longitude, recordedAt: Date.now() }
      store.coordinates = fresh
      saveStore()
      return fresh
    }
  } catch (_) {}
  try {
    const request = new Request('http://ip-api.com/json?fields=lat,lon')
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

async function runWeatherStep(dayOffset) {
  try {
    const coordinates = await resolveCoordinates()
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=2&timezone=auto`
    const request = new Request(url)
    const data = await request.loadJSON()
    const current = data.current || {}
    const temp = Math.round(current.temperature_2m ?? 0)
    const feelsLike = Math.round(current.apparent_temperature ?? temp)
    const code = current.weather_code ?? current.weathercode ?? 0
    const symbolAndLabel = WMO[String(code)] || WMO['0']
    const humidity = current.relative_humidity_2m ?? 0
    const daily = data.daily || {}
    const maxValue = daily.temperature_2m_max ? daily.temperature_2m_max[dayOffset] : undefined
    const minValue = daily.temperature_2m_min ? daily.temperature_2m_min[dayOffset] : undefined
    const rainValue = daily.precipitation_probability_max ? daily.precipitation_probability_max[dayOffset] : undefined
    const maxTemp = maxValue !== undefined ? Math.round(maxValue) : null
    const minTemp = minValue !== undefined ? Math.round(minValue) : null
    const rain = rainValue !== undefined ? Math.round(rainValue) : null
    const rangeText = maxTemp !== null && minTemp !== null ? ` · ${minTemp}°/${maxTemp}°` : ''
    const rainText = rain !== null ? ` · 💧${rain}%` : ''
    const line = `${temp}° ${symbolAndLabel[1]}${rangeText}${rainText}`
    const speech = `${symbolAndLabel[1]}, ${temp} grados${maxTemp !== null ? `, máxima ${maxTemp}` : ''}`
    return { emoji: symbolAndLabel[0], title: dayOffset === 0 ? 'Clima hoy' : 'Clima mañana', line, speech }
  } catch (_) {
    return { emoji: '🌡️', title: 'Clima', line: 'Sin datos', speech: 'No pude obtener el clima' }
  }
}

async function runAgendaStep(dayOffset) {
  try {
    const day = new Date()
    day.setDate(day.getDate() + dayOffset)
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0)
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59)
    const events = await CalendarEvent.between(start, end)
    const sorted = (events || []).slice().sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    const upcoming = sorted.slice(0, 3)
    const title = dayOffset === 0 ? 'Agenda hoy' : 'Agenda mañana'
    if (upcoming.length === 0) {
      return { emoji: '📅', title, line: 'Sin eventos', speech: title + ': sin eventos' }
    }
    const line = upcoming.map(event => `${formatTime(event.startDate)} ${event.title}`).join(' · ')
    const extra = sorted.length > 3 ? ` +${sorted.length - 3} más` : ''
    const speech = upcoming.map(event => `${event.title} a las ${formatTime(event.startDate)}`).join(', ')
    return { emoji: '📅', title, line: line + extra, speech: `Agenda: ${speech}` }
  } catch (_) {
    return { emoji: '📅', title: 'Agenda', line: 'No disponible', speech: 'No pude leer el calendario' }
  }
}

async function runRemindersStep(dayOffset) {
  try {
    const day = new Date()
    day.setDate(day.getDate() + dayOffset)
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0)
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59)
    const dueToday = await Reminder.allDueBetween(start, end)
    const openAll = await Reminder.allIncomplete()
    const undated = (openAll || []).filter(reminder => !reminder.dueDate)
    const merged = [...(dueToday || []), ...undated]
    const unique = []
    const seen = new Set()
    for (const reminder of merged) {
      const key = reminder.title || ''
      if (key && !seen.has(key)) {
        seen.add(key)
        unique.push(reminder)
      }
    }
    const title = dayOffset === 0 ? 'Recordatorios' : 'Pendientes'
    if (unique.length === 0) {
      return { emoji: '📌', title, line: 'Nada pendiente', speech: 'No tienes recordatorios pendientes' }
    }
    const titles = unique.slice(0, 3).map(reminder => reminder.title).join(' · ')
    const extra = unique.length > 3 ? ` +${unique.length - 3} más` : ''
    return { emoji: '📌', title, line: titles + extra, speech: `${unique.length} recordatorios pendientes: ${titles}` }
  } catch (_) {
    return { emoji: '📌', title: 'Recordatorios', line: 'No disponible', speech: 'No pude leer los recordatorios' }
  }
}

async function runNextEventStep() {
  try {
    const start = new Date()
    const end = new Date()
    end.setHours(23, 59, 59)
    const events = await CalendarEvent.between(start, end)
    const sorted = (events || []).filter(event => new Date(event.startDate) > Date.now()).sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    const next = sorted[0]
    if (!next) return { emoji: '📅', title: 'Siguiente evento', line: 'Ninguno hoy', speech: 'No hay más eventos hoy' }
    return { emoji: '📅', title: 'Siguiente evento', line: `${formatTime(next.startDate)} ${next.title}`, speech: `Siguiente evento a las ${formatTime(next.startDate)}: ${next.title}` }
  } catch (_) {
    return { emoji: '📅', title: 'Siguiente evento', line: 'No disponible', speech: 'No pude leer el calendario' }
  }
}

async function runBatteryStep() {
  try {
    const level = Device.batteryLevel()
    const charging = Device.isCharging()
    if (level < 0) return { emoji: '🔋', title: 'Batería', line: 'No disponible', speech: 'Nivel de batería no disponible' }
    const percent = Math.round(level * 100)
    const symbol = percent > 70 ? '🟢' : percent > 30 ? '🟡' : '🔴'
    const state = charging ? 'cargando' : 'batería'
    return { emoji: symbol, title: 'Batería', line: `${percent}% · ${state}`, speech: `Batería al ${percent} por ciento${charging ? ', cargando' : ''}` }
  } catch (_) {
    return { emoji: '🔋', title: 'Batería', line: 'No disponible', speech: 'Batería no disponible' }
  }
}

async function runQuoteStep() {
  try {
    const request = new Request('https://api.quotable.io/random')
    const data = await request.loadJSON()
    if (data && data.content) {
      const quote = data.content.length > 120 ? data.content.slice(0, 117) + '...' : data.content
      const author = data.author || 'Anónimo'
      return { emoji: '💬', title: 'Cita', line: `"${quote}" — ${author}`, speech: `Cita: ${quote}, de ${author}` }
    }
  } catch (_) {}
  const quote = FALLBACK_QUOTES[dailyHash() % FALLBACK_QUOTES.length]
  return { emoji: '💬', title: 'Cita', line: quote, speech: quote }
}

async function runRecapStep() {
  try {
    const today = todayKeyString()
    const runsToday = (store.history || []).filter(entry => entry.date.startsWith(today)).length
    const plannedCount = (store.plannedRoutines || []).length
    const line = `${runsToday} rutinas hoy · ${plannedCount} notif. programadas`
    const speech = `Hoy ejecutaste ${runsToday} rutinas y tienes ${plannedCount} notificaciones programadas`
    return { emoji: '📊', title: 'Resumen', line, speech }
  } catch (_) {
    return { emoji: '📊', title: 'Resumen', line: 'Sin datos', speech: 'Sin resumen disponible' }
  }
}

async function executeRoutine(routineName) {
  const routine = ROUTINES[routineName]
  if (!routine) throw new Error('Rutina desconocida: ' + routineName)
  const fallback = { emoji: '⚠️', title: 'Paso', line: 'Error', speech: 'Un paso falló' }
  const results = await Promise.all(routine.steps.map(step => step().catch(() => fallback)))
  const output = [`${routine.emoji} ${routine.label}`, '', ...results.map(result => `${result.emoji} ${result.title}: ${result.line}`)].join('\n')
  const speech = results.map(result => result.speech).join('. ')
  const record = { routine: routineName, date: new Date().toISOString(), ok: results.every(result => result.line !== 'Error') }
  store.lastRuns[routineName] = { date: record.date, ok: record.ok, lines: results.map(result => result.line) }
  store.history.unshift(record)
  if (store.history.length > 30) store.history.length = 30
  saveStore()
  return { output, speech }
}

async function consumeDuePlannedRoutine() {
  const planned = store.plannedRoutines || []
  if (planned.length === 0) return null
  const now = Date.now()
  const index = planned.findIndex(entry => {
    const trigger = new Date(entry.date).getTime()
    return now >= trigger && now - trigger < 12 * 3600 * 1000
  })
  if (index === -1) return null
  const target = planned[index]
  store.plannedRoutines.splice(index, 1)
  saveStore()
  return target.routine
}

async function captureReminder(text) {
  const clean = (text || '').trim()
  if (!clean) return { output: '✋ Sin texto para capturar', speech: 'No hay texto para capturar' }
  try {
    const reminder = new Reminder()
    reminder.title = clean
    reminder.notes = 'Capturado por Routine Runner · ' + new Date().toLocaleString('es-ES')
    await reminder.save()
    return { output: '✅ Capturado: ' + clean, speech: 'Recordatorio guardado: ' + clean }
  } catch (_) {
    return { output: '❌ No se pudo capturar', speech: 'No se pudo guardar el recordatorio' }
  }
}

async function runStatusReport() {
  const outputLines = ['📊 Estado de rutinas']
  const speechLines = []
  for (const key of Object.keys(ROUTINES)) {
    const routine = ROUTINES[key]
    const last = store.lastRuns[key]
    if (last) {
      outputLines.push(`${routine.emoji} ${routine.label}: ${last.ok ? '✅' : '❌'} · ${formatAgo(last.date)}`)
      speechLines.push(`${routine.label}: ${last.ok ? 'correcta' : 'con errores'}`)
    } else {
      outputLines.push(`${routine.emoji} ${routine.label}: sin ejecutar`)
      speechLines.push(`${routine.label}: sin ejecutar`)
    }
  }
  const battery = await runBatteryStep()
  outputLines.push(`${battery.emoji} Batería: ${battery.line}`)
  speechLines.push(battery.speech)
  const plannedCount = (store.plannedRoutines || []).length
  outputLines.push(`⏰ Notificaciones programadas: ${plannedCount}`)
  speechLines.push(`${plannedCount} notificaciones programadas`)
  return { output: outputLines.join('\n'), speech: speechLines.join('. ') }
}

async function scheduleRoutineNotifications() {
  const scheduled = []
  const targets = [
    { routine: 'morning', hour: 8, minute: 0 },
    { routine: 'evening', hour: 22, minute: 0 },
  ]
  for (const target of targets) {
    const fireDate = new Date()
    fireDate.setDate(fireDate.getDate() + 1)
    fireDate.setHours(target.hour, target.minute, 0, 0)
    const notification = new Notification()
    notification.title = `${ROUTINES[target.routine].emoji} ${ROUTINES[target.routine].label}`
    notification.body = 'Toca para ejecutar la rutina ahora'
    notification.sound = 'default'
    notification.scriptName = Script.name()
    notification.setTriggerDate(fireDate)
    await notification.schedule()
    scheduled.push({ routine: target.routine, date: fireDate.toISOString() })
  }
  store.plannedRoutines = scheduled
  saveStore()
  const summary = scheduled.map(entry => `${ROUTINES[entry.routine].emoji} ${ROUTINES[entry.routine].label} mañana ${formatTime(new Date(entry.date))}`).join('\n')
  const speech = `Programadas ${scheduled.length} notificaciones: rutina mañana a las 8 y rutina noche a las 22`
  return { output: '⏰ Notificaciones programadas\n' + summary, speech }
}

async function cancelRoutineNotifications() {
  let removed = 0
  try {
    const pending = await Notification.allPending()
    for (const notification of pending || []) {
      if (notification.scriptName === Script.name()) {
        await Notification.removePending(notification.identifier)
        removed++
      }
    }
  } catch (_) {}
  store.plannedRoutines = []
  saveStore()
  const message = removed > 0 ? `Eliminadas ${removed} notificaciones pendientes` : 'No había notificaciones pendientes'
  return { output: '🚫 ' + message, speech: message }
}

function runHistoryReport() {
  const entries = store.history.slice(0, 10)
  if (entries.length === 0) return { output: '📜 Sin ejecuciones registradas', speech: 'Todavía no hay historial' }
  const lines = entries.map(entry => {
    const routine = ROUTINES[entry.routine]
    const label = routine ? `${routine.emoji} ${routine.label}` : '🤖 ' + entry.routine
    return `${label} · ${entry.ok ? '✅' : '❌'} · ${formatDateTime(entry.date)}`
  })
  return { output: '📜 Últimas ejecuciones\n' + lines.join('\n'), speech: `Últimas ${entries.length} ejecuciones registradas` }
}

function runHelp() {
  const routineLines = Object.keys(ROUTINES).map(key => `· ${ROUTINES[key].emoji} ${ROUTINES[key].label}: ${ROUTINES[key].description}`)
  const commandLine = '· estado · programar · cancelar · historial · capturar <texto>'
  return {
    output: '🤖 Routine Runner\nRutinas:\n' + routineLines.join('\n') + '\nComandos:\n' + commandLine,
    speech: 'Routine Runner. Rutinas disponibles: mañana, trabajo, noche y rápida',
  }
}

async function deliverResult(result) {
  Script.setShortcutOutput(result.output)
  try {
    await Speech.speak(result.speech)
  } catch (_) {}
}

async function handleAutomationCommand() {
  const parameter = (args.shortcutParameter || '').trim()
  const dictation = (args.plainTexts && args.plainTexts[0] ? args.plainTexts[0] : '').trim()
  const command = normalizeCommand(parameter)

  if (!command && dictation) {
    await deliverResult(await captureReminder(dictation))
    return
  }
  if (!command) {
    const dueRoutine = await consumeDuePlannedRoutine()
    if (dueRoutine) {
      await deliverResult(await executeRoutine(dueRoutine))
      return
    }
    await deliverResult(runHelp())
    return
  }

  const route = COMMAND_ROUTES[command]
  if (route === 'weather') {
    const result = await runWeatherStep(0)
    await deliverResult({ output: `${result.emoji} ${result.title}: ${result.line}`, speech: result.speech })
    return
  }
  if (route === 'capture') {
    await deliverResult(await captureReminder(dictation || 'Nota rápida'))
    return
  }
  if (route === 'schedule') {
    await deliverResult(await scheduleRoutineNotifications())
    return
  }
  if (route === 'cancel') {
    await deliverResult(await cancelRoutineNotifications())
    return
  }
  if (route === 'history') {
    await deliverResult(runHistoryReport())
    return
  }
  if (route === 'status') {
    await deliverResult(await runStatusReport())
    return
  }
  if (route === 'help') {
    await deliverResult(runHelp())
    return
  }
  if (route) {
    await deliverResult(await executeRoutine(route))
    return
  }
  await deliverResult(await captureReminder(dictation || command))
}

function addChipRow(parent, battery, openReminders) {
  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  const chips = []
  if (battery) chips.push(`${battery.emoji} ${battery.line}`)
  if (openReminders !== null && openReminders !== undefined) chips.push(`📌 ${openReminders}`)
  chips.forEach((chipText, index) => {
    if (index > 0) row.addSpacer(6)
    const chip = row.addStack()
    chip.layoutHorizontally()
    chip.centerAlignContent()
    chip.backgroundColor = C.surface
    chip.cornerRadius = 7
    chip.setPadding(3, 7, 3, 7)
    const label = chip.addText(chipText)
    label.font = Font.systemFont(10)
    label.textColor = C.secondary
  })
}

function addWidgetHeader(widget, iconSize, titleSize) {
  const header = widget.addStack()
  header.layoutHorizontally()
  header.centerAlignContent()
  const icon = header.addText('🤖')
  icon.font = Font.mediumSystemFont(iconSize)
  header.addSpacer(6)
  const title = header.addText('Routine Runner')
  title.font = Font.boldSystemFont(titleSize)
  title.textColor = C.text
  header.addSpacer(null)
  const dateLabel = header.addText(formatToday())
  dateLabel.font = Font.systemFont(10)
  dateLabel.textColor = C.muted
  return header
}

function addRoutineRow(parent, key) {
  const routine = ROUTINES[key]
  const last = store.lastRuns[key]
  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.backgroundColor = C.surface
  row.cornerRadius = 8
  row.setPadding(5, 8, 5, 8)
  const symbol = row.addText(routine.emoji)
  symbol.font = Font.systemFont(13)
  row.addSpacer(8)
  const name = row.addText(routine.label)
  name.font = Font.mediumSystemFont(12)
  name.textColor = C.text
  row.addSpacer(null)
  const status = row.addText(last ? (last.ok ? '✅' : '❌') + ' ' + formatAgo(last.date) : '—')
  status.font = Font.systemFont(10)
  status.textColor = last ? (last.ok ? C.success : C.error) : C.muted
}

function addRoutineCard(parent, key) {
  const routine = ROUTINES[key]
  const last = store.lastRuns[key]
  const card = parent.addStack()
  card.layoutVertically()
  card.backgroundColor = C.surface
  card.cornerRadius = 9
  card.setPadding(6, 9, 6, 9)
  const header = card.addStack()
  header.layoutHorizontally()
  header.centerAlignContent()
  const symbol = header.addText(routine.emoji)
  symbol.font = Font.systemFont(12)
  header.addSpacer(7)
  const name = header.addText(routine.label)
  name.font = Font.mediumSystemFont(12)
  name.textColor = C.text
  header.addSpacer(null)
  const status = header.addText(last ? (last.ok ? '✅' : '❌') + ' ' + formatAgo(last.date) : '—')
  status.font = Font.systemFont(9)
  status.textColor = last ? (last.ok ? C.success : C.error) : C.muted
  if (last && last.lines && last.lines.length > 0) {
    card.addSpacer(3)
    for (const line of last.lines.slice(0, 2)) {
      const detail = card.addText(line)
      detail.font = Font.systemFont(9)
      detail.textColor = C.secondary
    }
  }
}

function latestRoutineLine() {
  const entry = store.history[0]
  if (!entry) return 'Ejecuta una rutina con Siri'
  const routine = ROUTINES[entry.routine]
  const label = routine ? `${routine.emoji} ${routine.label}` : '🤖 ' + entry.routine
  return `${label}: ${entry.ok ? '✅' : '❌'} ${formatAgo(entry.date)}`
}

function buildSmallWidget(widget, battery, nextEvent, openReminders) {
  addWidgetHeader(widget, 14, 14)
  widget.addSpacer(8)
  addChipRow(widget, battery, openReminders)
  widget.addSpacer(8)
  if (nextEvent) {
    const eventLine = widget.addText(`${nextEvent.emoji} ${nextEvent.line}`)
    eventLine.font = Font.systemFont(11)
    eventLine.textColor = C.secondary
  }
  widget.addSpacer(null)
  const footer = widget.addText(latestRoutineLine())
  footer.font = Font.systemFont(9)
  footer.textColor = C.muted
}

function buildMediumWidget(widget, battery, nextEvent, openReminders) {
  addWidgetHeader(widget, 16, 16)
  widget.addSpacer(10)
  for (const key of Object.keys(ROUTINES)) {
    addRoutineRow(widget, key)
    widget.addSpacer(5)
  }
  widget.addSpacer(4)
  addChipRow(widget, battery, openReminders)
}

function buildLargeWidget(widget, battery, nextEvent, openReminders) {
  addWidgetHeader(widget, 18, 18)
  widget.addSpacer(10)
  for (const key of Object.keys(ROUTINES)) {
    addRoutineCard(widget, key)
    widget.addSpacer(6)
  }
  const planned = store.plannedRoutines || []
  if (planned.length > 0) {
    const plannedLabel = widget.addText('⏰ ' + planned.map(entry => `${ROUTINES[entry.routine] ? ROUTINES[entry.routine].emoji : '🤖'} ${formatTime(new Date(entry.date))}`).join('  '))
    plannedLabel.font = Font.systemFont(10)
    plannedLabel.textColor = C.warning
    widget.addSpacer(4)
  }
  addChipRow(widget, battery, openReminders)
}

function renderErrorWidget() {
  const widget = new ListWidget()
  const background = new LinearGradient()
  background.colors = [new Color('#1A1A2E'), new Color('#0F0C29')]
  background.locations = [0, 1]
  widget.backgroundGradient = background
  const title = widget.addText('⚠️ Routine Runner')
  title.font = Font.boldSystemFont(14)
  title.textColor = C.text
  const message = widget.addText('Error al renderizar')
  message.font = Font.systemFont(10)
  message.textColor = C.secondary
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  widget.refreshAfterDate = new Date(Date.now() + 600000)
  Script.setWidget(widget)
  Script.complete()
}

async function runAsWidget() {
  const widget = new ListWidget()
  const background = new LinearGradient()
  background.colors = [new Color('#0B0B12'), new Color('#1A1B2E')]
  background.locations = [0, 1]
  widget.backgroundGradient = background
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000)

  const battery = await runBatteryStep().catch(() => null)
  const nextEvent = await runNextEventStep().catch(() => null)
  const openReminders = await countOpenReminders().catch(() => null)

  const family = config.widgetFamily
  if (family === 'small') {
    buildSmallWidget(widget, battery, nextEvent, openReminders)
  } else if (family === 'medium') {
    buildMediumWidget(widget, battery, nextEvent, openReminders)
  } else {
    buildLargeWidget(widget, battery, nextEvent, openReminders)
  }
  Script.setWidget(widget)
  Script.complete()
}

async function countOpenReminders() {
  try {
    const open = await Reminder.allIncomplete()
    return (open || []).length
  } catch (_) {
    return null
  }
}

async function showResult(titleKey, result) {
  const titleMap = {
    status: '📊 Estado',
    schedule: '⏰ Notificaciones',
    cancel: '🚫 Cancelar',
    history: '📜 Historial',
  }
  const routine = ROUTINES[titleKey]
  const title = titleMap[titleKey] || (routine ? `${routine.emoji} ${routine.label}` : '🤖 Routine Runner')
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

async function runAsUtility() {
  const dueRoutine = await consumeDuePlannedRoutine()
  if (dueRoutine) {
    await showResult(dueRoutine, await executeRoutine(dueRoutine))
    return
  }
  const menu = new Alert()
  menu.title = '🤖 Routine Runner'
  menu.message = 'Ejecuta rutinas, programa notificaciones y consulta el estado'
  menu.addAction('🌅 Rutina mañana')
  menu.addAction('💼 Rutina trabajo')
  menu.addAction('🌙 Rutina noche')
  menu.addAction('⚡ Rutina rápida')
  menu.addAction('📊 Estado')
  menu.addAction('⏰ Programar notificaciones')
  menu.addAction('🚫 Cancelar notificaciones')
  menu.addAction('📜 Historial')
  menu.addCancelAction('✖️ Cerrar')
  const choice = await menu.presentSheet()
  if (choice === 0) {
    await showResult('morning', await executeRoutine('morning'))
  } else if (choice === 1) {
    await showResult('work', await executeRoutine('work'))
  } else if (choice === 2) {
    await showResult('evening', await executeRoutine('evening'))
  } else if (choice === 3) {
    await showResult('quick', await executeRoutine('quick'))
  } else if (choice === 4) {
    await showResult('status', await runStatusReport())
  } else if (choice === 5) {
    await showResult('schedule', await scheduleRoutineNotifications())
  } else if (choice === 6) {
    await showResult('cancel', await cancelRoutineNotifications())
  } else if (choice === 7) {
    await showResult('history', runHistoryReport())
  }
}

try {
  if (config.runsInWidget) {
    await runAsWidget()
  } else if (config.runsInApp !== false) {
    await runAsUtility()
  } else {
    await handleAutomationCommand()
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
      await Speech.speak('La rutina falló')
    } catch (_) {}
  }
}
