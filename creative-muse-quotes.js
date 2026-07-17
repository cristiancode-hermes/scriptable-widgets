const quotes = [
  { text: "Creativity is intelligence having fun", author: "Albert Einstein", symbol: "sparkles" },
  { text: "Every artist was first an amateur", author: "Ralph Waldo Emerson", symbol: "paintbrush" },
  { text: "Art enables us to find ourselves and lose ourselves at the same time", author: "Thomas Merton", symbol: "heart" },
  { text: "The purpose of art is washing the dust of daily life off our souls", author: "Pablo Picasso", symbol: "drop" },
  { text: "Creativity takes courage", author: "Henri Matisse", symbol: "flame" },
  { text: "Art is not what you see but what you make others see", author: "Edgar Degas", symbol: "eye" },
  { text: "Imagination is more important than knowledge", author: "Albert Einstein", symbol: "star" },
  { text: "The chief enemy of creativity is good sense", author: "Pablo Picasso", symbol: "bolt" },
  { text: "Art washes away from the soul the dust of everyday life", author: "Pablo Picasso", symbol: "cloud.rain" },
  { text: "Inspiration exists but it has to find you working", author: "Pablo Picasso", symbol: "pencil" },
  { text: "The world always seems brighter when creating something", author: "Unknown", symbol: "sun.max" },
  { text: "Art is the lie that enables us to realize the truth", author: "Pablo Picasso", symbol: "eye" },
  { text: "An artist cannot fail; it is a success to be one", author: "Charles Horton Cooley", symbol: "hand.thumbsup" },
  { text: "The only way to do great work is to love what you do", author: "Steve Jobs", symbol: "heart.fill" },
  { text: "Make the ordinary come alive", author: "William Martin", symbol: "wand.and.stars" },
  { text: "Every child is an artist", author: "Pablo Picasso", symbol: "figure.child" },
  { text: "Art is the stored honey of the human soul", author: "Theodore Dreiser", symbol: "heart.circle" },
  { text: "To practice any art is to make your soul grow", author: "Kurt Vonnegut", symbol: "leaf" },
  { text: "Art should comfort the disturbed and disturb the comfortable", author: "Banksy", symbol: "triangle" },
  { text: "Great things are done by a series of small things brought together", author: "Vincent Van Gogh", symbol: "square.on.square" },
  { text: "There is no must in art because art is free", author: "Wassily Kandinsky", symbol: "wind" },
  { text: "Art is not a handicraft it is the transmission of feeling", author: "Leo Tolstoy", symbol: "antenna.radiowaves.left.and.right" },
  { text: "Painting is poetry that is seen rather than felt", author: "Leonardo da Vinci", symbol: "paintpalette" },
  { text: "Art is the most intense mode of individualism", author: "Oscar Wilde", symbol: "person.fill" },
  { text: "Where the spirit does not work with the hand there is no art", author: "Leonardo da Vinci", symbol: "hand.raised" },
  { text: "Creativity is contagious pass it on", author: "Albert Einstein", symbol: "arrow.right" },
  { text: "The creative adult is the child who survived", author: "Ursula K. Le Guin", symbol: "figure.stand" },
  { text: "Art is freedom to express what others might not understand", author: "Unknown", symbol: "figure.wave" },
  { text: "Without art the earth is just eh", author: "Unknown", symbol: "globe" },
  { text: "Art speaks where words are unable to explain", author: "Threadless", symbol: "bubble.left" },
];

class CreativeMuseWidget {
  constructor() {
    this.family = config.widgetFamily || 'medium';
    this.quote = this.selectQuote();
    this.gradientColors = this.generateGradient();
  }

  selectQuote() {
    const hash = this.dailyHash();
    return quotes[hash % quotes.length];
  }

  dailyHash() {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    let hash = seed;
    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
    hash = (hash >> 16) ^ hash;
    return Math.abs(hash);
  }

  generateGradient() {
    const palettes = [
      [['#0f0c29', '#302b63', '#24243e'], ['#667eea', '#764ba2']],
      [['#1a1a2e', '#16213e', '#0f3460'], ['#e94560', '#533483']],
      [['#0d0d0d', '#1a1a2e', '#2d2d44'], ['#6c63ff', '#3f3d56']],
      [['#0a0a23', '#1a1a3e', '#2a2a55'], ['#ff6b6b', '#c44dff']],
      [['#121212', '#1e1e2f', '#2d2d3f'], ['#00d2ff', '#7b2ff7']],
      [['#0b0b1a', '#1a1a35', '#262650'], ['#f093fb', '#f5576c']],
      [['#0e0e1a', '#1c1c3a', '#282850'], ['#4facfe', '#00f2fe']],
      [['#0f0f24', '#1a1a3e', '#252560'], ['#fa709a', '#fee140']],
      [['#080818', '#141430', '#202048'], ['#a18cd1', '#fbc2eb']],
      [['#0c0c1e', '#181840', '#242460'], ['#f7971e', '#ffd200']],
    ];
    return palettes[this.dailyHash() % palettes.length];
  }

  async render() {
    const widget = new ListWidget();
    const [backgroundColors, accentColors] = this.gradientColors;

    const gradient = new LinearGradient();
    gradient.locations = [0.0, 0.5, 1.0];
    gradient.colors = backgroundColors.map(c => new Color(c));
    widget.backgroundGradient = gradient;

    const accent = new Color(accentColors[this.dailyHash() % accentColors.length]);

    if (this.family === 'small') {
      await this.renderSmall(widget, accent);
    } else if (this.family === 'medium') {
      await this.renderMedium(widget, accent);
    } else {
      await this.renderLarge(widget, accent);
    }

    widget.setPadding(16, 16, 16, 16);
    widget.refreshAfterDate = new Date(Date.now() + 3600000);
    return widget;
  }

  async renderSmall(widget, accent) {
    const symbolStack = widget.addStack();
    symbolStack.addSpacer();
    const symbol = SFSymbol.named(this.quote.symbol);
    symbol.applyFont(SFFont.systemFont(28));
    symbolStack.addImage(symbol.image);
    symbolStack.addSpacer();
    symbolStack.tintColor = accent;
    symbolStack.setPadding(8, 0, 4, 0);

    widget.addSpacer(8);

    const textStack = widget.addStack();
    textStack.layoutVertically();
    textStack.addSpacer();

    const quoteText = textStack.addText(this.truncateText(this.quote.text, 70));
    quoteText.font = Font.systemFont(13);
    quoteText.textColor = Color.white();
    quoteText.lineLimit = 5;

    textStack.addSpacer(6);

    const dashStack = textStack.addStack();
    const dash = dashStack.addText('—');
    dash.font = Font.systemFont(11);
    dash.textColor = accent;
    dashStack.addSpacer(2);
    const authorLabel = dashStack.addText(this.quote.author);
    authorLabel.font = Font.systemFont(11);
    authorLabel.textColor = new Color('rgba(255,255,255,0.6)');

    textStack.addSpacer();
  }

  async renderMedium(widget, accent) {
    const mainStack = widget.addStack();
    mainStack.layoutHorizontally();

    const iconStack = mainStack.addStack();
    iconStack.layoutVertically();
    iconStack.addSpacer();
    const symbol = SFSymbol.named(this.quote.symbol);
    symbol.applyFont(SFFont.systemFont(36));
    const img = iconStack.addImage(symbol.image);
    img.tintColor = accent;
    img.imageSize = new Size(36, 36);
    iconStack.addSpacer();
    iconStack.setPadding(0, 4, 0, 0);

    mainStack.addSpacer(16);

    const contentStack = mainStack.addStack();
    contentStack.layoutVertically();
    contentStack.addSpacer();

    const quoteText = contentStack.addText(this.quote.text);
    quoteText.font = Font.systemFont(17);
    quoteText.textColor = Color.white();
    quoteText.lineLimit = 6;

    contentStack.addSpacer(4);

    const lineStack = contentStack.addStack();
    const line = lineStack.addText('— ');
    line.font = Font.systemFont(12);
    line.textColor = accent;
    const authorLabel = lineStack.addText(this.quote.author);
    authorLabel.font = Font.systemFont(12);
    authorLabel.textColor = new Color('rgba(255,255,255,0.55)');

    contentStack.addSpacer();
    mainStack.addSpacer();
  }

  async renderLarge(widget, accent) {
    widget.addSpacer();

    const symbolStack = widget.addStack();
    symbolStack.addSpacer();
    const symbol = SFSymbol.named(this.quote.symbol);
    symbol.applyFont(SFFont.systemFont(48));
    const img = symbolStack.addImage(symbol.image);
    img.tintColor = accent;
    img.imageSize = new Size(48, 48);
    symbolStack.addSpacer();
    symbolStack.setPadding(8, 0, 16, 0);

    const quoteText = widget.addText(this.quote.text);
    quoteText.font = Font.systemFont(22);
    quoteText.textColor = Color.white();
    quoteText.lineLimit = 8;
    quoteText.centerAlignText();

    widget.addSpacer(12);

    const lineStack = widget.addStack();
    lineStack.addSpacer();
    const dash = lineStack.addText('— ');
    dash.font = Font.systemFont(14);
    dash.textColor = accent;
    const authorLabel = lineStack.addText(this.quote.author);
    authorLabel.font = Font.systemFont(14);
    authorLabel.textColor = new Color('rgba(255,255,255,0.5)');
    lineStack.addSpacer();

    widget.addSpacer(16);

    const subText = widget.addText('Tap to refresh • ' + this.getDayName());
    subText.font = Font.systemFont(11);
    subText.textColor = new Color('rgba(255,255,255,0.3)');
    subText.centerAlignText();

    widget.addSpacer();
  }

  truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength - 1) + '…' : text;
  }

  getDayName() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }
}

const muse = new CreativeMuseWidget();
const widget = await muse.render();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}
Script.complete();
