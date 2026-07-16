const AvatarPalette = [
  new Color('#FF453A'), new Color('#FF9F0A'), new Color('#30D158'),
  new Color('#0A84FF'), new Color('#BF5AF2'), new Color('#FF6482'),
  new Color('#FFD60A'), new Color('#64D2FF'), new Color('#5E5CE6'),
  new Color('#FF375F')
]

const Theme = {
  background: new Color('#1C1C1E'),
  card: new Color('#2C2C2E'),
  text: new Color('#FFFFFF'),
  secondary: new Color('#8E8E93'),
  accent: new Color('#0A84FF'),
  separator: new Color('#38383A')
}

function getDisplayName(contact) {
  const given = contact.givenName || ''
  const family = contact.familyName || ''
  const org = contact.organizationName || ''
  return given || family ? `${given} ${family}`.trim() : org || 'Unknown'
}

function getInitials(contact) {
  const first = (contact.givenName || '')[0] || ''
  const last = (contact.familyName || '')[0] || ''
  const org = (contact.organizationName || '')[0] || ''
  return (first + last || org).toUpperCase() || '?'
}

function pickAvatarColor(text) {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AvatarPalette[Math.abs(hash) % AvatarPalette.length]
}

function formatPostal(address) {
  return [address.street, address.city, address.state, address.zip, address.country]
    .filter(p => p).join(', ')
}

async function fetchContacts() {
  try {
    return await Contact.all([
      Contact.givenName, Contact.familyName, Contact.organizationName,
      Contact.phoneNumbers, Contact.emailAddresses, Contact.postalAddresses,
      Contact.urlAddresses
    ])
  } catch {
    const alert = new Alert()
    alert.title = 'Contacts Unavailable'
    alert.message = 'Grant contacts access in Settings to use this utility'
    alert.addAction('OK')
    await alert.present()
    return null
  }
}

async function presentContactTable(displayList, fullList) {
  const table = new UITable()
  table.showSeparators = false

  const headerRow = new UITableRow()
  headerRow.isHeader = true
  headerRow.addText('Contact Cards', `${displayList.length} contacts`)
  table.addRow(headerRow)

  const searchRow = new UITableRow()
  searchRow.backgroundColor = Theme.card
  searchRow.cellSpacing = 12
  const searchLabel = searchRow.addText('🔍  Search', 'Filter by name or organization')
  searchLabel.subtitleColor = Theme.secondary
  searchRow.onSelect = async () => {
    const alert = new Alert()
    alert.title = 'Search Contacts'
    alert.message = 'Type a name to search'
    alert.addTextField('', 'Search...')
    alert.addCancelAction('Cancel')
    alert.addAction('Search')
    const btn = await alert.present()
    if (btn === 1) {
      const query = alert.textFieldValue(0).toLowerCase().trim()
      if (query) {
        const filtered = fullList.filter(c => {
          const name = getDisplayName(c).toLowerCase()
          const org = (c.organizationName || '').toLowerCase()
          return name.includes(query) || org.includes(query)
        })
        await presentContactTable(filtered, fullList)
      } else {
        await presentContactTable(fullList, fullList)
      }
    }
  }
  table.addRow(searchRow)

  for (const contact of displayList) {
    const row = new UITableRow()
    row.backgroundColor = Theme.card
    row.cellSpacing = 12
    row.dismissOnSelect = false

    const name = getDisplayName(contact)
    const init = getInitials(contact)
    const phones = contact.phoneNumbers || []
    const emails = contact.emailAddresses || []

    let badge = ''
    if (phones.length > 0) badge += `📞 ${phones.length}`
    if (emails.length > 0) badge += badge ? `  ✉️ ${emails.length}` : `✉️ ${emails.length}`
    if (!badge) badge = 'No contact info'

    const initialCell = row.addText(init, '')
    initialCell.titleFont = Font.boldSystemFont(20)
    initialCell.titleColor = Color.white()
    initialCell.backgroundColor = pickAvatarColor(name)
    initialCell.width = 50
    initialCell.height = 50
    initialCell.cornerRadius = 25

    const infoCell = row.addText(name, badge)
    infoCell.titleFont = Font.boldSystemFont(17)
    infoCell.subtitleColor = Theme.secondary

    row.onSelect = async () => {
      await showContactActions(contact)
    }

    table.addRow(row)
  }

  if (displayList.length === 0) {
    const emptyRow = new UITableRow()
    emptyRow.addText('No results', 'Try a different search')
    table.addRow(emptyRow)
  }

  await table.present(true)
}

async function showContactActions(contact) {
  const name = getDisplayName(contact)
  const phones = contact.phoneNumbers || []
  const emails = contact.emailAddresses || []
  const addrs = contact.postalAddresses || []
  const urls = contact.urlAddresses || []

  const infoLines = []
  if (contact.organizationName) infoLines.push(`🏢 ${contact.organizationName}`)
  for (const p of phones) infoLines.push(`📞 ${p.label || 'phone'}: ${p.value}`)
  for (const e of emails) infoLines.push(`✉️ ${e.label || 'email'}: ${e.value}`)
  for (const a of addrs) infoLines.push(`📍 ${formatPostal(a.value)}`)
  for (const u of urls) infoLines.push(`🔗 ${u.value}`)

  const actions = []
  for (const p of phones) {
    actions.push({ label: `📞 Call ${p.label || 'phone'}`, handler: () => Phone.call(p.value) })
    actions.push({ label: `💬 Message ${p.label || 'phone'}`, handler: () => Messages.send({ recipients: [p.value], body: '' }) })
  }
  for (const e of emails) {
    actions.push({ label: `✉️ Email ${e.label || 'email'}`, handler: () => Mail.open({ to: e.value }) })
  }
  for (const a of addrs) {
    actions.push({ label: `📍 Open in Maps`, handler: () => Maps.search(formatPostal(a.value)) })
  }
  for (const u of urls) {
    actions.push({ label: `🔗 Open URL`, handler: () => Safari.open(u.value) })
  }
  actions.push({ label: '📤 Share Contact', handler: () => ShareSheet.open([name + '\n' + infoLines.join('\n')]) })

  const alert = new Alert()
  alert.title = name
  alert.message = infoLines.join('\n') || 'No contact information'

  if (actions.length > 0) {
    for (const a of actions) alert.addAction(a.label)
    alert.addCancelAction('Close')
    const tapped = await alert.presentSheet()
    if (tapped >= 0 && tapped < actions.length) {
      try {
        await actions[tapped].handler()
      } catch (error) {
        const errAlert = new Alert()
        errAlert.title = 'Error'
        errAlert.message = error.message || String(error)
        errAlert.addAction('OK')
        await errAlert.present()
      }
    }
  } else {
    alert.addAction('OK')
    await alert.present()
  }
}

async function main() {
  const contacts = await fetchContacts()
  if (contacts) {
    const sorted = contacts.sort((a, b) => {
      const aName = getDisplayName(a).toLowerCase()
      const bName = getDisplayName(b).toLowerCase()
      return aName.localeCompare(bName)
    })
    await presentContactTable(sorted, sorted)
  }
}

await main()
