const LOCATIONS = [
  { name: 'Madrid', lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid' },
  { name: 'New York', lat: 40.7128, lon: -74.0060, tz: 'America/New_York' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
  { name: 'London', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
  { name: 'Reykjavik', lat: 64.1466, lon: -21.9426, tz: 'Atlantic/Reykjavik' }
]

const CONFIG = {
  storageFile: 'lunar-orbit-config.json',
  refreshMinutes: 15
}

const THEME = {
  bgTop: '#050510',
  bgMid: '#0d0d1a',
  bgBottom: '#16213e',
  moonGlowHex: '#cfd7ff',
  text: new Color('#eef2ff'),
  muted: new Color('#aab4d6'),
  accent: new Color('#e2b13c'),
  warning: new Color('#ff6b6b'),
  dusk: new Color('#f57fb4')
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const rad = Math.PI / 180
const J1970 = 2440588
const J2000 = 2451545
const msDay = 86400000

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function toDays(date) {
  return date.valueOf() / msDay - 0.5 + J1970 - J2000
}

function siderealTime(d, lw) {
  return rad * (280.16 + 360.9856235 * d) - lw
}

function sunCoords(d) {
  const M = rad * (357.5291 + 0.98560028 * d)
  const C = 1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)
  const L = (rad * (280 + 0.98564736 * d) + C) % (2 * Math.PI)
  const obliquity = 23.44 * rad
  const dec = Math.asin(Math.sin(L) * Math.sin(obliquity))
  const ra = Math.atan2(Math.sin(L) * Math.cos(obliquity), Math.cos(L))
  return { ra, dec }
}

function moonCoords(d) {
  const L = rad * (218.316 + 13.176396 * d)
  const M = rad * (134.963 + 13.064993 * d)
  const F = rad * (93.272 + 13.229350 * d)
  const l = L + 6.289 * Math.sin(M)
  const b = rad * (5.128 * Math.sin(F))
  const obliquity = 23.439 * rad
  const dec = Math.asin(Math.sin(b) * Math.cos(obliquity) + Math.cos(b) * Math.sin(obliquity) * Math.sin(l))
  const ra = Math.atan2(Math.sin(l) * Math.cos(obliquity) - Math.sin(b) * Math.sin(obliquity), Math.cos(l))
  const dist = 385736 - 20905 * Math.cos(M)
  return { ra, dec, dist }
}

function bodyAltitude(H, phi, dec) {
  return Math.asin(clamp(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H), -1, 1))
}

function bodyAzimuth(H, phi, dec) {
  return Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) + Math.PI
}

function sunPosition(lat, lon, date) {
  const lw = rad * -lon
  const phi = rad * lat
  const d = toDays(date)
  const c = sunCoords(d)
  const H = siderealTime(d, lw) - c.ra
  const altitude = bodyAltitude(H, phi, c.dec) / rad
  const azimuth = bodyAzimuth(H, phi, c.dec) / rad
  return { altitude, azimuth }
}

function moonSkyPosition(lat, lon, date) {
  const lw = rad * -lon
  const phi = rad * lat
  const d = toDays(date)
  const c = moonCoords(d)
  const H = siderealTime(d, lw) - c.ra
  const altitude = bodyAltitude(H, phi, c.dec) / rad
  const azimuth = bodyAzimuth(H, phi, c.dec) / rad
  return { altitude, azimuth, distance: c.dist }
}

function sunCrossing(lat, lon, date, elevationDeg) {
  const day = (date - new Date(date.getFullYear(), 0, 0)) / msDay
  const julian = 2451549.5 + day
  const meanAnomaly = (357.5291 + 0.98560028 * (julian - 2451545)) * rad
  const eqCenter = 1.9148 * rad * Math.sin(meanAnomaly) + 0.02 * rad * Math.sin(2 * meanAnomaly) + 0.0003 * rad * Math.sin(3 * meanAnomaly)
  const eclipticLongitude = (meanAnomaly + eqCenter + 282.937 * rad) % (2 * Math.PI)
  const obliquity = (23.4393 - 0.00000036 * (julian - 2451545)) * rad
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))
  const latitudeRad = lat * rad
  const cosH = -(Math.sin(-elevationDeg * rad) - Math.sin(latitudeRad) * Math.sin(declination)) / (Math.cos(latitudeRad) * Math.cos(declination))
  if (Math.abs(cosH) > 1) {
    return { rise: null, set: null, polar: cosH > 1 ? 'night' : 'day' }
  }
  const hourAngle = Math.acos(cosH)
  const riseHour = 12 - hourAngle * 180 / Math.PI / 15 - lon / 15
  const setHour = 12 + hourAngle * 180 / Math.PI / 15 - lon / 15
  const buildDate = (hourValue) => {
    const dt = new Date(date)
    const hours = Math.floor(hourValue)
    const minutes = Math.floor((hourValue - hours) * 60)
    dt.setHours(hours, minutes, 0, 0)
    return dt
  }
  try {
    return { rise: buildDate(riseHour), set: buildDate(setHour), polar: null }
  } catch (err) {
    return { rise: null, set: null, polar: null }
  }
}

function dayProgress(rise, set) {
  if (!rise || !set) return 0
  const now = new Date()
  const total = set.getTime() - rise.getTime()
  const elapsed = now.getTime() - rise.getTime()
  return clamp(elapsed / total, 0, 1)
}

function dayLengthHours(rise, set) {
  if (!rise || !set) return null
  return (set.getTime() - rise.getTime()) / 3600000
}

function moonPhaseInfo(date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  let y = year
  let m = month
  if (m <= 2) { y -= 1; m += 12 }
  const a = Math.floor(y / 100)
  const b = 2 - a + Math.floor(a / 4)
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5
  const daysSinceNew = ((jd - 2451549.5) % 29.53058867 + 29.53058867) % 29.53058867
  const phase = daysSinceNew / 29.53058867
  const names = ['Luna nueva', 'Luna creciente', 'Cuarto creciente', 'Gibosa creciente', 'Luna llena', 'Gibosa menguante', 'Cuarto menguante', 'Luna menguante']
  const glyphs = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']
  const index = Math.round(phase * 8) % 8
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * phase)) / 2 * 100)
  return { phase, name: names[index], glyph: glyphs[index], index, illumination }
}

function estimateMoonEvents(lat, lon, date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const stepMs = 10 * 60000
  const totalSteps = Math.round(msDay / stepMs)
  const crossings = []
  let previousSign = null
  for (let i = 0; i <= totalSteps; i++) {
    const t = new Date(start.getTime() + i * stepMs)
    const altitude = moonSkyPosition(lat, lon, t).altitude
    const sign = altitude > 0 ? 1 : -1
    if (previousSign !== null && previousSign !== sign) {
      crossings.push(new Date(t.getTime() - stepMs / 2))
    }
    previousSign = sign
  }
  if (crossings.length === 0) {
    return { rise: null, set: null, upAllDay: previousSign > 0, downAllDay: previousSign < 0 }
  }
  if (crossings.length === 1) {
    return { rise: crossings[0], set: null, upAllDay: false, downAllDay: false }
  }
  return { rise: crossings[0], set: crossings[1], upAllDay: false, downAllDay: false }
}

function nextMoonDate(date, minIllumination) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  for (let i = 1; i <= 40; i++) {
    const candidate = new Date(start.getTime() + i * msDay)
    const info = moonPhaseInfo(candidate)
    if (minIllumination > 50) {
      if (info.illumination > 96) return candidate
    } else {
      if (info.illumination < 3) return candidate
    }
  }
  return null
}

function formatClock(date, tz) {
  if (!date) return '--:--'
  try {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: false })
  } catch (err) {
    return '--:--'
  }
}

function formatDayName(date) {
  return DAY_NAMES[date.getDay()]
}

function formatDayMonth(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

function hoursLabel(hours) {
  if (hours === null) return '--h'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m >= 60) return `${h + 1}h`
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function applyTheme(widget) {
  const gradient = new LinearGradient()
  gradient.colors = [new Color(THEME.bgTop), new Color(THEME.bgMid), new Color(THEME.bgBottom)]
  gradient.locations = [0, 0.5, 1]
  widget.backgroundGradient = gradient
}

function addLabel(parent, text, font, color) {
  const label = parent.addText(text)
  label.font = font
  label.textColor = color || THEME.text
  return label
}

function addInfoRow(parent, glyph, text, font, color) {
  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  const icon = row.addText(glyph)
  icon.font = Font.systemFont(font)
  const value = row.addText(text)
  value.font = Font.systemFont(font)
  value.textColor = color || THEME.muted
  return row
}

function addProgressBar(widget, value, color) {
  const bar = widget.addStack()
  bar.layoutHorizontally()
  bar.backgroundColor = new Color('#ffffff', 0.14)
  bar.cornerRadius = 3
  bar.size = new Size(0, 5)
  const fillPercent = Math.round(clamp(value, 0, 1) * 100)
  const fill = bar.addStack()
  fill.backgroundColor = color || THEME.accent
  fill.cornerRadius = 3
  fill.size = new Size(0, 5)
  if (fillPercent > 0) fill.addSpacer(fillPercent)
  bar.addSpacer(null)
  return bar
}

async function loadLocationIndex() {
  const fm = FileManager.local()
  const path = fm.joinPath(fm.documentsDirectory(), CONFIG.storageFile)
  try {
    if (fm.fileExists(path)) {
      const data = JSON.parse(fm.readString(path))
      return data.locationIndex ?? 0
    }
  } catch (err) {}
  return 0
}

async function saveLocationIndex(index) {
  const fm = FileManager.local()
  const path = fm.joinPath(fm.documentsDirectory(), CONFIG.storageFile)
  try {
    fm.writeString(path, JSON.stringify({ locationIndex: index }))
  } catch (err) {}
}

async function loadAgenda() {
  const events = []
  let reminderCount = 0
  try {
    const calendars = await Calendar.forEvents()
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
    for (const cal of calendars) {
      if (!cal.allowsContentModifications) continue
      const found = await CalendarEvent.between(start, end, [cal])
      for (const ev of found) {
        if (ev.isAllDay) continue
        events.push({ title: ev.title, startDate: ev.startDate })
      }
    }
    events.sort((a, b) => a.startDate - b.startDate)
  } catch (err) {}
  try {
    const lists = await Reminder.allLists()
    for (const list of lists) {
      const items = await Reminder.allIncomplete([list])
      reminderCount += items.length
    }
  } catch (err) {}
  return { events: events.slice(0, 6), reminderCount }
}

function buildSmall(widget, location, moon, lunarInfo, moonEvents, sun, agenda) {
  const header = widget.addStack()
  header.layoutHorizontally()
  const title = addLabel(header, '🌙 Lunar', Font.mediumSystemFont(11), THEME.muted)
  header.addSpacer()
  const loc = addLabel(header, location.name, Font.systemFont(9), THEME.muted)

  widget.addSpacer(6)

  const pct = addLabel(widget, `${lunarInfo.illumination}%`, Font.boldSystemFont(42), new Color(THEME.moonGlowHex))
  widget.addSpacer(2)
  const phase = addLabel(widget, lunarInfo.glyph + ' ' + lunarInfo.name, Font.systemFont(11), THEME.text)
  widget.addSpacer(6)
  const status = moon.altitude > 0 ? `↑ Alt ${Math.round(moon.altitude)}°` : '⬇ Bajo horizonte'
  const statusLabel = addLabel(widget, status, Font.systemFont(10), THEME.accent)
  widget.addSpacer(6)
  const sunRow = widget.addStack()
  sunRow.layoutHorizontally()
  sunRow.centerAlignContent()
  const sunText = addLabel(sunRow, `☀️ ${formatClock(sun.rise, location.tz)} / ${formatClock(sun.set, location.tz)}`, Font.systemFont(8), THEME.muted)
  widget.setPadding(14, 14, 14, 14)
}

function buildMedium(widget, location, moon, lunarInfo, moonEvents, sun, agenda) {
  const header = widget.addStack()
  header.layoutHorizontally()
  header.centerAlignContent()
  const title = addLabel(header, `${lunarInfo.glyph} Lunar Orbit`, Font.boldSystemFont(14), THEME.text)
  header.addSpacer()
  const loc = addLabel(header, location.name, Font.systemFont(10), THEME.muted)

  widget.addSpacer(8)

  const body = widget.addStack()
  body.layoutHorizontally()

  const leftCol = body.addStack()
  leftCol.layoutVertically()
  const pct = addLabel(leftCol, `${lunarInfo.illumination}%`, Font.boldSystemFont(34), new Color(THEME.moonGlowHex))
  const phase = addLabel(leftCol, lunarInfo.name, Font.systemFont(11), THEME.text)
  leftCol.addSpacer(4)
  const pos = addLabel(leftCol, `📍 ${Math.round(moon.altitude)}° alt · ${Math.round(moon.azimuth)}° az`, Font.systemFont(9), THEME.muted)
  leftCol.addSpacer(4)
  const moonStatus = moonEvents.rise ? `↑ ${formatClock(moonEvents.rise, location.tz)}` : moonEvents.downAllDay ? '👇 Sin salida hoy' : '⬆️ Toda la noche'
  const moonStatusLabel = addLabel(leftCol, moonStatus, Font.systemFont(9), THEME.accent)

  body.addSpacer(10)
  const divider = body.addText('│')
  divider.font = Font.systemFont(46)
  divider.textColor = new Color(THEME.moonGlowHex, 0.35)
  body.addSpacer(10)

  const rightCol = body.addStack()
  rightCol.layoutVertically()
  addLabel(rightCol, '☀️ Sol', Font.mediumSystemFont(11), THEME.text)
  rightCol.addSpacer(3)
  addInfoRow(rightCol, '↑', `Salida ${formatClock(sun.rise, location.tz)}`, 9, THEME.dusk)
  addInfoRow(rightCol, '↓', `Puesta ${formatClock(sun.set, location.tz)}`, 9, THEME.accent)
  rightCol.addSpacer(5)
  addInfoRow(rightCol, '🌗', `Día ${hoursLabel(dayLengthHours(sun.rise, sun.set))}`, 9, THEME.muted)

  widget.addSpacer(8)

  if (agenda.events.length > 0) {
    const nextEvent = agenda.events[0]
    const agendaRow = widget.addStack()
    agendaRow.layoutHorizontally()
    agendaRow.centerAlignContent()
    const glyph = agendaRow.addText('📅 ')
    glyph.font = Font.systemFont(10)
    const time = addLabel(agendaRow, `${formatClock(nextEvent.startDate, location.tz)} `, Font.systemFont(9), THEME.accent)
    const title = nextEvent.title.length > 22 ? nextEvent.title.slice(0, 21) + '…' : nextEvent.title
    addLabel(agendaRow, title, Font.systemFont(9), THEME.text)
  } else {
    addLabel(widget, `📅 Sin eventos · ${agenda.reminderCount} recordatorios`, Font.systemFont(9), THEME.muted)
  }

  widget.setPadding(14, 14, 14, 14)
}

function buildLarge(widget, location, moon, lunarInfo, moonEvents, sun, agenda, progress, solarNoon) {
  const header = widget.addStack()
  header.layoutHorizontally()
  header.centerAlignContent()
  const title = addLabel(header, `${lunarInfo.glyph} ${location.name}`, Font.boldSystemFont(16), THEME.text)
  header.addSpacer()
  const date = addLabel(header, `${formatDayName(new Date())} ${formatDayMonth(new Date())}`, Font.systemFont(10), THEME.muted)

  widget.addSpacer(8)

  const heroRow = widget.addStack()
  heroRow.layoutHorizontally()

  const heroLeft = heroRow.addStack()
  heroLeft.layoutVertically()
  const pct = addLabel(heroLeft, `${lunarInfo.illumination}%`, Font.boldSystemFont(40), new Color(THEME.moonGlowHex))
  addLabel(heroLeft, lunarInfo.name, Font.systemFont(12), THEME.text)
  heroLeft.addSpacer(4)
  const skyStatus = moon.altitude > 0 ? '⬆️ Sobre el horizonte' : '⬇️ Bajo el horizonte'
  addLabel(heroLeft, skyStatus, Font.systemFont(10), THEME.accent)

  heroRow.addSpacer()
  const heroRight = heroRow.addStack()
  heroRight.layoutVertically()
  addLabel(heroRight, `Posición ${Math.round(moon.altitude)}° · ${Math.round(moon.azimuth)}°`, Font.systemFont(10), THEME.muted)
  addLabel(heroRight, `Distancia ${Math.round(moon.distance / 1000)} km`, Font.systemFont(10), THEME.muted)
  if (moonEvents.rise) addLabel(heroRight, `Salida lunar ${formatClock(moonEvents.rise, location.tz)}`, Font.systemFont(10), THEME.muted)
  if (moonEvents.set) addLabel(heroRight, `Puesta lunar ${formatClock(moonEvents.set, location.tz)}`, Font.systemFont(10), THEME.muted)

  widget.addSpacer(10)

  const sunGrid = widget.addStack()
  sunGrid.layoutHorizontally()
  sunGrid.addSpacer(2)

  const sunriseCol = sunGrid.addStack()
  sunriseCol.layoutVertically()
  sunriseCol.centerAlignContent()
  const sunriseGlyph = sunriseCol.addText('🌅')
  sunriseGlyph.font = Font.systemFont(14)
  addLabel(sunriseCol, 'Amanecer', Font.systemFont(8), THEME.muted)
  addLabel(sunriseCol, formatClock(sun.rise, location.tz), Font.mediumSystemFont(12), THEME.text)

  sunGrid.addSpacer(null)

  const noonCol = sunGrid.addStack()
  noonCol.layoutVertically()
  noonCol.centerAlignContent()
  const noonGlyph = noonCol.addText('☀️')
  noonGlyph.font = Font.systemFont(14)
  addLabel(noonCol, 'Mediodía', Font.systemFont(8), THEME.muted)
  addLabel(noonCol, formatClock(solarNoon, location.tz), Font.mediumSystemFont(12), THEME.text)

  sunGrid.addSpacer(null)

  const sunsetCol = sunGrid.addStack()
  sunsetCol.layoutVertically()
  sunsetCol.centerAlignContent()
  const sunsetGlyph = sunsetCol.addText('🌇')
  sunsetGlyph.font = Font.systemFont(14)
  addLabel(sunsetCol, 'Anochecer', Font.systemFont(8), THEME.muted)
  addLabel(sunsetCol, formatClock(sun.set, location.tz), Font.mediumSystemFont(12), THEME.text)

  sunGrid.addSpacer(2)

  widget.addSpacer(8)

  const progressRow = widget.addStack()
  progressRow.layoutHorizontally()
  addLabel(progressRow, `Día ${Math.round(progress * 100)}%`, Font.systemFont(9), THEME.muted)
  progressRow.addSpacer()
  addLabel(progressRow, `${hoursLabel(dayLengthHours(sun.rise, sun.set))} de luz`, Font.systemFont(9), THEME.muted)
  widget.addSpacer(3)
  addProgressBar(widget, progress, THEME.accent)

  widget.addSpacer(8)

  const cycleRow = widget.addStack()
  cycleRow.layoutHorizontally()
  const nextFull = nextMoonDate(new Date(), 90)
  const nextNew = nextMoonDate(new Date(), 10)
  addLabel(cycleRow, `🌕 Llena ${nextFull ? formatDayMonth(nextFull) : '--'}`, Font.systemFont(9), THEME.dusk)
  cycleRow.addSpacer()
  addLabel(cycleRow, `🌑 Nueva ${nextNew ? formatDayMonth(nextNew) : '--'}`, Font.systemFont(9), THEME.muted)

  widget.addSpacer(8)

  const agendaHeader = widget.addStack()
  agendaHeader.layoutHorizontally()
  addLabel(agendaHeader, '📅 Hoy', Font.mediumSystemFont(10), THEME.text)
  agendaHeader.addSpacer()
  addLabel(agendaHeader, `${agenda.events.length} eventos · ${agenda.reminderCount} rec.`, Font.systemFont(8), THEME.muted)

  widget.addSpacer(3)

  if (agenda.events.length > 0) {
    for (const ev of agenda.events.slice(0, 3)) {
      const row = widget.addStack()
      row.layoutHorizontally()
      row.centerAlignContent()
      addLabel(row, '·', Font.systemFont(10), THEME.accent)
      row.addSpacer(4)
      addLabel(row, formatClock(ev.startDate, location.tz), Font.systemFont(9), THEME.accent)
      row.addSpacer(6)
      const title = ev.title.length > 28 ? ev.title.slice(0, 27) + '…' : ev.title
      addLabel(row, title, Font.systemFont(9), THEME.text)
      row.addSpacer(2)
    }
  } else {
    addLabel(widget, 'Sin eventos programados hoy ✨', Font.systemFont(9), THEME.muted)
  }

  widget.setPadding(14, 16, 14, 16)
}

async function createWidget() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const index = await loadLocationIndex()
  const location = LOCATIONS[index % LOCATIONS.length]
  const agenda = await loadAgenda()

  const moon = moonSkyPosition(location.lat, location.lon, now)
  const lunarInfo = moonPhaseInfo(today)
  const moonEvents = estimateMoonEvents(location.lat, location.lon, today)
  const sun = sunCrossing(location.lat, location.lon, today, 0.833)
  const progress = dayProgress(sun.rise, sun.set)
  const solarNoon = sun.rise && sun.set ? new Date(sun.rise.getTime() + (sun.set.getTime() - sun.rise.getTime()) / 2) : null

  const widget = new ListWidget()
  applyTheme(widget)

  const family = config.widgetFamily
  if (family === 'small') {
    buildSmall(widget, location, moon, lunarInfo, moonEvents, sun, agenda)
  } else if (family === 'medium') {
    buildMedium(widget, location, moon, lunarInfo, moonEvents, sun, agenda)
  } else {
    buildLarge(widget, location, moon, lunarInfo, moonEvents, sun, agenda, progress, solarNoon)
  }

  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000)

  if (config.runsInWidget) {
    Script.setWidget(widget)
  } else {
    await widget.presentMedium()
  }
  Script.complete()
}

async function run() {
  try {
    await createWidget()
    const index = await loadLocationIndex()
    await saveLocationIndex((index + 1) % LOCATIONS.length)
  } catch (err) {
    const fallback = new ListWidget()
    applyTheme(fallback)
    fallback.addSpacer()
    const message = addLabel(fallback, '🌙 Lunar Orbit — error', Font.systemFont(14), THEME.warning)
    fallback.addSpacer()
    fallback.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
    fallback.refreshAfterDate = new Date(Date.now() + 600000)
    if (config.runsInWidget) {
      Script.setWidget(fallback)
    }
    Script.complete()
  }
}

await run()