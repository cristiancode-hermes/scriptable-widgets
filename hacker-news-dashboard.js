const CONFIG = {
  topStoriesUrl: "https://hacker-news.firebaseio.com/v0/topstories.json",
  itemUrl: "https://hacker-news.firebaseio.com/v0/item/",
  requestTimeout: 12,
  refreshMinutes: 15,
  smallCount: 3,
  mediumCount: 5,
  largeCount: 8,
};

const C = {
  bgTop: new Color("#101014"),
  bgBottom: new Color("#1a1a24"),
  surface: new Color("#ffffff", 0.06),
  card: new Color("#ffffff", 0.04),
  accent: new Color("#ff6600"),
  green: new Color("#22c55e"),
  red: new Color("#ef4444"),
  text: new Color("#e6e6ee"),
  dim: new Color("#9a9ab0"),
  muted: new Color("#5c5c72"),
  border: new Color("#ffffff", 0.08),
};

const PALETTES = [
  [["#101014", "#1a1a24"], "#ff6600"],
  [["#0d1117", "#161b22"], "#58a6ff"],
  [["#12101e", "#1e1a30"], "#a78bfa"],
  [["#0f1a14", "#16241c"], "#4ade80"],
];

function dailyHash() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  let h = ((seed >> 16) ^ seed) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return Math.abs(h);
}

function fmtCompact(n) {
  if (n == null) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function fmtRelative(epochSeconds) {
  const diff = Math.floor(Date.now() / 1000 - epochSeconds);
  if (diff < 60) return "now";
  if (diff < 3600) return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  if (diff < 172800) return "1d";
  return Math.floor(diff / 86400) + "d";
}

function fmtUpdated(date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function storyLink(story) {
  if (story.url) return story.url;
  return "https://news.ycombinator.com/item?id=" + story.id;
}

function truncateTitle(title, maxChars) {
  if (!title) return "Untitled";
  if (title.length <= maxChars) return title;
  return title.slice(0, maxChars - 1) + "…";
}

async function fetchJSON(url) {
  try {
    const req = new Request(url);
    req.timeoutInterval = CONFIG.requestTimeout;
    return await req.loadJSON();
  } catch (e) {
    return null;
  }
}

async function fetchTopStories() {
  const ids = await fetchJSON(CONFIG.topStoriesUrl);
  if (!Array.isArray(ids)) return [];
  const wanted = ids.slice(0, CONFIG.largeCount);
  const stories = await Promise.all(
    wanted.map((id) => fetchJSON(CONFIG.itemUrl + id + ".json"))
  );
  return stories.filter((s) => s && s.type === "story" && s.title);
}

function rankColor(rank) {
  if (rank === 1) return new Color("#ffd700");
  if (rank === 2) return new Color("#c0c0c0");
  if (rank === 3) return new Color("#cd7f32");
  return C.dim;
}

function addHeader(widget, palette) {
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const logo = row.addText("Y");
  logo.font = Font.boldSystemFont(20);
  logo.textColor = palette;
  logo.textShadowColor = palette;
  logo.textShadowRadius = 6;
  row.addSpacer(6);
  const title = row.addText("Hacker News");
  title.font = Font.boldSystemFont(14);
  title.textColor = C.text;
  row.addSpacer(null);
  const clock = row.addText(fmtUpdated(new Date()));
  clock.font = Font.systemFont(9);
  clock.textColor = C.muted;
  widget.addSpacer(8);
}

function addStoryRow(parent, story, rank, maxTitleChars, showMeta) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.topAlignContent();
  row.url = storyLink(story);
  row.backgroundColor = C.card;
  row.cornerRadius = 8;
  row.setPadding(6, 8, 6, 8);
  row.addSpacer(2);

  const badge = row.addStack();
  badge.layoutHorizontally();
  badge.centerAlignContent();
  badge.backgroundColor = rankColor(rank);
  badge.cornerRadius = 4;
  badge.setPadding(1, 5, 1, 5);
  const rankText = badge.addText(String(rank));
  rankText.font = Font.boldSystemFont(10);
  rankText.textColor = new Color("#101014");
  row.addSpacer(6);

  const info = row.addStack();
  info.layoutVertically();
  info.addSpacer(1);
  const titleText = info.addText(truncateTitle(story.title, maxTitleChars));
  titleText.font = Font.mediumSystemFont(10);
  titleText.textColor = C.text;
  if (showMeta) {
    info.addSpacer(2);
    const meta = info.addStack();
    meta.layoutHorizontally();
    const score = meta.addText("▲ " + fmtCompact(story.score));
    score.font = Font.systemFont(8);
    score.textColor = C.accent;
    meta.addSpacer(6);
    const comments = meta.addText("💬 " + fmtCompact(story.descendants || 0));
    comments.font = Font.systemFont(8);
    comments.textColor = C.dim;
    meta.addSpacer(6);
    const author = meta.addText(story.by || "?");
    author.font = Font.systemFont(8);
    author.textColor = C.muted;
    meta.addSpacer(6);
    const age = meta.addText(fmtRelative(story.time) + " ago");
    age.font = Font.systemFont(8);
    age.textColor = C.muted;
  }
  info.addSpacer(1);
  row.addSpacer(null);
}

function addFooter(widget, stories, updatedDate) {
  widget.addSpacer(4);
  const footer = widget.addStack();
  footer.layoutHorizontally();
  footer.centerAlignContent();
  const total = footer.addText("📰 " + stories.length + " top stories");
  total.font = Font.systemFont(8);
  total.textColor = C.muted;
  footer.addSpacer(null);
  const updated = footer.addText("Updated " + fmtUpdated(updatedDate));
  updated.font = Font.systemFont(8);
  updated.textColor = C.muted;
}

function buildSmallLayout(stories, palette, updatedDate) {
  const widget = new ListWidget();
  const bg = new LinearGradient();
  bg.colors = [palette[0][0], palette[0][1]];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
  widget.setPadding(12, 12, 10, 12);
  addHeader(widget, palette[1]);
  const slice = stories.slice(0, CONFIG.smallCount);
  for (let i = 0; i < slice.length; i++) {
    addStoryRow(widget, slice[i], i + 1, 42, false);
    if (i < slice.length - 1) widget.addSpacer(4);
  }
  widget.addSpacer(null);
  addFooter(widget, stories, updatedDate);
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function buildMediumLayout(stories, palette, updatedDate) {
  const widget = new ListWidget();
  const bg = new LinearGradient();
  bg.colors = [palette[0][0], palette[0][1]];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
  widget.setPadding(14, 14, 12, 14);
  addHeader(widget, palette[1]);
  const slice = stories.slice(0, CONFIG.mediumCount);
  for (let i = 0; i < slice.length; i++) {
    addStoryRow(widget, slice[i], i + 1, 56, true);
    if (i < slice.length - 1) widget.addSpacer(4);
  }
  widget.addSpacer(null);
  addFooter(widget, stories, updatedDate);
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function buildLargeLayout(stories, palette, updatedDate) {
  const widget = new ListWidget();
  const bg = new LinearGradient();
  bg.colors = [palette[0][0], palette[0][1]];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
  widget.setPadding(16, 16, 14, 16);
  addHeader(widget, palette[1]);
  const slice = stories.slice(0, CONFIG.largeCount);
  for (let i = 0; i < slice.length; i++) {
    addStoryRow(widget, slice[i], i + 1, 120, true);
    if (i < slice.length - 1) widget.addSpacer(5);
  }
  widget.addSpacer(null);
  addFooter(widget, stories, updatedDate);
  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60000);
  return widget;
}

function createErrorWidget() {
  const widget = new ListWidget();
  const bg = new LinearGradient();
  bg.colors = [new Color("#1a1a24"), new Color("#101014")];
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;
  widget.setPadding(14, 14, 14, 14);
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const icon = row.addText("⚠️");
  icon.font = Font.systemFont(16);
  row.addSpacer(6);
  const title = row.addText("No signal");
  title.font = Font.boldSystemFont(13);
  title.textColor = C.text;
  widget.addSpacer(6);
  const hint = widget.addText("Tap to retry");
  hint.font = Font.systemFont(10);
  hint.textColor = C.dim;
  widget.url = "scriptable:///open/" + encodeURIComponent(Script.name());
  widget.refreshAfterDate = new Date(Date.now() + 600000);
  return widget;
}

async function createWidget() {
  const palette = PALETTES[dailyHash() % PALETTES.length];
  const stories = await fetchTopStories();
  if (!stories.length) return createErrorWidget();
  const updatedDate = new Date();
  const family = config.widgetFamily;
  if (family === "small") return buildSmallLayout(stories, palette, updatedDate);
  if (family === "medium") return buildMediumLayout(stories, palette, updatedDate);
  return buildLargeLayout(stories, palette, updatedDate);
}

async function run() {
  try {
    const widget = await createWidget();
    Script.setWidget(widget);
  } catch (e) {
    Script.setWidget(createErrorWidget());
  }
  Script.complete();
}

await run();
