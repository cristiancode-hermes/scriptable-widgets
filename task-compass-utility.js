const version = '1.0.0'
const storage = FileManager.iCloud()

function hexToColor(hex) {
  const val = parseInt(hex.replace('#',''), 16)
  return new Color((val >> 16) / 255, ((val >> 8) & 255) / 255, (val & 255) / 255)
}

const palette = {
  bg: hexToColor('0d0d12'),
  surface: hexToColor('1a1a24'),
  surfaceLight: hexToColor('252536'),
  accent: hexToColor('7c5cfc'),
  accentDim: hexToColor('5a3fd6'),
  success: hexToColor('34c759'),
  warning: hexToColor('ff9f0a'),
  danger: hexToColor('ff453a'),
  text: hexToColor('ffffff'),
  textDim: hexToColor('9a9ab0'),
  textMuted: hexToColor('636380'),
  border: hexToColor('2c2c3e'),
  gradientStart: hexToColor('1a1a2e'),
  gradientEnd: hexToColor('0d0d12'),
}

async function fetchReminders() {
  const calendars = await Reminders.allCalendars()
  const all = []
  for (const cal of calendars) {
    const reminders = await Reminders.allReminders([cal])
    all.push(...reminders.map(r => ({
      ...r,
      calendarTitle: cal.title,
      calendarColor: Color.dynamic(cal.color, cal.color),
    })))
  }
  return all
}

function getTodayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return { start, end }
}

function filterTodayReminders(reminders) {
  const { start, end } = getTodayRange()
  return reminders.filter(r => {
    if (r.isCompleted) return false
    if (!r.dueDateIncludesTime && r.dueDate) {
      const d = new Date(r.dueDate)
      return d >= start && d <= end
    }
    if (r.dueDateIncludesTime && r.dueDate) {
      const d = new Date(r.dueDate)
      return d >= start && d <= end
    }
    return false
  })
}

function filterOverdueReminders(reminders) {
  const now = new Date()
  const { start } = getTodayRange()
  return reminders.filter(r => {
    if (r.isCompleted) return false
    if (!r.dueDate) return false
    const due = new Date(r.dueDate)
    return due < start
  })
}

function filterNoDateReminders(reminders) {
  return reminders.filter(r => !r.dueDate && !r.isCompleted)
}

function sortByDueDate(reminders) {
  return [...reminders].sort((a, b) => {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate) - new Date(b.dueDate)
  })
}

async function saveTaskState(reminders) {
  const path = storage.joinPath(storage.documentsDirectory(), 'task-compass-state.json')
  const data = reminders.map(r => ({
    id: r.identifier,
    title: r.title,
    isCompleted: r.isCompleted,
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
    calendar: r.calendarTitle,
    notes: r.notes,
    priority: r.priority,
  }))
  storage.writeString(path, JSON.stringify(data, null, 2))
}

async function loadTaskState() {
  const path = storage.joinPath(storage.documentsDirectory(), 'task-compass-state.json')
  if (!storage.fileExists(path)) return []
  const raw = storage.readString(path)
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function getPriorityLabel(priority) {
  switch (priority) {
    case Reminders.Priority.High: return '!!!'
    case Reminders.Priority.Medium: return '!!'
    case Reminders.Priority.Low: return '!'
    default: return ''
  }
}

function getPriorityColor(priority) {
  switch (priority) {
    case Reminders.Priority.High: return palette.danger
    case Reminders.Priority.Medium: return palette.warning
    case Reminders.Priority.Low: return palette.accent
    default: return palette.textDim
  }
}

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function timeUntilDue(date) {
  if (!date) return ''
  const now = new Date()
  const due = new Date(date)
  const diffMs = due - now
  if (diffMs <= 0) return 'OVERDUE'
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function buildHtml(todayReminders, overdueReminders, nodateReminders, completedCount, totalCount, stats) {
  const groups = {}
  for (const r of todayReminders) {
    const key = r.calendarTitle || 'Default'
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  }

  let cardsHtml = ''
  const calendarNames = Object.keys(groups).sort()
  for (const name of calendarNames) {
    const items = groups[name]
    let rowsHtml = ''
    for (const r of sortByDueDate(items)) {
      const time = formatTime(r.dueDate)
      const urgency = timeUntilDue(r.dueDate)
      const prio = getPriorityLabel(r.priority)
      const prioColor = getPriorityColor(r.priority).hex
      const isUrgent = r.dueDate && new Date(r.dueDate) <= new Date(Date.now() + 3600000)
      const borderColor = isUrgent ? palette.danger.hex : palette.border.hex
      rowsHtml += `
        <div class="task-card" style="border-left: 3px solid ${borderColor};" data-id="${r.identifier}">
          <div class="task-left">
            <div class="task-check" data-id="${r.identifier}">
              <svg width="22" height="22" viewBox="0 0 22 22">
                <circle cx="11" cy="11" r="9" fill="none" stroke="${palette.textDim.hex}" stroke-width="1.5"/>
              </svg>
            </div>
            <div class="task-content">
              <div class="task-title">${escapeHtml(r.title)}</div>
              <div class="task-meta">
                <span class="task-calendar">${escapeHtml(name)}</span>
                ${time ? `<span class="task-time">${time}</span>` : ''}
                ${urgency ? `<span class="task-urgency ${urgency === 'OVERDUE' ? 'overdue' : ''}">${urgency}</span>` : ''}
                ${prio ? `<span class="task-priority" style="color:${prioColor}">${prio}</span>` : ''}
              </div>
            </div>
          </div>
        </div>`
    }
    cardsHtml += `
      <div class="list-group">
        <div class="list-header">
          <span class="list-title">${escapeHtml(name)}</span>
          <span class="list-count">${items.length}</span>
        </div>
        ${rowsHtml}
      </div>`
  }

  let overdueHtml = ''
  if (overdueReminders.length > 0) {
    let rows = ''
    for (const r of sortByDueDate(overdueReminders)) {
      const time = formatTime(r.dueDate)
      rows += `
        <div class="task-card overdue-card" data-id="${r.identifier}">
          <div class="task-left">
            <div class="task-check" data-id="${r.identifier}">
              <svg width="22" height="22" viewBox="0 0 22 22">
                <circle cx="11" cy="11" r="9" fill="none" stroke="${palette.danger.hex}" stroke-width="1.5"/>
              </svg>
            </div>
            <div class="task-content">
              <div class="task-title">${escapeHtml(r.title)}</div>
              <div class="task-meta">
                <span class="task-calendar">${escapeHtml(r.calendarTitle)}</span>
                ${time ? `<span class="task-time">${time}</span>` : ''}
                <span class="task-urgency overdue">OVERDUE</span>
              </div>
            </div>
          </div>
        </div>`
    }
    overdueHtml = `
      <div class="list-group overdue-group">
        <div class="list-header">
          <span class="list-title overdue-title">Overdue</span>
          <span class="list-count danger-count">${overdueReminders.length}</span>
        </div>
        ${rows}
      </div>`
  }

  let nodateHtml = ''
  if (nodateReminders.length > 0) {
    let rows = ''
    for (const r of nodateReminders) {
      rows += `
        <div class="task-card nodate-card" data-id="${r.identifier}">
          <div class="task-left">
            <div class="task-check" data-id="${r.identifier}">
              <svg width="22" height="22" viewBox="0 0 22 22">
                <circle cx="11" cy="11" r="9" fill="none" stroke="${palette.textMuted.hex}" stroke-width="1.5"/>
              </svg>
            </div>
            <div class="task-content">
              <div class="task-title">${escapeHtml(r.title)}</div>
              <div class="task-meta">
                <span class="task-calendar">${escapeHtml(r.calendarTitle)}</span>
                <span class="task-urgency no-date">No due date</span>
              </div>
            </div>
          </div>
        </div>`
    }
    nodateHtml = `
      <div class="list-group nodate-group">
        <div class="list-header">
          <span class="list-title nodate-title">Unscheduled</span>
          <span class="list-count muted-count">${nodateReminders.length}</span>
        </div>
        ${rows}
      </div>`
  }

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const now = new Date()
  const dayName = dayNames[now.getDay()]
  const dateStr = `${dayName}, ${now.getDate()} ${now.toLocaleString('default',{month:'short'})} ${now.getFullYear()}`

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, 'SF Pro Display', 'SF Pro Text', Helvetica, sans-serif;
    background: ${palette.bg.hex};
    color: ${palette.text.hex};
    padding: 0;
    margin: 0;
    -webkit-font-smoothing: antialiased;
  }
  .header {
    background: linear-gradient(135deg, ${palette.gradientStart.hex}, ${palette.gradientEnd.hex});
    padding: 48px 20px 24px;
    border-bottom: 1px solid ${palette.border.hex};
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute;
    top: -60px;
    right: -60px;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, ${palette.accent.hex}22, transparent 70%);
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .header-title {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  .header-subtitle {
    font-size: 13px;
    color: ${palette.textDim.hex};
    margin-top: 2px;
  }
  .header-actions {
    display: flex;
    gap: 10px;
  }
  .header-btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: ${palette.surfaceLight.hex};
    border: 1px solid ${palette.border.hex};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
  }
  .header-btn:active {
    background: ${palette.surface.hex};
    opacity: 0.8;
  }
  .header-btn svg {
    width: 20px;
    height: 20px;
  }
  .progress-section {
    padding: 20px;
  }
  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .progress-label {
    font-size: 13px;
    font-weight: 600;
    color: ${palette.textDim.hex};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .progress-value {
    font-size: 13px;
    font-weight: 600;
    color: ${palette.accent.hex};
  }
  .progress-bar-bg {
    height: 6px;
    background: ${palette.surfaceLight.hex};
    border-radius: 3px;
    overflow: hidden;
    position: relative;
  }
  .progress-bar-fill {
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, ${palette.accent.hex}, ${palette.success.hex});
    transition: width 0.6s ease;
  }
  .stats-row {
    display: flex;
    gap: 8px;
    padding: 0 20px 16px;
  }
  .stat-card {
    flex: 1;
    background: ${palette.surface.hex};
    border-radius: 12px;
    padding: 12px;
    border: 1px solid ${palette.border.hex};
    text-align: center;
  }
  .stat-value {
    font-size: 22px;
    font-weight: 700;
  }
  .stat-label {
    font-size: 11px;
    color: ${palette.textDim.hex};
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .stat-value.today { color: ${palette.accent.hex}; }
  .stat-value.done { color: ${palette.success.hex}; }
  .stat-value.overdue { color: ${palette.danger.hex}; }
  .stat-value.unscheduled { color: ${palette.textMuted.hex}; }
  .section-title {
    padding: 16px 20px 8px;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.2px;
  }
  .list-group {
    margin: 0 12px 12px;
    background: ${palette.surface.hex};
    border-radius: 14px;
    border: 1px solid ${palette.border.hex};
    overflow: hidden;
  }
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px 10px;
    border-bottom: 1px solid ${palette.border.hex};
  }
  .list-title {
    font-size: 14px;
    font-weight: 600;
    color: ${palette.textDim.hex};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .overdue-title { color: ${palette.danger.hex}; }
  .nodate-title { color: ${palette.textMuted.hex}; }
  .list-count {
    font-size: 13px;
    font-weight: 600;
    color: ${palette.accent.hex};
    background: ${palette.accent.hex}15;
    padding: 2px 10px;
    border-radius: 10px;
  }
  .danger-count {
    color: ${palette.danger.hex};
    background: ${palette.danger.hex}15;
  }
  .muted-count {
    color: ${palette.textMuted.hex};
    background: ${palette.textMuted.hex}12;
  }
  .task-card {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid ${palette.border.hex};
    cursor: pointer;
    transition: background 0.15s;
  }
  .task-card:last-child { border-bottom: none; }
  .task-card:active { background: ${palette.surfaceLight.hex}; }
  .overdue-card { background: ${palette.danger.hex}08; }
  .nodate-card { background: transparent; }
  .task-left {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex: 1;
  }
  .task-check {
    flex-shrink: 0;
    margin-top: 2px;
    cursor: pointer;
  }
  .task-check:active { opacity: 0.6; }
  .task-content {
    flex: 1;
    min-width: 0;
  }
  .task-title {
    font-size: 15px;
    font-weight: 500;
    line-height: 1.3;
    margin-bottom: 4px;
    color: ${palette.text.hex};
  }
  .task-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .task-calendar {
    font-size: 11px;
    color: ${palette.textMuted.hex};
    background: ${palette.textMuted.hex}12;
    padding: 1px 8px;
    border-radius: 6px;
  }
  .task-time {
    font-size: 11px;
    color: ${palette.textDim.hex};
    font-weight: 500;
  }
  .task-urgency {
    font-size: 11px;
    font-weight: 600;
    color: ${palette.warning.hex};
  }
  .task-urgency.overdue {
    color: ${palette.danger.hex};
  }
  .task-urgency.no-date {
    color: ${palette.textMuted.hex};
    font-weight: 400;
  }
  .task-priority {
    font-size: 12px;
    font-weight: 700;
  }
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: ${palette.textMuted.hex};
  }
  .empty-state svg { margin-bottom: 16px; opacity: 0.4; }
  .empty-state h3 {
    font-size: 18px;
    font-weight: 600;
    color: ${palette.textDim.hex};
    margin-bottom: 6px;
  }
  .empty-state p {
    font-size: 14px;
    color: ${palette.textMuted.hex};
  }
  .toast {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: ${palette.surfaceLight.hex};
    color: ${palette.text.hex};
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    border: 1px solid ${palette.border.hex};
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    z-index: 100;
  }
  .toast.visible { opacity: 1; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div>
        <div class="header-title">Task Compass</div>
        <div class="header-subtitle">${dateStr}</div>
      </div>
      <div class="header-actions">
        <div class="header-btn" id="addBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="${palette.text.hex}" stroke-width="2" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <div class="header-btn" id="refreshBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="${palette.text.hex}" stroke-width="2" stroke-linecap="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </div>
      </div>
    </div>
  </div>

  <div class="progress-section">
    <div class="progress-header">
      <span class="progress-label">Daily Progress</span>
      <span class="progress-value">${completedCount}/${totalCount} · ${progressPct}%</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width:${progressPct}%"></div>
    </div>
  </div>

  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-value today">${todayReminders.length}</div>
      <div class="stat-label">Today</div>
    </div>
    <div class="stat-card">
      <div class="stat-value done">${completedCount}</div>
      <div class="stat-label">Done</div>
    </div>
    <div class="stat-card">
      <div class="stat-value overdue">${overdueReminders.length}</div>
      <div class="stat-label">Overdue</div>
    </div>
    <div class="stat-card">
      <div class="stat-value unscheduled">${nodateReminders.length}</div>
      <div class="stat-label">Unscheduled</div>
    </div>
  </div>

  ${overdueHtml ? `<div class="section-title">Priority</div>${overdueHtml}` : ''}

  <div class="section-title">Today</div>
  ${cardsHtml || `<div class="empty-state">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${palette.textMuted.hex}" stroke-width="1.5" stroke-linecap="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
    <h3>All caught up</h3>
    <p>No tasks scheduled for today. Add one!</p>
  </div>`}

  ${nodateHtml ? `<div class="section-title">Other</div>${nodateHtml}` : ''}

  <div class="toast" id="toast"></div>

  <script>
    const toast = document.getElementById('toast')
    function showToast(msg) {
      toast.textContent = msg
      toast.classList.add('visible')
      setTimeout(() => toast.classList.remove('visible'), 2000)
    }

    document.querySelectorAll('.task-check').forEach(el => {
      el.addEventListener('click', async function(e) {
        e.stopPropagation()
        const id = this.dataset.id
        const result = await new Completion().completeWith(null)
        if (result) {
          this.innerHTML = \`<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="${palette.success.hex}" stroke="${palette.success.hex}" stroke-width="1.5"/><polyline points="7,11 10,14 15,9" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>\`
          showToast('Task completed')
        }
      })
    })

    document.querySelectorAll('.task-card').forEach(el => {
      el.addEventListener('click', function(e) {
        if (e.target.closest('.task-check')) return
        const id = this.dataset.id
        WebView.postMessage({ type: 'taskTap', id })
      })
    })

    document.getElementById('addBtn').addEventListener('click', () => {
      WebView.postMessage({ type: 'addTask' })
    })

    document.getElementById('refreshBtn').addEventListener('click', () => {
      WebView.postMessage({ type: 'refresh' })
    })
  </script>
</body>
</html>`
}

function escapeHtml(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function completeReminder(identifier) {
  const reminder = await Reminders.reminder(identifier)
  if (!reminder) return false
  reminder.isCompleted = true
  await reminder.save()
  return true
}

async function addNewReminder() {
  const calendars = await Reminders.allCalendars()
  const calNames = calendars.map(c => c.title)
  let targetCal = calendars[0]

  if (calNames.length > 1) {
    const picker = new Alert()
    picker.title = 'Choose List'
    picker.message = 'Select a reminders list for the new task'
    for (const name of calNames) {
      picker.addAction(name)
    }
    picker.addCancelAction('Cancel')
    const idx = await picker.presentSheet()
    if (idx === -1) return null
    targetCal = calendars[idx]
  }

  const alert = new Alert()
  alert.title = 'New Task'
  alert.message = `Adding to: ${targetCal.title}`
  alert.addTextField('Task title', '')
  alert.addTextField('Notes (optional)', '')
  alert.addAction('Add')
  alert.addCancelAction('Cancel')
  const didConfirm = await alert.presentAlert()
  if (!didConfirm) return null

  const title = alert.textFieldValue(0).trim()
  if (!title) return null
  const notes = alert.textFieldValue(1).trim()

  const reminder = new Reminder()
  reminder.title = title
  if (notes) reminder.notes = notes
  reminder.calendar = targetCal
  reminder.dueDate = new Date()

  const priorityAlert = new Alert()
  priorityAlert.title = 'Priority'
  priorityAlert.addAction('None')
  priorityAlert.addAction('Low')
  priorityAlert.addAction('Medium')
  priorityAlert.addAction('High')
  const prioIdx = await priorityAlert.presentSheet()
  if (prioIdx === 0) reminder.priority = Reminders.Priority.None
  else if (prioIdx === 1) reminder.priority = Reminders.Priority.Low
  else if (prioIdx === 2) reminder.priority = Reminders.Priority.Medium
  else if (prioIdx === 3) reminder.priority = Reminders.Priority.High

  await reminder.save()

  const timeAlert = new Alert()
  timeAlert.title = 'Set Due Time?'
  timeAlert.addAction('No Time')
  timeAlert.addAction('Set Time')
  timeAlert.addCancelAction('Cancel')
  const timeIdx = await timeAlert.presentSheet()
  if (timeIdx === 1) {
    const datePicker = new DatePicker()
    datePicker.title = 'Due Time'
    datePicker.initialDate = new Date()
    datePicker.mode = DatePicker.Mode.Time
    const picked = await datePicker.pickTimeAndDate()
    if (picked) {
      const now = new Date()
      picked.setFullYear(now.getFullYear(), now.getMonth(), now.getDate())
      reminder.dueDate = picked
      reminder.dueDateIncludesTime = true
      await reminder.save()
    }
  }

  return reminder
}

async function run() {
  try {
    const allReminders = await fetchReminders()
    const todayReminders = filterTodayReminders(allReminders)
    const overdueReminders = filterOverdueReminders(allReminders)
    const nodateReminders = filterNoDateReminders(allReminders)
    const completedToday = allReminders.filter(r => {
      if (!r.isCompleted) return false
      if (!r.completionDate) return false
      const { start, end } = getTodayRange()
      const comp = new Date(r.completionDate)
      return comp >= start && comp <= end
    })
    const allVisible = [...todayReminders, ...overdueReminders, ...nodateReminders]
    const totalCount = allVisible.length + completedToday.length

    const html = buildHtml(todayReminders, overdueReminders, nodateReminders, completedToday.length, totalCount, { today: todayReminders.length, completed: completedToday.length })

    const webView = new WebView()
    await webView.loadHTML(html)
    await webView.present(true)

    while (true) {
      const msg = await webView.getMessage()
      if (msg.type === 'addTask') {
        const result = await addNewReminder()
        if (result) {
          await webView.evaluateJavaScript(`showToast('Task added: ${escapeHtml(result.title.replace(/'/g, "\\'"))}')`)
        }
        setTimeout(() => run(), 300)
        return
      } else if (msg.type === 'refresh') {
        setTimeout(() => run(), 200)
        return
      } else if (msg.type === 'taskTap') {
        const reminder = await Reminders.reminder(msg.id)
        if (reminder) {
          const menu = new Alert()
          menu.title = reminder.title
          menu.message = reminder.notes || ''
          menu.addAction('Complete')
          menu.addAction('View in Reminders')
          menu.addCancelAction('Close')
          const choice = await menu.presentSheet()
          if (choice === 0) {
            reminder.isCompleted = true
            await reminder.save()
            setTimeout(() => run(), 200)
            return
          } else if (choice === 1) {
            const url = `x-apple-reminderkit://remcdreminder/${msg.id}`
            Safari.open(url)
            setTimeout(() => run(), 500)
            return
          }
        }
      }
    }
  } catch (error) {
    const alert = new Alert()
    alert.title = 'Error'
    alert.message = error.message || 'Something went wrong'
    alert.addAction('OK')
    await alert.presentAlert()
  }
}

if (config.runsInWidget) {
  const widget = new ListWidget()
  widget.backgroundColor = palette.bg
  const gradient = new LinearGradient()
  gradient.locations = [0, 1]
  gradient.colors = [new Color('1a1a2e'), new Color('0d0d12')]
  widget.backgroundGradient = gradient

  const titleTxt = widget.addText('Task Compass')
  titleTxt.font = Font.boldSystemFont(16)
  titleTxt.textColor = palette.text

  widget.addSpacer(4)

  const subtitleTxt = widget.addText('Open to manage tasks')
  subtitleTxt.font = Font.systemFont(12)
  subtitleTxt.textColor = palette.textDim

  widget.addSpacer(8)

  if (config.widgetFamily === 'medium') {
    Reminders.allCalendars().then(calendars => {
      Reminders.allReminders([calendars[0]]).then(reminders => {
        const active = reminders.filter(r => !r.isCompleted).slice(0, 4)
        for (const r of active) {
          const row = widget.addText(`• ${r.title}`)
          row.font = Font.systemFont(11)
          row.textColor = palette.textDim
          row.lineLimit = 1
        }
      })
    })
  }

  const symbolTxt = widget.addText(Symbol.calendarBadgeClock.image)
  widget.addSpacer(2)

  Script.setWidget(widget)
  Script.complete()
} else {
  await run()
}