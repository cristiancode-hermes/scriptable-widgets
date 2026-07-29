const CONFIG = {
  username: "cristiancode-hermes",
  cacheMinutes: 15,
  maxReposSmall: 0,
  maxReposMedium: 3,
  maxReposLarge: 5,
  maxEventsLarge: 4,
};

const C = {
  background: new Color("#0d0d14"),
  surface: new Color("#16161f"),
  card: new Color("#1c1c2a"),
  cardAlt: new Color("#23233a"),
  border: new Color("#ffffff", 0.05),

  accent: new Color("#58a6ff"),
  green: new Color("#3fb950"),
  orange: new Color("#d29922"),
  red: new Color("#f85149"),
  purple: new Color("#bc8cff"),
  pink: new Color("#db61a2"),

  text: new Color("#e6e6f0"),
  dim: new Color("#8b949e"),
  muted: new Color("#484f58"),
  ultraMuted: new Color("#30363d"),
};

function fmtCompact(n) {
  if (n == null) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function fmtRelative(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 172800) return "yesterday";
  return Math.floor(diff / 86400) + "d ago";
}

function eventIcon(type) {
  if (type === "PushEvent") return "arrow.up.circle.fill";
  if (type === "CreateEvent") return "plus.circle.fill";
  if (type === "IssuesEvent") return "ant.fill";
  if (type === "PullRequestEvent") return "arrow.triangle.merge";
  if (type === "ForkEvent") return "arrow.triangle.branch";
  if (type === "WatchEvent") return "star.fill";
  if (type === "IssueCommentEvent") return "bubble.left.fill";
  if (type === "ReleaseEvent") return "tag.fill";
  return "circle.fill";
}

function eventColor(type) {
  if (type === "PushEvent") return C.accent;
  if (type === "CreateEvent") return C.green;
  if (type === "IssuesEvent") return C.green;
  if (type === "PullRequestEvent") return C.purple;
  if (type === "ForkEvent") return C.dim;
  if (type === "WatchEvent") return C.orange;
  if (type === "IssueCommentEvent") return C.accent;
  if (type === "ReleaseEvent") return C.green;
  return C.muted;
}

function eventSummary(event) {
  const repo = event.repo.name.split("/")[1] || event.repo.name;
  switch (event.type) {
    case "PushEvent":
      return "Pushed to " + repo;
    case "CreateEvent":
      return "Created " + (event.payload.ref_type || "repo") + " in " + repo;
    case "IssuesEvent":
      return (event.payload.action || "opened") + " issue in " + repo;
    case "PullRequestEvent":
      return (event.payload.action || "opened") + " PR in " + repo;
    case "ForkEvent":
      return "Forked " + repo;
    case "WatchEvent":
      return "Starred " + repo;
    case "IssueCommentEvent":
      return "Commented on issue in " + repo;
    case "ReleaseEvent":
      return "Released in " + repo;
    default:
      return event.type + " in " + repo;
  }
}

async function fetchJSON(url) {
  const req = new Request(url);
  req.timeoutInterval = 8;
  const resp = await req.loadJSON();
  return resp;
}

async function fetchProfile(username) {
  return fetchJSON("https://api.github.com/users/" + encodeURIComponent(username));
}

async function fetchRepos(username, perPage) {
  const url = "https://api.github.com/users/" + encodeURIComponent(username) + "/repos?sort=stars&per_page=" + perPage + "&type=owner";
  const data = await fetchJSON(url);
  return data;
}

async function fetchEvents(username) {
  const url = "https://api.github.com/users/" + encodeURIComponent(username) + "/events/public?per_page=10";
  const data = await fetchJSON(url);
  return data;
}

async function fetchStarCount(username) {
  const repos = await fetchRepos(username, 100);
  return repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
}

async function createWidget() {
  try {
    const family = config.widgetFamily || "medium";
    const username = CONFIG.username;

    const [profile, repos, events] = await Promise.all([
      fetchProfile(username),
      fetchRepos(username, Math.max(CONFIG.maxReposLarge, CONFIG.maxReposMedium)),
      family === "large" ? fetchEvents(username) : Promise.resolve([]),
    ]);

    if (!profile || profile.message) {
      return await createErrorWidget("User not found: " + username);
    }

    const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
    const sortedRepos = (repos || []).sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
    const recentEvents = (events || []).filter(e => e.type && e.repo).slice(0, CONFIG.maxEventsLarge);

    const widget = new ListWidget();
    widget.backgroundColor = C.background;

    const bgGradient = new LinearGradient();
    bgGradient.colors = [new Color("#0d0d14"), new Color("#111120")];
    bgGradient.locations = [0, 1];
    widget.backgroundGradient = bgGradient;

    const headerStack = widget.addStack();
    headerStack.layoutHorizontally();
    headerStack.centerAlignContent();
    headerStack.setPadding(12, 14, 0, 14);

    const iconText = headerStack.addText("◉");
    iconText.font = Font.boldSystemFont(18);
    iconText.textColor = C.accent;

    headerStack.addSpacer(8);

    const titleText = headerStack.addText("GitHub Pulse");
    titleText.font = Font.boldSystemFont(16);
    titleText.textColor = C.text;

    headerStack.addSpacer(null);

    const usernameText = headerStack.addText("@" + username.split("/")[0].slice(0, 18));
    usernameText.font = Font.systemFont(11);
    usernameText.textColor = C.dim;

    widget.addSpacer(8);

    const divider = widget.addText("─".repeat(50));
    divider.font = Font.systemFont(8);
    divider.textColor = C.ultraMuted;
    divider.centerAlignText();

    widget.addSpacer(8);

    if (family === "small") {
      await buildSmallLayout(widget, profile, totalStars, sortedRepos);
    } else if (family === "medium") {
      await buildMediumLayout(widget, profile, totalStars, sortedRepos);
    } else {
      await buildLargeLayout(widget, profile, totalStars, sortedRepos, recentEvents);
    }

    widget.addSpacer(6);

    const footerDivider = widget.addText("─".repeat(50));
    footerDivider.font = Font.systemFont(8);
    footerDivider.textColor = C.ultraMuted;
    footerDivider.centerAlignText();

    const updateStack = widget.addStack();
    updateStack.layoutHorizontally();
    updateStack.setPadding(4, 14, 10, 14);

    const updateLabel = updateStack.addText("Updated " + fmtRelative(new Date().toISOString()));
    updateLabel.font = Font.systemFont(9);
    updateLabel.textColor = C.ultraMuted;

    updateStack.addSpacer(null);

    const refreshLabel = updateStack.addText("↻");
    refreshLabel.font = Font.systemFont(12);
    refreshLabel.textColor = C.muted;

    return widget;
  } catch (err) {
    return await createErrorWidget(err.message || "Unknown error");
  }
}

async function buildSmallLayout(widget, profile, totalStars, repos) {
  const avatarUrl = profile.avatar_url;

  const avatarStack = widget.addStack();
  avatarStack.layoutHorizontally();
  avatarStack.centerAlignContent();
  avatarStack.setPadding(0, 10, 0, 10);
  avatarStack.addSpacer(null);

  const avatarText = avatarStack.addText("◉");
  avatarText.font = Font.boldSystemFont(36);
  avatarText.textColor = C.accent;

  avatarStack.addSpacer(null);

  widget.addSpacer(6);

  const nameStack = widget.addStack();
  nameStack.layoutHorizontally();
  nameStack.centerAlignContent();
  nameStack.setPadding(0, 10, 0, 10);
  nameStack.addSpacer(null);

  const nameLabel = nameStack.addText(profile.name || profile.login);
  nameLabel.font = Font.boldSystemFont(13);
  nameLabel.textColor = C.text;
  nameLabel.lineLimit = 1;

  nameStack.addSpacer(null);

  widget.addSpacer(4);

  const bioText = widget.addText((profile.bio || "").slice(0, 60));
  bioText.font = Font.systemFont(9);
  bioText.textColor = C.dim;
  bioText.lineLimit = 2;
  bioText.centerAlignText();

  widget.addSpacer(8);

  const statsGrid = widget.addStack();
  statsGrid.layoutHorizontally();
  statsGrid.setPadding(0, 10, 0, 10);

  const items = [
    { label: "Repos", value: fmtCompact(profile.public_repos), color: C.accent },
    { label: "Stars", value: fmtCompact(totalStars), color: C.orange },
    { label: "Fol.", value: fmtCompact(profile.followers), color: C.green },
  ];

  for (let i = 0; i < items.length; i++) {
    if (i > 0) {
      statsGrid.addSpacer(4);
    }
    const itemStack = statsGrid.addStack();
    itemStack.layoutVertically();
    itemStack.backgroundColor = C.card;
    itemStack.cornerRadius = 8;
    itemStack.setPadding(6, 8, 6, 8);
    itemStack.addSpacer(null);

    const valLabel = itemStack.addText(items[i].value);
    valLabel.font = Font.boldSystemFont(14);
    valLabel.textColor = items[i].color;
    valLabel.centerAlignText();

    itemStack.addSpacer(2);

    const keyLabel = itemStack.addText(items[i].label);
    keyLabel.font = Font.systemFont(8);
    keyLabel.textColor = C.muted;
    keyLabel.centerAlignText();

    itemStack.addSpacer(null);
  }
}

async function buildMediumLayout(widget, profile, totalStars, repos) {
  const topRow = widget.addStack();
  topRow.layoutHorizontally();
  topRow.setPadding(0, 14, 0, 14);
  topRow.centerAlignContent();

  const avatarSymbol = topRow.addText("◉");
  avatarSymbol.font = Font.boldSystemFont(32);
  avatarSymbol.textColor = C.accent;

  topRow.addSpacer(12);

  const infoCol = topRow.addStack();
  infoCol.layoutVertically();

  const nameLabel = infoCol.addText(profile.name || profile.login);
  nameLabel.font = Font.boldSystemFont(15);
  nameLabel.textColor = C.text;
  nameLabel.lineLimit = 1;

  infoCol.addSpacer(2);

  const bioLabel = infoCol.addText((profile.bio || "").slice(0, 90));
  bioLabel.font = Font.systemFont(9);
  bioLabel.textColor = C.dim;
  bioLabel.lineLimit = 2;

  infoCol.addSpacer(4);

  const statRow = infoCol.addStack();
  statRow.layoutHorizontally();
  statRow.spacing = 12;

  const statData = [
    { label: "Repos", value: fmtCompact(profile.public_repos), color: C.accent },
    { label: "Stars", value: fmtCompact(totalStars), color: C.orange },
    { label: "Followers", value: fmtCompact(profile.followers), color: C.green },
    { label: "Following", value: fmtCompact(profile.following), color: C.purple },
  ];

  for (const s of statData) {
    const col = statRow.addStack();
    col.layoutVertically();
    const val = col.addText(s.value);
    val.font = Font.boldSystemFont(12);
    val.textColor = s.color;
    const lab = col.addText(s.label);
    lab.font = Font.systemFont(7);
    lab.textColor = C.muted;
  }

  widget.addSpacer(10);

  const reposHeader = widget.addStack();
  reposHeader.layoutHorizontally();
  reposHeader.setPadding(0, 14, 0, 14);

  const reposTitle = reposHeader.addText("⭐ Top Repos");
  reposTitle.font = Font.boldSystemFont(11);
  reposTitle.textColor = C.dim;

  widget.addSpacer(6);

  const maxRepos = CONFIG.maxReposMedium;
  const topRepos = (repos || []).slice(0, maxRepos);

  for (const repo of topRepos) {
    const repoRow = widget.addStack();
    repoRow.layoutHorizontally();
    repoRow.setPadding(3, 14, 3, 14);
    repoRow.backgroundColor = C.card;
    repoRow.cornerRadius = 6;

    const repoName = repoRow.addText(repo.name.slice(0, 24));
    repoName.font = Font.systemFont(11);
    repoName.textColor = C.accent;
    repoName.lineLimit = 1;

    repoRow.addSpacer(null);

    const starCount = repoRow.addText(fmtCompact(repo.stargazers_count || 0) + " ⭐");
    starCount.font = Font.systemFont(10);
    starCount.textColor = C.orange;

    widget.addSpacer(4);
  }

  if (topRepos.length === 0) {
    const emptyText = widget.addText("No repositories found");
    emptyText.font = Font.systemFont(10);
    emptyText.textColor = C.muted;
    emptyText.centerAlignText();
  }
}

async function buildLargeLayout(widget, profile, totalStars, repos, events) {
  const topRow = widget.addStack();
  topRow.layoutHorizontally();
  topRow.setPadding(0, 14, 0, 14);
  topRow.centerAlignContent();

  const avatarSymbol = topRow.addText("◉");
  avatarSymbol.font = Font.boldSystemFont(40);
  avatarSymbol.textColor = C.accent;

  topRow.addSpacer(14);

  const infoCol = topRow.addStack();
  infoCol.layoutVertically();

  const nameLabel = infoCol.addText(profile.name || profile.login);
  nameLabel.font = Font.boldSystemFont(17);
  nameLabel.textColor = C.text;
  nameLabel.lineLimit = 1;

  infoCol.addSpacer(2);

  const loginLabel = infoCol.addText("@" + profile.login);
  loginLabel.font = Font.systemFont(10);
  loginLabel.textColor = C.dim;

  infoCol.addSpacer(2);

  const bioLabel = infoCol.addText((profile.bio || "").slice(0, 120));
  bioLabel.font = Font.systemFont(9);
  bioLabel.textColor = C.dim;
  bioLabel.lineLimit = 2;

  infoCol.addSpacer(4);

  const statRow = infoCol.addStack();
  statRow.layoutHorizontally();
  statRow.spacing = 14;

  const statData = [
    { label: "Repos", value: fmtCompact(profile.public_repos), color: C.accent },
    { label: "Stars", value: fmtCompact(totalStars), color: C.orange },
    { label: "Followers", value: fmtCompact(profile.followers), color: C.green },
    { label: "Following", value: fmtCompact(profile.following), color: C.purple },
    { label: "Gists", value: fmtCompact(profile.public_gists), color: C.pink },
  ];

  for (const s of statData) {
    const col = statRow.addStack();
    col.layoutVertically();
    const val = col.addText(s.value);
    val.font = Font.boldSystemFont(11);
    val.textColor = s.color;
    const lab = col.addText(s.label);
    lab.font = Font.systemFont(7);
    lab.textColor = C.muted;
  }

  widget.addSpacer(10);

  const sectionsRow = widget.addStack();
  sectionsRow.layoutHorizontally();

  const leftCol = sectionsRow.addStack();
  leftCol.layoutVertically();
  leftCol.setPadding(0, 14, 0, 0);

  const leftHeader = leftCol.addText("⭐ Top Repos");
  leftHeader.font = Font.boldSystemFont(10);
  leftHeader.textColor = C.dim;

  leftCol.addSpacer(4);

  const maxRepos = CONFIG.maxReposLarge;
  const topRepos = (repos || []).slice(0, maxRepos);

  for (const repo of topRepos) {
    const repoRow = leftCol.addStack();
    repoRow.layoutHorizontally();
    repoRow.setPadding(3, 8, 3, 8);
    repoRow.backgroundColor = C.card;
    repoRow.cornerRadius = 6;

    const nameCol = repoRow.addStack();
    nameCol.layoutVertically();

    const rName = nameCol.addText(repo.name.slice(0, 22));
    rName.font = Font.systemFont(10);
    rName.textColor = C.accent;
    rName.lineLimit = 1;

    if (repo.description) {
      const rDesc = nameCol.addText(repo.description.slice(0, 40));
      rDesc.font = Font.systemFont(7);
      rDesc.textColor = C.muted;
      rDesc.lineLimit = 1;
    }

    repoRow.addSpacer(null);

    const starCol = repoRow.addStack();
    starCol.layoutVertically();
    starCol.centerAlignContent();

    const starVal = starCol.addText(fmtCompact(repo.stargazers_count || 0));
    starVal.font = Font.boldSystemFont(10);
    starVal.textColor = C.orange;
    starVal.centerAlignText();

    const starLab = starCol.addText("⭐");
    starLab.font = Font.systemFont(7);
    starLab.textColor = C.muted;
    starLab.centerAlignText();

    leftCol.addSpacer(4);
  }

  sectionsRow.addSpacer(8);

  const rightCol = sectionsRow.addStack();
  rightCol.layoutVertically();
  rightCol.setPadding(0, 0, 0, 14);

  const rightHeader = rightCol.addText("⚡ Recent Activity");
  rightHeader.font = Font.boldSystemFont(10);
  rightHeader.textColor = C.dim;

  rightCol.addSpacer(4);

  const filteredEvents = events;

  for (const event of filteredEvents) {
    const eventRow = rightCol.addStack();
    eventRow.layoutHorizontally();
    eventRow.setPadding(3, 8, 3, 8);
    eventRow.backgroundColor = C.card;
    eventRow.cornerRadius = 6;

    const iconStack = eventRow.addStack();
    iconStack.setPadding(0, 0, 0, 6);

    const dotLabel = iconStack.addText("●");
    dotLabel.font = Font.systemFont(8);
    dotLabel.textColor = eventColor(event.type);

    const eventCol = eventRow.addStack();
    eventCol.layoutVertically();

    const eventSummary = eventCol.addText(summarizeEvent(event, profile.login));
    eventSummary.font = Font.systemFont(9);
    eventSummary.textColor = C.text;
    eventSummary.lineLimit = 1;

    eventCol.addSpacer(1);

    const timeLabel = eventCol.addText(fmtRelative(event.created_at));
    timeLabel.font = Font.systemFont(7);
    timeLabel.textColor = C.muted;

    rightCol.addSpacer(4);
  }

  if (filteredEvents.length === 0) {
    const emptyText = rightCol.addText("No recent activity");
    emptyText.font = Font.systemFont(9);
    emptyText.textColor = C.muted;
  }
}

function summarizeEvent(event, username) {
  const repo = event.repo.name.replace(username + "/", "");
  switch (event.type) {
    case "PushEvent":
      return "Pushed " + (event.payload.commits || []).length + " commit" + ((event.payload.commits || []).length !== 1 ? "s" : "") + " → " + repo;
    case "CreateEvent":
      return "Created " + (event.payload.ref_type || "repo") + " → " + repo;
    case "IssuesEvent":
      return (event.payload.action || "Opened") + " issue → " + repo;
    case "PullRequestEvent":
      return (event.payload.action || "Opened") + " PR → " + repo;
    case "ForkEvent":
      return "Forked → " + repo;
    case "WatchEvent":
      return "Starred → " + repo;
    case "IssueCommentEvent":
      return "Commented on issue in " + repo;
    case "ReleaseEvent":
      return "Released → " + repo;
    default:
      return (event.type || "Event").replace("Event", "") + " → " + repo;
  }
}

async function createErrorWidget(message) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1a0a0a");

  const gradient = new LinearGradient();
  gradient.colors = [new Color("#1a0a0a"), new Color("#0d0d14")];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;

  widget.addSpacer(null);

  const iconLabel = widget.addText("⚠️");
  iconLabel.font = Font.boldSystemFont(28);
  iconLabel.centerAlignText();

  widget.addSpacer(6);

  const errLabel = widget.addText(message);
  errLabel.font = Font.systemFont(11);
  errLabel.textColor = new Color("#ff6b6b");
  errLabel.centerAlignText();
  errLabel.lineLimit = 3;

  widget.addSpacer(null);

  return widget;
}

try {
  const widget = await createWidget();
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    widget.presentMedium();
  }
} catch (err) {
  const errWidget = await createErrorWidget(err.message || "Script error");
  if (config.runsInWidget) {
    Script.setWidget(errWidget);
  } else {
    errWidget.presentMedium();
  }
}

Script.complete();
