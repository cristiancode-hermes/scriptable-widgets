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

const Icon = {
  photos: SFSymbol.named('photo'),
  videos: SFSymbol.named('video'),
  favorites: SFSymbol.named('star.fill'),
  screenshots: SFSymbol.named('rectangle.split.3x1'),
  selfies: SFSymbol.named('person.crop.square'),
  livePhotos: SFSymbol.named('livephoto'),
  calendar: SFSymbol.named('calendar'),
  storage: SFSymbol.named('internaldrive'),
  album: SFSymbol.named('folder'),
  delete: SFSymbol.named('trash')
}

function formattedCount(n) {
  if (!n || n === 0) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

function formattedDate(date) {
  if (!date) return '\u2014'
  const f = new DateFormatter()
  f.dateFormat = 'MMM d, yyyy'
  return f.string(date)
}

function formattedDuration(seconds) {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function estimateStorage(count, isVideo) {
  const avgMB = isVideo ? 60 : 3.5
  const total = count * avgMB
  if (total >= 1024) return (total / 1024).toFixed(1) + ' GB'
  return total.toFixed(0) + ' MB'
}

function addSectionRow(table, title) {
  const row = new UITableRow()
  row.isHeader = true
  row.addText(title)
  table.addRow(row)
}

function addDataRow(table, label, value, symbol, accent) {
  const row = new UITableRow()
  row.addText(`${symbol}  ${label}`)
  const valueCell = row.addText(value)
  valueCell.widthWeight = 0.35
  valueCell.rightAligned()
  valueCell.titleColor = accent ? Theme.accent : Theme.secondary
  table.addRow(row)
}

async function presentPhotoActions(asset) {
  try {
    const isVideo = asset.isVideo
    const isFav = asset.isFavorite
    const actions = ['View', 'Share', isFav ? 'Remove from Favorites' : 'Add to Favorites', 'Info']

    const alert = new Alert()
    alert.title = asset.filename || 'Untitled'
    let detail = formattedDate(asset.creationDate)
    if (isVideo) detail += `  \u00b7  ${formattedDuration(asset.duration)}`
    detail += `  \u00b7  ${asset.width}\u00d7${asset.height}`
    alert.message = detail

    for (const action of actions) {
      alert.addAction(action)
    }
    alert.addDestructiveAction('Delete')
    alert.addCancelAction('Cancel')

    const choice = await alert.presentSheet()
    if (choice === -1 || choice === actions.length + 1) return

    if (choice === 0) {
      const image = await asset.getImage()
      QuickLook.present(image)
    } else if (choice === 1) {
      const image = await asset.getImage()
      await ShareSheet.present([image])
    } else if (choice === 2) {
      asset.favorite = !isFav
      await asset.save()
      const confirmAlert = new Alert()
      confirmAlert.title = isFav ? 'Removed from Favorites' : 'Added to Favorites'
      confirmAlert.addAction('OK')
      await confirmAlert.presentAlert()
    } else if (choice === 3) {
      const infoAlert = new Alert()
      infoAlert.title = asset.filename || 'Untitled'
      const mediaType = isVideo ? 'Video' : asset.isLivePhoto ? 'Live Photo' : asset.isScreenshot ? 'Screenshot' : 'Photo'
      let infoMsg = `Type: ${mediaType}\n`
      infoMsg += `Dimensions: ${asset.width} \u00d7 ${asset.height}\n`
      infoMsg += `Created: ${formattedDate(asset.creationDate)}\n`
      infoMsg += `Modified: ${formattedDate(asset.modificationDate)}\n`
      if (isVideo) infoMsg += `Duration: ${formattedDuration(asset.duration)}\n`
      infoMsg += `Favorite: ${isFav ? 'Yes' : 'No'}\n`
      infoMsg += `Hidden: ${asset.hidden ? 'Yes' : 'No'}`
      if (asset.location) {
        infoMsg += `\nLocation: ${asset.location.latitude.toFixed(4)}, ${asset.location.longitude.toFixed(4)}`
      }
      infoMsg += `\n\nFile: ${asset.filename || 'Unknown'}`
      infoAlert.message = infoMsg
      infoAlert.addAction('OK')
      await infoAlert.presentAlert()
    } else if (choice === 4) {
      const confirmAlert = new Alert()
      confirmAlert.title = 'Delete Photo?'
      confirmAlert.message = 'This will move the photo to Recently Deleted.'
      confirmAlert.addDestructiveAction('Delete')
      confirmAlert.addCancelAction('Cancel')
      const confirmed = await confirmAlert.presentAlert()
      if (confirmed === 0) {
        await asset.delete()
      }
    }
  } catch (error) {
    const errorAlert = new Alert()
    errorAlert.title = 'Action Failed'
    errorAlert.message = error.message
    errorAlert.addAction('OK')
    await errorAlert.presentAlert()
  }
}

async function buildAlbumTable(album) {
  try {
    const assets = await album.getAllAssets()
    const table = new UITable()
    table.showSeparators = true

    const headerRow = new UITableRow()
    headerRow.isHeader = true
    headerRow.height = 50
    headerRow.addText(`${album.title || 'Album'}  \u00b7  ${assets.length} items`)
    table.addRow(headerRow)

    if (assets.length === 0) {
      const emptyRow = new UITableRow()
      const emptyCell = emptyRow.addText('No items in this album')
      emptyCell.centerAligned()
      table.addRow(emptyRow)
      return table
    }

    const batchSize = 30
    for (let batchStart = 0; batchStart < assets.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, assets.length)
      for (let i = batchStart; i < batchEnd; i++) {
        const asset = assets[i]
        const row = new UITableRow()
        row.height = 72
        row.onSelect = () => presentPhotoActions(asset)

        let thumbnail
        try {
          thumbnail = await asset.getImage()
        } catch {
          thumbnail = null
        }

        if (thumbnail) {
          const imageCell = row.addImage(thumbnail)
          imageCell.widthWeight = 12
        }

        const typeBadge = asset.isVideo ? '\uD83C\uDFAC' : asset.isLivePhoto ? '\u2728' : asset.isScreenshot ? '\uD83D\uDDA5' : '\uD83D\uDCF7'
        let detailLine = `${asset.width}\u00d7${asset.height}`
        if (asset.isVideo) detailLine += `  \u00b7  ${formattedDuration(asset.duration)}`
        if (asset.creationDate) detailLine += `  \u00b7  ${formattedDate(asset.creationDate)}`
        if (asset.isFavorite) detailLine += '  \u2B50'

        const textCell = row.addText(`${typeBadge}  ${asset.filename || 'Untitled'}`, detailLine)
        textCell.widthWeight = 88
        textCell.subtitleColor = Theme.secondary

        table.addRow(row)
      }
    }

    return table
  } catch (error) {
    const errorTable = new UITable()
    const errorRow = new UITableRow()
    errorRow.addText(`Error: ${error.message}`)
    errorTable.addRow(errorRow)
    return errorTable
  }
}

async function showSmartAlbum(name, accessor) {
  try {
    const album = typeof accessor === 'function' ? accessor() : accessor
    if (!album) {
      const alert = new Alert()
      alert.title = 'Album Unavailable'
      alert.message = `The "${name}" album could not be accessed.`
      alert.addAction('OK')
      await alert.presentAlert()
      return
    }
    if (album.count === 0) {
      const alert = new Alert()
      alert.title = name
      alert.message = 'This album is empty.'
      alert.addAction('OK')
      await alert.presentAlert()
      return
    }
    const table = await buildAlbumTable(album)
    table.present(false)
  } catch (error) {
    const alert = new Alert()
    alert.title = 'Error'
    alert.message = error.message
    alert.addAction('OK')
    await alert.presentAlert()
  }
}

async function showUserAlbum(album) {
  try {
    const table = await buildAlbumTable(album)
    table.present(false)
  } catch (error) {
    const alert = new Alert()
    alert.title = 'Error'
    alert.message = error.message
    alert.addAction('OK')
    await alert.presentAlert()
  }
}

async function buildDashboard() {
  try {
    const table = new UITable()
    table.showSeparators = true

    addSectionRow(table, '\uD83D\uDCF8  Photo Library')

    const overviewRow = new UITableRow()
    overviewRow.isHeader = true
    overviewRow.addText('Library Overview')
    table.addRow(overviewRow)

    const favAlbum = Photos.getFavoritesAlbum()
    const videosAlbum = Photos.getVideosAlbum()
    const screenshotsAlbum = Photos.getScreenshotsAlbum()
    const selfiesAlbum = Photos.getSelfPortraitsAlbum()
    const livePhotosAlbum = Photos.getLivePhotosAlbum()
    const recentAlbum = Photos.getRecentlyAddedAlbum()
    const deletedAlbum = Photos.getRecentlyDeletedAlbum()

    const favCount = favAlbum ? favAlbum.count : 0
    const vidCount = videosAlbum ? videosAlbum.count : 0
    const ssCount = screenshotsAlbum ? screenshotsAlbum.count : 0
    const selfCount = selfiesAlbum ? selfiesAlbum.count : 0
    const liveCount = livePhotosAlbum ? livePhotosAlbum.count : 0
    const recentCount = recentAlbum ? recentAlbum.count : 0
    const deletedCount = deletedAlbum ? deletedAlbum.count : 0

    addDataRow(table, 'Recent (30d)', formattedCount(recentCount), Icon.calendar)
    addDataRow(table, 'Favorites', formattedCount(favCount), Icon.favorites)
    addDataRow(table, 'Videos', formattedCount(vidCount), Icon.videos)
    addDataRow(table, 'Screenshots', formattedCount(ssCount), Icon.screenshots)
    addDataRow(table, 'Selfies', formattedCount(selfCount), Icon.selfies)
    addDataRow(table, 'Live Photos', formattedCount(liveCount), Icon.livePhotos)
    addDataRow(table, 'Recently Deleted', formattedCount(deletedCount), Icon.delete)

    addDataRow(table, 'Photo Storage', estimateStorage(ssCount + selfCount + liveCount, false), Icon.storage)
    addDataRow(table, 'Video Storage', estimateStorage(vidCount, true), Icon.storage)

    addSectionRow(table, 'Smart Albums')

    const smartAlbums = [
      { name: '\u2B50  Favorites', getter: () => Photos.getFavoritesAlbum() },
      { name: '\uD83C\uDFAC  Videos', getter: () => Photos.getVideosAlbum() },
      { name: '\uD83D\uDDA5  Screenshots', getter: () => Photos.getScreenshotsAlbum() },
      { name: '\uD83E\uDD33  Selfies', getter: () => Photos.getSelfPortraitsAlbum() },
      { name: '\u2728  Live Photos', getter: () => Photos.getLivePhotosAlbum() },
      { name: '\uD83D\uDCE5  Recently Added', getter: () => Photos.getRecentlyAddedAlbum() },
      { name: '\uD83D\uDDD1  Recently Deleted', getter: () => Photos.getRecentlyDeletedAlbum() }
    ]

    for (let i = 0; i < smartAlbums.length; i++) {
      const entry = smartAlbums[i]
      const row = new UITableRow()
      row.onSelect = () => showSmartAlbum(entry.name, entry.getter)
      row.addText(entry.name)
      table.addRow(row)
    }

    const userAlbums = await Photos.getAllAlbums()
    if (userAlbums && userAlbums.length > 0) {
      addSectionRow(table, 'My Albums')
      for (let i = 0; i < userAlbums.length; i++) {
        const album = userAlbums[i]
        const row = new UITableRow()
        row.onSelect = () => showUserAlbum(album)
        row.addText(`\uD83D\uDCC1  ${album.title}`)
        const countCell = row.addText(formattedCount(album.count))
        countCell.rightAligned()
        countCell.titleColor = Theme.secondary
        table.addRow(row)
      }
    }

    return table
  } catch (error) {
    const errorTable = new UITable()
    const errorRow = new UITableRow()
    errorRow.addText(`Failed to load library: ${error.message}`)
    errorTable.addRow(errorRow)
    return errorTable
  }
}

async function run() {
  try {
    const dashboard = await buildDashboard()
    dashboard.present(false)
  } catch (error) {
    const alert = new Alert()
    alert.title = 'Photo Library Explorer'
    alert.message = `Failed to load: ${error.message}`
    alert.addAction('OK')
    await alert.presentAlert()
  }
}

await run()
