const DARK_BG = new Color('#0d0d1a')
const CARD_BG = new Color('#ffffff', 0.06)
const CARD_BG_ALT = new Color('#ffffff', 0.04)
const BORDER = new Color('#ffffff', 0.08)
const TEXT = Color.white()
const TEXT_DIM = new Color('#ffffff', 0.65)
const TEXT_MUTED = new Color('#ffffff', 0.35)
const TEXT_ULTRA = new Color('#ffffff', 0.15)
const ACCENT_BLUE = new Color('#5e5ce6')
const ACCENT_CYAN = new Color('#64d2ff')
const ACCENT_PURPLE = new Color('#bf5af2')
const ACCENT_GREEN = new Color('#30d158')
const ACCENT_ORANGE = new Color('#ff9500')
const ACCENT_PINK = new Color('#ff375f')
const ACCENT_YELLOW = new Color('#ffd60a')

const MONTH_PALETTES = [
  [new Color('#1a1a3e'), new Color('#0d0d1a')],
  [new Color('#1e1e3a'), new Color('#0d0d1a')],
  [new Color('#1a2a3e'), new Color('#0d0d1a')],
  [new Color('#1a2e3a'), new Color('#0d0d1a')],
  [new Color('#1a2a2e'), new Color('#0d0d1a')],
  [new Color('#1a1a2e'), new Color('#0d0d1a')],
  [new Color('#1e1e3e'), new Color('#0d0d1a')],
  [new Color('#1a1a3a'), new Color('#0d0d1a')],
  [new Color('#1e2a1e'), new Color('#0d0d1a')],
  [new Color('#1e2e2e'), new Color('#0d0d1a')],
  [new Color('#1e1e2e'), new Color('#0d0d1a')],
  [new Color('#1a1a3e'), new Color('#0d0d1a')],
]

const MOON_SYMBOLS = ['new.moon', 'waxing.crescent', 'first.quarter', 'waxing.gibbous', 'full.moon', 'waning.gibbous', 'last.quarter', 'waning.crescent']
const MOON_GLYPHS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']

const SEASONS = [
  { name: 'Spring', startMonth: 3, startDay: 20, symbol: 'leaf.fill' },
  { name: 'Summer', startMonth: 6, startDay: 21, symbol: 'sun.max.fill' },
  { name: 'Autumn', startMonth: 9, startDay: 23, symbol: 'wind' },
  { name: 'Winter', startMonth: 12, startDay: 21, symbol: 'snowflake' },
]

class CosmicDayDashboard {
  constructor() {
    this.family = config.widgetFamily || 'medium'
    this.now = new Date()
    this.dayStart = new Date(this.now.getFullYear(), this.now.getMonth(), this.now.getDate())
    this.dayEnd = new Date(this.dayStart.getTime() + 86400000)
    this.events = []
    this.battery = 0
    this.wifiSSID = ''
    this.quote = ''
  }

  getDayOfYear() {
    const diff = this.now.getTime() - new Date(this.now.getFullYear(), 0, 0).getTime()
    return Math.floor(diff / 86400000)
  }

  getYearProgress() {
    const daysInYear = (new Date(this.now.getFullYear(), 11, 31).getTime() - new Date(this.now.getFullYear(), 0, 0).getTime()) / 86400000
    return this.getDayOfYear() / daysInYear
  }

  getDayProgress() {
    return (this.now.getTime() - this.dayStart.getTime()) / 86400000
  }

  getWeekNumber() {
    const d = new Date(Date.UTC(this.now.getFullYear(), this.now.getMonth(), this.now.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d - yStart) / 86400000 + 1) / 7)
  }

  getWeekProgress() {
    const day = this.now.getDay()
    return day === 0 ? 1 : day / 7
  }

  getMoonPhase() {
    let year = this.now.getFullYear()
    let month = this.now.getMonth() + 1
    let day = this.now.getDate()
    if (month < 3) { year--; month += 12 }
    month++
    let jd = 365.25 * year + 30.6 * month + day - 694039.09
    jd /= 29.5305882
    return Math.round((jd - Math.floor(jd)) * 8) % 8
  }

  getSeason() {
    const m = this.now.getMonth() + 1
    const d = this.now.getDate()
    for (let i = 0; i < SEASONS.length; i++) {
      const s = SEASONS[i]
      const next = SEASONS[(i + 1) % SEASONS.length]
      const start = new Date(this.now.getFullYear(), s.startMonth - 1, s.startDay)
      const end = new Date(this.now.getFullYear(), next.startMonth - 1, next.startDay)
      if (this.now >= start && this.now < end) return s
    }
    return SEASONS[0]
  }

  getSeasonProgress() {
    const s = this.getSeason()
    const next = SEASONS[(SEASONS.indexOf(s) + 1) % SEASONS.length]
    let start = new Date(this.now.getFullYear(), s.startMonth - 1, s.startDay)
    let end = new Date(this.now.getFullYear(), next.startMonth - 1, next.startDay)
    if (end <= start) end.setFullYear(end.getFullYear() + 1)
    const total = end.getTime() - start.getTime()
    const elapsed = this.now.getTime() - start.getTime()
    return Math.max(0, Math.min(1, elapsed / total))
  }

  getBatteryLevel() {
    try {
      return Device.batteryLevel()
    } catch {
      return -1
    }
  }

  isCharging() {
    try {
      return Device.isCharging()
    } catch {
      return false
    }
  }

  getMonthAccent() {
    const m = this.now.getMonth()
    return MONTH_PALETTES[m]
  }

  formatTime(date) {
    const df = new DateFormatter()
    df.useShortTimeStyle()
    return df.string(date)
  }

  async loadEvents() {
    try {
      const calendars = await Calendar.forEvents()
      if (calendars && calendars.length > 0) {
        const events = await CalendarEvent.between(this.now, this.dayEnd, calendars)
        if (events) {
          this.events = events
            .filter(e => !e.isAllDay)
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
            .slice(0, 3)
        }
      }
    } catch {}
  }

  async loadQuote() {
    try {
      const req = new Request('https://api.quotable.io/random?maxLength=100')
      req.timeoutInterval = 3
      const data = await req.loadJSON()
      if (data && data.content) {
        this.quote = data.content
        return
      }
    } catch {}
    const local = [
      'The cosmos is within us',
      'We are made of star stuff',
      'Look up at the stars',
      'Every day is a new beginning',
      'The present moment is a gift',
      'Be here now',
      'Small steps lead to big changes',
      'Breathe and begin again',
    ]
    this.quote = local[Math.floor(Math.random() * local.length)]
  }

  async loadNetworkInfo() {
    try {
      this.wifiSSID = Device.wifiNetwork()
    } catch {}
  }

  makeGradient(top, bottom) {
    const g = new LinearGradient()
    g.colors = [top, bottom]
    g.locations = [0, 1]
    return g
  }

  makeBar(progress, barColor) {
    const stack = new ListWidget()
    stack.layoutHorizontally()
    stack.backgroundColor = new Color('#ffffff', 0.08)
    stack.cornerRadius = 3
    stack.setPadding(0, 0, 0, 0)
    if (progress > 0) {
      const fill = stack.addStack()
      fill.size = new Size(0, 4)
      fill.backgroundColor = barColor || ACCENT_BLUE
      fill.cornerRadius = 3
      fill.size = new Size(Math.max(4, progress * 180), 4)
    }
    return stack
  }

  renderProgressBar(context, progress, color, width) {
    const bg = context.addStack()
    bg.layoutHorizontally()
    bg.backgroundColor = new Color('#ffffff', 0.08)
    bg.cornerRadius = 3
    bg.setPadding(0, 0, 0, 0)
    bg.size = new Size(width || 180, 4)
    if (progress > 0) {
      const fill = bg.addStack()
      fill.backgroundColor = color || ACCENT_BLUE
      fill.cornerRadius = 3
      fill.size = new Size(Math.max(4, (width || 180) * progress), 4)
    }
  }

  async render() {
    await Promise.all([
      this.loadEvents(),
      this.loadQuote(),
      this.loadNetworkInfo(),
    ])
    this.battery = this.getBatteryLevel()

    const widget = new ListWidget()
    const [bgTop, bgBottom] = this.getMonthAccent()
    widget.backgroundGradient = this.makeGradient(bgTop, bgBottom)

    if (this.family === 'small') {
      await this.renderSmall(widget)
    } else if (this.family === 'medium') {
      await this.renderMedium(widget)
    } else {
      await this.renderLarge(widget)
    }

    widget.setPadding(16, 16, 16, 16)
    widget.refreshAfterDate = new Date(Date.now() + 600000)
    return widget
  }

  async renderSmall(widget) {
    const dateStr = widget.addText(this.now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase())
    dateStr.font = Font.systemFont(11)
    dateStr.textColor = TEXT_MUTED

    widget.addSpacer(2)

    const timeStack = widget.addStack()
    timeStack.layoutHorizontally()
    timeStack.addSpacer()
    const timeLabel = timeStack.addText(this.formatTime(this.now))
    timeLabel.font = Font.boldSystemFont(32)
    timeLabel.textColor = TEXT
    timeStack.addSpacer()

    widget.addSpacer(6)

    const dayPct = this.getDayProgress()
    this.renderProgressBar(widget, dayPct, ACCENT_CYAN, 160)
    widget.addSpacer(2)
    const dayPctLabel = widget.addText(`${Math.round(dayPct * 100)}% of day`)
    dayPctLabel.font = Font.systemFont(9)
    dayPctLabel.textColor = TEXT_DIM

    widget.addSpacer(8)

    const infoStack = widget.addStack()
    infoStack.layoutHorizontally()
    infoStack.centerAlignContent()
    infoStack.backgroundColor = CARD_BG
    infoStack.cornerRadius = 10
    infoStack.setPadding(8, 10, 8, 10)

    const moonPhase = this.getMoonPhase()
    const moonGlyph = infoStack.addText(MOON_GLYPHS[moonPhase])
    moonGlyph.font = Font.systemFont(16)
    infoStack.addSpacer(6)

    const infoText = infoStack.addText(`W${this.getWeekNumber()} • Y${Math.round(this.getYearProgress() * 100)}%`)
    infoText.font = Font.systemFont(12)
    infoText.textColor = TEXT_DIM
    infoText.minimumScaleFactor = 0.7

    if (this.battery >= 0) {
      infoStack.addSpacer(4)
      const bLabel = infoStack.addText(`${Math.round(this.battery * 100)}%`)
      bLabel.font = Font.systemFont(10)
      bLabel.textColor = this.battery > 0.2 ? ACCENT_GREEN : ACCENT_ORANGE
    }

    widget.addSpacer(4)
  }

  async renderMedium(widget) {
    const mainStack = widget.addStack()
    mainStack.layoutHorizontally()

    const leftStack = mainStack.addStack()
    leftStack.layoutVertically()

    const dateStr = leftStack.addText(this.now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase())
    dateStr.font = Font.systemFont(10)
    dateStr.textColor = TEXT_MUTED

    leftStack.addSpacer(2)

    const timeLabel = leftStack.addText(this.formatTime(this.now))
    timeLabel.font = Font.boldSystemFont(28)
    timeLabel.textColor = TEXT

    leftStack.addSpacer(6)

    const dayPct = this.getDayProgress()
    const pctText = leftStack.addText(`${Math.round(dayPct * 100)}%`)
    pctText.font = Font.systemFont(13)
    pctText.textColor = ACCENT_CYAN

    this.renderProgressBar(leftStack, dayPct, ACCENT_CYAN, 120)
    leftStack.addSpacer(10)

    const statGrid = leftStack.addStack()
    statGrid.layoutVertically()

    const row1 = statGrid.addStack()
    row1.layoutHorizontally()
    const wLabel = row1.addText(`Week ${this.getWeekNumber()}`)
    wLabel.font = Font.systemFont(11)
    wLabel.textColor = TEXT_DIM
    row1.addSpacer(12)
    this.renderProgressBar(row1, this.getWeekProgress(), ACCENT_BLUE, 60)

    statGrid.addSpacer(4)

    const row2 = statGrid.addStack()
    row2.layoutHorizontally()
    const yLabel = row2.addText(`Year ${Math.round(this.getYearProgress() * 100)}%`)
    yLabel.font = Font.systemFont(11)
    yLabel.textColor = TEXT_DIM
    row2.addSpacer(12)
    this.renderProgressBar(row2, this.getYearProgress(), ACCENT_PURPLE, 60)

    mainStack.addSpacer(10)

    const rightStack = mainStack.addStack()
    rightStack.layoutVertically()
    rightStack.backgroundColor = CARD_BG
    rightStack.cornerRadius = 14
    rightStack.setPadding(14, 12, 14, 12)
    rightStack.size = new Size(130, 0)

    rightStack.addSpacer()

    const moonPhase = this.getMoonPhase()
    const moonStack = rightStack.addStack()
    moonStack.addSpacer()
    const moonIcon = moonStack.addText(MOON_GLYPHS[moonPhase])
    moonIcon.font = Font.systemFont(28)
    moonStack.addSpacer()

    rightStack.addSpacer(4)

    const moonLabel = rightStack.addText(this.getMoonPhaseName(moonPhase))
    moonLabel.font = Font.systemFont(11)
    moonLabel.textColor = TEXT_DIM
    moonLabel.centerAlignText()

    rightStack.addSpacer(6)

    const season = this.getSeason()
    const sStack = rightStack.addStack()
    sStack.addSpacer()
    const sIcon = sStack.addText(this.getSeasonEmoji(season.name))
    sIcon.font = Font.systemFont(16)
    sStack.addSpacer()

    const sLabel = rightStack.addText(season.name)
    sLabel.font = Font.systemFont(10)
    sLabel.textColor = TEXT_MUTED
    sLabel.centerAlignText()

    if (this.battery >= 0) {
      rightStack.addSpacer(8)
      const bStack = rightStack.addStack()
      bStack.addSpacer()
      const bText = bStack.addText(`⚡${Math.round(this.battery * 100)}%${this.isCharging() ? ' ⚡' : ''}`)
      bText.font = Font.systemFont(10)
      bText.textColor = this.battery > 0.2 ? TEXT_MUTED : ACCENT_ORANGE
      bStack.addSpacer()
    }

    rightStack.addSpacer()
  }

  async renderLarge(widget) {
    const topRow = widget.addStack()
    topRow.layoutHorizontally()
    topRow.centerAlignContent()

    const dateStack = topRow.addStack()
    dateStack.layoutVertically()
    const dateStr = dateStack.addText(this.now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase())
    dateStr.font = Font.systemFont(10)
    dateStr.textColor = TEXT_MUTED

    const timeLabel = dateStack.addText(this.formatTime(this.now))
    timeLabel.font = Font.boldSystemFont(34)
    timeLabel.textColor = TEXT

    topRow.addSpacer()

    const cardStack = topRow.addStack()
    cardStack.layoutVertically()
    cardStack.backgroundColor = CARD_BG
    cardStack.cornerRadius = 14
    cardStack.setPadding(12, 14, 12, 14)
    cardStack.size = new Size(100, 0)
    cardStack.centerAlignContent()

    cardStack.addSpacer()
    const moonPhase = this.getMoonPhase()
    const mIcon = cardStack.addText(MOON_GLYPHS[moonPhase])
    mIcon.font = Font.systemFont(24)
    const mLabel = cardStack.addText(this.getMoonPhaseName(moonPhase))
    mLabel.font = Font.systemFont(10)
    mLabel.textColor = TEXT_DIM
    cardStack.addSpacer()

    widget.addSpacer(8)

    const progressRow = widget.addStack()
    progressRow.layoutHorizontally()
    progressRow.centerAlignContent()

    const dayCol = progressRow.addStack()
    dayCol.layoutVertically()
    const dayPct = this.getDayProgress()
    const dayHeader = dayCol.addText('DAY')
    dayHeader.font = Font.systemFont(9)
    dayHeader.textColor = TEXT_MUTED
    const dayValue = dayCol.addText(`${Math.round(dayPct * 100)}%`)
    dayValue.font = Font.boldSystemFont(15)
    dayValue.textColor = ACCENT_CYAN
    this.renderProgressBar(dayCol, dayPct, ACCENT_CYAN, 80)
    dayCol.addSpacer(4)
    const dayLabel = dayCol.addText(`Day ${this.getDayOfYear()}`)
    dayLabel.font = Font.systemFont(9)
    dayLabel.textColor = TEXT_MUTED

    progressRow.addSpacer()

    const weekCol = progressRow.addStack()
    weekCol.layoutVertically()
    const weekHeader = weekCol.addText('WEEK')
    weekHeader.font = Font.systemFont(9)
    weekHeader.textColor = TEXT_MUTED
    const weekValue = weekCol.addText(`W${this.getWeekNumber()}`)
    weekValue.font = Font.boldSystemFont(15)
    weekValue.textColor = ACCENT_BLUE
    this.renderProgressBar(weekCol, this.getWeekProgress(), ACCENT_BLUE, 80)
    weekCol.addSpacer(4)
    const weekLabel = weekCol.addText(`${Math.round(this.getWeekProgress() * 100)}% done`)
    weekLabel.font = Font.systemFont(9)
    weekLabel.textColor = TEXT_MUTED

    progressRow.addSpacer()

    const yearCol = progressRow.addStack()
    yearCol.layoutVertically()
    const yearHeader = yearCol.addText('YEAR')
    yearHeader.font = Font.systemFont(9)
    yearHeader.textColor = TEXT_MUTED
    const yp = this.getYearProgress()
    const yearValue = yearCol.addText(`${Math.round(yp * 100)}%`)
    yearValue.font = Font.boldSystemFont(15)
    yearValue.textColor = ACCENT_PURPLE
    this.renderProgressBar(yearCol, yp, ACCENT_PURPLE, 80)
    yearCol.addSpacer(4)
    const season = this.getSeason()
    const yearLabel = yearCol.addText(`${season.name} ${Math.round(this.getSeasonProgress() * 100)}%`)
    yearLabel.font = Font.systemFont(9)
    yearLabel.textColor = TEXT_MUTED

    widget.addSpacer(10)

    const midRow = widget.addStack()
    midRow.layoutHorizontally()
    midRow.centerAlignContent()

    if (this.events.length > 0) {
      const evCard = midRow.addStack()
      evCard.layoutVertically()
      evCard.backgroundColor = CARD_BG
      evCard.cornerRadius = 12
      evCard.setPadding(10, 12, 10, 12)
      evCard.size = new Size(0, 0)

      const evHeader = evCard.addText('UPCOMING')
      evHeader.font = Font.systemFont(9)
      evHeader.textColor = TEXT_MUTED

      evCard.addSpacer(4)

      for (const ev of this.events) {
        const evRow = evCard.addStack()
        evRow.layoutHorizontally()
        evRow.centerAlignContent()
        evRow.addSpacer(4)
        const dot = evRow.addText('●')
        dot.font = Font.systemFont(7)
        dot.textColor = ACCENT_BLUE
        evRow.addSpacer(6)
        const evText = evRow.addText(this.shorten(ev.title, 22))
        evText.font = Font.systemFont(11)
        evText.textColor = TEXT_DIM
        evRow.addSpacer()
        const evTime = evRow.addText(this.formatTime(ev.startDate))
        evTime.font = Font.systemFont(10)
        evTime.textColor = TEXT_MUTED

        evCard.addSpacer(3)
      }
    }

    if (this.battery >= 0 || this.wifiSSID) {
      if (this.events.length > 0) midRow.addSpacer(8)

      const infoCard = midRow.addStack()
      infoCard.layoutVertically()
      infoCard.backgroundColor = CARD_BG
      infoCard.cornerRadius = 12
      infoCard.setPadding(10, 12, 10, 12)

      const infoHeader = infoCard.addText('STATUS')
      infoHeader.font = Font.systemFont(9)
      infoHeader.textColor = TEXT_MUTED

      infoCard.addSpacer(4)

      if (this.battery >= 0) {
        const bRow = infoCard.addStack()
        bRow.layoutHorizontally()
        bRow.centerAlignContent()
        const bIcon = bRow.addText(this.battery > 0.2 ? '🔋' : '🪫')
        bIcon.font = Font.systemFont(11)
        bRow.addSpacer(4)
        const bText = bRow.addText(`${Math.round(this.battery * 100)}%${this.isCharging() ? ' ⚡' : ''}`)
        bText.font = Font.systemFont(11)
        bText.textColor = this.battery > 0.2 ? TEXT_DIM : ACCENT_ORANGE
        infoCard.addSpacer(3)
      }

      if (this.wifiSSID) {
        const wRow = infoCard.addStack()
        wRow.layoutHorizontally()
        wRow.centerAlignContent()
        const wIcon = wRow.addText('📶')
        wIcon.font = Font.systemFont(11)
        wRow.addSpacer(4)
        const wText = wRow.addText(this.shorten(this.wifiSSID, 14))
        wText.font = Font.systemFont(11)
        wText.textColor = TEXT_DIM
      }
    }

    widget.addSpacer(8)

    if (this.quote) {
      const quoteStack = widget.addStack()
      quoteStack.backgroundColor = CARD_BG_ALT
      quoteStack.cornerRadius = 12
      quoteStack.setPadding(10, 14, 10, 14)

      const quoteLabel = quoteStack.addText(`"${this.quote}"`)
      quoteLabel.font = Font.italicSystemFont(11)
      quoteLabel.textColor = TEXT_MUTED
      quoteLabel.lineLimit = 2
    }

    widget.addSpacer(4)

    const footer = widget.addStack()
    footer.addSpacer()
    const footerLbl = footer.addText(`📅 ${this.getSeasonEmoji(season.name)} ${season.name} • 🌊 ${MOON_GLYPHS[moonPhase]} ${this.getMoonPhaseName(moonPhase)}`)
    footerLbl.font = Font.systemFont(9)
    footerLbl.textColor = TEXT_ULTRA
    footer.addSpacer()
  }

  getMoonPhaseName(phase) {
    const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent']
    return names[phase]
  }

  getSeasonEmoji(name) {
    const map = { Spring: '🌸', Summer: '☀️', Autumn: '🍂', Winter: '❄️' }
    return map[name] || '🌍'
  }

  shorten(text, maxLen) {
    if (!text) return ''
    return text.length > maxLen ? text.substring(0, maxLen - 1) + '…' : text
  }
}

const dashboard = new CosmicDayDashboard()
const widget = await dashboard.render()
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  widget.presentMedium()
}
Script.complete()
