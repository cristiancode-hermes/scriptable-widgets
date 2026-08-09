const CONFIG = {
  refreshMinutes: 30,
  batteryLow: 0.2,
  batteryMid: 0.5,
  warnWhenUnplugged: true,
}

const COLORS = {
  backgroundTop: new Color('#1a1a2e'),
  backgroundBottom: new Color('#0d0d1a'),
  card: new Color('#ffffff', 0.07),
  cardAlt: new Color('#ffffff', 0.04),
  text: new Color('#f2f2f7'),
  textDim: new Color('#a0a0b0'),
  textMuted: new Color('#636366'),
  green: new Color('#30d158'),
  yellow: new Color('#ffd60a'),
  red: new Color('#ff453a'),
  blue: new Color('#64d2ff'),
  purple: new Color('#bf5af2'),
  track: new Color('#ffffff', 0.12),
}

const ICONS = {
  battery: '🔋',
  charging: '⚡',
  wifi: '📶',
  noWifi: '📵',
  brightness: '🔆',
  volume: '🔊',
  device: '📱',
  os: '🍏',
  name: '🏷️',
  darkMode: '🌙',
  lightMode: '☀️',
}

function getBatterySnapshot() {
  const level = Device.batteryLevel()
  return {
    level: level < 0 ? 0 : level,
    charging: Device.isCharging(),
  }
}

function getConnectivitySnapshot() {
  try {
    const ssid = Device.wifiNetwork()
    return { connected: !!ssid, ssid: ssid || 'Sin WiFi' }
  } catch (e) {
    return { connected: false, ssid: 'Sin WiFi' }
  }
}

function getDisplaySnapshot() {
  return {
    brightness: Math.max(0, Math.min(1, Device.screenBrightness())),
    volume: Math.max(0, Math.min(1, Device.volume())),
  }
}

function getHardwareSnapshot() {
  return {
    model: Device.model(),
    osVersion: Device.systemVersion(),
    deviceName: Device.name(),
  }
}

function getBatteryColor(level, charging) {
  if (charging) return COLORS.green
  if (level <= CONFIG.batteryLow) return COLORS.red
  if (level <= CONFIG.batteryMid) return COLORS.yellow
  return COLORS.green
}

function getBatteryEmoji(level, charging) {
  if (charging) return ICONS.charging
  if (level <= CONFIG.batteryLow) return '🪫'
  if (level >= 0.95) return '🔋'
  return ICONS.battery
}

function getBatteryLabel(level, charging) {
  const pct = Math.round(level * 100)
  if (charging) return `${pct}% · cargando`
  if (level <= CONFIG.batteryLow) return `${pct}% · baja`
  return `${pct}%`
}

function buildProgressBar(widget, ratio, fillColor) {
  const track = widget.addStack()
  track.layoutHorizontally()
  track.backgroundColor = COLORS.track
  track.cornerRadius = 3
  track.size = new Size(0, 6)
  const fill = track.addStack()
  fill.backgroundColor = fillColor
  fill.cornerRadius = 3
  fill.size = new Size(0, 6)
  fill.addSpacer(Math.max(2, Math.round(ratio * 100)))
  track.addSpacer(null)
}

function addStatusRow(parent, icon, label, value, valueColor) {
  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.addSpacer(2)
  const iconText = row.addText(icon)
  iconText.font = Font.systemFont(13)
  row.addSpacer(8)
  const labelText = row.addText(label)
  labelText.font = Font.mediumSystemFont(11)
  labelText.textColor = COLORS.textDim
  labelText.lineLimit = 1
  row.addSpacer(null)
  const valueText = row.addText(value)
  valueText.font = Font.mediumSystemFont(11)
  valueText.textColor = valueColor || COLORS.text
  valueText.lineLimit = 1
  row.addSpacer(2)
}

function buildSmallWidget(snapshot) {
  const widget = new ListWidget()
  const background = new LinearGradient()
  background.colors = [COLORS.backgroundTop, COLORS.backgroundBottom]
  background.locations = [0, 1]
  widget.backgroundGradient = background

  const battery = getBatterySnapshot()
  const connectivity = getConnectivitySnapshot()

  const topRow = widget.addStack()
  topRow.layoutHorizontally()
  topRow.centerAlignContent()
  const batteryEmoji = topRow.addText(getBatteryEmoji(battery.level, battery.charging))
  batteryEmoji.font = Font.systemFont(18)
  topRow.addSpacer(6)
  const pctText = topRow.addText(`${Math.round(battery.level * 100)}%`)
  pctText.font = Font.boldSystemFont(28)
  pctText.textColor = getBatteryColor(battery.level, battery.charging)
  topRow.addSpacer(null)
  const chargeText = topRow.addText(battery.charging ? ICONS.charging : '')
  chargeText.font = Font.systemFont(14)
  chargeText.textColor = COLORS.green

  widget.addSpacer(10)
  buildProgressBar(widget, battery.level, getBatteryColor(battery.level, battery.charging))
  widget.addSpacer(10)

  const wifiRow = widget.addStack()
  wifiRow.layoutHorizontally()
  wifiRow.centerAlignContent()
  const wifiIcon = wifiRow.addText(connectivity.connected ? ICONS.wifi : ICONS.noWifi)
  wifiIcon.font = Font.systemFont(11)
  wifiRow.addSpacer(6)
  const wifiLabel = wifiRow.addText(connectivity.ssid)
  wifiLabel.font = Font.systemFont(11)
  wifiLabel.textColor = connectivity.connected ? COLORS.textDim : COLORS.red
  wifiLabel.lineLimit = 1

  widget.addSpacer(null)
  const hintText = widget.addText('Tap para detalles')
  hintText.font = Font.systemFont(9)
  hintText.textColor = COLORS.textMuted

  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000)
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  return widget
}

function buildMediumWidget(snapshot) {
  const widget = new ListWidget()
  const background = new LinearGradient()
  background.colors = [COLORS.backgroundTop, COLORS.backgroundBottom]
  background.locations = [0, 1]
  widget.backgroundGradient = background

  const header = widget.addStack()
  header.layoutHorizontally()
  header.centerAlignContent()
  const titleIcon = header.addText(ICONS.battery)
  titleIcon.font = Font.systemFont(15)
  header.addSpacer(6)
  const titleText = header.addText('Estado del dispositivo')
  titleText.font = Font.boldSystemFont(13)
  titleText.textColor = COLORS.text
  header.addSpacer(null)
  const clockText = header.addText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  clockText.font = Font.mediumSystemFont(10)
  clockText.textColor = COLORS.textMuted

  widget.addSpacer(8)

  const batteryCard = widget.addStack()
  batteryCard.layoutHorizontally()
  batteryCard.centerAlignContent()
  batteryCard.backgroundColor = COLORS.card
  batteryCard.cornerRadius = 10
  batteryCard.setPadding(8, 10, 8, 10)
  const batteryIcon = batteryCard.addText(getBatteryEmoji(snapshot.battery.level, snapshot.battery.charging))
  batteryIcon.font = Font.systemFont(16)
  batteryCard.addSpacer(10)
  const batteryInfo = batteryCard.addStack()
  batteryInfo.layoutVertically()
  const batteryTitle = batteryInfo.addText(getBatteryLabel(snapshot.battery.level, snapshot.battery.charging))
  batteryTitle.font = Font.mediumSystemFont(12)
  batteryTitle.textColor = COLORS.text
  batteryInfo.addSpacer(3)
  buildProgressBar(batteryInfo, snapshot.battery.level, getBatteryColor(snapshot.battery.level, snapshot.battery.charging))

  widget.addSpacer(8)

  const rowsCard = widget.addStack()
  rowsCard.layoutVertically()
  rowsCard.backgroundColor = COLORS.card
  rowsCard.cornerRadius = 10
  rowsCard.setPadding(6, 10, 6, 10)
  addStatusRow(rowsCard, connectivityIcon(snapshot), 'WiFi', snapshot.connectivity.ssid, snapshot.connectivity.connected ? COLORS.text : COLORS.red)
  rowsCard.addSpacer(4)
  addStatusRow(rowsCard, ICONS.brightness, 'Brillo', `${Math.round(snapshot.display.brightness * 100)}%`, COLORS.blue)
  rowsCard.addSpacer(4)
  addStatusRow(rowsCard, ICONS.volume, 'Volumen', `${Math.round(snapshot.display.volume * 100)}%`, COLORS.purple)

  widget.addSpacer(8)

  const footer = widget.addStack()
  footer.layoutHorizontally()
  footer.centerAlignContent()
  const modelIcon = footer.addText(ICONS.device)
  modelIcon.font = Font.systemFont(10)
  footer.addSpacer(5)
  const modelText = footer.addText(`${snapshot.hardware.model} · iOS ${snapshot.hardware.osVersion}`)
  modelText.font = Font.systemFont(10)
  modelText.textColor = COLORS.textMuted
  modelText.lineLimit = 1

  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000)
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  return widget
}

function connectivityIcon(snapshot) {
  return snapshot.connectivity.connected ? ICONS.wifi : ICONS.noWifi
}

function buildLargeWidget(snapshot) {
  const widget = new ListWidget()
  const background = new LinearGradient()
  background.colors = [COLORS.backgroundTop, COLORS.backgroundBottom]
  background.locations = [0, 1]
  widget.backgroundGradient = background

  const header = widget.addStack()
  header.layoutHorizontally()
  header.centerAlignContent()
  const titleIcon = header.addText(ICONS.device)
  titleIcon.font = Font.systemFont(16)
  header.addSpacer(6)
  const titleStack = header.addStack()
  titleStack.layoutVertically()
  const titleText = titleStack.addText(snapshot.hardware.deviceName)
  titleText.font = Font.boldSystemFont(14)
  titleText.textColor = COLORS.text
  titleText.lineLimit = 1
  const subtitleText = titleStack.addText(`${snapshot.hardware.model} · iOS ${snapshot.hardware.osVersion}`)
  subtitleText.font = Font.systemFont(10)
  subtitleText.textColor = COLORS.textMuted
  subtitleText.lineLimit = 1
  header.addSpacer(null)
  const clockText = header.addText(new Date().toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }))
  clockText.font = Font.mediumSystemFont(10)
  clockText.textColor = COLORS.textMuted

  widget.addSpacer(10)

  const batteryCard = widget.addStack()
  batteryCard.layoutHorizontally()
  batteryCard.centerAlignContent()
  batteryCard.backgroundColor = COLORS.card
  batteryCard.cornerRadius = 12
  batteryCard.setPadding(10, 12, 10, 12)
  const batteryIcon = batteryCard.addText(getBatteryEmoji(snapshot.battery.level, snapshot.battery.charging))
  batteryIcon.font = Font.systemFont(22)
  batteryCard.addSpacer(12)
  const batteryInfo = batteryCard.addStack()
  batteryInfo.layoutVertically()
  const batteryTitle = batteryInfo.addText(getBatteryLabel(snapshot.battery.level, snapshot.battery.charging))
  batteryTitle.font = Font.boldSystemFont(16)
  batteryTitle.textColor = getBatteryColor(snapshot.battery.level, snapshot.battery.charging)
  batteryInfo.addSpacer(4)
  buildProgressBar(batteryInfo, snapshot.battery.level, getBatteryColor(snapshot.battery.level, snapshot.battery.charging))
  batteryCard.addSpacer(null)
  const healthText = batteryCard.addText(snapshot.battery.charging ? '⚡ En carga' : '🔌 Desenchufado')
  healthText.font = Font.systemFont(10)
  healthText.textColor = snapshot.battery.charging ? COLORS.green : COLORS.textMuted

  widget.addSpacer(10)

  const grid = widget.addStack()
  grid.layoutHorizontally()
  grid.addSpacer(1)

  const leftCard = grid.addStack()
  leftCard.layoutVertically()
  leftCard.backgroundColor = COLORS.card
  leftCard.cornerRadius = 10
  leftCard.setPadding(8, 10, 8, 10)
  leftCard.size = new Size(0, 0)
  const wifiTitle = leftCard.addText('WiFi')
  wifiTitle.font = Font.mediumSystemFont(10)
  wifiTitle.textColor = COLORS.textMuted
  leftCard.addSpacer(4)
  const wifiValue = leftCard.addText(snapshot.connectivity.ssid)
  wifiValue.font = Font.mediumSystemFont(12)
  wifiValue.textColor = snapshot.connectivity.connected ? COLORS.text : COLORS.red
  wifiValue.lineLimit = 1
  leftCard.addSpacer(6)
  const brightTitle = leftCard.addText('Brillo')
  brightTitle.font = Font.mediumSystemFont(10)
  brightTitle.textColor = COLORS.textMuted
  leftCard.addSpacer(3)
  buildProgressBar(leftCard, snapshot.display.brightness, COLORS.blue)
  leftCard.addSpacer(2)
  const brightValue = leftCard.addText(`${Math.round(snapshot.display.brightness * 100)}%`)
  brightValue.font = Font.systemFont(9)
  brightValue.textColor = COLORS.textDim

  grid.addSpacer(8)

  const rightCard = grid.addStack()
  rightCard.layoutVertically()
  rightCard.backgroundColor = COLORS.card
  rightCard.cornerRadius = 10
  rightCard.setPadding(8, 10, 8, 10)
  rightCard.size = new Size(0, 0)
  const volumeTitle = rightCard.addText('Volumen')
  volumeTitle.font = Font.mediumSystemFont(10)
  volumeTitle.textColor = COLORS.textMuted
  rightCard.addSpacer(4)
  const volumeValue = rightCard.addText(`${Math.round(snapshot.display.volume * 100)}%`)
  volumeValue.font = Font.mediumSystemFont(12)
  volumeValue.textColor = COLORS.text
  rightCard.addSpacer(6)
  const osTitle = rightCard.addText('Sistema')
  osTitle.font = Font.mediumSystemFont(10)
  osTitle.textColor = COLORS.textMuted
  rightCard.addSpacer(3)
  const osValue = rightCard.addText(`iOS ${snapshot.hardware.osVersion}`)
  osValue.font = Font.systemFont(10)
  osValue.textColor = COLORS.textDim
  osValue.lineLimit = 1

  grid.addSpacer(1)

  widget.addSpacer(10)

  const footer = widget.addStack()
  footer.layoutHorizontally()
  footer.centerAlignContent()
  const modeIcon = footer.addText(appearanceIcon())
  modeIcon.font = Font.systemFont(10)
  footer.addSpacer(5)
  const modeText = footer.addText(appearanceLabel())
  modeText.font = Font.systemFont(10)
  modeText.textColor = COLORS.textMuted
  footer.addSpacer(null)
  const batteryNote = footer.addText(`${Math.round(snapshot.battery.level * 100)}% · ${snapshot.battery.charging ? '⚡' : '🔋'}`)
  batteryNote.font = Font.systemFont(10)
  batteryNote.textColor = COLORS.textMuted

  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000)
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  return widget
}

function appearanceIcon() {
  try {
    return Device.isUsingDarkAppearance() ? ICONS.darkMode : ICONS.lightMode
  } catch (e) {
    return ICONS.darkMode
  }
}

function appearanceLabel() {
  try {
    return Device.isUsingDarkAppearance() ? 'Modo oscuro activo' : 'Modo claro activo'
  } catch (e) {
    return 'Modo oscuro'
  }
}

function buildErrorWidget() {
  const widget = new ListWidget()
  const background = new LinearGradient()
  background.colors = [COLORS.backgroundTop, COLORS.backgroundBottom]
  background.locations = [0, 1]
  widget.backgroundGradient = background
  widget.addText('⚠️ Error')
  widget.addText('Toca para reintentar')
  widget.url = 'scriptable:///open/' + encodeURIComponent(Script.name())
  widget.refreshAfterDate = new Date(Date.now() + 600000)
  return widget
}

function buildWidget() {
  const snapshot = {
    battery: getBatterySnapshot(),
    connectivity: getConnectivitySnapshot(),
    display: getDisplaySnapshot(),
    hardware: getHardwareSnapshot(),
  }
  const family = config.widgetFamily
  if (family === 'small') return buildSmallWidget(snapshot)
  if (family === 'medium') return buildMediumWidget(snapshot)
  return buildLargeWidget(snapshot)
}

async function run() {
  try {
    if (config.runsInWidget) {
      const widget = buildWidget()
      Script.setWidget(widget)
    } else {
      const widget = buildLargeWidget({
        battery: getBatterySnapshot(),
        connectivity: getConnectivitySnapshot(),
        display: getDisplaySnapshot(),
        hardware: getHardwareSnapshot(),
      })
      await widget.presentLarge()
    }
  } catch (e) {
    const widget = buildErrorWidget()
    Script.setWidget(widget)
  }
  Script.complete()
}

await run()
