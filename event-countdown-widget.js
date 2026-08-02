const EVENTS = [
  { name: 'Año Nuevo', emoji: '🎆', month: 1, day: 1, accent: '#ffd60a' },
  { name: 'San Valentín', emoji: '💘', month: 2, day: 14, accent: '#ff375f' },
  { name: 'Inicio del Verano', emoji: '☀️', month: 6, day: 21, accent: '#ff9500' },
  { name: 'Halloween', emoji: '🎃', month: 10, day: 31, accent: '#bf5af2' },
  { name: 'Nochebuena', emoji: '🌙', month: 12, day: 24, accent: '#64d2ff' },
  { name: 'Navidad', emoji: '🎅', month: 12, day: 25, accent: '#30d158' },
]

const BG_TOP = new Color('#1a1a3e')
const BG_BOTTOM = new Color('#0d0d1a')
const SURFACE = new Color('#ffffff', 0.06)
const TEXT = new Color('#ffffff')
const TEXT_DIM = new Color('#ffffff', 0.65)
const TEXT_MUTED = new Color('#ffffff', 0.35)
const TRACK = new Color('#ffffff', 0.08)
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const DAY_MS = 86400000
const HOUR_MS = 3600000

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function nextOccurrence(event, now) {
  const nowDay = startOfDay(now).getTime()
  const candidate = new Date(now.getFullYear(), event.month - 1, event.day)
  if (nowDay >= candidate.getTime() + DAY_MS) {
    candidate.setFullYear(candidate.getFullYear() + 1)
  }
  return candidate
}

function daysUntil(next, now) {
  return Math.ceil((next.getTime() - startOfDay(now).getTime()) / DAY_MS)
}

function hoursUntil(next, now) {
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / HOUR_MS))
}

function cycleProgress(event, now) {
  const next = nextOccurrence(event, now)
  const previous = new Date(next.getTime() - 365 * DAY_MS)
  const total = next.getTime() - previous.getTime()
  return Math.max(0, Math.min(1, (now.getTime() - previous.getTime()) / total))
}

function dateLabel(date) {
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`
}

function countdownFor(event, now) {
  const next = nextOccurrence(event, now)
  const days = daysUntil(next, now)
  const hours = hoursUntil(next, now)
  if (days === 0 && hours === 0) return { headline: '¡Hoy!', subline: 'Es el día 🎉' }
  if (days === 0) return { headline: `Hoy · ${hours}h`, subline: dateLabel(next) }
  if (days === 1) return { headline: 'Mañana', subline: dateLabel(next) }
  return { headline: `${days} días`, subline: dateLabel(next) }
}

function sortedCountdowns(now) {
  return EVENTS
    .map(event => ({
      event,
      days: daysUntil(nextOccurrence(event, now), now),
      progress: cycleProgress(event, now),
    }))
    .sort((a, b) => a.days - b.days)
}

function applyBackground(widget) {
  const gradient = new LinearGradient()
  gradient.colors = [BG_TOP, BG_BOTTOM]
  gradient.locations = [0, 1]
  widget.backgroundGradient = gradient
}

function buildHeader(widget, now) {
  const header = widget.addStack()
  header.layoutHorizontally()
  header.centerAlignContent()
  const title = header.addText('⏳ Cuenta atrás')
  title.font = Font.boldSystemFont(14)
  title.textColor = TEXT
  header.addSpacer(null)
  const today = header.addText(dateLabel(now))
  today.font = Font.mediumSystemFont(9)
  today.textColor = TEXT_MUTED
  widget.addSpacer(8)
}

function addProgressBar(parent, fraction, color, height) {
  const barHeight = height || 6
  const track = parent.addStack()
  track.layoutHorizontally()
  track.backgroundColor = TRACK
  track.cornerRadius = barHeight / 2
  track.size = new Size(0, barHeight)
  const fill = track.addStack()
  fill.backgroundColor = color
  fill.cornerRadius = barHeight / 2
  fill.size = new Size(0, barHeight)
  fill.addSpacer(Math.round(Math.min(1, Math.max(0, fraction)) * 100))
  track.addSpacer(null)
}

function buildEventCard(widget, event, now, compact) {
  const countdown = countdownFor(event, now)
  const card = widget.addStack()
  card.layoutVertically()
  card.backgroundColor = SURFACE
  card.cornerRadius = 10
  card.setPadding(compact ? 6 : 8, 10, compact ? 6 : 8, 10)

  const topRow = card.addStack()
  topRow.layoutHorizontally()
  topRow.centerAlignContent()

  const glyph = topRow.addText(event.emoji)
  glyph.font = Font.systemFont(compact ? 13 : 16)
  topRow.addSpacer(8)

  const info = topRow.addStack()
  info.layoutVertically()
  const name = info.addText(event.name)
  name.font = Font.mediumSystemFont(compact ? 10 : 12)
  name.textColor = TEXT
  const when = info.addText(countdown.subline)
  when.font = Font.systemFont(compact ? 8 : 9)
  when.textColor = TEXT_MUTED

  topRow.addSpacer(null)

  const headline = topRow.addText(countdown.headline)
  headline.font = Font.boldSystemFont(compact ? 13 : 15)
  headline.textColor = new Color(event.accent)

  card.addSpacer(compact ? 4 : 6)
  addProgressBar(card, cycleProgress(event, now), new Color(event.accent), compact ? 4 : 6)
  widget.addSpacer(compact ? 4 : 6)
}

function buildSmall(widget, now) {
  const nearest = sortedCountdowns(now)[0]
  const countdown = countdownFor(nearest.event, now)
  const glyph = widget.addText(nearest.event.emoji)
  glyph.font = Font.systemFont(28)
  widget.addSpacer(4)
  const name = widget.addText(nearest.event.name)
  name.font = Font.mediumSystemFont(11)
  name.textColor = TEXT_DIM
  widget.addSpacer(6)
  const headline = widget.addText(countdown.headline)
  headline.font = Font.boldSystemFont(26)
  headline.textColor = new Color(nearest.event.accent)
  const subline = widget.addText(countdown.subline)
  subline.font = Font.systemFont(9)
  subline.textColor = TEXT_MUTED
  widget.addSpacer(8)
  addProgressBar(widget, nearest.progress, new Color(nearest.event.accent))
}

function buildMedium(widget, now) {
  buildHeader(widget, now)
  for (const item of sortedCountdowns(now).slice(0, 3)) {
    buildEventCard(widget, item.event, now, false)
  }
}

function buildLarge(widget, now) {
  buildHeader(widget, now)
  for (const item of sortedCountdowns(now)) {
    buildEventCard(widget, item.event, now, true)
  }
  const footer = widget.addStack()
  footer.layoutHorizontally()
  footer.centerAlignContent()
  const hint = footer.addText('Toca para abrir el script')
  hint.font = Font.systemFont(8)
  hint.textColor = TEXT_MUTED
}

async function createWidget() {
  const widget = new ListWidget()
  const now = new Date()
  applyBackground(widget)
  if (config.widgetFamily === 'small') {
    buildSmall(widget, now)
  } else if (config.widgetFamily === 'medium') {
    buildMedium(widget, now)
  } else {
    buildLarge(widget, now)
  }
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  widget.refreshAfterDate = new Date(Date.now() + HOUR_MS)
  return widget
}

try {
  const widget = await createWidget()
  Script.setWidget(widget)
} catch (error) {
  const errorWidget = new ListWidget()
  applyBackground(errorWidget)
  errorWidget.addText('⚠️ Error en el contador')
  errorWidget.addText('Toca para reintentar')
  errorWidget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  errorWidget.refreshAfterDate = new Date(Date.now() + 10 * 60 * 1000)
  Script.setWidget(errorWidget)
}
Script.complete()
