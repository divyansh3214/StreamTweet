const API = "/api/v1";
const ACCESS_KEY = "streamtweet.access";
const REFRESH_KEY = "streamtweet.refresh";
const USER_KEY = "streamtweet.user";

const state = {
  user: readUser(),
  page: "home",
  videos: [],
  tweets: [],
  likedVideos: [],
  history: [],
  channel: null,
  comments: [],
  activeVideo: null,
  videoPage: 1,
  videoQuery: "",
  videoSortBy: "createdAt",
  videoSortType: "desc",
  feedQuery: "",
  toastTimer: null,
};

const workspace = document.querySelector("#workspace");
const dialog = document.querySelector("#dialog");
const dialogForm = document.querySelector("#dialog-form");
const dialogContent = document.querySelector("#dialog-content");

function readUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function getAccessToken() {
  return sessionStorage.getItem(ACCESS_KEY);
}

async function api(path, options = {}, retryRefresh = true) {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let response;
  try {
    response = await fetch(`${API}${path}`, { ...options, headers, credentials: "same-origin" });
  } catch {
    throw new Error("Could not connect to the API. Check that the backend is running and the frontend proxy is configured.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    if (!response.ok) throw new Error(`The API returned an unexpected response (${response.status}).`);
    result = {};
  }

  if (response.status === 401 && retryRefresh && path !== "/users/refresh-token" && sessionStorage.getItem(REFRESH_KEY)) {
    try {
      const refreshResult = await api(
        "/users/refresh-token",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken: sessionStorage.getItem(REFRESH_KEY) }),
        },
        false,
      );
      const tokens = refreshResult.data || {};
      if (!tokens.accessToken) throw new Error("The refresh endpoint did not return an access token.");
      sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
      if (tokens.refreshToken) sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
      return api(path, options, false);
    } catch (error) {
      throw new Error(`Your session could not be refreshed: ${error.message}`);
    }
  }

  if (!response.ok || result.success === false) {
    const error = new Error(result.message || result.error || `API request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return result;
}

function notify(message, duration = 3500) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("visible"), duration);
}

function setBusy(button, busy, message = "Working…") {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent.trim();
    button.disabled = true;
    button.textContent = message;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.label || button.textContent;
  }
}

function imageOrInitial(url, name, className = "avatar") {
  const safeUrl = typeof url === "string" ? escapeHtml(url) : "";
  return `<span class="${className}">${safeUrl ? `<img src="${safeUrl}" alt="" />` : escapeHtml((name || "S").slice(0, 1).toUpperCase())}</span>`;
}

function userId() {
  return state.user?._id || state.user?.id || "";
}

function ownerId(item) {
  const owner = item?.owner || item?.likedby || item?.ownerdetails?._id;
  return typeof owner === "string" ? owner : owner?._id || "";
}

function isOwner(item) {
  return Boolean(userId() && ownerId(item) === userId());
}

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const elapsed = Math.floor((Date.now() - date.getTime()) / 1000);
  if (elapsed < 60) return "Just now";
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
  if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`;
  if (elapsed < 604800) return `${Math.floor(elapsed / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(seconds) {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) < 0) return "";
  const total = Math.floor(Number(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function pageTitle(page) {
  return ({
    home: "Home",
    videos: "My videos",
    tweets: "My updates",
    liked: "Liked videos",
    history: "Watch history",
    channel: "Channel",
    settings: "Settings",
  })[page] || "Home";
}

function updateChrome() {
  document.querySelector("#page-title").textContent = pageTitle(state.page);
  document.querySelectorAll("[data-page]").forEach((button) => {
    if (button.matches(".nav-link")) button.classList.toggle("active", button.dataset.page === state.page);
  });
  const name = state.user?.fullname || state.user?.username || "Guest";
  document.querySelector("#nav-name").textContent = name;
  document.querySelector("#nav-handle").textContent = state.user?.username ? `@${state.user.username}` : "Sign in to get started";
  const avatarUrl = state.user?.avatar;
  const navAvatar = document.querySelector("#nav-avatar");
  navAvatar.innerHTML = avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="" />` : escapeHtml(name.slice(0, 1).toUpperCase());
  document.querySelector("#login-open").classList.toggle("hidden", Boolean(state.user));
  document.querySelector("#register-open").classList.toggle("hidden", Boolean(state.user));
  document.querySelector("#signout-button").classList.toggle("hidden", !state.user);
  const topAvatar = document.querySelector("#top-avatar");
  topAvatar.classList.toggle("hidden", !state.user);
  topAvatar.innerHTML = avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="" />` : escapeHtml(name.slice(0, 1).toUpperCase());
}

function showError(message, title = "The API request failed") {
  return `<div class="error-card"><strong>${escapeHtml(title)}</strong>${escapeHtml(message)}</div>`;
}

function emptyCard(title, copy, action = "", icon = "✳") {
  return `<div class="empty-card"><span class="empty-mark">${icon}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p>${action}</div>`;
}

function pageHead(eyebrow, title, description, actions = "") {
  return `<div class="page-head"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${title}</h1><p class="page-description">${escapeHtml(description)}</p></div>${actions}</div>`;
}

function videoCard(video, options = {}) {
  const id = video._id || video.id || "";
  const title = video.title || "Untitled video";
  const creator = video.ownerdetails?.fullname || state.user?.fullname || "StreamTweet creator";
  const avatar = video.ownerdetails?.avatar || state.user?.avatar;
  const viewCount = Number(video.views) || 0;
  const actions = options.compact ? "" : `<div class="card-actions">
      <button class="mini-action" data-action="video-open" data-id="${escapeHtml(id)}">Details & comments</button>
      <button class="mini-action" data-action="video-like" data-id="${escapeHtml(id)}">♡ Like</button>
      ${isOwner(video) ? `<button class="mini-action" data-action="video-edit" data-id="${escapeHtml(id)}">Edit</button><button class="mini-action" data-action="video-publish" data-id="${escapeHtml(id)}">${video.isPublished ? "Unpublish" : "Publish"}</button><button class="mini-action" data-action="video-delete" data-id="${escapeHtml(id)}">Delete</button>` : ""}
    </div>`;
  return `<article class="video-card" data-video-card="${escapeHtml(id)}">
    <button class="video-thumb" data-action="video-open" data-id="${escapeHtml(id)}" aria-label="Open ${escapeHtml(title)}">
      ${video.thumbnail ? `<img src="${escapeHtml(video.thumbnail)}" alt="${escapeHtml(title)}" loading="lazy" />` : `<span class="video-thumb-placeholder">▷</span>`}
      ${video.duration ? `<span class="duration">${escapeHtml(formatDuration(video.duration))}</span>` : ""}
    </button>
    <div class="video-meta">${imageOrInitial(avatar, creator)}<div class="video-info"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(creator)} · ${viewCount} views · ${escapeHtml(formatDate(video.createdAt))}</p></div><span class="status-pill ${video.isPublished === false ? "offline" : ""}">${video.isPublished === false ? "Draft" : "Live"}</span></div>
    ${actions}
  </article>`;
}

function tweetCard(tweet) {
  const id = tweet._id || tweet.id || "";
  const creator = tweet.ownerdetails?.fullname || state.user?.fullname || "Creator";
  const avatar = tweet.ownerdetails?.avatar || state.user?.avatar;
  return `<article class="tweet-card">
    <div class="tweet-top">${imageOrInitial(avatar, creator)}<div class="tweet-owner"><strong>${escapeHtml(creator)}</strong><span>@${escapeHtml(tweet.ownerdetails?.username || state.user?.username || "creator")} · ${escapeHtml(formatDate(tweet.createdAt))}</span></div></div>
    <p class="tweet-text">${escapeHtml(tweet.content || tweet.text || "This update has no content.")}</p>
    <div class="tweet-actions">
      <button type="button" class="mini-action" data-action="tweet-like" data-id="${escapeHtml(id)}">♡ Like</button>
      ${isOwner(tweet) ? `<button type="button" class="mini-action" data-action="tweet-edit" data-id="${escapeHtml(id)}">Edit</button><button type="button" class="mini-action" data-action="tweet-delete" data-id="${escapeHtml(id)}">Delete</button>` : ""}
    </div>
  </article>`;
}

function requireSignIn(verb = "use this feature") {
  notify(`Log in to ${verb}.`);
  openDialog("login");
  return false;
}

function saveSession(user, tokens = {}) {
  state.user = user;
  if (tokens.accessToken) sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
  if (tokens.refreshToken) sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  updateChrome();
}

function clearSession() {
  state.user = null;
  state.videos = [];
  state.tweets = [];
  state.likedVideos = [];
  state.history = [];
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);
  updateChrome();
}

function responseList(result) {
  const data = result?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.docs)) return data.docs;
  if (Array.isArray(data?.videos)) return data.videos;
  if (Array.isArray(data?.History)) return data.History;
  return [];
}

function queryString(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  return params.toString();
}

async function fetchVideos({ query = "", page = 1 } = {}) {
  if (!state.user) return [];
  const queryPart = queryString({
    userid: userId(),
    query,
    page,
    limit: 12,
    sortBy: state.videoSortBy,
    sortType: state.videoSortType,
  });
  const result = await api(`/videos/get-all-videos?${queryPart}`);
  const list = responseList(result);
  if (page === 1) state.videos = list;
  else state.videos = [...state.videos, ...list];
  return list;
}

async function loadCurrentPage() {
  updateChrome();
  workspace.innerHTML = `<div class="empty-card"><span class="empty-mark">✳</span><h2>One moment</h2><p>Loading your StreamTweet space…</p></div>`;

  if (state.page === "home") return renderHome();
  if (!state.user) {
    workspace.innerHTML = `${pageHead("YOUR STREAMTWEET", "Your space is waiting.", "Log in or make an account to use this part of StreamTweet.")}${emptyCard("A little better together", "Sign in to open your videos, updates, profile, and account tools.", `<button class="button button-primary" data-action="login">Log in to continue →</button>`)}`;
    return;
  }

  try {
    if (state.page === "videos") return await renderVideos();
    if (state.page === "tweets") return await renderTweets();
    if (state.page === "liked") return await renderLikedVideos();
    if (state.page === "history") return await renderHistory();
    if (state.page === "channel") return renderChannel();
    if (state.page === "settings") return renderSettings();
    return renderHome();
  } catch (error) {
    workspace.innerHTML = `${pageHead("STREAMTWEET", "We hit a snag.", "This view could not be loaded from the API.")}${showError(error.message)}`;
  }
}

async function renderHome() {
  if (!state.user) {
    workspace.innerHTML = `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="eyebrow-dot"></span> YOUR WORLD, IN MOTION</p><h1 class="hero-title">Watch. Share.<br /><span>Find your people.</span></h1><p>Videos, quick updates, and the community that makes them worth sharing.</p></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><span class="art-play">▶</span><span class="art-star">✳</span><span class="art-dot"></span></div></section>
      <div class="quick-grid">
        <button class="quick-card" data-action="login"><span class="quick-icon">↗</span><span class="quick-copy"><strong>Log in</strong><span>Pick up where you left off</span></span></button>
        <button class="quick-card" data-action="register"><span class="quick-icon">✳</span><span class="quick-copy"><strong>Create your account</strong><span>Join your StreamTweet community</span></span></button>
        <button class="quick-card" data-action="channel"><span class="quick-icon">◎</span><span class="quick-copy"><strong>Find a channel</strong><span>Explore a creator profile</span></span></button>
        <button class="quick-card" data-action="refresh"><span class="quick-icon">⟳</span><span class="quick-copy"><strong>Refresh a session</strong><span>Restore with a refresh token</span></span></button>
      </div>
      <div class="feed-layout"><div class="feed-main">${emptyCard("Your feed starts here", "Sign in to load your videos, post updates, manage your profile, and connect with your community.", `<button class="button button-primary" data-action="register">Get started →</button>`)}</div><aside class="feed-side"><section class="panel side-feature"><span class="sparkle">✦</span><h2>Your people are <span>right here.</span></h2><p>Sign in to make the most of your StreamTweet account.</p><button class="button button-primary button-wide" data-action="login">Log in →</button></section>${endpointCard()}</aside></div>`;
    return;
  }

  let videos = [];
  let loadError = "";
  try {
    videos = await fetchVideos();
  } catch (error) {
    loadError = error.message;
  }
  workspace.innerHTML = `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="eyebrow-dot"></span> WELCOME BACK, ${escapeHtml((state.user.fullname || state.user.username || "FRIEND").toUpperCase())}</p><h1 class="hero-title">Your world,<br /><span>in motion.</span></h1><p>Your videos, updates, and watch history—all in one place.</p></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><span class="art-play">▶</span><span class="art-star">✳</span><span class="art-dot"></span></div></section>
    <div class="quick-grid">
      <button class="quick-card" data-action="video-create"><span class="quick-icon">＋</span><span class="quick-copy"><strong>Upload a video</strong><span>Share a new moment</span></span></button>
      <button class="quick-card" data-action="tweet-create"><span class="quick-icon">✎</span><span class="quick-copy"><strong>Write an update</strong><span>Post a quick thought</span></span></button>
      <button class="quick-card" data-page="liked"><span class="quick-icon">♡</span><span class="quick-copy"><strong>Liked videos</strong><span>Revisit your favorites</span></span></button>
      <button class="quick-card" data-page="settings"><span class="quick-icon">⚙</span><span class="quick-copy"><strong>Account settings</strong><span>Keep things up to date</span></span></button>
    </div>
    ${loadError ? showError(loadError, "Your video library could not be loaded") : ""}
    <div class="section-heading"><div><h2>Your latest videos</h2><p>Recent videos from your channel</p></div><button class="button button-quiet" data-page="videos">All videos →</button></div>
    ${videos.length ? `<div class="feed-grid">${videos.slice(0, 3).map((video) => videoCard(video, { compact: true })).join("")}</div>` : emptyCard("Your channel is ready for its first video", "Upload a video and it will appear in your library here.", `<button class="button button-primary" data-action="video-create">Upload a video →</button>`)}
    <div class="feed-layout home-lower"><div>${endpointCard()}</div><aside class="feed-side"><section class="panel side-feature"><span class="sparkle">✦</span><h2>Make something.<br /><span>Share it with someone.</span></h2><p>Your next update is only a thought away.</p><button class="button button-primary button-wide" data-action="tweet-create">Write an update →</button></section></aside></div>`;
}

function endpointCard() {
  return `<section class="panel"><h2>Connected to your API</h2><p>Every tool in this app uses the StreamTweet API through the frontend proxy.</p><div class="tag-list"><div class="tag-button"><strong>Users & profiles</strong><small>/api/v1/users</small></div><div class="tag-button"><strong>Videos & uploads</strong><small>/api/v1/videos</small></div><div class="tag-button"><strong>Updates & reactions</strong><small>/api/v1/tweets · /likes</small></div><div class="tag-button"><strong>Comments</strong><small>/api/v1/comments</small></div></div></section>`;
}

async function renderVideos() {
  state.videoPage = 1;
  const query = state.videoQuery;
  let videos = [];
  let error = "";
  try {
    videos = await fetchVideos({ query, page: 1 });
  } catch (caught) {
    error = caught.message;
  }
  const actions = `<button class="button button-primary" data-action="video-create">＋ Upload video</button>`;
  workspace.innerHTML = `${pageHead("YOUR CHANNEL", "My videos", "Browse, search, update, publish, and remove videos from your channel.", actions)}
    <div class="section-heading"><div><h2>Video library</h2><p>${videos.length} video${videos.length === 1 ? "" : "s"} loaded from your account</p></div><span class="status-pill">API connected</span></div>
    <form class="search-row video-filter" data-form="video-search"><input name="query" value="${escapeHtml(query)}" placeholder="Search your video titles and descriptions…" /><select name="sortBy" aria-label="Sort videos"><option value="createdAt" ${state.videoSortBy === "createdAt" ? "selected" : ""}>Recently added</option><option value="title" ${state.videoSortBy === "title" ? "selected" : ""}>Title</option><option value="views" ${state.videoSortBy === "views" ? "selected" : ""}>Views</option></select><select name="sortType" aria-label="Sort order"><option value="desc" ${state.videoSortType === "desc" ? "selected" : ""}>Descending</option><option value="asc" ${state.videoSortType === "asc" ? "selected" : ""}>Ascending</option></select><button class="button button-quiet" type="submit">Apply</button></form>
    ${error ? showError(error, "Video library request failed") : videos.length ? `<div class="feed-grid">${videos.map((video) => videoCard(video)).join("")}</div>` : emptyCard("No videos to show", query ? "Try a different search, or upload a new video." : "Videos you upload will appear here.", `<button class="button button-primary" data-action="video-create">Upload a video →</button>`)}
    ${!error && videos.length >= 12 ? `<div class="section-heading more-row"><button class="button button-quiet" data-action="videos-more">Load more videos →</button></div>` : ""}`;
}

async function renderTweets() {
  let tweets = [];
  let error = "";
  try {
    const result = await api(`/tweets/get-user-tweets?userid=${encodeURIComponent(userId())}&page=1&limit=20`);
    tweets = responseList(result);
    state.tweets = tweets;
  } catch (caught) {
    error = caught.message;
  }
  workspace.innerHTML = `${pageHead("QUICK UPDATES", "My updates", "Share a thought, then edit or remove your own updates.", `<button class="button button-primary" data-action="tweet-create">＋ New update</button>`)}
    <div class="feed-layout"><div class="feed-main">
      <section class="panel composer">${imageOrInitial(state.user.avatar, state.user.fullname || state.user.username)}<form class="composer-form" data-form="tweet-create"><textarea name="content" maxlength="1000" required placeholder="What’s on your mind?"></textarea><div class="composer-bottom"><small>Keep it short, make it yours.</small><button class="button button-primary" type="submit">Share update →</button></div></form></section>
      ${error ? showError(error, "Updates could not be loaded") : `<div class="tweet-list">${tweets.length ? tweets.map(tweetCard).join("") : emptyCard("No updates yet", "Write the first update from your account.", "", "✎")}</div>`}
    </div><aside class="feed-side">${endpointCard()}<section class="panel side-feature"><span class="sparkle">✦</span><h2>A small thought can <span>go a long way.</span></h2><p>Share it with your community.</p></section></aside></div>`;
}

async function renderLikedVideos() {
  let rows = [];
  let error = "";
  try {
    const result = await api("/likes/get-all-liked-videos");
    rows = responseList(result).map((row) => row.videodetails).filter(Boolean);
    state.likedVideos = rows;
  } catch (caught) {
    error = caught.message;
  }
  workspace.innerHTML = `${pageHead("SAVED FOR LATER", "Liked videos", "Videos you have liked, collected in one place.")}${error ? showError(error, "Liked videos could not be loaded") : rows.length ? `<div class="feed-grid">${rows.map((video) => videoCard(video)).join("")}</div>` : emptyCard("No liked videos yet", "Like a video and it will show up here.", "", "♡")}`;
}

async function renderHistory() {
  let history = [];
  let error = "";
  try {
    const result = await api("/users/watch-history");
    history = responseList(result);
    state.history = history;
  } catch (caught) {
    error = caught.message;
  }
  workspace.innerHTML = `${pageHead("PICK UP WHERE YOU LEFT OFF", "Watch history", "Your watched videos, fetched from your account history.")}${error ? showError(error, "Watch history could not be loaded") : history.length ? `<div class="table-list">${history.map((video) => `<article class="panel history-item"><button class="history-thumb" data-action="video-open" data-id="${escapeHtml(video._id)}">${video.thumbnail ? `<img src="${escapeHtml(video.thumbnail)}" alt="${escapeHtml(video.title || "Video")}" />` : "▷"}</button><div class="history-info"><strong>${escapeHtml(video.title || "Untitled video")}</strong><span>${escapeHtml(video.ownerdetails?.fullname || "StreamTweet creator")} · ${Number(video.views) || 0} views</span></div><button class="mini-action" data-action="video-open" data-id="${escapeHtml(video._id)}">Open</button></article>`).join("")}</div>` : emptyCard("Nothing in your history yet", "Videos you watch will appear here when your backend records watch history.", "", "◷")}`;
}

function renderChannel() {
  const channel = state.channel;
  if (!channel) {
    workspace.innerHTML = `${pageHead("CREATOR PROFILE", "Channel", "View your profile or look up another channel by username.")}
      <section class="panel settings-panel"><h2>Find a channel</h2><p>Channel profiles are fetched from the authenticated user API.</p><form class="search-row" data-form="channel-search"><input name="username" required placeholder="Enter a username" /><button class="button button-primary" type="submit">Open channel</button></form></section>
      <div class="feed-layout" style="margin-top:14px"><section class="panel side-feature"><span class="sparkle">◎</span><h2>Your channel is <span>yours to shape.</span></h2><p>View your account profile and update your details in settings.</p><button class="button button-primary" data-action="channel-self">View my channel →</button></section><aside>${endpointCard()}</aside></div>`;
    return;
  }
  const name = channel.fullname || channel.username || "Creator";
  workspace.innerHTML = `${pageHead("CREATOR PROFILE", escapeHtml(name), `@${channel.username || ""} · Channel profile from the API.`, `<button class="button button-quiet" data-action="channel-reset">Find another channel</button>`)}
    <section class="panel">
      <div class="channel-banner">${channel.coverImage ? `<img src="${escapeHtml(channel.coverImage)}" alt="" />` : ""}</div>
      <div class="channel-details">${imageOrInitial(channel.avatar, name)}<div><h2>${escapeHtml(name)}</h2><p>@${escapeHtml(channel.username || "")}</p></div></div>
      <div class="channel-counts"><span><strong>${Number(channel.subscriberscount) || 0}</strong> subscribers</span><span><strong>${Number(channel.subscribedchannelscount) || 0}</strong> subscriptions</span><span>${channel.issubscribed ? "You are subscribed" : "Not subscribed"}</span></div>
    </section>`;
}

function renderSettings() {
  const user = state.user || {};
  workspace.innerHTML = `${pageHead("YOUR ACCOUNT", "Settings", "Update the details, password, and profile image on your account.")}
    <div class="settings-grid">
      <section class="panel settings-panel"><h2>Profile details</h2><p>Update your name and email address.</p><form data-form="profile">
        <div class="field"><label for="profile-fullname">Full name</label><input id="profile-fullname" name="fullname" required value="${escapeHtml(user.fullname || "")}" /></div>
        <div class="field"><label for="profile-email">Email address</label><input id="profile-email" name="email" type="email" required value="${escapeHtml(user.email || "")}" /></div>
        <div class="field"><label>Username</label><input disabled value="${escapeHtml(user.username || "")}" /></div>
        <button class="button button-primary" type="submit">Save profile details →</button>
      </form></section>
      <section class="panel settings-panel"><h2>Change password</h2><p>Choose a password with at least 6 characters.</p><form data-form="password">
        <div class="field"><label for="old-password">Current password</label><input id="old-password" name="oldpassword" type="password" autocomplete="current-password" required /></div>
        <div class="field"><label for="new-password">New password</label><input id="new-password" name="newpassword" type="password" minlength="6" autocomplete="new-password" required /></div>
        <button class="button button-primary" type="submit">Change password →</button>
      </form></section>
      <section class="panel settings-panel"><h2>Profile photo</h2><p>Upload a new avatar image for your account.</p><form data-form="avatar">
        <div class="field"><label for="avatar-file">Choose an image</label><input id="avatar-file" name="avatar" type="file" accept="image/*" required /></div>
        <button class="button button-primary" type="submit">Update avatar →</button>
      </form></section>
      <section class="panel account-card">${imageOrInitial(user.avatar, user.fullname || user.username)}<div class="account-copy"><h2>${escapeHtml(user.fullname || user.username || "Your account")}</h2><p>@${escapeHtml(user.username || "")} · ${escapeHtml(user.email || "")}</p></div><button class="button button-danger" data-action="logout">Sign out</button></section>
    </div>`;
}

function setDialog(kind, item = {}) {
  dialogForm.dataset.form = kind;
  const input = (label, name, value = "", type = "text", required = true, attrs = "") =>
    `<div class="field"><label>${escapeHtml(label)}</label><input name="${name}" type="${type}" ${required ? "required" : ""} value="${escapeHtml(value)}" ${attrs} /></div>`;
  const textarea = (label, name, value = "", required = true) =>
    `<div class="field"><label>${escapeHtml(label)}</label><textarea name="${name}" ${required ? "required" : ""}>${escapeHtml(value)}</textarea></div>`;
  const heading = (title, copy) => `<h2 class="dialog-heading">${title}</h2><p class="dialog-copy">${escapeHtml(copy)}</p>`;
  const file = (label, name, accept, required = false) =>
    `<div class="field"><label>${escapeHtml(label)}</label><input name="${name}" type="file" accept="${accept}" ${required ? "required" : ""} /></div>`;
  const submit = (label) => `<button class="button button-primary button-wide" type="submit">${escapeHtml(label)} →</button>`;

  if (kind === "login") {
    dialogContent.innerHTML = `${heading("Welcome back.", "Log in to manage your StreamTweet account.")}${input("Email or username", "identity", "", "text", true, 'autocomplete="username"')}${input("Password", "password", "", "password", true, 'autocomplete="current-password"')}${submit("Log in")}<p class="dialog-copy" style="margin:12px 0 0">New around here? <button class="mini-action" type="button" data-action="dialog-register">Create an account</button></p>`;
  } else if (kind === "register") {
    dialogContent.innerHTML = `${heading("Join StreamTweet.", "Create an account to share videos and updates.")}${input("Full name", "fullname")}${input("Email address", "email", "", "email")}${input("Username", "username")}${input("Password (at least 6 characters)", "password", "", "password", true, 'minlength="6"')}${file("Avatar image", "avatar", "image/*", true)}${file("Cover image (optional)", "coverImage", "image/*", false)}${submit("Create account")}`;
  } else if (kind === "video-create") {
    dialogContent.innerHTML = `${heading("Upload a video.", "Choose a video and thumbnail. The backend stores the files through Cloudinary.")}${input("Title", "title")}${textarea("Description", "description")}${file("Video file", "videofile", "video/*", true)}${file("Thumbnail image", "thumbnail", "image/*", true)}${submit("Upload video")}`;
  } else if (kind === "tweet-create") {
    dialogContent.innerHTML = `${heading("Write an update.", "Share a quick thought with your community.")}${textarea("What's on your mind?", "content")}${submit("Share update")}`;
  } else if (kind === "video-edit") {
    dialogContent.innerHTML = `${heading("Edit video details.", "Update the title, description, or thumbnail.")}${input("Title", "title", item.title || "", "text", false)}${textarea("Description", "description", item.description || "", false)}${file("Replace thumbnail (optional)", "thumbnail", "image/*")}${submit("Save video")}`;
  } else if (kind === "tweet-edit") {
    dialogContent.innerHTML = `${heading("Edit update.", "Change the text of your update.")}${textarea("Update text", "content", item.content || "", true)}${submit("Save update")}`;
  } else if (kind === "comment-edit") {
    dialogContent.innerHTML = `${heading("Edit comment.", "Update your comment on this video.")}${textarea("Comment", "content", item.content || "", true)}${submit("Save comment")}`;
  } else if (kind === "channel-search") {
    dialogContent.innerHTML = `${heading("Find a channel.", "Enter the creator username to fetch their profile.")}${input("Username", "username", "", "text", true)}${submit("Open channel")}`;
  } else if (kind === "video-detail") {
    const video = state.activeVideo || item;
    const comments = state.comments;
    dialogContent.innerHTML = `${heading(escapeHtml(video.title || "Video details"), escapeHtml(`${video.ownerdetails?.fullname || "StreamTweet creator"} · ${Number(video.views) || 0} views`))}
      ${video.videofile ? `<video controls playsinline class="detail-player" src="${escapeHtml(video.videofile)}"></video>` : ""}
      <p class="detail-description">${escapeHtml(video.description || "No description provided.")}</p>
      <div class="section-heading"><div><h2>Comments</h2><p>${comments.length} loaded</p></div></div>
      <div class="comment-form" data-video-id="${escapeHtml(video._id || video.id || "")}"><input name="content" maxlength="1000" placeholder="Add a comment…" required /><button class="button button-primary" type="button" data-action="comment-submit">Post</button></div>
      <div class="comments-list">${comments.length ? comments.map(commentCard).join("") : `<p class="dialog-copy">No comments yet. Add the first one.</p>`}</div>`;
  } else {
    dialogContent.innerHTML = `${heading("StreamTweet", "Choose an action.")}`;
  }
  if (!dialog.open) dialog.showModal();
}

function commentCard(comment) {
  const owner = comment.ownerdetails || {};
  const canEdit = isOwner(comment);
  const id = comment._id || comment.id;
  return `<article class="comment-card"><div class="comment-row">${imageOrInitial(owner.avatar || (canEdit ? state.user?.avatar : ""), owner.fullname || state.user?.fullname)}<div class="comment-body"><strong>${escapeHtml(owner.fullname || (canEdit ? state.user?.fullname : "") || "Community member")}</strong><time>${escapeHtml(formatDate(comment.createdAt))}</time><p>${escapeHtml(comment.content || "")}</p><div class="comment-actions"><button type="button" class="mini-action" data-action="comment-like" data-id="${escapeHtml(id)}">♡ Like</button>${canEdit ? `<button type="button" class="mini-action" data-action="comment-edit" data-id="${escapeHtml(id)}">Edit</button><button type="button" class="mini-action" data-action="comment-delete" data-id="${escapeHtml(id)}">Delete</button>` : ""}</div></div></div></article>`;
}

function openDialog(kind, item) {
  if (["video-create", "tweet-create", "video-edit", "tweet-edit", "comment-edit", "video-detail", "comment-create"].includes(kind) && !state.user) {
    return requireSignIn("use this feature");
  }
  if (kind === "video-detail") {
    state.activeVideo = item;
    state.comments = [];
  }
  setDialog(kind, item);
  if (kind === "video-detail") loadComments(item._id || item.id);
}

async function loadComments(videoid, page = 1) {
  try {
    const result = await api(`/comments/get-video-comments/${encodeURIComponent(videoid)}?page=${page}&limit=20`);
    state.comments = responseList(result);
    if (dialog.open && dialogForm.dataset.form === "video-detail") setDialog("video-detail", state.activeVideo || {});
  } catch (error) {
    notify(`Comments could not be loaded: ${error.message}`);
  }
}

function findItem(id, collection = state.videos) {
  return collection.find((item) => String(item._id || item.id) === String(id));
}

async function doLogout() {
  try {
    await api("/users/logout", { method: "POST" });
  } catch (error) {
    notify(`Sign out failed: ${error.message}`);
    return;
  }
  clearSession();
  state.page = "home";
  await loadCurrentPage();
  notify("You have signed out.");
}

async function loadChannel(username) {
  try {
    const result = await api(`/users/channel-profile/${encodeURIComponent(username)}`);
    state.channel = result.data;
    state.page = "channel";
    updateChrome();
    renderChannel();
    if (dialog.open) dialog.close();
  } catch (error) {
    notify(`Channel could not be loaded: ${error.message}`);
  }
}

async function performAction(action, element) {
  const id = element.dataset.id;
  if (action === "login") return openDialog("login");
  if (action === "register") return openDialog("register");
  if (action === "dialog-register") return setDialog("register");
  if (action === "video-create" || action === "tweet-create") return openDialog(action);
  if (action === "channel") {
    state.channel = null;
    state.page = "channel";
    await loadCurrentPage();
    return;
  }
  if (action === "channel-self") return loadChannel(state.user?.username);
  if (action === "channel-reset") {
    state.channel = null;
    return renderChannel();
  }
  if (action === "logout") return doLogout();
  if (action === "refresh") {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return notify("There is no saved refresh token. Log in first.");
    try {
      const result = await api("/users/refresh-token", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }, false);
      if (result.data?.accessToken) sessionStorage.setItem(ACCESS_KEY, result.data.accessToken);
      if (result.data?.refreshToken) sessionStorage.setItem(REFRESH_KEY, result.data.refreshToken);
      notify(result.message || "Session refreshed.");
    } catch (error) {
      notify(`Could not refresh the session: ${error.message}`);
    }
    return;
  }
  if (action === "video-open") {
    const item = findItem(id, [...state.videos, ...state.likedVideos, ...state.history]) || { _id: id };
    try {
      const result = await api(`/videos/get-video/${encodeURIComponent(id)}`);
      state.activeVideo = { ...item, ...result.data };
    } catch (error) {
      state.activeVideo = item;
      notify(`Video details request failed: ${error.message}`);
    }
    return openDialog("video-detail", state.activeVideo);
  }
  if (action === "video-like") {
    if (!state.user) return requireSignIn("like a video");
    try {
      const result = await api(`/likes/toggle-video-like/${encodeURIComponent(id)}`, { method: "POST" });
      notify(result.message || "Video like updated.");
    } catch (error) {
      notify(`Video like failed: ${error.message}`);
    }
    return;
  }
  if (action === "video-edit") {
    const item = findItem(id) || {};
    return openDialog("video-edit", item);
  }
  if (action === "video-publish") {
    try {
      const result = await api(`/videos/toggle-publish-status/${encodeURIComponent(id)}`, { method: "PUT" });
      notify(result.message || "Publish status updated.");
      await loadCurrentPage();
    } catch (error) {
      notify(`Publish status could not be updated: ${error.message}`);
    }
    return;
  }
  if (action === "video-delete") {
    if (!window.confirm("Delete this video and its thumbnail? This cannot be undone.")) return;
    try {
      const result = await api(`/videos/delete-video/${encodeURIComponent(id)}`, { method: "DELETE" });
      notify(result.message || "Video deleted.");
      await loadCurrentPage();
    } catch (error) {
      notify(`Video could not be deleted: ${error.message}`);
    }
    return;
  }
  if (action === "videos-more") {
    try {
      state.videoPage += 1;
      await fetchVideos({ query: state.videoQuery, page: state.videoPage });
      const cards = state.videos.map((video) => videoCard(video)).join("");
      workspace.querySelector(".feed-grid").innerHTML = cards;
    } catch (error) {
      state.videoPage -= 1;
      notify(`More videos could not be loaded: ${error.message}`);
    }
    return;
  }
  if (action === "tweet-like") {
    if (!state.user) return requireSignIn("like an update");
    try {
      const result = await api(`/likes/toggle-tweet-like/${encodeURIComponent(id)}`, { method: "POST" });
      notify(result.message || "Update reaction saved.");
    } catch (error) {
      notify(`Update like failed: ${error.message}`);
    }
    return;
  }
  if (action === "tweet-edit") return openDialog("tweet-edit", findItem(id, state.tweets) || {});
  if (action === "tweet-delete") {
    if (!window.confirm("Delete this update?")) return;
    try {
      const result = await api(`/tweets/delete-tweet/${encodeURIComponent(id)}`, { method: "DELETE" });
      notify(result.message || "Update deleted.");
      await loadCurrentPage();
    } catch (error) {
      notify(`Update could not be deleted: ${error.message}`);
    }
    return;
  }
  if (action === "comment-like") {
    try {
      const result = await api(`/likes/toggle-comment-like/${encodeURIComponent(id)}`, { method: "POST" });
      notify(result.message || "Comment reaction saved.");
    } catch (error) {
      notify(`Comment like failed: ${error.message}`);
    }
    return;
  }
  if (action === "comment-edit") {
    const item = state.comments.find((comment) => String(comment._id || comment.id) === String(id)) || {};
    return openDialog("comment-edit", item);
  }
  if (action === "comment-delete") {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const result = await api(`/comments/delete-comment/${encodeURIComponent(id)}`, { method: "DELETE" });
      notify(result.message || "Comment deleted.");
      await loadComments(state.activeVideo?._id || state.activeVideo?.id);
    } catch (error) {
      notify(`Comment could not be deleted: ${error.message}`);
    }
    return;
  }
  if (action === "comment-submit") {
    const form = element.closest(".comment-form");
    const input = form?.querySelector('input[name="content"]');
    const content = input?.value.trim();
    const videoid = form?.dataset.videoId;
    if (!content || !videoid) return notify("Write a comment before posting it.");
    element.disabled = true;
    try {
      const result = await api(`/comments/add-comment/${encodeURIComponent(videoid)}`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      input.value = "";
      await loadComments(videoid);
      notify(result.message || "Comment added.");
    } catch (error) {
      notify(`Comment could not be posted: ${error.message}`);
    } finally {
      element.disabled = false;
    }
  }
}

async function submitDialog(event) {
  event.preventDefault();
  const form = event.target;
  const kind = form.dataset.form;
  const button = form.querySelector('[type="submit"]');
  setBusy(button, true, "Working…");
  try {
    const data = new FormData(form);
    const value = (name) => String(data.get(name) || "").trim();
    let result;
    if (kind === "login") {
      const identity = value("identity");
      result = await api("/users/login", {
        method: "POST",
        body: JSON.stringify({
          [identity.includes("@") ? "email" : "username"]: identity,
          password: data.get("password"),
        }),
      }, false);
      const user = result.data?.loggeduser;
      if (!user || !result.data?.accessToken) throw new Error("The API did not return the expected login session.");
      saveSession(user, result.data);
      dialog.close();
      state.page = "home";
      await loadCurrentPage();
      notify(`Welcome back, ${user.fullname || user.username}!`);
    } else if (kind === "register") {
      const body = new FormData();
      for (const key of ["fullname", "email", "username", "password", "avatar", "coverImage"]) {
        const field = data.get(key);
        if (field instanceof File && field.size === 0) continue;
        if (field !== null) body.append(key, field);
      }
      result = await api("/users/register", { method: "POST", body }, false);
      dialog.close();
      notify(result.message || "Account created. Log in to start using StreamTweet.");
      openDialog("login");
    } else if (kind === "video-create") {
      result = await api("/videos/upload-video", { method: "POST", body: data });
      dialog.close();
      notify(result.message || "Video uploaded.");
      state.page = "videos";
      await loadCurrentPage();
    } else if (kind === "tweet-create") {
      result = await api("/tweets/create-tweet", {
        method: "POST",
        body: JSON.stringify({ content: value("content") }),
      });
      dialog.close();
      notify(result.message || "Update posted.");
      state.page = "tweets";
      await loadCurrentPage();
    } else if (kind === "video-edit") {
      const id = state.editingId;
      if (!value("title") && !value("description") && !data.get("thumbnail")?.size) {
        throw new Error("Enter a title or description, or choose a thumbnail to update.");
      }
      result = await api(`/videos/update-video/${encodeURIComponent(id)}`, { method: "PUT", body: data });
      dialog.close();
      notify(result.message || "Video updated.");
      await loadCurrentPage();
    } else if (kind === "tweet-edit") {
      result = await api(`/tweets/update-tweet/${encodeURIComponent(state.editingId)}`, {
        method: "PUT",
        body: JSON.stringify({ content: value("content") }),
      });
      dialog.close();
      notify(result.message || "Update changed.");
      await loadCurrentPage();
    } else if (kind === "comment-edit") {
      result = await api(`/comments/update-comment/${encodeURIComponent(state.editingId)}`, {
        method: "PUT",
        body: JSON.stringify({ content: value("content") }),
      });
      dialog.close();
      notify(result.message || "Comment updated.");
      await loadComments(state.activeVideo?._id || state.activeVideo?.id);
    } else if (kind === "comment-create") {
      result = await api(`/comments/add-comment/${encodeURIComponent(form.dataset.videoId)}`, {
        method: "POST",
        body: JSON.stringify({ content: value("content") }),
      });
      await loadComments(form.dataset.videoId);
      notify(result.message || "Comment added.");
    } else if (kind === "channel-search") {
      return await loadChannel(value("username"));
    }
  } catch (error) {
    notify(error.message, 5000);
  } finally {
    setBusy(button, false);
  }
}

async function submitForm(event) {
  event.preventDefault();
  const form = event.target;
  const kind = form.dataset.form;
  if (!kind) return;
  const button = form.querySelector('[type="submit"]');
  setBusy(button, true, "Working…");
  try {
    const data = new FormData(form);
    const val = (key) => String(data.get(key) || "").trim();
    let result;
    if (kind === "profile") {
      result = await api("/users/update-other-details", {
        method: "PUT",
        body: JSON.stringify({ fullname: val("fullname"), email: val("email") }),
      });
      state.user = result.data || { ...state.user, fullname: val("fullname"), email: val("email") };
      sessionStorage.setItem(USER_KEY, JSON.stringify(state.user));
      updateChrome();
      notify(result.message || "Profile updated.");
    } else if (kind === "password") {
      result = await api("/users/change-password", {
        method: "PUT",
        body: JSON.stringify({ oldpassword: data.get("oldpassword"), newpassword: data.get("newpassword") }),
      });
      form.reset();
      notify(result.message || "Password changed.");
    } else if (kind === "avatar") {
      const body = new FormData();
      body.append("avatar", data.get("avatar"));
      result = await api("/users/update-avatar", { method: "PUT", body });
      state.user = result.data || state.user;
      sessionStorage.setItem(USER_KEY, JSON.stringify(state.user));
      updateChrome();
      notify(result.message || "Avatar updated.");
    } else if (kind === "tweet-create") {
      result = await api("/tweets/create-tweet", {
        method: "POST",
        body: JSON.stringify({ content: val("content") }),
      });
      form.reset();
      notify(result.message || "Update posted.");
      await renderTweets();
    } else if (kind === "video-search") {
      state.videoQuery = val("query");
      state.videoSortBy = val("sortBy") || "createdAt";
      state.videoSortType = val("sortType") || "desc";
      state.videoPage = 1;
      await renderVideos();
    } else if (kind === "channel-search") {
      return await loadChannel(val("username"));
    }
  } catch (error) {
    notify(error.message, 5000);
  } finally {
    setBusy(button, false);
  }
}

document.addEventListener("click", async (event) => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) {
    event.preventDefault();
    state.page = pageButton.dataset.page;
    if (state.page === "channel") state.channel = null;
    document.querySelector("#sidebar").classList.remove("mobile-open");
    await loadCurrentPage();
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    event.preventDefault();
    const action = actionButton.dataset.action;
    if (action === "video-edit") state.editingId = actionButton.dataset.id;
    if (action === "tweet-edit" || action === "comment-edit") state.editingId = actionButton.dataset.id;
    await performAction(action, actionButton);
  }
});

document.addEventListener("submit", (event) => {
  if (event.target === dialogForm) {
    void submitDialog(event);
    return;
  }
  void submitForm(event);
});

document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => dialog.close()));
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
document.querySelector("#login-open").addEventListener("click", () => openDialog("login"));
document.querySelector("#register-open").addEventListener("click", () => openDialog("register"));
document.querySelector("#signout-button").addEventListener("click", doLogout);
document.querySelector("#top-avatar").addEventListener("click", () => {
  state.page = "settings";
  void loadCurrentPage();
});
document.querySelector("#mobile-menu").addEventListener("click", () => {
  document.querySelector("#sidebar").classList.toggle("mobile-open");
});
let searchTimer;
document.querySelector("#global-search").addEventListener("input", (event) => {
  const input = event.currentTarget;
  const query = input.value.trim().toLowerCase();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (state.page === "videos") {
      state.videoQuery = input.value;
      state.videoPage = 1;
      void renderVideos();
      return;
    }
    workspace.querySelectorAll(".video-card, .tweet-card, .history-item, .comment-card").forEach((item) => {
      item.classList.toggle("hidden", !item.textContent.toLowerCase().includes(query));
    });
  }, 180);
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.querySelector("#global-search").focus();
  }
  if (event.key === "Escape") document.querySelector("#sidebar").classList.remove("mobile-open");
});

async function restoreSession() {
  if (!getAccessToken() || !state.user) {
    if (state.user && !getAccessToken()) clearSession();
    updateChrome();
    return loadCurrentPage();
  }
  updateChrome();
  try {
    const result = await api("/users/get-current-user");
    state.user = result.data || state.user;
    sessionStorage.setItem(USER_KEY, JSON.stringify(state.user));
  } catch (error) {
    notify(`Saved session could not be verified: ${error.message}`);
  }
  updateChrome();
  await loadCurrentPage();
}

restoreSession();
