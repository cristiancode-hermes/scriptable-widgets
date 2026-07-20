const LOCATIONS = [
  { name: 'Madrid', lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid' },
  { name: 'New York', lat: 40.7128, lon: -74.0060, tz: 'America/New_York' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
  { name: 'London', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' }
]

const STORAGE_KEY = 'solar-compass-location-index'

async function loadLocationIndex() {
  const fm = FileManager.local()
  const path = fm.joinPath(fm.documentsDirectory(), 'solar-compass-config.json')
  if (fm.fileExists(path)) {
    const data = JSON.parse(fm.readString(path))
    return data.locationIndex ?? 0
  }
  return 0
}

async function saveLocationIndex(index) {
  const fm = FileManager.local()
  const path = fm.joinPath(fm.documentsDirectory(), 'solar-compass-config.json')
  fm.writeString(path, JSON.stringify({ locationIndex: index }))
}

function getSunPosition(lat, lon, date) {
  const rad = Math.PI / 180
  const day = (date - new Date(date.getFullYear(), 0, 0)) / 86400000
  const julian = 2451549.5 + day + 0.0008
  const century = (julian - 2451545) / 36525
  const meanAnomaly = (357.52911 + 35999.05029 * century - 0.0001537 * century * century) * rad
  const equationCenter = Math.sin(meanAnomaly) * (1.914602 - 0.004817 * century - 0.000014 * century * century)
    + Math.sin(2 * meanAnomaly) * (0.019993 - 0.000101 * century)
    + Math.sin(3 * meanAnomaly) * 0.000289
  const eclipticLong = (meanAnomaly + equationCenter + 282.938346 + 0.000047 * century) * rad
  const obliquity = (23.439291 - 0.013004 * century) * rad
  const sinDeclination = Math.sin(obliquity) * Math.sin(eclipticLong)
  const declination = Math.asin(sinDeclination)
  const hourAngle = (date.getUTCHours() + date.getUTCMinutes() / 60 - 12) * 15 * rad + lon * rad
  const sinAlt = Math.sin(lat * rad) * Math.sin(declination) + Math.cos(lat * rad) * Math.cos(declination) * Math.cos(hourAngle)
  const cosAz = (Math.sin(declination) * Math.cos(lat * rad) - Math.cos(declination) * Math.sin(lat * rad) * Math.cos(hourAngle)) / Math.cos(Math.asin(sinAlt))
  return {
    altitude: Math.asin(sinAlt) / rad,
    azimuth: 180 + Math.acos(Math.min(1, Math.max(-1, cosAz))) / rad * (Math.sin(hourAngle) > 0 ? -1 : 1)
  }
}

function getSunriseSunset(lat, lon, date) {
  const rad = Math.PI / 180
  const day = (date - new Date(date.getFullYear(), 0, 0)) / 86400000
  const julian = 2451549.5 + day
  const meanAnomaly = (357.5291 + 0.98560028 * (julian - 2451545)) * rad
  const coeff1 = 1.9148 * rad
  const coeff2 = 0.0200 * rad
  const coeff3 = 0.0003 * rad
  const eqCenter = coeff1 * Math.sin(meanAnomaly) + coeff2 * Math.sin(2 * meanAnomaly) + coeff3 * Math.sin(3 * meanAnomaly)
  const eclipticLongitude = (meanAnomaly + eqCenter + 282.937 * rad + 0.000047 * rad) % (2 * Math.PI)
  const obliquityEcliptic = (23.4393 - 0.00000036 * (julian - 2451545)) * rad
  const sinDeclination = Math.sin(obliquityEcliptic) * Math.sin(eclipticLongitude)
  const declination = Math.asin(sinDeclination)
  const latitudeRad = lat * rad
  const cosH = -(Math.sin(-0.833 * rad) - Math.sin(latitudeRad) * Math.sin(declination)) / (Math.cos(latitudeRad) * Math.cos(declination))
  if (Math.abs(cosH) > 1) return { sunrise: null, sunset: null, polar: cosH > 1 ? 'night' : 'day' }
  const hourAngle = Math.acos(cosH)
  const sunriseHour = 12 - hourAngle * 180 / Math.PI / 15 - lon / 15
  const sunsetHour = 12 + hourAngle * 180 / Math.PI / 15 - lon / 15
  const sunrise = new Date(date)
  sunrise.setHours(Math.floor(sunriseHour), Math.floor((sunriseHour % 1) * 60), 0, 0)
  const sunset = new Date(date)
  sunset.setHours(Math.floor(sunsetHour), Math.floor((sunsetHour % 1) * 60), 0, 0)
  return { sunrise, sunset, polar: null }
}

function getDayProgress(sunrise, sunset) {
  const now = new Date()
  if (!sunrise || !sunset) return 0
  const total = sunset.getTime() - sunrise.getTime()
  const elapsed = now.getTime() - sunrise.getTime()
  return Math.max(0, Math.min(1, elapsed / total))
}

function getDaylightRemaining(sunset) {
  const now = new Date()
  if (!sunset || now > sunset) return '0h 0m'
  const diff = sunset.getTime() - now.getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

function getMoonPhase(date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  let y = year
  let m = month
  if (m <= 2) { y -= 1; m += 12 }
  const a = Math.floor(y / 100)
  const b = 2 - a + Math.floor(a / 4)
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5
  const daysSinceNew = (jd - 2451549.5) % 29.53058867
  const phase = daysSinceNew / 29.53058867
  const names = ['🌑 New Moon', '🌒 Waxing Crescent', '🌓 First Quarter', '🌔 Waxing Gibbous', '🌕 Full Moon', '🌖 Waning Gibbous', '🌗 Last Quarter', '🌘 Waning Crescent']
  const index = Math.round(phase * 8) % 8
  return { phase, name: names[index], illumination: Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100) }
}

function getGoldenHour(sunrise, sunset, date) {
  const sunriseGolden = sunrise ? new Date(sunrise.getTime() + 3600000) : null
  const sunsetGolden = sunset ? new Date(sunset.getTime() - 3600000) : null
  return { morningEnd: sunriseGolden, eveningStart: sunsetGolden }
}

function formatTime(date, tz) {
  if (!date) return '--:--'
  const opts = { hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: false }
  return date.toLocaleTimeString('en-US', opts)
}

async function createWidget(location) {
  const widget = new ListWidget()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const { sunrise, sunset, polar } = getSunriseSunset(location.lat, location.lon, today)
  const sunPos = getSunPosition(location.lat, location.lon, now)
  const dayProgress = getDayProgress(sunrise, sunset)
  const moon = getMoonPhase(today)
  const golden = getGoldenHour(sunrise, sunset, today)

  const isDaytime = sunrise && sunset && now >= sunrise && now <= sunset
  const gradient = new LinearGradient()
  if (isDaytime) {
    gradient.colors = [new Color('#1a1a2e'), new Color('#16213e'), new Color('#0f3460'), new Color('#e94560')]
    gradient.locations = [0, 0.3, 0.6, 1]
  } else if (sunrise && now < sunrise) {
    gradient.colors = [new Color('#0f0c29'), new Color('#302b63'), new Color('#24243e'), new Color('#1a1a2e')]
    gradient.locations = [0, 0.4, 0.8, 1]
  } else {
    gradient.colors = [new Color('#0f0c29'), new Color('#1a1a2e'), new Color('#16213e'), new Color('#0f3460')]
    gradient.locations = [0, 0.3, 0.6, 1]
  }
  widget.backgroundGradient = gradient

  const family = config.widgetFamily

  if (family === 'small') {
    const timeStack = widget.addStack()
    timeStack.layoutHorizontally()
    const timeLabel = timeStack.addText(isDaytime ? '☀️' : '🌙')
    timeLabel.font = Font.systemFont(14)
    timeStack.addSpacer()
    const locLabel = timeStack.addText(location.name)
    locLabel.font = Font.systemFont(10)
    locLabel.textColor = Color.white()
    locLabel.alpha = 0.7

    widget.addSpacer(8)

    const altitudeStr = `${Math.round(sunPos.altitude)}°`
    const altitudeText = widget.addText(altitudeStr)
    altitudeText.font = Font.boldSystemFont(42)
    altitudeText.textColor = Color.white()
    altitudeText.centerAlignText()

    widget.addSpacer(4)

    const label = widget.addText(isDaytime ? 'Sun Altitude' : 'Sun Below Horizon')
    label.font = Font.systemFont(11)
    label.textColor = Color.white()
    label.alpha = 0.6
    label.centerAlignText()

    widget.addSpacer(8)

    if (sunrise && sunset) {
      const timesRow = widget.addStack()
      timesRow.layoutHorizontally()
      timesRow.centerAlignContent()

      const sunriseStack = timesRow.addStack()
      sunriseStack.layoutVertically()
      sunriseStack.centerAlignContent()
      sunriseStack.addText('↑')
      sunriseStack.addText(formatTime(sunrise, location.tz))

      timesRow.addSpacer()

      const sunsetStack = timesRow.addStack()
      sunsetStack.layoutVertically()
      sunsetStack.centerAlignContent()
      sunsetStack.addText('↓')
      sunsetStack.addText(formatTime(sunset, location.tz))

      if (sunriseStack.stackElements) sunriseStack.stackElements.forEach(e => { e.font = Font.systemFont(10); e.textColor = Color.white(); e.alpha = 0.8 })
      if (sunsetStack.stackElements) sunsetStack.stackElements.forEach(e => { e.font = Font.systemFont(10); e.textColor = Color.white(); e.alpha = 0.8 })
    }
  }

  else if (family === 'medium') {
    const header = widget.addStack()
    header.layoutHorizontally()
    header.addText(`☀️ Solar Compass`)
    header.addSpacer()
    const locText = header.addText(location.name)
    locText.font = Font.systemFont(11)
    locText.textColor = Color.white()
    locText.alpha = 0.6
    widget.addSpacer(8)

    const body = widget.addStack()
    body.layoutHorizontally()

    const leftCol = body.addStack()
    leftCol.layoutVertically()

    if (sunrise && sunset) {
      leftCol.addText(`↑ ${formatTime(sunrise, location.tz)}`)
      leftCol.addText(`↓ ${formatTime(sunset, location.tz)}`)
      leftCol.addSpacer(4)
      leftCol.addText(`☀️ ${Math.round(sunPos.altitude)}°`)
      leftCol.addText(`🎯 ${Math.round(sunPos.azimuth)}°`)
    } else if (polar === 'day') {
      leftCol.addText('☀️ Midnight Sun')
      leftCol.addText('Daylight all day')
    } else {
      leftCol.addText('🌑 Polar Night')
      leftCol.addText('No sunrise today')
    }
    leftCol.stackElements?.forEach(e => { e.font = Font.systemFont(11); e.textColor = Color.white(); e.alpha = 0.85 })

    body.addSpacer()

    const rightCol = body.addStack()
    rightCol.layoutVertically()

    if (sunset && sunrise) {
      const daylight = Math.round((sunset.getTime() - sunrise.getTime()) / 3600000 * 10) / 10
      rightCol.addText(`Daylight: ${daylight}h`)
      rightCol.addText(`Remaining: ${getDaylightRemaining(sunset)}`)
    }
    rightCol.addSpacer(4)
    rightCol.addText(isDaytime ? `🌞 ${golden.morningEnd && now < golden.morningEnd ? 'Golden hour 🌅' : golden.eveningStart && now >= golden.eveningStart ? 'Golden hour 🌇' : 'Day'}` : `🌙 ${moon.name}`)
    rightCol.addText(`Moon: ${moon.illumination}%`)
    rightCol.stackElements?.forEach(e => { e.font = Font.systemFont(11); e.textColor = Color.white(); e.alpha = 0.85 })
  }

  else {
    const header = widget.addStack()
    header.layoutHorizontally()
    const titleText = header.addText(`☀️ Solar Compass — ${location.name}`)
    titleText.font = Font.boldSystemFont(18)
    titleText.textColor = Color.white()
    header.addSpacer()
    const refreshBtn = header.addText('↻')
    refreshBtn.font = Font.systemFont(16)
    refreshBtn.textColor = Color.white()
    refreshBtn.alpha = 0.5
    widget.addSpacer(12)

    const mainRow = widget.addStack()
    mainRow.layoutHorizontally()

    const leftCol = mainRow.addStack()
    leftCol.layoutVertically()

    const altitudeBig = leftCol.addText(`${Math.round(sunPos.altitude)}°`)
    altitudeBig.font = Font.boldSystemFont(48)
    altitudeBig.textColor = Color.white()
    const altLabel = leftCol.addText(isDaytime ? 'Sun Altitude' : 'Sun Depression')
    altLabel.font = Font.systemFont(12)
    altLabel.textColor = Color.white()
    altLabel.alpha = 0.6

    leftCol.addSpacer(6)

    const progressStack = leftCol.addStack()
    if (sunrise && sunset) {
      progressStack.addText(`Day ${Math.round(dayProgress * 100)}% complete`)
    }

    mainRow.addSpacer()

    const rightCol = mainRow.addStack()
    rightCol.layoutVertically()

    const sunriseRow = rightCol.addStack()
    sunriseRow.layoutHorizontally()
    sunriseRow.addText('Sunrise  ')
    sunriseRow.addText(formatTime(sunrise, location.tz))

    const sunsetRow = rightCol.addStack()
    sunsetRow.layoutHorizontally()
    sunsetRow.addText('Sunset   ')
    sunsetRow.addText(formatTime(sunset, location.tz))

    const azimuthRow = rightCol.addStack()
    azimuthRow.layoutHorizontally()
    azimuthRow.addText('Azimuth  ')
    azimuthRow.addText(`${Math.round(sunPos.azimuth)}°`)

    rightCol.addSpacer(4)

    if (sunrise && sunset) {
      const daylightHrs = (sunset.getTime() - sunrise.getTime()) / 3600000
      const daylightRow = rightCol.addStack()
      daylightRow.layoutHorizontally()
      daylightRow.addText('Daylight ')
      daylightRow.addText(`${Math.round(daylightHrs * 10) / 10}h`)

      const remainRow = rightCol.addStack()
      remainRow.layoutHorizontally()
      remainRow.addText('Remains  ')
      remainRow.addText(getDaylightRemaining(sunset))
    }

    rightCol.stackElements?.forEach(e => {
      if (e instanceof ListWidget || typeof e.font === 'undefined') return
      try { e.font = Font.systemFont(12); e.textColor = Color.white(); e.alpha = 0.85 } catch {}
    })

    widget.addSpacer(12)

    const detailRow = widget.addStack()
    detailRow.layoutHorizontally()

    const moonCol = detailRow.addStack()
    moonCol.layoutVertically()
    moonCol.addText(`🌙 ${moon.name}`)
    moonCol.addText(`Illumination: ${moon.illumination}%`)

    detailRow.addSpacer()

    const goldenCol = detailRow.addStack()
    goldenCol.layoutVertically()
    goldenCol.addText('✨ Golden Hours')
    if (golden.morningEnd) goldenCol.addText(`AM: ${formatTime(sunrise, location.tz)}–${formatTime(golden.morningEnd, location.tz)}`)
    if (golden.eveningStart) goldenCol.addText(`PM: ${formatTime(golden.eveningStart, location.tz)}–${formatTime(sunset, location.tz)}`)

    detailRow.stackElements?.forEach(e => { try { e.font = Font.systemFont(11); e.textColor = Color.white(); e.alpha = 0.75 } catch {} })

    widget.addSpacer(6)

    const progressBar = widget.addStack()
    progressBar.layoutHorizontally()
    progressBar.size = new Size(0, 4)
    progressBar.cornerRadius = 2
    const bg = new Color('#ffffff', 0.15)
    progressBar.backgroundColor = bg
    if (sunrise && sunset) {
      const fillStack = progressBar.addStack()
      const fillWidth = Math.round(dayProgress * 280)
      fillStack.size = new Size(fillWidth, 4)
      fillStack.cornerRadius = 2
      fillStack.backgroundColor = isDaytime ? new Color('#f39c12') : new Color('#8e44ad')
    } else {
      progressBar.addSpacer()
    }
  }

  widget.setPadding(16, 16, 16, 16)

  if (config.runsInWidget) {
    Script.setWidget(widget)
  } else {
    await widget.presentMedium()
  }

  Script.complete()
}

async function run() {
  try {
    const locIndex = await loadLocationIndex()
    const location = LOCATIONS[locIndex % LOCATIONS.length]
    await createWidget(location)
    const nextIndex = (locIndex + 1) % LOCATIONS.length
    await saveLocationIndex(nextIndex)
  } catch (error) {
    const widget = new ListWidget()
    widget.addText('⚠️ Error loading data')
    if (config.runsInWidget) {
      Script.setWidget(widget)
    } else {
      await widget.presentSmall()
    }
    Script.complete()
  }
}

await run()
