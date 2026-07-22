const colors = {
  darkBg: new Color('#0D0D12'),
  cardBg: new Color('#1A1A23'),
  accentGreen: new Color('#34C759'),
  accentRed: new Color('#FF3B30'),
  mutedText: new Color('#8E8E93'),
  white: new Color('#FFFFFF'),
  cardBorder: new Color('#2C2C3A'),
  gradientTop: new Color('#1A1A23'),
  gradientBottom: new Color('#0D0D12'),
  gold: new Color('#FFD700'),
  silver: new Color('#C0C0C0'),
  bronze: new Color('#CD7F32'),
}

async function fetchCryptoData() {
  try {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h'
    const req = new Request(url)
    req.timeoutInterval = 10
    const data = await req.loadJSON()
    return data
  } catch {
    return null
  }
}

function formatPrice(price) {
  if (price >= 1) {
    return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 })
}

function formatMarketCap(cap) {
  if (cap >= 1e12) return '$' + (cap / 1e12).toFixed(2) + 'T'
  if (cap >= 1e9) return '$' + (cap / 1e9).toFixed(2) + 'B'
  if (cap >= 1e6) return '$' + (cap / 1e6).toFixed(2) + 'M'
  return '$' + cap.toLocaleString()
}

function getRankBadge(rank) {
  if (rank === 1) return colors.gold
  if (rank === 2) return colors.silver
  if (rank === 3) return colors.bronze
  return colors.mutedText
}

function getChangeColor(change) {
  return change >= 0 ? colors.accentGreen : colors.accentRed
}

function getChangeIcon(change) {
  return change >= 0 ? 'arrow.up.right' : 'arrow.down.right'
}

function truncateText(text, maxLen) {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text
}

async function createSmallWidget(coins) {
  const widget = new ListWidget()
  widget.backgroundColor = colors.darkBg

  const gradient = new LinearGradient()
  gradient.locations = [0, 1]
  gradient.colors = [colors.gradientTop, colors.gradientBottom]
  widget.backgroundGradient = gradient

  const headerStack = widget.addStack()
  headerStack.layoutHorizontally()
  headerStack.centerAlignContent()

  const iconSymbol = SFSymbol.named('bitcoinsign.circle.fill')
  iconSymbol.applyFont(Font.mediumSystemFont(14))
  const iconElement = headerStack.addImage(iconSymbol.image)
  iconElement.imageSize = new Size(16, 16)
  iconElement.tintColor = colors.gold

  headerStack.addSpacer(6)

  const titleText = headerStack.addText('Top 10')
  titleText.font = Font.boldSystemFont(14)
  titleText.textColor = colors.white

  widget.addSpacer(8)

  const separator = widget.addStack()
  separator.layoutHorizontally()
  separator.backgroundColor = colors.cardBorder
  separator.addText('')
  separator.size = new Size(0, 1)
  widget.addSpacer(6)

  if (!coins || coins.length === 0) {
    const errText = widget.addText('No data')
    errText.font = Font.mediumSystemFont(12)
    errText.textColor = colors.mutedText
    errText.centerAlignText()
    return widget
  }

  const displayCoins = coins.slice(0, 4)

  for (const coin of displayCoins) {
    const row = widget.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()

    const rankColor = getRankBadge(coin.market_cap_rank)
    const rankText = row.addText('#' + coin.market_cap_rank)
    rankText.font = Font.boldSystemFont(11)
    rankText.textColor = rankColor
    rankText.minimumScaleFactor = 0.8

    row.addSpacer(6)

    const symbolText = row.addText(coin.symbol.toUpperCase())
    symbolText.font = Font.boldSystemFont(11)
    symbolText.textColor = colors.white
    symbolText.minimumScaleFactor = 0.8

    row.addSpacer(null)

    const changeColor = getChangeColor(coin.price_change_percentage_24h)
    const changeText = row.addText((coin.price_change_percentage_24h >= 0 ? '+' : '') + coin.price_change_percentage_24h.toFixed(1) + '%')
    changeText.font = Font.mediumSystemFont(11)
    changeText.textColor = changeColor
    changeText.minimumScaleFactor = 0.8

    widget.addSpacer(4)
  }

  widget.addSpacer(null)

  const footerText = widget.addText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  footerText.font = Font.regularFont(9)
  footerText.textColor = colors.mutedText
  footerText.centerAlignText()

  return widget
}

async function createMediumWidget(coins) {
  const widget = new ListWidget()
  widget.backgroundColor = colors.darkBg

  const gradient = new LinearGradient()
  gradient.locations = [0, 1]
  gradient.colors = [colors.gradientTop, colors.gradientBottom]
  widget.backgroundGradient = gradient

  widget.setPadding(14, 14, 10, 14)

  const headerStack = widget.addStack()
  headerStack.layoutHorizontally()
  headerStack.centerAlignContent()

  const iconSymbol = SFSymbol.named('chart.bar.fill')
  iconSymbol.applyFont(Font.mediumSystemFont(16))
  const iconElement = headerStack.addImage(iconSymbol.image)
  iconElement.imageSize = new Size(18, 18)
  iconElement.tintColor = colors.gold

  headerStack.addSpacer(8)

  const titleText = headerStack.addText('Crypto Dashboard')
  titleText.font = Font.boldSystemFont(16)
  titleText.textColor = colors.white

  headerStack.addSpacer(null)

  const updateText = headerStack.addText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  updateText.font = Font.regularFont(10)
  updateText.textColor = colors.mutedText

  widget.addSpacer(8)

  const separator = widget.addStack()
  separator.layoutHorizontally()
  separator.backgroundColor = colors.cardBorder
  separator.addText('')
  separator.size = new Size(0, 1)
  widget.addSpacer(6)

  if (!coins || coins.length === 0) {
    const errText = widget.addText('Unable to fetch crypto data. Check connection.')
    errText.font = Font.mediumSystemFont(12)
    errText.textColor = colors.mutedText
    errText.centerAlignText()
    return widget
  }

  const displayCoins = coins.slice(0, 7)

  const headerRow = widget.addStack()
  headerRow.layoutHorizontally()
  headerRow.centerAlignContent()

  const rankH = headerRow.addText('#')
  rankH.font = Font.mediumSystemFont(9)
  rankH.textColor = colors.mutedText
  rankH.minimumScaleFactor = 0.7

  headerRow.addSpacer(20)

  const nameH = headerRow.addText('Name')
  nameH.font = Font.mediumSystemFont(9)
  nameH.textColor = colors.mutedText
  nameH.minimumScaleFactor = 0.7

  headerRow.addSpacer(null)

  const priceH = headerRow.addText('Price')
  priceH.font = Font.mediumSystemFont(9)
  priceH.textColor = colors.mutedText
  priceH.minimumScaleFactor = 0.7
  priceH.size = new Size(55, 0)

  headerRow.addSpacer(8)

  const changeH = headerRow.addText('24h')
  changeH.font = Font.mediumSystemFont(9)
  changeH.textColor = colors.mutedText
  changeH.minimumScaleFactor = 0.7
  changeH.size = new Size(50, 0)

  widget.addSpacer(4)

  const sep2 = widget.addStack()
  sep2.layoutHorizontally()
  sep2.backgroundColor = colors.cardBorder
  sep2.addText('')
  sep2.size = new Size(0, 0.5)
  widget.addSpacer(4)

  for (const coin of displayCoins) {
    const row = widget.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()

    const rankColor = getRankBadge(coin.market_cap_rank)
    const rankText = row.addText('#' + coin.market_cap_rank)
    rankText.font = Font.boldSystemFont(11)
    rankText.textColor = rankColor
    rankText.minimumScaleFactor = 0.7
    rankText.size = new Size(26, 0)

    const nameStack = row.addStack()
    nameStack.layoutVertically()

    const nameText = nameStack.addText(truncateText(coin.name, 12))
    nameText.font = Font.boldSystemFont(11)
    nameText.textColor = colors.white
    nameText.minimumScaleFactor = 0.7

    row.addSpacer(null)

    const priceText = row.addText(formatPrice(coin.current_price))
    priceText.font = Font.boldSystemFont(11)
    priceText.textColor = colors.white
    priceText.minimumScaleFactor = 0.7
    priceText.size = new Size(62, 0)
    priceText.rightAlignText()

    row.addSpacer(6)

    const changeColor = getChangeColor(coin.price_change_percentage_24h)
    const changeText = row.addText((coin.price_change_percentage_24h >= 0 ? '+' : '') + coin.price_change_percentage_24h.toFixed(1) + '%')
    changeText.font = Font.boldSystemFont(11)
    changeText.textColor = changeColor
    changeText.minimumScaleFactor = 0.7
    changeText.size = new Size(52, 0)
    changeText.rightAlignText()

    row.addSpacer(2)

    const arrowSymbol = SFSymbol.named(getChangeIcon(coin.price_change_percentage_24h))
    arrowSymbol.applyFont(Font.mediumSystemFont(9))
    const arrowElement = row.addImage(arrowSymbol.image)
    arrowElement.imageSize = new Size(10, 10)
    arrowElement.tintColor = changeColor

    widget.addSpacer(4)
  }

  return widget
}

async function createLargeWidget(coins) {
  const widget = new ListWidget()
  widget.backgroundColor = colors.darkBg

  const gradient = new LinearGradient()
  gradient.locations = [0, 1]
  gradient.colors = [colors.gradientTop, colors.gradientBottom]
  widget.backgroundGradient = gradient

  widget.setPadding(16, 16, 14, 16)

  const headerStack = widget.addStack()
  headerStack.layoutHorizontally()
  headerStack.centerAlignContent()

  const iconSymbol = SFSymbol.named('bitcoinsign.circle.fill')
  iconSymbol.applyFont(Font.mediumSystemFont(20))
  const iconElement = headerStack.addImage(iconSymbol.image)
  iconElement.imageSize = new Size(22, 22)
  iconElement.tintColor = colors.gold

  headerStack.addSpacer(8)

  const titleText = headerStack.addText('Crypto Market Dashboard')
  titleText.font = Font.boldSystemFont(18)
  titleText.textColor = colors.white

  headerStack.addSpacer(null)

  const updateText = headerStack.addText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  updateText.font = Font.regularFont(10)
  updateText.textColor = colors.mutedText

  widget.addSpacer(10)

  const separator = widget.addStack()
  separator.layoutHorizontally()
  separator.backgroundColor = colors.cardBorder
  separator.addText('')
  separator.size = new Size(0, 1)
  widget.addSpacer(8)

  if (!coins || coins.length === 0) {
    const errText = widget.addText('Unable to fetch crypto data. Check your internet connection and try again.')
    errText.font = Font.mediumSystemFont(13)
    errText.textColor = colors.mutedText
    errText.centerAlignText()
    return widget
  }

  const displayCoins = coins.slice(0, 10)

  const headerRow = widget.addStack()
  headerRow.layoutHorizontally()
  headerRow.centerAlignContent()

  const rankH = headerRow.addText('Rank')
  rankH.font = Font.mediumSystemFont(9)
  rankH.textColor = colors.mutedText
  rankH.size = new Size(32, 0)

  const nameH = headerRow.addText('Name')
  nameH.font = Font.mediumSystemFont(9)
  nameH.textColor = colors.mutedText

  headerRow.addSpacer(null)

  const priceH = headerRow.addText('Price')
  priceH.font = Font.mediumSystemFont(9)
  priceH.textColor = colors.mutedText
  priceH.size = new Size(62, 0)
  priceH.rightAlignText()

  headerRow.addSpacer(6)

  const changeH = headerRow.addText('24h')
  changeH.font = Font.mediumSystemFont(9)
  changeH.textColor = colors.mutedText
  changeH.size = new Size(50, 0)
  changeH.rightAlignText()

  headerRow.addSpacer(6)

  const mcapH = headerRow.addText('Market Cap')
  mcapH.font = Font.mediumSystemFont(9)
  mcapH.textColor = colors.mutedText
  mcapH.size = new Size(70, 0)
  mcapH.rightAlignText()

  widget.addSpacer(4)

  const sep2 = widget.addStack()
  sep2.layoutHorizontally()
  sep2.backgroundColor = colors.cardBorder
  sep2.addText('')
  sep2.size = new Size(0, 0.5)
  widget.addSpacer(4)

  for (const coin of displayCoins) {
    const row = widget.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()

    const rankColor = getRankBadge(coin.market_cap_rank)
    const rankText = row.addText('#' + coin.market_cap_rank)
    rankText.font = Font.boldSystemFont(11)
    rankText.textColor = rankColor
    rankText.minimumScaleFactor = 0.7
    rankText.size = new Size(32, 0)

    const nameStack = row.addStack()
    nameStack.layoutVertically()

    const symbolLabel = nameStack.addText(coin.symbol.toUpperCase())
    symbolLabel.font = Font.boldSystemFont(11)
    symbolLabel.textColor = colors.white
    symbolLabel.minimumScaleFactor = 0.7

    row.addSpacer(null)

    const priceText = row.addText(formatPrice(coin.current_price))
    priceText.font = Font.boldSystemFont(11)
    priceText.textColor = colors.white
    priceText.minimumScaleFactor = 0.7
    priceText.size = new Size(62, 0)
    priceText.rightAlignText()

    row.addSpacer(6)

    const changeColor = getChangeColor(coin.price_change_percentage_24h)
    const changeText = row.addText((coin.price_change_percentage_24h >= 0 ? '+' : '') + coin.price_change_percentage_24h.toFixed(1) + '%')
    changeText.font = Font.boldSystemFont(11)
    changeText.textColor = changeColor
    changeText.minimumScaleFactor = 0.7
    changeText.size = new Size(50, 0)
    changeText.rightAlignText()

    row.addSpacer(6)

    const mcapText = row.addText(formatMarketCap(coin.market_cap))
    mcapText.font = Font.mediumSystemFont(10)
    mcapText.textColor = colors.mutedText
    mcapText.minimumScaleFactor = 0.7
    mcapText.size = new Size(70, 0)
    mcapText.rightAlignText()

    widget.addSpacer(3)
  }

  widget.addSpacer(4)

  const sourceRow = widget.addStack()
  sourceRow.layoutHorizontally()
  sourceRow.addSpacer(null)

  const sourceText = sourceRow.addText('CoinGecko')
  sourceText.font = Font.regularFont(8)
  sourceText.textColor = colors.mutedText

  return widget
}

async function createWidget() {
  const coins = await fetchCryptoData()

  switch (config.widgetFamily) {
    case 'small':
      return await createSmallWidget(coins)
    case 'medium':
      return await createMediumWidget(coins)
    case 'large':
    case 'extraLarge':
      return await createLargeWidget(coins)
    default:
      return await createMediumWidget(coins)
  }
}

const widget = await createWidget()
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}
Script.complete()
