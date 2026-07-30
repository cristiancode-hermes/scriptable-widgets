const Theme = {
  background: new Color('#1C1C1E'),
  card: new Color('#2C2C2E'),
  text: new Color('#FFFFFF'),
  secondary: new Color('#8E8E93'),
  accent: new Color('#0A84FF'),
  success: new Color('#30D158'),
  warning: new Color('#FF9F0A'),
  destructive: new Color('#FF453A'),
  separator: new Color('#38383A')
}

const CategoryLinks = [
  { name: '🍽️  Food & Drink', query: 'Restaurants near me' },
  { name: '☕  Cafes', query: 'Cafes near me' },
  { name: '🛍️  Shopping', query: 'Shopping near me' },
  { name: '🏥  Health', query: 'Pharmacy hospital near me' },
  { name: '⛽  Gas Station', query: 'Gas station near me' },
  { name: '🏨  Hotels', query: 'Hotels near me' },
  { name: '🌳  Parks', query: 'Parks near me' },
  { name: '🚇  Transit', query: 'Transit station near me' },
  { name: '🎬  Entertainment', query: 'Movies theater near me' },
  { name: '📚  Education', query: 'Library near me' }
]

function coordinateLabel(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`
}

async function loadSaves() {
  try {
    const fm = FileManager.local()
    const path = fm.joinPath(fm.documentsDirectory(), 'location-saves.json')
    if (fm.fileExists(path)) {
      return JSON.parse(fm.readString(path))
    }
  } catch {}
  return []
}

async function writeSaves(saves) {
  const fm = FileManager.local()
  const path = fm.joinPath(fm.documentsDirectory(), 'location-saves.json')
  fm.writeString(path, JSON.stringify(saves, null, 2))
}

async function currentLocation() {
  try {
    return await Location.current()
  } catch {
    return null
  }
}

async function geocodeAddress(lat, lng) {
  try {
    const results = await Location.reverseGeocode(lat, lng, 'en')
    if (results && results.length > 0) {
      const p = results[0]
      const parts = []
      if (p.subThoroughfare) parts.push(p.subThoroughfare)
      if (p.thoroughfare) parts.push(p.thoroughfare)
      if (p.locality) parts.push(p.locality)
      if (p.administrativeArea) parts.push(p.administrativeArea)
      if (p.postalCode) parts.push(p.postalCode)
      if (p.country) parts.push(p.country)
      return parts.join(', ') || 'Unknown Address'
    }
    return 'Address not found'
  } catch {
    return 'Geocoding failed'
  }
}

async function locationDetailAlert(lat, lng, address) {
  const alert = new Alert()
  alert.title = '📍  Current Location'
  alert.message = `${address}\n\n${coordinateLabel(lat, lng)}`
  alert.addAction('🗺️  Open in Maps')
  alert.addAction('📋  Copy Coordinates')
  alert.addAction('💾  Save Location')
  alert.addAction('📤  Share')
  alert.addCancelAction('Back')
  const choice = await alert.presentSheet()
  if (choice === 0) {
    Maps.openMaps(lat, lng)
  } else if (choice === 1) {
    Pasteboard.copy(coordinateLabel(lat, lng))
    const confirm = new Alert()
    confirm.title = 'Copied'
    confirm.message = 'Coordinates copied to clipboard'
    confirm.addAction('OK')
    await confirm.present()
  } else if (choice === 2) {
    await saveLocationPrompt(lat, lng, address)
  } else if (choice === 3) {
    ShareSheet.open([`📍 ${address}`, coordinateLabel(lat, lng)])
  }
}

async function saveLocationPrompt(lat, lng, address) {
  const alert = new Alert()
  alert.title = 'Save Location'
  alert.message = 'Enter a name for this location'
  alert.addTextField('Name', address)
  alert.addTextField('Notes (optional)', '')
  alert.addCancelAction('Cancel')
  alert.addAction('Save')
  const choice = await alert.present()
  if (choice === 1) {
    const name = alert.textFieldValue(0).trim() || address
    const notes = alert.textFieldValue(1).trim()
    const saves = await loadSaves()
    saves.unshift({ name, notes, lat, lng, address, savedAt: new Date().toISOString() })
    await writeSaves(saves)
    const confirm = new Alert()
    confirm.title = 'Saved ✓'
    confirm.message = `"${name}" was saved to your locations`
    confirm.addAction('OK')
    await confirm.present()
  }
}

async function showCurrentLocationScreen() {
  const loading = new Alert()
  loading.title = '📍  Fetching Location'
  loading.message = 'Please wait...'
  loading.addCancelAction('Cancel')
  const proceed = await loading.present()
  if (proceed === -1) return
  const loc = await currentLocation()
  if (!loc) {
    const errAlert = new Alert()
    errAlert.title = 'Location Unavailable'
    errAlert.message = 'Enable location access in Settings to use this feature'
    errAlert.addAction('OK')
    await errAlert.present()
    return
  }
  const address = await geocodeAddress(loc.latitude, loc.longitude)
  await locationDetailAlert(loc.latitude, loc.longitude, address)
}

function addSection(table, title) {
  const row = new UITableRow()
  row.isHeader = true
  row.height = 36
  row.addText(title)
  table.addRow(row)
}

function addActionRow(table, label, onSelect) {
  const row = new UITableRow()
  row.backgroundColor = Theme.card
  row.dismissOnSelect = false
  row.addText(`  ${label}`)
  row.onSelect = onSelect
  table.addRow(row)
}

function addDataRow(table, label, value) {
  const row = new UITableRow()
  row.backgroundColor = Theme.card
  row.dismissOnSelect = false
  row.cellSpacing = 10
  const titleCell = row.addText(`  ${label}`)
  titleCell.titleFont = Font.boldSystemFont(15)
  titleCell.titleColor = Theme.text
  const valueCell = row.addText(value)
  valueCell.subtitleColor = Theme.secondary
  valueCell.rightAligned()
  valueCell.widthWeight = 35
  table.addRow(row)
}

async function showCategoryList() {
  const table = new UITable()
  table.showSeparators = false
  addSection(table, '🏷️  Search Nearby')
  for (const cat of CategoryLinks) {
    const row = new UITableRow()
    row.backgroundColor = Theme.card
    row.dismissOnSelect = false
    row.addText(`  ${cat.name}`)
    row.onSelect = () => Maps.search(cat.query)
    table.addRow(row)
  }
  const backRow = new UITableRow()
  backRow.addText('  ← Back')
  backRow.onSelect = () => buildMain()
  table.addRow(backRow)
  await table.present(true)
}

async function showSavedLocations() {
  const saves = await loadSaves()
  const table = new UITable()
  table.showSeparators = false
  if (saves.length === 0) {
    addSection(table, '💾  Saved Locations')
    const row = new UITableRow()
    row.addText('No saved locations yet')
    table.addRow(row)
    const backRow = new UITableRow()
    backRow.addText('  ← Back')
    backRow.onSelect = () => buildMain()
    table.addRow(backRow)
    await table.present(true)
    return
  }
  addSection(table, `💾  Saved Locations  ·  ${saves.length}`)
  for (let i = 0; i < saves.length; i++) {
    const s = saves[i]
    const row = new UITableRow()
    row.backgroundColor = Theme.card
    row.dismissOnSelect = false
    row.cellSpacing = 10
    const nameCell = row.addText(`  ${s.name}`)
    nameCell.titleFont = Font.boldSystemFont(16)
    nameCell.titleColor = Theme.text
    const detail = s.notes || s.address || coordinateLabel(s.lat, s.lng)
    const detailCell = row.addText(detail.length > 40 ? detail.slice(0, 37) + '...' : detail)
    detailCell.subtitleColor = Theme.secondary
    detailCell.widthWeight = 35
    detailCell.rightAligned()
    row.onSelect = async () => {
      const alert = new Alert()
      alert.title = s.name
      let msg = coordinateLabel(s.lat, s.lng)
      if (s.address) msg += `\n${s.address}`
      if (s.notes) msg += `\n\n📝 ${s.notes}`
      alert.message = msg
      alert.addAction('🗺️  Open in Maps')
      alert.addAction('📤  Share')
      alert.addDestructiveAction('Delete')
      alert.addCancelAction('Back')
      const choice = await alert.presentSheet()
      if (choice === 0) {
        Maps.openMaps(s.lat, s.lng)
      } else if (choice === 1) {
        ShareSheet.open([s.name, s.address || coordinateLabel(s.lat, s.lng)])
      } else if (choice === 2) {
        const confirm = new Alert()
        confirm.title = 'Delete?'
        confirm.message = `Remove "${s.name}" from saved locations?`
        confirm.addDestructiveAction('Delete')
        confirm.addCancelAction('Cancel')
        const confirmed = await confirm.present()
        if (confirmed === 0) {
          saves.splice(i, 1)
          await writeSaves(saves)
          await showSavedLocations()
        }
      }
    }
    table.addRow(row)
  }
  const backRow = new UITableRow()
  backRow.addText('  ← Back')
  backRow.onSelect = () => buildMain()
  table.addRow(backRow)
  await table.present(true)
}

function formatTime(date) {
  const f = new DateFormatter()
  f.timeStyle = DateFormatter.TimeStyle.SHORT
  return f.string(date)
}

async function buildMain() {
  const table = new UITable()
  table.showSeparators = false
  const now = new Date()
  const headerRow = new UITableRow()
  headerRow.isHeader = true
  headerRow.height = 60
  headerRow.backgroundColor = Theme.background
  const titleCell = headerRow.addText('📍  Location Scout', `Last opened: ${formatTime(now)}`)
  titleCell.titleFont = Font.boldSystemFont(22)
  titleCell.titleColor = Theme.text
  titleCell.subtitleColor = Theme.secondary
  table.addRow(headerRow)
  addSection(table, '📍  Current Location')
  addActionRow(table, '📍  Get Current Location', async () => {
    await showCurrentLocationScreen()
  })
  addSection(table, '🔍  Explore')
  addActionRow(table, '🏷️  Search Nearby Categories', async () => {
    await showCategoryList()
  })
  addActionRow(table, '🔎  Search Any Place', () => {
    Maps.search('')
  })
  addSection(table, '💾  Saved')
  addActionRow(table, '💾  Saved Locations', async () => {
    await showSavedLocations()
  })
  addSection(table, '⚡  Quick Links')
  addActionRow(table, '📍  Open Current Location in Maps', async () => {
    const loadingAlert = new Alert()
    loadingAlert.title = 'Getting Location'
    loadingAlert.message = 'One moment...'
    loadingAlert.addCancelAction('Cancel')
    const proceed = await loadingAlert.present()
    if (proceed === -1) return
    const loc = await currentLocation()
    if (loc) {
      Maps.openMaps(loc.latitude, loc.longitude)
    } else {
      const errAlert = new Alert()
      errAlert.title = 'Location Unavailable'
      errAlert.message = 'Unable to get current location'
      errAlert.addAction('OK')
      await errAlert.present()
    }
  })
  addActionRow(table, '📍  Directions to Saved', async () => {
    const saves = await loadSaves()
    if (saves.length === 0) {
      const alert = new Alert()
      alert.title = 'No Saved Locations'
      alert.message = 'Save a location first to get directions'
      alert.addAction('OK')
      await alert.present()
      return
    }
    const alert = new Alert()
    alert.title = 'Navigate To'
    for (const s of saves.slice(0, 20)) {
      alert.addAction(s.name)
    }
    alert.addCancelAction('Cancel')
    const choice = await alert.present()
    if (choice >= 0 && choice < saves.length) {
      const target = saves[choice]
      const currentLoc = await currentLocation()
      if (currentLoc) {
        Maps.openMaps(target.lat, target.lng, {
          from: new Maps.Point(currentLoc.latitude, currentLoc.longitude)
        })
      } else {
        Maps.openMaps(target.lat, target.lng)
      }
    }
  })
  addSection(table, 'ℹ️')
  const infoRow = new UITableRow()
  infoRow.backgroundColor = Theme.card
  infoRow.addText('  Location Scout integrates Location Services, Maps, and local storage for place discovery and navigation')
  table.addRow(infoRow)
  await table.present(true)
}

await buildMain()
