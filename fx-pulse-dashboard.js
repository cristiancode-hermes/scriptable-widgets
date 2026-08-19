const CONFIG = {
  baseCurrency: "EUR",
  refreshMinutes: 60,
  requestTimeout: 12,
  smallCount: 4,
  mediumCount: 8,
  largeCount: 12,
  priorityPairs: [
    "USD",
    "GBP",
    "CHF",
    "JPY",
    "CAD",
    "AUD",
    "CNY",
    "MXN",
    "BRL",
    "PLN",
    "SEK",
    "NOK",
    "INR",
    "KRW",
    "TRY",
    "SGD",
  ],
  frankfurterLatest: "https://api.frankfurter.dev/v1/latest",
  frankfurterHistorical: "https://api.frankfurter.dev/v1/",
};

const C = {
  bgTop: new Color("#0b1020"),
  bgBottom: new Color("#141a2e"),
  surface: new Color("#ffffff", 0.06),
  card: new Color("#ffffff", 0.045),
  accent: new Color("#5ac8fa"),
  green: new Color("#30d158"),
  red: new Color("#ff453a"),
  orange: new Color("#ff9f0a"),
  purple: new Color("#bf5af2"),
  gold: new Color("#ffd60a"),
  text: new Color("#eef0f8"),
  dim: new Color("#9aa3b8"),
  muted: new Color("#5e6780"),
  ultra: new Color("#3a4258"),
  border: new Color("#ffffff", 0.08),
};

const PALETTES = [
  [["#0b1020", "#141a2e"], "#5ac8fa"],
  [["#0d1117", "#161b22"], "#58a6ff"],
  [["#10141f", "#1a2238"], "#64d2ff"],
  [["#120f1e", "#1c1830"], "#bf5af2"],
  [["#0f1a14", "#16241c"], "#30d158"],
];

const CURRENCY_META = {
  USD: { flag: "🇺🇸", name: "Dólar US" },
  GBP: { flag: "🇬🇧", name: "Libra" },
  CHF: { flag: "🇨🇭", name: "Franco CH" },
  JPY: { flag: "🇯🇵", name: "Yen" },
  CAD: { flag: "🇨🇦", name: "Dólar CA" },
  AUD: { flag: "🇦🇺", name: "Dólar AU" },
  CNY: { flag: "🇨🇳", name: "Yuan" },
  MXN: { flag: "🇲🇽", name: "Peso MX" },
  BRL: { flag: "🇧🇷", name: "Real" },
  PLN: { flag: "🇵🇱", name: "Złoty" },
  SEK: { flag: "🇸🇪", name: "Corona SE" },
  NOK: { flag: "🇳🇴", name: "Corona NO" },
  INR: { flag: "🇮🇳", name: "Rupia" },
  KRW: { flag: "🇰🇷", name: "Won" },
  TRY: { flag: "🇹🇷", name: "Lira" },
  SGD: { flag: "🇸🇬", name: "Dólar SG" },
  DKK: { flag: "🇩🇰", name: "Corona DK" },
  CZK: { flag: "🇨🇿", name: "Corona CZ" },
  HKD: { flag: "🇭🇰", name: "Dólar HK" },
  NZD: { flag: "🇳🇿", name: "Dólar NZ" },
  ZAR: { flag: "🇿🇦", name: "Rand" },
  THB: { flag: "🇹🇭", name: "Baht" },
  ILS: { flag: "🇮🇱", name: "Shekel" },
  HUF: { flag: "🇭🇺", name: "Forinto" },
  RON: { flag: "🇷🇴", name: "Leu" },
  ISK: { flag: "🇮🇸", name: "Corona IS" },
  IDR: { flag: "🇮🇩", name: "Rupia ID" },
  MYR: { flag: "🇲🇾", name: "Ringgit" },
  PHP: { flag: "🇵🇭", name: "Peso PH" },
};

function dailyHash() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  let h = ((seed >> 16) ^ seed) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return Math.abs(h);
}

function isoDateDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function currencyMeta(code) {
  return CURRENCY_META[code] || { flag: "💱", name: code };
}

function formatRate(rate) {
  if (rate == null || Number.isNaN(rate)) return "—";
  const abs = Math.abs(rate);
  if (abs >= 1000) {
    return rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (abs >= 100) {
    return rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  }
  if (abs >= 1) {
    return rate.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  return rate.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 6 });
}

function formatChange(pct) {
  if (pct == null || Number.isNaN(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return sign + pct.toFixed(2) + "%";
}

function changeColor(pct) {
  if (pct == null || Number.isNaN(pct) || Math.abs(pct) < 0.005) return C.dim;
  return pct >= 0 ? C.green : C.red;
}

function changeArrow(pct) {
  if (pct == null || Number.isNaN(pct) || Math.abs(pct) < 0.005) return "→";
  return pct >= 0 ? "▲" : "▼";
}

function fmtUpdated(date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function fmtDateLabel(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + "T12:00:00Z");
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  } catch (e) {
    return iso;
  }
}

async function fetchJSON(url) {
  try {
    const req = new Request(url);
    req.timeoutInterval = CONFIG.requestTimeout;
    req.headers = { Accept: "application/json" };
    return await req.loadJSON();
  } catch (e) {
    return null;
  }
}

async function fetchLatestRates(base) {
  const url = CONFIG.frankfurterLatest + "?base=" + encodeURIComponent(base);
  const data = await fetchJSON(url);
  if (!data || !data.rates) return null;
  return {
    base: data.base || base,
    date: data.date || null,
    rates: data.rates,
  };
}

async function fetchPastRates(base, daysAgo) {
  const day = isoDateDaysAgo(daysAgo);
  const url = CONFIG.frankfurterHistorical + day + "?base=" + encodeURIComponent(base);
  const data = await fetchJSON(url);
  if (!data || !data.rates) return null;
  return {
    base: data.base || base,
    date: data.date || day,
    rates: data.rates,
  };
}

function buildPairRows(latest, pastWeek, pastDay) {
  if (!latest || !latest.rates) return [];
  const weekRates = (pastWeek && pastWeek.rates) || {};
  const dayRates = (pastDay && pastDay.rates) || {};
  const codes = CONFIG.priorityPairs.filter((code) => latest.rates[code] != null);
  const extras = Object.keys(latest.rates)
    .filter((code) => !codes.includes(code))
    .sort();
  const ordered = codes.concat(extras);
  return ordered.map((code) => {
    const rate = latest.rates[code];
    const weekBase = weekRates[code];
    const dayBase = dayRates[code];
    const weekChange =
      weekBase && weekBase !== 0 ? ((rate - weekBase) / weekBase) * 100 : null;
    const dayChange =
      dayBase && dayBase !== 0 ? ((rate - dayBase) / dayBase) * 100 : null;
    const meta = currencyMeta(code);
    return {
      code,
      name: meta.name,
      flag: meta.flag,
      rate,
      weekChange,
      dayChange,
    };
  });
}

function applyBackground(widget, palette) {
  const bg = new LinearGradient();
  bg.colors = [new Color(palette[0][0]), new Color(palette[0][1])];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
}

function addHeader(widget, accentHex, title, subtitle) {
  const accent = new Color(accentHex);
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const iconWrap = row.addStack();
  iconWrap.layoutHorizontally();
  iconWrap.centerAlignContent();
  iconWrap.backgroundColor = new Color(accentHex, 0.18);
  iconWrap.cornerRadius = 7;
  iconWrap.setPadding(4, 7, 4, 7);
  const icon = iconWrap.addText("€");
  icon.font = Font.boldSystemFont(14);
  icon.textColor = accent;

  row.addSpacer(8);
  const titles = row.addStack();
  titles.layoutVertically();
  const main = titles.addText(title);
  main.font = Font.boldSystemFont(13);
  main.textColor = C.text;
  if (subtitle) {
    titles.addSpacer(1);
    const sub = titles.addText(subtitle);
    sub.font = Font.systemFont(9);
    sub.textColor = C.dim;
  }
  row.addSpacer(null);
  const clock = row.addText(fmtUpdated(new Date()));
  clock.font = Font.mediumSystemFont(9);
  clock.textColor = C.muted;
  widget.addSpacer(8);
}

function addStatChip(parent, label, value, color) {
  const chip = parent.addStack();
  chip.layoutVertically();
  chip.backgroundColor = C.surface;
  chip.cornerRadius = 8;
  chip.setPadding(6, 8, 6, 8);
  const l = chip.addText(label);
  l.font = Font.systemFont(8);
  l.textColor = C.muted;
  chip.addSpacer(2);
  const v = chip.addText(value);
  v.font = Font.boldSystemFont(12);
  v.textColor = color || C.text;
  return chip;
}

function addPairRow(parent, pair, options) {
  const compact = options && options.compact;
  const showDay = options && options.showDay;
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = C.card;
  row.cornerRadius = 9;
  row.setPadding(compact ? 5 : 7, 8, compact ? 5 : 7, 8);
  row.url =
    "https://www.google.com/finance/quote/" +
    CONFIG.baseCurrency +
    "-" +
    pair.code;

  const flag = row.addText(pair.flag);
  flag.font = Font.systemFont(compact ? 12 : 14);
  row.addSpacer(6);

  const left = row.addStack();
  left.layoutVertically();
  const codeRow = left.addStack();
  codeRow.layoutHorizontally();
  codeRow.centerAlignContent();
  const code = codeRow.addText(pair.code);
  code.font = Font.boldSystemFont(compact ? 11 : 12);
  code.textColor = C.text;
  if (!compact) {
    codeRow.addSpacer(5);
    const name = codeRow.addText(pair.name);
    name.font = Font.systemFont(9);
    name.textColor = C.muted;
    name.lineLimit = 1;
  }
  if (!compact && showDay && pair.dayChange != null) {
    left.addSpacer(2);
    const dayLine = left.addText("24h " + formatChange(pair.dayChange));
    dayLine.font = Font.systemFont(8);
    dayLine.textColor = changeColor(pair.dayChange);
  }

  row.addSpacer(null);

  const right = row.addStack();
  right.layoutVertically();
  const rateText = right.addText(formatRate(pair.rate));
  rateText.font = Font.mediumSystemFont(compact ? 11 : 12);
  rateText.textColor = C.text;
  rateText.rightAlignText();
  right.addSpacer(2);
  const changeStack = right.addStack();
  changeStack.layoutHorizontally();
  changeStack.centerAlignContent();
  const arrow = changeStack.addText(changeArrow(pair.weekChange));
  arrow.font = Font.systemFont(8);
  arrow.textColor = changeColor(pair.weekChange);
  changeStack.addSpacer(3);
  const chg = changeStack.addText(formatChange(pair.weekChange));
  chg.font = Font.mediumSystemFont(9);
  chg.textColor = changeColor(pair.weekChange);
  return row;
}

function addMoversSection(widget, pairs, accent) {
  const sorted = pairs
    .filter((p) => p.weekChange != null && !Number.isNaN(p.weekChange))
    .slice()
    .sort((a, b) => b.weekChange - a.weekChange);
  if (!sorted.length) return;

  const gainers = sorted.filter((p) => p.weekChange > 0).slice(0, 3);
  const losers = sorted
    .filter((p) => p.weekChange < 0)
    .sort((a, b) => a.weekChange - b.weekChange)
    .slice(0, 3);

  const title = widget.addText("Movimientos 7d");
  title.font = Font.boldSystemFont(11);
  title.textColor = accent;
  widget.addSpacer(6);

  const cols = widget.addStack();
  cols.layoutHorizontally();

  const left = cols.addStack();
  left.layoutVertically();
  left.backgroundColor = C.surface;
  left.cornerRadius = 10;
  left.setPadding(8, 8, 8, 8);
  const upTitle = left.addText("▲ Fortalezas");
  upTitle.font = Font.boldSystemFont(9);
  upTitle.textColor = C.green;
  left.addSpacer(5);
  if (!gainers.length) {
    const empty = left.addText("Sin alzas");
    empty.font = Font.systemFont(9);
    empty.textColor = C.muted;
  } else {
    gainers.forEach((p, i) => {
      const line = left.addText(p.flag + " " + p.code + "  " + formatChange(p.weekChange));
      line.font = Font.mediumSystemFont(10);
      line.textColor = C.text;
      if (i < gainers.length - 1) left.addSpacer(3);
    });
  }

  cols.addSpacer(8);

  const right = cols.addStack();
  right.layoutVertically();
  right.backgroundColor = C.surface;
  right.cornerRadius = 10;
  right.setPadding(8, 8, 8, 8);
  const downTitle = right.addText("▼ Debilidades");
  downTitle.font = Font.boldSystemFont(9);
  downTitle.textColor = C.red;
  right.addSpacer(5);
  if (!losers.length) {
    const empty = right.addText("Sin bajas");
    empty.font = Font.systemFont(9);
    empty.textColor = C.muted;
  } else {
    losers.forEach((p, i) => {
      const line = right.addText(p.flag + " " + p.code + "  " + formatChange(p.weekChange));
      line.font = Font.mediumSystemFont(10);
      line.textColor = C.text;
      if (i < losers.length - 1) right.addSpacer(3);
    });
  }
}

function addFooter(widget, latestDate, pairCount) {
  widget.addSpacer(6);
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const src = footer.addText("BCE · Frankfurter");
  src.font = Font.systemFont(8);
  src.textColor = C.muted;
  footer.addSpacer(null);
  const meta = footer.addText(
    (latestDate ? fmtDateLabel(latestDate) + " · " : "") + pairCount + " pares"
  );
  meta.font = Font.systemFont(8);
  meta.textColor = C.muted;
}

function summarizeMoves(pairs) {
  const valid = pairs.filter((p) => p.weekChange != null && !Number.isNaN(p.weekChange));
  if (!valid.length) {
    return { up: 0, down: 0, flat: 0, top: null, bottom: null };
  }
  let up = 0;
  let down = 0;
  let flat = 0;
  let top = valid[0];
  let bottom = valid[0];
  valid.forEach((p) => {
    if (Math.abs(p.weekChange) < 0.005) flat += 1;
    else if (p.weekChange > 0) up += 1;
    else down += 1;
    if (p.weekChange > top.weekChange) top = p;
    if (p.weekChange < bottom.weekChange) bottom = p;
  });
  return { up, down, flat, top, bottom };
}

function buildSmallLayout(pairs, latest, palette) {
  const widget = new ListWidget();
  applyBackground(widget, palette);
  widget.setPadding(12, 12, 10, 12);
  addHeader(widget, palette[1], "FX Pulse", "1 " + CONFIG.baseCurrency);

  const slice = pairs.slice(0, CONFIG.smallCount);
  slice.forEach((pair, index) => {
    addPairRow(widget, pair, { compact: true, showDay: false });
    if (index < slice.length - 1) widget.addSpacer(4);
  });

  widget.addSpacer(null);
  addFooter(widget, latest.date, pairs.length);
  widget.url = "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html";
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function buildMediumLayout(pairs, latest, palette) {
  const widget = new ListWidget();
  applyBackground(widget, palette);
  widget.setPadding(14, 14, 12, 14);
  addHeader(
    widget,
    palette[1],
    "FX Pulse",
    "Base " + CONFIG.baseCurrency + " · cambio 7d"
  );

  const stats = summarizeMoves(pairs);
  const chips = widget.addStack();
  chips.layoutHorizontally();
  addStatChip(chips, "Al alza", String(stats.up), C.green);
  chips.addSpacer(6);
  addStatChip(chips, "A la baja", String(stats.down), C.red);
  chips.addSpacer(6);
  if (stats.top) {
    addStatChip(
      chips,
      "Top 7d",
      stats.top.code + " " + formatChange(stats.top.weekChange),
      C.green
    );
  }
  widget.addSpacer(8);

  const slice = pairs.slice(0, CONFIG.mediumCount);
  slice.forEach((pair, index) => {
    addPairRow(widget, pair, { compact: false, showDay: false });
    if (index < slice.length - 1) widget.addSpacer(4);
  });

  widget.addSpacer(null);
  addFooter(widget, latest.date, pairs.length);
  widget.url = "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html";
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function buildLargeLayout(pairs, latest, palette) {
  const widget = new ListWidget();
  applyBackground(widget, palette);
  widget.setPadding(16, 16, 14, 16);
  const accent = new Color(palette[1]);
  addHeader(
    widget,
    palette[1],
    "FX Pulse Dashboard",
    "Referencia BCE · 1 " + CONFIG.baseCurrency
  );

  const stats = summarizeMoves(pairs);
  const chips = widget.addStack();
  chips.layoutHorizontally();
  addStatChip(chips, "Al alza", String(stats.up), C.green);
  chips.addSpacer(6);
  addStatChip(chips, "A la baja", String(stats.down), C.red);
  chips.addSpacer(6);
  addStatChip(chips, "Estables", String(stats.flat), C.dim);
  chips.addSpacer(6);
  if (stats.bottom) {
    addStatChip(
      chips,
      "Peor 7d",
      stats.bottom.code + " " + formatChange(stats.bottom.weekChange),
      C.red
    );
  }
  widget.addSpacer(10);

  const body = widget.addStack();
  body.layoutHorizontally();

  const listCol = body.addStack();
  listCol.layoutVertically();
  const listTitle = listCol.addText("Pares prioritarios");
  listTitle.font = Font.boldSystemFont(11);
  listTitle.textColor = accent;
  listCol.addSpacer(6);
  const slice = pairs.slice(0, CONFIG.largeCount);
  slice.forEach((pair, index) => {
    addPairRow(listCol, pair, { compact: false, showDay: true });
    if (index < slice.length - 1) listCol.addSpacer(4);
  });

  body.addSpacer(10);

  const side = body.addStack();
  side.layoutVertically();
  addMoversSection(side, pairs, accent);
  side.addSpacer(10);

  const tipCard = side.addStack();
  tipCard.layoutVertically();
  tipCard.backgroundColor = C.surface;
  tipCard.cornerRadius = 10;
  tipCard.setPadding(8, 8, 8, 8);
  const tipTitle = tipCard.addText("Cómo leerlo");
  tipTitle.font = Font.boldSystemFont(9);
  tipTitle.textColor = C.dim;
  tipCard.addSpacer(4);
  const tipBody = tipCard.addText(
    "Tasa = unidades de divisa por 1 " +
      CONFIG.baseCurrency +
      ". ▲ verde: la divisa se debilita frente al euro (más unidades por €)."
  );
  tipBody.font = Font.systemFont(8);
  tipBody.textColor = C.muted;
  tipBody.lineLimit = 6;

  widget.addSpacer(null);
  addFooter(widget, latest.date, pairs.length);
  widget.url = "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html";
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function createErrorWidget(message) {
  const widget = new ListWidget();
  const bg = new LinearGradient();
  bg.colors = [new Color("#1a1a24"), new Color("#0b1020")];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
  widget.setPadding(14, 14, 14, 14);
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const icon = row.addText("⚠️");
  icon.font = Font.systemFont(16);
  row.addSpacer(6);
  const title = row.addText("FX Pulse");
  title.font = Font.boldSystemFont(13);
  title.textColor = C.text;
  widget.addSpacer(6);
  const body = widget.addText(message || "Sin datos de tipos de cambio");
  body.font = Font.systemFont(11);
  body.textColor = C.dim;
  widget.addSpacer(4);
  const hint = widget.addText("Toca para reintentar");
  hint.font = Font.systemFont(10);
  hint.textColor = C.muted;
  widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + 600000);
  return widget;
}

async function createWidget() {
  const palette = PALETTES[dailyHash() % PALETTES.length];
  const base = CONFIG.baseCurrency;
  const [latest, pastWeek, pastDay] = await Promise.all([
    fetchLatestRates(base),
    fetchPastRates(base, 7),
    fetchPastRates(base, 1),
  ]);

  if (!latest) return createErrorWidget("No se pudo contactar con Frankfurter");

  const pairs = buildPairRows(latest, pastWeek, pastDay);
  if (!pairs.length) return createErrorWidget("Respuesta sin pares de divisas");

  const family = config.widgetFamily;
  if (family === "small") return buildSmallLayout(pairs, latest, palette);
  if (family === "medium") return buildMediumLayout(pairs, latest, palette);
  return buildLargeLayout(pairs, latest, palette);
}

async function run() {
  try {
    const widget = await createWidget();
    if (config.runsInWidget) {
      Script.setWidget(widget);
    } else {
      Script.setWidget(widget);
      await widget.presentLarge();
    }
  } catch (e) {
    const errWidget = createErrorWidget(e && e.message ? e.message : "Error inesperado");
    Script.setWidget(errWidget);
    if (!config.runsInWidget) {
      try {
        await errWidget.presentMedium();
      } catch (presentError) {}
    }
  }
  Script.complete();
}

await run();
