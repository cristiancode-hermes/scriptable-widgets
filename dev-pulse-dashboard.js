const CONFIG = {
  refreshMinutes: 30,
  maxReposSmall: 3,
  maxReposMedium: 5,
  maxReposLarge: 8,
  npmPackages: ["react", "next", "vue", "express", "typescript", "angular", "svelte", "astro"],
  githubPerPage: 10,
};

function todayString() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

const C = {
  bg: new Color("#0a0a12"),
  surface: new Color("#14141f"),
  card: new Color("#1c1c2e"),
  accent: new Color("#5e5ce6"),
  green: new Color("#30d158"),
  red: new Color("#ff453a"),
  orange: new Color("#ff9f0a"),
  blue: new Color("#0a84ff"),
  purple: new Color("#bf5af2"),
  cyan: new Color("#64d2ff"),
  pink: new Color("#ff375f"),
  text: new Color("#ececf0"),
  dim: new Color("#9898aa"),
  muted: new Color("#5a5a6e"),
  ultra: new Color("#3a3a4e"),
  border: new Color("#ffffff", 0.06),
};

const LANG_COLORS = {
  JavaScript: new Color("#f0db4f"),
  TypeScript: new Color("#3178c6"),
  Python: new Color("#3572a5"),
  Rust: new Color("#dea584"),
  Go: new Color("#00add8"),
  Java: new Color("#b07219"),
  C: new Color("#555555"),
  "C++": new Color("#f34b7d"),
  HTML: new Color("#e34c26"),
  CSS: new Color("#563d7c"),
  Ruby: new Color("#701516"),
  Swift: new Color("#f05138"),
  Kotlin: new Color("#a97bff"),
  Dart: new Color("#00b4ab"),
  PHP: new Color("#4f5d95"),
  Shell: new Color("#89e051"),
  Scala: new Color("#c22d40"),
  Lua: new Color("#000080"),
};

function fmtCompact(n) {
  if (n == null) return "\u2014";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function fmtRelative(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

function buildQueryString(params) {
  return Object.entries(params).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
}

function langColor(language) {
  return LANG_COLORS[language] || new Color("#8e8e93");
}

function repoApiUrl() {
  const weekAgo = todayString();
  return "https://api.github.com/search/repositories?" + buildQueryString({
    q: "created:>" + weekAgo,
    sort: "stars",
    order: "desc",
    per_page: String(CONFIG.githubPerPage),
  });
}

function npmApiUrl() {
  return "https://api.npmjs.org/downloads/point/last-week/" + CONFIG.npmPackages.join(",");
}

function dailyHash() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  let h = ((seed >> 16) ^ seed) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return Math.abs(h);
}

const PALETTES = [
  [["#0a0a12", "#14141f", "#1a1a2e"], ["#5e5ce6", "#bf5af2"]],
  [["#0a0f1a", "#0f1a2e", "#142040"], ["#0a84ff", "#64d2ff"]],
  [["#0f0a1a", "#1a0f2e", "#241540"], ["#bf5af2", "#ff375f"]],
  [["#0a120a", "#0f1a0f", "#142414"], ["#30d158", "#64d2ff"]],
  [["#120a0a", "#1a0f0f", "#241515"], ["#ff9f0a", "#ff453a"]],
  [["#0a0a1a", "#0f0f24", "#151530"], ["#5e5ce6", "#0a84ff"]],
  [["#120a12", "#1a0f1a", "#241524"], ["#ff375f", "#ff9f0a"]],
];

function gradientForToday() {
  return PALETTES[dailyHash() % PALETTES.length];
}

function addRepoRow(stack, repo, index, width) {
  const row = stack.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = C.card;
  row.cornerRadius = 8;
  row.setPadding(6, 8, 6, 8);
  row.url = repo.html_url;

  const rankLabel = row.addText("#" + (index + 1));
  rankLabel.font = Font.boldSystemFont(9);
  rankLabel.textColor = C.dim;
  rankLabel.lineLimit = 1;
  row.addSpacer(4);

  const infoCol = row.addStack();
  infoCol.layoutVertically();

  const nameRow = infoCol.addStack();
  nameRow.layoutHorizontally();
  nameRow.centerAlignContent();
  const nameLabel = nameRow.addText(repo.name);
  nameLabel.font = Font.mediumSystemFont(10);
  nameLabel.textColor = C.text;
  nameLabel.lineLimit = 1;
  nameRow.addSpacer(4);
  if (repo.language) {
    const langDot = nameRow.addText("\u25CF");
    langDot.font = Font.systemFont(8);
    langDot.textColor = langColor(repo.language);
    nameRow.addSpacer(2);
    const langLabel = nameRow.addText(repo.language);
    langLabel.font = Font.systemFont(8);
    langLabel.textColor = C.dim;
    langLabel.lineLimit = 1;
  }

  const descLabel = infoCol.addStack().addText((repo.description || "").slice(0, width > 300 ? 80 : 40));
  descLabel.font = Font.systemFont(8);
  descLabel.textColor = C.muted;
  descLabel.lineLimit = 1;

  row.addSpacer(null);

  const starLabel = row.addText("\u2605 " + fmtCompact(repo.stargazers_count));
  starLabel.font = Font.boldSystemFont(9);
  starLabel.textColor = C.orange;
  starLabel.lineLimit = 1;
}

function addNpmRow(parent, name, downloads, barColor) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.setPadding(2, 0, 2, 0);

  const nameLabel = row.addText(name);
  nameLabel.font = Font.systemFont(8);
  nameLabel.textColor = C.dim;
  nameLabel.lineLimit = 1;
  nameLabel.minimumScaleFactor = 0.7;
  row.addSpacer(4);

  const barBg = row.addStack();
  barBg.backgroundColor = C.ultra;
  barBg.cornerRadius = 3;
  barBg.size = new Size(0, 6);

  const barFill = barBg.addStack();
  barFill.backgroundColor = barColor || C.accent;
  barFill.cornerRadius = 3;
  barFill.size = new Size(0, 6);
  barFill.addSpacer(100);

  barBg.addSpacer(null);
  row.addSpacer(4);

  const countLabel = row.addText(fmtCompact(downloads));
  countLabel.font = Font.boldSystemFont(8);
  countLabel.textColor = C.text;
  countLabel.lineLimit = 1;
}

function cardHeader(stack, emoji, title, rightText, titleColor) {
  const hRow = stack.addStack();
  hRow.layoutHorizontally();
  hRow.centerAlignContent();

  const emojiLabel = hRow.addText(emoji);
  emojiLabel.font = Font.systemFont(11);
  hRow.addSpacer(4);

  const titleLabel = hRow.addText(title);
  titleLabel.font = Font.boldSystemFont(10);
  titleLabel.textColor = titleColor || C.text;
  titleLabel.lineLimit = 1;

  if (rightText) {
    hRow.addSpacer(null);
    const rightLabel = hRow.addText(rightText);
    rightLabel.font = Font.systemFont(8);
    rightLabel.textColor = C.muted;
    rightLabel.lineLimit = 1;
  }
}

async function fetchTrendingRepos() {
  try {
    const url = repoApiUrl();
    const req = new Request(url);
    req.timeoutInterval = 10;
    req.headers = { "User-Agent": "Scriptable", "Accept": "application/vnd.github.v3+json" };
    const json = await req.loadJSON();
    return json.items || [];
  } catch {
    return [];
  }
}

async function fetchNpmDownloads() {
  try {
    const url = npmApiUrl();
    const req = new Request(url);
    req.timeoutInterval = 10;
    const json = await req.loadJSON();
    return json;
  } catch {
    return {};
  }
}

function buildSmallWidget(repos, npmData, updatedAt) {
  const w = new ListWidget();
  const [bgColors] = gradientForToday();
  const bg = new LinearGradient();
  bg.colors = bgColors.map(h => new Color(h));
  bg.locations = [0, 0.5, 1];
  w.backgroundGradient = bg;

  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const icon = header.addText("\u26A1");
  icon.font = Font.systemFont(12);
  header.addSpacer(4);
  const hLabel = header.addText("Dev Pulse");
  hLabel.font = Font.boldSystemFont(11);
  hLabel.textColor = C.text;

  w.addSpacer(6);

  const section = w.addStack();
  section.layoutVertically();

  const trending = repos.slice(0, CONFIG.maxReposSmall);
  trending.forEach((repo, i) => {
    addRepoRow(section, repo, i, 280);

    const truncated = repo.name.length > 18 ? repo.name.slice(0, 16) + "\u2026" : repo.name;
    const stars = fmtCompact(repo.stargazers_count);
    if (i < trending.length - 1) section.addSpacer(3);
  });

  w.addSpacer(null);

  const footer = w.addStack();
  footer.layoutHorizontally();
  const updatedLabel = footer.addText(fmtRelative(updatedAt));
  updatedLabel.font = Font.systemFont(8);
  updatedLabel.textColor = C.muted;
  updatedLabel.lineLimit = 1;

  footer.addSpacer(null);

  const totalLabel = footer.addText(repos.length + " trending");
  totalLabel.font = Font.systemFont(8);
  totalLabel.textColor = C.muted;
  totalLabel.lineLimit = 1;

  w.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return w;
}

function buildMediumWidget(repos, npmData, updatedAt) {
  const w = new ListWidget();
  const [bgColors] = gradientForToday();
  const bg = new LinearGradient();
  bg.colors = bgColors.map(h => new Color(h));
  bg.locations = [0, 0.5, 1];
  w.backgroundGradient = bg;

  cardHeader(w, "\u26A1", "Dev Pulse", fmtRelative(updatedAt));

  w.addSpacer(4);

  const repoCard = w.addStack();
  repoCard.layoutVertically();
  repoCard.backgroundColor = C.surface;
  repoCard.cornerRadius = 10;
  repoCard.setPadding(8, 10, 8, 10);

  const subHeader = repoCard.addStack();
  subHeader.layoutHorizontally();
  subHeader.centerAlignContent();
  const fireLabel = subHeader.addText("\U0001F525 Trending \u00B7 " + repos.length + " repos");
  fireLabel.font = Font.boldSystemFont(10);
  fireLabel.textColor = C.orange;
  subHeader.addSpacer(null);
  const weekLabel = subHeader.addText("this week");
  weekLabel.font = Font.systemFont(8);
  weekLabel.textColor = C.muted;

  repoCard.addSpacer(4);

  const trending = repos.slice(0, CONFIG.maxReposMedium);
  trending.forEach((repo, i) => {
    addRepoRow(repoCard, repo, i, 320);
    if (i < trending.length - 1) repoCard.addSpacer(3);
  });

  w.addSpacer(4);

  if (npmData && Object.keys(npmData).length > 0) {
    const npmCard = w.addStack();
    npmCard.layoutVertically();
    npmCard.backgroundColor = C.surface;
    npmCard.cornerRadius = 10;
    npmCard.setPadding(8, 10, 8, 10);

    cardHeader(npmCard, "\U0001F4E6", "npm Weekly Downloads");

    npmCard.addSpacer(4);

    const maxDownloads = Math.max(...Object.values(npmData).map(v => v?.downloads || 0));
    const bars = [
      { pkg: "React", key: "react", color: C.cyan },
      { pkg: "Next.js", key: "next", color: C.accent },
      { pkg: "TypeScript", key: "typescript", color: C.blue },
      { pkg: "Vue", key: "vue", color: C.green },
      { pkg: "Express", key: "express", color: C.orange },
      { pkg: "Svelte", key: "svelte", color: C.purple },
    ];

    bars.forEach(bar => {
      const data = npmData[bar.key];
      const downloads = data?.downloads || 0;
      const pct = maxDownloads > 0 ? downloads / maxDownloads : 0;
      addNpmRow(npmCard, bar.pkg, downloads, bar.color);
    });
  }

  w.addSpacer(null);

  const source = w.addStack();
  source.layoutHorizontally();
  const srcLabel = source.addText("\u2318 GitHub \u00B7 npm");
  srcLabel.font = Font.systemFont(7);
  srcLabel.textColor = C.ultra;

  w.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return w;
}

function buildLargeWidget(repos, npmData, updatedAt) {
  const w = new ListWidget();
  const [bgColors] = gradientForToday();
  const bg = new LinearGradient();
  bg.colors = bgColors.map(h => new Color(h));
  bg.locations = [0, 0.5, 1];
  w.backgroundGradient = bg;

  cardHeader(w, "\u26A1", "Developer Pulse", repos.length + " trending repos");

  w.addSpacer(4);

  const trending = repos.slice(0, CONFIG.maxReposLarge);
  const firstHalf = trending.slice(0, 4);
  const secondHalf = trending.slice(4);

  const colRow = w.addStack();
  colRow.layoutHorizontally();

  const leftCol = colRow.addStack();
  leftCol.layoutVertically();
  leftCol.size = new Size(0, 0);
  leftCol.backgroundColor = C.surface;
  leftCol.cornerRadius = 10;
  leftCol.setPadding(8, 8, 8, 8);

  firstHalf.forEach((repo, i) => {
    addRepoRow(leftCol, repo, i, 150);
    if (i < firstHalf.length - 1) leftCol.addSpacer(3);
  });

  colRow.addSpacer(4);

  const rightCol = colRow.addStack();
  rightCol.layoutVertically();
  rightCol.size = new Size(0, 0);
  rightCol.backgroundColor = C.surface;
  rightCol.cornerRadius = 10;
  rightCol.setPadding(8, 8, 8, 8);

  secondHalf.forEach((repo, i) => {
    addRepoRow(rightCol, repo, i + 4, 150);
    if (i < secondHalf.length - 1) rightCol.addSpacer(3);
  });

  w.addSpacer(4);

  const langCounts = {};
  repos.forEach(r => {
    if (r.language) {
      langCounts[r.language] = (langCounts[r.language] || 0) + 1;
    }
  });
  const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);

  const bottomRow = w.addStack();
  bottomRow.layoutHorizontally();

  if (npmData && Object.keys(npmData).length > 0) {
    const npmCard = bottomRow.addStack();
    npmCard.layoutVertically();
    npmCard.size = new Size(0, 0);
    npmCard.backgroundColor = C.surface;
    npmCard.cornerRadius = 10;
    npmCard.setPadding(6, 8, 6, 8);

    cardHeader(npmCard, "\U0001F4E6", "npm Weekly");

    npmCard.addSpacer(4);

    const maxDownloads = Math.max(...Object.values(npmData).map(v => v?.downloads || 0));
    const topPkgs = [
      { pkg: "React", key: "react", color: C.cyan },
      { pkg: "Next.js", key: "next", color: C.accent },
      { pkg: "TypeScript", key: "typescript", color: C.blue },
      { pkg: "Vue", key: "vue", color: C.green },
      { pkg: "Express", key: "express", color: C.orange },
      { pkg: "Angular", key: "angular", color: C.red },
    ];

    topPkgs.forEach(bar => {
      const data = npmData[bar.key];
      const downloads = data?.downloads || 0;
      addNpmRow(npmCard, bar.pkg, downloads, bar.color);
    });

    bottomRow.addSpacer(4);
  }

  if (sortedLangs.length > 0) {
    const langCard = bottomRow.addStack();
    langCard.layoutVertically();
    langCard.size = new Size(0, 0);
    langCard.backgroundColor = C.surface;
    langCard.cornerRadius = 10;
    langCard.setPadding(6, 8, 6, 8);

    cardHeader(langCard, "\U0001F30D", "Languages This Week");

    langCard.addSpacer(4);

    sortedLangs.slice(0, 6).forEach(([lang, count]) => {
      const lRow = langCard.addStack();
      lRow.layoutHorizontally();
      lRow.centerAlignContent();
      lRow.setPadding(1, 0, 1, 0);

      const dot = lRow.addText("\u25CF");
      dot.font = Font.systemFont(9);
      dot.textColor = langColor(lang);
      lRow.addSpacer(4);

      const nameLabel = lRow.addText(lang);
      nameLabel.font = Font.systemFont(8);
      nameLabel.textColor = C.dim;
      nameLabel.lineLimit = 1;

      lRow.addSpacer(null);

      const countLabel = lRow.addText(String(count));
      countLabel.font = Font.boldSystemFont(8);
      countLabel.textColor = C.text;
      countLabel.lineLimit = 1;
    });
  }

  w.addSpacer(null);

  const source = w.addStack();
  source.layoutHorizontally();
  const srcLabel = source.addText("GitHub \u00B7 npm   " + fmtRelative(updatedAt));
  srcLabel.font = Font.systemFont(7);
  srcLabel.textColor = C.ultra;

  w.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return w;
}

function createErrorWidget(message) {
  const w = new ListWidget();
  const bg = new LinearGradient();
  bg.colors = [new Color("#1a1a2e"), new Color("#0f0c29")];
  bg.locations = [0, 1];
  w.backgroundGradient = bg;

  w.addSpacer(null);
  const errorEmoji = w.addText("\u26A0\uFE0F");
  errorEmoji.font = Font.systemFont(24);
  errorEmoji.centerAlignText();
  w.addSpacer(4);
  const msg = w.addText(message || "Widget Error");
  msg.font = Font.systemFont(10);
  msg.textColor = C.dim;
  msg.centerAlignText();
  w.addSpacer(2);
  const retry = w.addText("Tap to retry");
  retry.font = Font.systemFont(8);
  retry.textColor = C.muted;
  retry.centerAlignText();
  w.addSpacer(null);

  w.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  w.refreshAfterDate = new Date(Date.now() + 600000);
  return w;
}

async function createWidget() {
  const family = config.widgetFamily || "medium";

  const [repos, npmData] = await Promise.all([
    fetchTrendingRepos().catch(() => []),
    fetchNpmDownloads().catch(() => ({})),
  ]);

  const updatedAt = new Date().toISOString();

  if (family === "small") {
    return buildSmallWidget(repos, npmData, updatedAt);
  }
  if (family === "large") {
    return buildLargeWidget(repos, npmData, updatedAt);
  }
  return buildMediumWidget(repos, npmData, updatedAt);
}

try {
  const widget = await createWidget();
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentMedium();
  }
} catch (e) {
  const errWidget = createErrorWidget("Dev Pulse Error");
  if (config.runsInWidget) {
    Script.setWidget(errWidget);
  } else {
    await errWidget.presentMedium();
  }
}
Script.complete();
