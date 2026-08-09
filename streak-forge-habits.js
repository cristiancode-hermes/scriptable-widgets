const VERSION = '1.0.0'
const LIST_NAME = 'StreakForge Habits'
const STREAK_EMOJI = '🔥'
const EMPTY_EMOJI = '⚪'
const DONE_EMOJI = '✅'
const COLORS = {
  background: new Color('#1a1a2e'),
  card: new Color('#16213e'),
  accent: new Color('#e94560'),
  accentDim: new Color('#e94560', 0.3),
  secondary: new Color('#a0a0b0'),
  success: new Color('#2ecc71'),
  warning: new Color('#f39c12'),
  streak: new Color('#ff6b35'),
  muted: new Color('#333355'),
}

async function run() {
  if (config.runsInWidget) {
    const widget = await createWidget()
    Script.setWidget(widget)
    Script.complete()
    return
  }
  const app = new App()
  await app.present()
}

async function createWidget() {
  const widget = new ListWidget()
  widget.backgroundColor = COLORS.background
  widget.setPadding(12, 12, 12, 12)

  const habits = await loadOrCreateHabits()
  const todayHabits = getTodayHabits(habits)
  const completed = todayHabits.filter(h => h.completed).length
  const total = todayHabits.length
  const topStreak = Math.max(...habits.map(h => h.streak), 0)

  if (config.widgetFamily === 'small') {
    renderSmallWidget(widget, completed, total, topStreak)
  } else if (config.widgetFamily === 'medium') {
    renderMediumWidget(widget, todayHabits, completed, total, topStreak)
  } else {
    renderLargeWidget(widget, habits, todayHabits, completed, total, topStreak)
  }

  return widget
}

function renderSmallWidget(widget, completed, total, topStreak) {
  const header = widget.addText('StreakForge')
  header.font = Font.boldSystemFont(11)
  header.textColor = COLORS.accent

  widget.addSpacer(8)

  const progressText = widget.addText(`${completed}/${total}`)
  progressText.font = Font.boldSystemFont(36)
  progressText.textColor = COLORS.text

  const label = widget.addText(total === 1 ? 'habit today' : 'habits today')
  label.font = Font.systemFont(11)
  label.textColor = COLORS.secondary

  widget.addSpacer(6)

  const streakStack = widget.addStack()
  const streakIcon = streakStack.addText(STREAK_EMOJI)
  streakIcon.font = Font.systemFont(12)
  streakStack.addSpacer(3)
  const streakValue = streakStack.addText(`${topStreak}`)
  streakValue.font = Font.boldSystemFont(16)
  streakValue.textColor = COLORS.streak
  const streakLabel = streakStack.addText(' day streak')
  streakLabel.font = Font.systemFont(11)
  streakLabel.textColor = COLORS.secondary
}

function renderMediumWidget(widget, todayHabits, completed, total, topStreak) {
  const headerRow = widget.addStack()
  const title = headerRow.addText('StreakForge')
  title.font = Font.boldSystemFont(14)
  title.textColor = COLORS.accent
  headerRow.addSpacer()
  const progress = headerRow.addText(`${completed}/${total}`)
  progress.font = Font.boldSystemFont(14)
  progress.textColor = COLORS.text

  widget.addSpacer(8)

  const streakRow = widget.addStack()
  const streakIcon = streakRow.addText(STREAK_EMOJI)
  streakIcon.font = Font.systemFont(11)
  streakRow.addSpacer(4)
  const streakVal = streakRow.addText(`Best streak: ${topStreak} days`)
  streakVal.font = Font.systemFont(11)
  streakVal.textColor = COLORS.secondary

  widget.addSpacer(8)

  for (const habit of todayHabits.slice(0, 6)) {
    const row = widget.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()
    row.addSpacer(2)
    const icon = row.addText(habit.completed ? DONE_EMOJI : EMPTY_EMOJI)
    icon.font = Font.systemFont(12)
    row.addSpacer(6)
    const name = row.addText(habit.name)
    name.font = Font.systemFont(12)
    name.textColor = COLORS.text
    row.addSpacer()
    if (habit.streak > 0) {
      const streak = row.addText(`${STREAK_EMOJI}${habit.streak}`)
      streak.font = Font.systemFont(10)
      streak.textColor = COLORS.streak
    }
    widget.addSpacer(4)
  }
}

function renderLargeWidget(widget, habits, todayHabits, completed, total, topStreak) {
  const headerRow = widget.addStack()
  const title = headerRow.addText('StreakForge')
  title.font = Font.boldSystemFont(18)
  title.textColor = COLORS.accent
  headerRow.addSpacer()
  const version = headerRow.addText(`v${VERSION}`)
  version.font = Font.systemFont(10)
  version.textColor = COLORS.secondary

  widget.addSpacer(6)

  const metaRow = widget.addStack()
  const progressBig = metaRow.addText(`${completed}/${total}`)
  progressBig.font = Font.boldSystemFont(28)
  progressBig.textColor = COLORS.text
  metaRow.addSpacer(12)
  const streakCol = metaRow.addStack()
  streakCol.layoutVertically()
  const streakBig = streakCol.addText(`${STREAK_EMOJI} ${topStreak}`)
  streakBig.font = Font.boldSystemFont(20)
  streakBig.textColor = COLORS.streak
  const streakDesc = streakCol.addText('best streak')
  streakDesc.font = Font.systemFont(10)
  streakDesc.textColor = COLORS.secondary

  widget.addSpacer(12)

  const statsRow = widget.addStack()
  const allHabitsCount = habits.length
  const activeCount = habits.filter(h => h.enabled).length
  statsRow.addText(`${activeCount} active · ${allHabitsCount} total habits`)
  statsRow.font = Font.systemFont(11)
  statsRow.textColor = COLORS.secondary

  widget.addSpacer(10)

  const sectionLabel = widget.addText('Today')
  sectionLabel.font = Font.boldSystemFont(12)
  sectionLabel.textColor = COLORS.accent
  widget.addSpacer(6)

  for (const habit of todayHabits) {
    const row = widget.addStack()
    row.centerAlignContent()
    const icon = row.addText(habit.completed ? DONE_EMOJI : EMPTY_EMOJI)
    icon.font = Font.systemFont(14)
    row.addSpacer(6)
    const col = row.addStack()
    col.layoutVertically()
    const nameRow = col.addStack()
    const name = nameRow.addText(habit.name)
    name.font = Font.systemFont(12)
    name.textColor = COLORS.text
    nameRow.addSpacer()
    if (habit.streak > 0) {
      const streakBadge = nameRow.addText(`${STREAK_EMOJI} ${habit.streak}d`)
      streakBadge.font = Font.boldSystemFont(11)
      streakBadge.textColor = COLORS.streak
    }
    if (habit.completed) {
      const timeLabel = col.addText(formatTime(habit.completedAt))
      timeLabel.font = Font.systemFont(9)
      timeLabel.textColor = COLORS.secondary
    }
    row.addSpacer()
    widget.addSpacer(5)
  }

  if (todayHabits.length === 0) {
    const empty = widget.addText('No habits defined. Open StreakForge to add some.')
    empty.font = Font.systemFont(12)
    empty.textColor = COLORS.secondary
  }

  widget.addSpacer(8)

  const calendarLabel = widget.addText('This Week')
  calendarLabel.font = Font.boldSystemFont(12)
  calendarLabel.textColor = COLORS.accent
  widget.addSpacer(6)

  const weekGrid = renderWeekGrid()
  widget.addStack(weekGrid)
}

function renderWeekGrid() {
  const grid = new ListWidget()
  grid.layoutHorizontally()
  const now = new Date()
  const dayOfWeek = now.getDay()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    const dayCol = grid.addStack()
    dayCol.layoutVertically()
    dayCol.centerAlignContent()
    dayCol.setPadding(4, 4, 4, 4)
    dayCol.size = new Size(28, 40)

    const isToday = day.toDateString() === now.toDateString()
    const dayName = dayCol.addText(['S', 'M', 'T', 'W', 'T', 'F', 'S'][i])
    dayName.font = Font.systemFont(9)
    dayName.textColor = isToday ? COLORS.accent : COLORS.secondary
    dayName.centerAlignText()

    const dayNum = dayCol.addText(`${day.getDate()}`)
    dayNum.font = isToday ? Font.boldSystemFont(12) : Font.systemFont(10)
    dayNum.textColor = isToday ? COLORS.text : COLORS.secondary
    dayNum.centerAlignText()

    if (i < 6) {
      grid.addSpacer(2)
    }
  }

  return grid
}

function formatTime(date) {
  if (!date) return ''
  const h = date.getHours()
  const m = date.getMinutes()
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

class App {
  constructor() {
    this.table = new UITable()
    this.habits = []
    this.selectedHabitIndex = -1
  }

  async present() {
    const alert = new Alert()
    alert.title = 'StreakForge'
    alert.message = 'Habit Tracker powered by iOS Reminders'
    alert.addAction('View Today')
    alert.addAction('Manage Habits')
    alert.addAction('Add Habit')

    const result = await alert.presentAlert()
    if (result === 0) {
      await this.showTodayView()
    } else if (result === 1) {
      await this.showManageView()
    } else if (result === 2) {
      await this.addHabit()
    }
  }

  async showTodayView() {
    this.habits = await loadOrCreateHabits()
    this.table = new UITable()
    this.table.addRow(createHeaderRow('StreakForge · Today'))
    this.table.addRow(createSeparatorRow())

    const todayHabits = getTodayHabits(this.habits)
    const completed = todayHabits.filter(h => h.completed).length
    const total = todayHabits.length
    const topStreak = Math.max(...this.habits.map(h => h.streak), 0)

    const summaryRow = new UITableRow()
    summaryRow.height = 60
    const summaryCell = summaryRow.addText(`Habits: ${completed}/${total}  ${STREAK_EMOJI} Best: ${topStreak}d`)
    summaryCell.titleFont = Font.boldSystemFont(16)
    summaryCell.titleColor = COLORS.text
    summaryCell.subtitleFont = Font.systemFont(12)
    summaryCell.subtitleColor = COLORS.secondary
    summaryRow.backgroundColor = COLORS.card
    this.table.addRow(summaryRow)
    this.table.addRow(createSeparatorRow())

    if (todayHabits.length === 0) {
      const emptyRow = new UITableRow()
      const emptyCell = emptyRow.addText('No habits found. Tap "Add Habit" to get started.')
      emptyCell.titleFont = Font.systemFont(14)
      emptyCell.titleColor = COLORS.secondary
      emptyRow.backgroundColor = COLORS.card
      this.table.addRow(emptyRow)
    } else {
      for (let i = 0; i < todayHabits.length; i++) {
        const habit = todayHabits[i]
        const row = new UITableRow()
        row.height = 50
        row.dismissOnSelect = false
        const icon = habit.completed ? DONE_EMOJI : EMPTY_EMOJI
        const streakBadge = habit.streak > 0 ? ` ${STREAK_EMOJI}${habit.streak}d` : ''
        const cell = row.addText(`${icon}  ${habit.name}${streakBadge}`)
        cell.titleFont = Font.systemFont(15)
        cell.titleColor = habit.completed ? COLORS.success : COLORS.text
        cell.subtitleFont = Font.systemFont(11)
        cell.subtitleColor = COLORS.secondary
        row.backgroundColor = COLORS.card
        row.onSelect = async () => {
          await toggleHabitCompletion(this.habits, habit.id)
          await this.showTodayView()
        }
        this.table.addRow(row)
      }
    }

    this.table.addRow(createSeparatorRow())
    const backRow = new UITableRow()
    backRow.height = 44
    const backCell = backRow.addText('← Back to Menu')
    backCell.titleFont = Font.boldSystemFont(14)
    backCell.titleColor = COLORS.accent
    backRow.backgroundColor = COLORS.card
    backRow.onSelect = async () => {
      await this.present()
    }
    this.table.addRow(backRow)

    await this.table.present()
  }

  async showManageView() {
    this.habits = await loadOrCreateHabits()
    this.table = new UITable()
    this.table.addRow(createHeaderRow('Manage Habits'))
    this.table.addRow(createSeparatorRow())

    for (let i = 0; i < this.habits.length; i++) {
      const habit = this.habits[i]
      const row = new UITableRow()
      row.height = 55
      row.dismissOnSelect = false
      const status = habit.enabled ? '🟢' : '🔴'
      const cell = row.addText(`${status} ${habit.name}`)
      cell.titleFont = Font.systemFont(15)
      cell.titleColor = COLORS.text
      cell.subtitleFont = Font.systemFont(11)
      cell.subtitleColor = COLORS.secondary
      cell.subtitleText = `Streak: ${habit.streak}d · Frequency: ${habit.frequency}`

      row.backgroundColor = COLORS.card
      const idx = i
      row.onSelect = async () => {
        await this.habitOptions(idx)
      }
      this.table.addRow(row)
    }

    this.table.addRow(createSeparatorRow())

    const backRow = new UITableRow()
    backRow.height = 44
    const backCell = backRow.addText('← Back to Menu')
    backCell.titleFont = Font.boldSystemFont(14)
    backCell.titleColor = COLORS.accent
    backRow.backgroundColor = COLORS.card
    backRow.onSelect = async () => {
      await this.present()
    }
    this.table.addRow(backRow)

    await this.table.present()
  }

  async habitOptions(index) {
    const habit = this.habits[index]
    const alert = new Alert()
    alert.title = habit.name
    alert.message = `Streak: ${habit.streak}d · ${habit.frequency}`
    alert.addAction('Toggle Enabled')
    alert.addAction('Reset Streak')
    alert.addAction('Delete Habit')
    alert.addCancelAction('Back')

    const result = await alert.presentAlert()
    if (result === 0) {
      habit.enabled = !habit.enabled
      await saveHabits(this.habits)
      await this.showManageView()
    } else if (result === 1) {
      habit.streak = 0
      await saveHabits(this.habits)
      await this.showManageView()
    } else if (result === 2) {
      this.habits.splice(index, 1)
      await saveHabits(this.habits)
      await removeReminderList(habit.reminderId)
      await this.showManageView()
    }
  }

  async addHabit() {
    const alert = new Alert()
    alert.title = 'New Habit'
    alert.message = 'Enter the habit name'
    alert.addTextField('e.g. Morning Walk')
    alert.addAction('Create')
    alert.addCancelAction('Cancel')

    const result = await alert.presentAlert()
    if (result === -1) {
      await this.present()
      return
    }

    const name = alert.textFieldValue(0).trim()
    if (!name) {
      await this.present()
      return
    }

    const frequencyAlert = new Alert()
    frequencyAlert.title = 'Frequency'
    frequencyAlert.message = 'How often should this habit be done?'
    frequencyAlert.addAction('Daily')
    frequencyAlert.addAction('Weekdays')
    frequencyAlert.addAction('Weekends')
    frequencyAlert.addCancelAction('Cancel')

    const freqResult = await frequencyAlert.presentAlert()
    if (freqResult === -1) {
      await this.present()
      return
    }

    const frequencies = ['daily', 'weekdays', 'weekends']
    const frequency = frequencies[freqResult]
    const habitId = `habit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const reminderId = await createReminderForHabit(name, habitId)

    this.habits.push({
      id: habitId,
      name: name,
      frequency: frequency,
      enabled: true,
      streak: 0,
      reminderId: reminderId,
      completions: [],
    })

    await saveHabits(this.habits)
    await this.present()
  }
}

function createHeaderRow(text) {
  const row = new UITableRow()
  row.height = 44
  row.backgroundColor = COLORS.accent
  const cell = row.addText(text)
  cell.titleFont = Font.boldSystemFont(18)
  cell.titleColor = Color.white()
  row.addText('').widthWeight = 0
  return row
}

function createSeparatorRow() {
  const row = new UITableRow()
  row.height = 1
  row.backgroundColor = COLORS.muted
  return row
}

function getTodayHabits(habits) {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const today = now.toDateString()

  return habits
    .filter(h => {
      if (!h.enabled) return false
      if (h.frequency === 'daily') return true
      if (h.frequency === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5
      if (h.frequency === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6
      return true
    })
    .map(h => {
      const completions = h.completions || []
      const todayCompletion = completions.find(c => new Date(c.date).toDateString() === today)
      return {
        ...h,
        completed: !!todayCompletion,
        completedAt: todayCompletion ? new Date(todayCompletion.date) : null,
      }
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return a.name.localeCompare(b.name)
    })
}

async function loadOrCreateHabits() {
  const fm = FileManager.iCloud()
  const dir = fm.documentsDirectory()
  const path = fm.joinPath(dir, 'streak-forge-habits.json')

  if (fm.fileExists(path)) {
    try {
      const data = JSON.parse(fm.readString(path))
      const updated = await recalculateStreaks(data)
      return updated
    } catch {
      return []
    }
  }

  const defaults = [
    { id: 'habit_morning_walk', name: 'Morning Walk', frequency: 'daily', enabled: true, streak: 0, completions: [] },
    { id: 'habit_drink_water', name: 'Drink 8 Glasses Water', frequency: 'daily', enabled: true, streak: 0, completions: [] },
    { id: 'habit_read', name: 'Read 20 min', frequency: 'daily', enabled: true, streak: 0, completions: [] },
    { id: 'habit_meditate', name: 'Meditate', frequency: 'daily', enabled: true, streak: 0, completions: [] },
    { id: 'habit_exercise', name: 'Exercise', frequency: 'weekdays', enabled: true, streak: 0, completions: [] },
  ]

  for (const h of defaults) {
    h.reminderId = await createReminderForHabit(h.name, h.id)
  }

  await saveHabits(defaults)
  return defaults
}

async function recalculateStreaks(habits) {
  const reminders = await loadReminders()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const habit of habits) {
    const reminder = reminders.find(r => r.id === habit.reminderId)
    if (!reminder) continue

    const completionDates = (reminder.completions || [])
      .map(d => {
        const dt = new Date(d)
        dt.setHours(0, 0, 0, 0)
        return dt
      })
      .sort((a, b) => b - a)

    const uniqueDates = [...new Set(completionDates.map(d => d.getTime()))]
      .map(t => new Date(t))
      .sort((a, b) => b - a)

    let streak = 0
    const checkDate = new Date(today)

    for (const d of uniqueDates) {
      if (d.getTime() === checkDate.getTime() || isYesterday(checkDate, d)) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
        if (d.getTime() === checkDate.getTime() + 86400000) {
          continue
        }
      } else {
        break
      }
    }

    const existingCompletions = uniqueDates.map(d => ({
      date: d.toISOString(),
    }))

    habit.streak = streak
    habit.completions = existingCompletions
    habit.enabled = habit.enabled !== false
  }

  return habits
}

function isYesterday(today, date) {
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  return date.getTime() === yesterday.getTime()
}

async function toggleHabitCompletion(habits, habitId) {
  const habit = habits.find(h => h.id === habitId)
  if (!habit) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  if (!habit.completions) habit.completions = []

  const existingIndex = habit.completions.findIndex(c => {
    const cd = new Date(c.date)
    cd.setHours(0, 0, 0, 0)
    return cd.getTime() === today.getTime()
  })

  if (existingIndex >= 0) {
    habit.completions.splice(existingIndex, 1)
    await removeReminderCompletion(habit.reminderId, todayStr)
  } else {
    habit.completions.push({ date: today.toISOString() })
    await addReminderCompletion(habit.reminderId, todayStr)
  }

  await recalculateStreaks(habits)
  await saveHabits(habits)
}

async function createReminderForHabit(name, habitId) {
  try {
    const list = await findOrCreateList()
    const reminder = new Reminder()
    reminder.title = `[SF] ${name}`
    reminder.notes = `StreakForge habit ID: ${habitId}`
    reminder.isCompleted = false
    reminder.list = list
    const reminderId = await reminder.save()
    return reminderId
  } catch {
    return `local_${habitId}`
  }
}

async function findOrCreateList() {
  const lists = await Reminder.allLists()
  let list = lists.find(l => l.title === LIST_NAME)
  if (!list) {
    list = await Reminder.createList(LIST_NAME)
  }
  return list
}

async function loadReminders() {
  try {
    const list = await findOrCreateList()
    const reminders = await Reminder.allIncomplete([list])
    const completed = await Reminder.allCompleted([list])
    const all = [...reminders, ...completed]

    return all.map(r => ({
      id: r.identifier,
      title: r.title,
      notes: r.notes || '',
      isCompleted: r.isCompleted,
      completionDate: r.completionDate,
      completions: r.isCompleted ? [r.completionDate.toISOString()] : [],
    }))
  } catch {
    return []
  }
}

async function addReminderCompletion(reminderId, dateStr) {
  try {
    const reminders = await Reminder.allIncomplete()
    const reminder = reminders.find(r => r.identifier === reminderId)
    if (reminder) {
      reminder.isCompleted = true
      await reminder.save()
    }
  } catch {
  }
}

async function removeReminderCompletion(reminderId, dateStr) {
  try {
    const reminders = await Reminder.allCompleted()
    const reminder = reminders.find(r => r.identifier === reminderId)
    if (reminder) {
      reminder.isCompleted = false
      await reminder.save()
    }
  } catch {
  }
}

async function removeReminderList(reminderId) {
  try {
    const reminders = await Reminder.allIncomplete()
    const r = reminders.find(r => r.identifier === reminderId)
    if (r) {
      await r.remove()
    }
  } catch {
  }
}

async function saveHabits(habits) {
  const fm = FileManager.iCloud()
  const dir = fm.documentsDirectory()
  const path = fm.joinPath(dir, 'streak-forge-habits.json')
  fm.writeString(path, JSON.stringify(habits, null, 2))
}

await run()
