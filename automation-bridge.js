const STORE_KEY = 'automation-bridge-store.json'
const fm = FileManager.local()
const storePath = fm.joinPath(fm.documentsDirectory(), STORE_KEY)

const C = {
  background: new Color('#1C1C1E'),
  card: new Color('#2C2C2E'),
  text: new Color('#FFFFFF'),
  secondary: new Color('#8E8E93'),
  accent: new Color('#0A84FF'),
  success: new Color('#30D158'),
  warning: new Color('#FF9F0A'),
  error: new Color('#FF453A'),
  muted: new Color('#636366'),
  surface: new Color('#3A3A3C'),
  separator: new Color('#38383A')
}

const DAY_EMOJIS = ['😴', '🌙', '🌤️', '☀️', '🌧️', '❄️', '🎯']

function loadStore() {
  try {
    if (fm.fileExists(storePath)) {
      return JSON.parse(fm.readString(storePath))
    }
  } catch (_) {}
  return { moods: [], taskLog: [], lastAuto: null }
}

function saveStore(data) {
  try {
    fm.writeString(storePath, JSON.stringify(data, null, 2))
  } catch (_) {}
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function tomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function formatTime(date) {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function dayNameInSpanish(date) {
  const names = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  return names[date.getDay()]
}

function timeAgo(isoString) {
  if (!isoString) return 'nunca'
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)
  if (diff < 1) return 'ahora mismo'
  if (diff < 60) return `hace ${diff} min`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

async function handleQuickCapture(text) {
  if (!text || !text.trim()) {
    Script.setShortcutOutput('error: no text provided')
    return 'error'
  }
  const reminder = new Reminder()
  reminder.title = text.trim()
  reminder.notes = `Capturado el ${new Date().toLocaleString('es-ES')} vía Automation Bridge`
  await reminder.save()
  Script.setShortcutOutput(`✓ Capturado: ${text.trim()}`)
  return 'success'
}

async function handleTomorrowPreview() {
  try {
    const cal = await Calendar.defaultForEvents()
    const start = new Date()
    start.setDate(start.getDate() + 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const events = await CalendarEvent.between(start, end, [cal])
    const remStore = await Reminder.allIncomplete([await Reminder.defaultList()])
    const overdue = remStore.filter(r => r.dueDate && r.dueDate < new Date())

    const lines = [`📅 Mañana — ${dayNameInSpanish(start)} ${start.getDate()}/${start.getMonth() + 1}`]
    lines.push('')
    if (events.length === 0) {
      lines.push('📭 Sin eventos programados')
    } else {
      lines.push(`📆 ${events.length} evento(s):`)
      for (const ev of events) {
        const emoji = ev.title.includes('Reunión') ? '👥' :
                      ev.title.includes('Doctor') ? '🏥' :
                      ev.title.includes('Cumple') ? '🎂' : '📌'
        const startStr = formatTime(ev.startDate)
        const endStr = formatTime(ev.endDate)
        lines.push(`  ${emoji} ${startStr}-${endStr} ${ev.title}`)
      }
    }
    if (overdue.length > 0) {
      lines.push('')
      lines.push(`⚠️ ${overdue.length} recordatorio(s) atrasado(s):`)
      for (const r of overdue.slice(0, 5)) {
        lines.push(`  • ${r.title}`)
      }
    }

    const alert = new Alert()
    alert.title = '📅 Vista previa de mañana'
    alert.message = lines.join('\n')
    alert.addCancelAction('Cerrar')
    await alert.present()
    Script.setShortcutOutput(lines.join('\n'))
  } catch (e) {
    Script.setShortcutOutput(`error: ${e.message}`)
  }
}

async function handleTodayOverview() {
  try {
    const cal = await Calendar.defaultForEvents()
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setDate(end.getDate() + 1)
    end.setHours(0, 0, 0, 0)
    const events = await CalendarEvent.between(start, end, [cal])
    const remStore = await Reminder.allIncomplete()
    const todayRem = remStore.filter(r => !r.dueDate || r.dueDate <= end)
    const overdue = remStore.filter(r => r.dueDate && r.dueDate < start)

    const lines = [`📋 Hoy — ${dayNameInSpanish(new Date())} ${new Date().getDate()}/${new Date().getMonth() + 1}`]
    lines.push('')
    lines.push(`📆 ${events.length} evento(s) hoy:`)
    if (events.length > 0) {
      for (const ev of events) {
        const startStr = formatTime(ev.startDate)
        const endStr = formatTime(ev.endDate)
        lines.push(`  ${startStr}-${endStr} ${ev.title}`)
      }
    } else {
      lines.push('  Sin eventos')
    }
    lines.push('')
    lines.push(`📝 ${todayRem.length} recordatorio(s) pendiente(s)`)
    if (overdue.length > 0) {
      lines.push(`⚠️ ${overdue.length} atrasado(s)`)
    }

    const alert = new Alert()
    alert.title = '📋 Resumen del día'
    alert.message = lines.join('\n')
    alert.addCancelAction('Cerrar')
    await alert.present()
    Script.setShortcutOutput(lines.join('\n'))
  } catch (e) {
    Script.setShortcutOutput(`error: ${e.message}`)
  }
}

async function handleWindDown() {
  try {
    const cal = await Calendar.defaultForEvents()
    const start = new Date()
    start.setDate(start.getDate() + 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const events = await CalendarEvent.between(start, end, [cal])
    const remStore = await Reminder.allIncomplete()
    const overdue = remStore.filter(r => r.dueDate && r.dueDate < new Date())
    const tomorrow = dayNameInSpanish(start)

    const lines = ['🌙 Rutina nocturna']
    lines.push('')
    if (events.length > 0) {
      const firstEvent = events.reduce((a, b) => a.startDate < b.startDate ? a : b)
      const hour = firstEvent.startDate.getHours()
      const recBedtime = hour <= 8 ? '22:00' : hour <= 10 ? '23:00' : '23:30'
      lines.push(`⏰ Primer evento mañana: ${formatTime(firstEvent.startDate)}`)
      lines.push(`😴 Hora recomendada de dormir: ${recBedtime}`)
      lines.push(`🛌 Despertar sugerido: ${formatTime(firstEvent.startDate)}`)
    } else {
      lines.push('📭 Sin eventos mañana — puedes dormir tranquilo')
    }
    if (overdue.length > 0) {
      lines.push('')
      lines.push(`⚠️ ${overdue.length} tarea(s) pendiente(s) de hoy:`)
      for (const r of overdue.slice(0, 3)) {
        lines.push(`  • ${r.title}`)
      }
    }
    lines.push('')
    lines.push(`📅 Mañana es ${tomorrow} — ${events.length > 0 ? `${events.length} evento(s)` : 'día libre'}`)

    const alert = new Alert()
    alert.title = '🌙 Rutina nocturna'
    alert.message = lines.join('\n')
    alert.addAction('✅ Empezar rutina')
    alert.addCancelAction('Cerrar')
    const choice = await alert.present()
    if (choice === 0) {
      const notif = new Notification()
      notif.title = '🌙 Hora de dormir'
      notif.body = '¡Prepárate para descansar! Revisa tus tareas pendientes.'
      notif.sound = 'default'
      await notif.schedule()
    }
    Script.setShortcutOutput(lines.join('\n'))
  } catch (e) {
    Script.setShortcutOutput(`error: ${e.message}`)
  }
}

async function handleLogMood(mood, note) {
  if (!mood || !mood.trim()) {
    Script.setShortcutOutput('error: mood required')
    return
  }
  const data = loadStore()
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: new Date().toISOString(),
    mood: mood.trim(),
    note: (note || '').trim(),
    day: dayNameInSpanish(new Date())
  }
  data.moods.push(entry)
  saveStore(data)
  Script.setShortcutOutput(`✓ Estado de ánimo registrado: ${mood.trim()}`)
}

async function handleListReminders(listName) {
  try {
    const lists = await ReminderList.all()
    let targetList = null
    if (listName && listName.trim()) {
      targetList = lists.find(l => l.title.toLowerCase().includes(listName.toLowerCase().trim()))
    }
    if (!targetList) {
      targetList = await Reminder.defaultList()
    }
    const reminders = await Reminder.allIncomplete([targetList])
    const sorted = reminders.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return 0
    })

    const lines = [`📝 ${sorted.length} recordatorio(s) en "${targetList.title}":`]
    if (sorted.length === 0) {
      lines.push('  ✅ Todos completados')
    } else {
      for (const r of sorted.slice(0, 15)) {
        const due = r.dueDate ? ` [${formatTime(r.dueDate)}]` : ''
        const priority = r.priority === 3 ? '🔴' : r.priority === 2 ? '🟡' : '⚪'
        lines.push(`  ${priority} ${r.title}${due}`)
      }
      if (sorted.length > 15) {
        lines.push(`  ... y ${sorted.length - 15} más`)
      }
    }

    const alert = new Alert()
    alert.title = '📝 Lista de recordatorios'
    alert.message = lines.join('\n')
    alert.addCancelAction('Cerrar')
    await alert.present()
    Script.setShortcutOutput(lines.join('\n'))
  } catch (e) {
    Script.setShortcutOutput(`error: ${e.message}`)
  }
}

async function handleScheduleTask(title, minutes) {
  if (!title || !title.trim()) {
    Script.setShortcutOutput('error: title required')
    return
  }
  const duration = parseInt(minutes) || 25
  const triggerDate = new Date(Date.now() + duration * 60000)

  const notif = new Notification()
  notif.title = '⏰ Recordatorio programado'
  notif.body = title.trim()
  notif.sound = 'default'
  notif.scriptName = Script.name()
  notif.setTriggerDate(triggerDate)
  await notif.schedule()

  const reminder = new Reminder()
  reminder.title = title.trim()
  reminder.dueDate = triggerDate
  await reminder.save()

  Script.setShortcutOutput(`✓ Programado: "${title.trim()}" en ${duration} min (${formatTime(triggerDate)})`)
}

async function handleStats() {
  const data = loadStore()
  const today = todayISO()
  const todayMoods = data.moods.filter(m => m.date.startsWith(today))
  const totalMoods = data.moods.length

  const lines = ['📊 Automation Bridge — Estadísticas']
  lines.push('')
  lines.push(`😊 Estados de ánimo registrados: ${totalMoods}`)
  if (todayMoods.length > 0) {
    lines.push(`  Hoy: ${todayMoods.map(m => m.mood).join(', ')}`)
  }
  const recent = data.moods.slice(-5).reverse()
  if (recent.length > 0) {
    lines.push('')
    lines.push('Últimos:')
    for (const m of recent) {
      lines.push(`  ${m.mood}${m.note ? ` — ${m.note}` : ''} (${timeAgo(m.date)})`)
    }
  }

  if (config.runsInApp) {
    const alert = new Alert()
    alert.title = '📊 Estadísticas'
    alert.message = lines.join('\n')
    alert.addCancelAction('Cerrar')
    await alert.present()
  }
  Script.setShortcutOutput(lines.join('\n'))
}

async function handleVersion() {
  const info = [
    '🤖 Automation Bridge v2.0',
    '',
    'Comandos disponibles:',
    '  quick-capture <text>        — Crear recordatorio',
    '  today-overview              — Resumen del día',
    '  tomorrow-preview            — Vista previa de mañana',
    '  wind-down                   — Rutina nocturna',
    '  log-mood <mood> [note]      — Registrar estado de ánimo',
    '  list-reminders [lista]      — Listar recordatorios',
    '  schedule-task <title> <min>  — Programar notificación',
    '  stats                       — Estadísticas de uso',
    '',
    'Usar desde Shortcuts:',
    '  args.shortcutParameter = {"command": "quick-capture", "text": "..."}',
    '',
    'O desde URL:',
    '  scriptable:///run?scriptName=automation-bridge&command=quick-capture&text=...'
  ].join('\n')
  if (config.runsInApp) {
    const alert = new Alert()
    alert.title = '🤖 Ayuda'
    alert.message = info
    alert.addCancelAction('Cerrar')
    await alert.present()
  }
  Script.setShortcutOutput(info)
}

async function handleHelp() {
  await handleVersion()
}

async function showMainMenu() {
  const data = loadStore()
  const moodCount = data.moods.length

  const alert = new Alert()
  alert.title = '🤖 Automation Bridge'
  alert.message = `Comandos de automatización • ${moodCount} registros`

  alert.addAction('📋 Resumen del día')
  alert.addAction('📅 Vista previa mañana')
  alert.addAction('🌙 Rutina nocturna')
  alert.addAction('📝 Listar recordatorios')
  alert.addAction('😊 Registrar estado de ánimo')
  alert.addAction('📊 Estadísticas')
  alert.addAction('🤖 Ayuda')
  alert.addCancelAction('✖️ Cerrar')

  const choice = await alert.presentSheet()

  switch (choice) {
    case 0:
      await handleTodayOverview()
      break
    case 1:
      await handleTomorrowPreview()
      break
    case 2:
      await handleWindDown()
      break
    case 3:
      await handleListReminders()
      break
    case 4: {
      const moodAlert = new Alert()
      moodAlert.title = '😊 ¿Cómo te sientes?'
      moodAlert.addTextField('Ej: tranquilo, productivo, cansado...')
      moodAlert.addTextField('Nota opcional')
      moodAlert.addAction('Guardar')
      moodAlert.addCancelAction('Cancelar')
      const moodChoice = await moodAlert.present()
      if (moodChoice === 0) {
        const mood = moodAlert.textFieldValue(0).trim()
        const note = moodAlert.textFieldValue(1).trim()
        await handleLogMood(mood, note)
        if (config.runsInApp) {
          const confirm = new Alert()
          confirm.title = '✅ Registrado'
          confirm.message = `Estado de ánimo: ${mood}${note ? `\nNota: ${note}` : ''}`
          confirm.addCancelAction('Cerrar')
          await confirm.present()
        }
      }
      break
    }
    case 5:
      await handleStats()
      break
    case 6:
      await handleVersion()
      break
  }

  if (choice >= 0 && choice <= 6) {
    await showMainMenu()
  }
}

if (config.runsWithSiri || args.shortcutParameter) {
  const input = args.shortcutParameter
  if (typeof input === 'object' && input !== null) {
    const command = input.command || ''
    switch (command) {
      case 'quick-capture':
        await handleQuickCapture(input.text)
        break
      case 'tomorrow-preview':
        await handleTomorrowPreview()
        break
      case 'today-overview':
        await handleTodayOverview()
        break
      case 'wind-down':
        await handleWindDown()
        break
      case 'log-mood':
        await handleLogMood(input.mood, input.note)
        break
      case 'list-reminders':
        await handleListReminders(input.list)
        break
      case 'schedule-task':
        await handleScheduleTask(input.title, input.minutes)
        break
      case 'stats':
        await handleStats()
        break
      case 'help':
      case 'version':
        await handleVersion()
        break
      default:
        Script.setShortcutOutput(`error: unknown command "${command}"`)
    }
  } else if (typeof input === 'string') {
    const parts = input.trim().split(/\s+/)
    const cmd = parts[0].toLowerCase()
    const rest = parts.slice(1).join(' ')
    switch (cmd) {
      case 'capture':
      case 'quick-capture':
        await handleQuickCapture(rest)
        break
      case 'tomorrow':
      case 'tomorrow-preview':
        await handleTomorrowPreview()
        break
      case 'today':
      case 'today-overview':
        await handleTodayOverview()
        break
      case 'winddown':
      case 'wind-down':
        await handleWindDown()
        break
      case 'mood':
      case 'log-mood':
        await handleLogMood(rest)
        break
      case 'list':
      case 'reminders':
      case 'list-reminders':
        await handleListReminders(rest)
        break
      case 'schedule':
      case 'schedule-task':
        await handleScheduleTask(rest, '25')
        break
      case 'stats':
        await handleStats()
        break
      case 'help':
      case 'version':
        await handleVersion()
        break
      default:
        Script.setShortcutOutput(`error: unknown command "${cmd}"`)
    }
  } else {
    Script.setShortcutOutput('error: invalid input format')
  }
} else if (config.runsInWidget) {
  const widget = new ListWidget()
  const bg = new LinearGradient()
  bg.colors = [new Color('#1a1b41'), new Color('#2d1b4e')]
  bg.locations = [0, 1]
  widget.backgroundGradient = bg

  const titleRow = widget.addStack()
  titleRow.layoutHorizontally()
  titleRow.centerAlignContent()
  const icon = titleRow.addText('🤖')
  icon.font = Font.systemFont(14)
  titleRow.addSpacer(4)
  const title = titleRow.addText('Automation Bridge')
  title.font = Font.boldSystemFont(14)
  title.textColor = C.text
  widget.addSpacer(6)

  const data = loadStore()
  const todayMoods = data.moods.filter(m => m.date.startsWith(todayISO()))

  const statsStack = widget.addStack()
  statsStack.layoutHorizontally()
  const moodsText = statsStack.addText(`😊 ${data.moods.length}`)
  moodsText.font = Font.systemFont(12)
  moodsText.textColor = C.secondary
  statsStack.addSpacer(null)
  const todayText = statsStack.addText(todayMoods.length > 0 ? `📌 ${todayMoods.length} hoy` : '🌙 sin datos')
  todayText.font = Font.systemFont(12)
  todayText.textColor = C.secondary

  widget.addSpacer(6)
  const divider = widget.addStack()
  divider.backgroundColor = C.surface
  divider.cornerRadius = 1
  divider.size = new Size(0, 1)
  widget.addSpacer(6)

  const commands = ['📋 Hoy', '📅 Mañana', '🌙 Noche', '📝 Tareas']
  const cmdsStack = widget.addStack()
  cmdsStack.layoutHorizontally()
  for (const cmd of commands) {
    const chip = cmdsStack.addStack()
    chip.layoutHorizontally()
    chip.centerAlignContent()
    chip.backgroundColor = C.card
    chip.cornerRadius = 6
    chip.setPadding(4, 6, 4, 6)
    const label = chip.addText(cmd)
    label.font = Font.mediumSystemFont(10)
    label.textColor = C.text
    if (commands.indexOf(cmd) < commands.length - 1) {
      cmdsStack.addSpacer(4)
    }
  }

  widget.addSpacer(8)
  const hintStack = widget.addStack()
  hintStack.layoutHorizontally()
  const hint = hintStack.addText('▼ Ábreme para el menú completo')
  hint.font = Font.systemFont(9)
  hint.textColor = C.muted
  hintStack.addSpacer(null)
  const urlIcon = hintStack.addText('⚡')
  urlIcon.font = Font.systemFont(9)
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  widget.refreshAfterDate = new Date(Date.now() + 3600000)

  Script.setWidget(widget)
} else {
  await showMainMenu()
}

Script.complete()
