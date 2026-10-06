const API_BASE = "/api/v1";
const TOKEN_KEY = "streamtweet-access-token";
const USER_KEY = "streamtweet-user";

const posts = [
  {
    id: "morning-coffee",
    kind: "video",
    name: "Mia Bennett",
    handle: "@miamakes",
    time: "18 min ago",
    initials: "M",
    avatar: "linear-gradient(145deg, #f6dfd2, #e6a58e)",
    photo: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=85",
    title: "The slowest morning. The best kind.",
    duration: "0:24",
    text: "Made a little room for absolutely nothing this morning. Highly recommend it. ☕",
    tags: "#slowmornings  #littlejoys",
    likes: 128,
    comments: 14,
  },
  {
    id: "garden-thought",
    kind: "thought",
    name: "Jordan Lee",
    handle: "@jordanoutside",
    time: "42 min ago",
    initials: "J",
    avatar: "linear-gradient(145deg, #d6ebe0, #91c2a3)",
    text: "Reminder to step outside today, even if it’s just for five minutes. There’s a whole sky out there doing its thing, and you deserve to see it. 🌱",
    tags: "#outsideagain  #smallreminder",
    likes: 86,
    comments: 9,
  },
  {
    id: "handmade",
    kind: "video",
    name: "Amara Cole",
    handle: "@amaracreates",
    time: "1 hr ago",
    initials: "A",
    avatar: "linear-gradient(145deg, #e7d9fa, #b8a0e3)",
    photo: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=85",
    title: "Made this with my own two hands",
    duration: "0:38",
    text: "A messy desk, a free afternoon, and something I’m actually proud of. ✂️",
    tags: "#madebyme  #makersgonnamake",
    likes: 204,
    comments: 21,
  },
];

const state = {
  filter: "all",
  search: "",
  saved: new Set(),
  liked: new Set(),
  videos: null,
  currentUser: readStoredUser(),
  toastTimer: null,
};

const feed = document.querySelector("#feed-list");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const authModal = document.querySelector("#auth-modal");
const registerModal = document.querySelector("#register-modal");
const uploadModal = document.querySelector("#upload-modal");

function readStoredUser() {
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

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error("Couldn’t reach StreamTweet. Check your connection and try again.");
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) throw new Error(`The server returned an unexpected response (${response.status}).`);
  }

  if (!response.ok) {
    const message = payload.message || payload.error || `Request failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function timeAgo(value) {
  if (!value) return "Just now";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function postActions(post) {
  const likes = Number(post.likes) || 0;
  const comments = Number(post.comments) || 0;
  const isLiked = state.liked.has(post.id);
  const isSaved = state.saved.has(post.id);
  return `<div class="post-actions">
    <button class="post-action ${isLiked ? "is-liked" : ""}" data-like="${escapeHtml(post.id)}" aria-label="${isLiked ? "Unlike" : "Like"} post">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" /></svg>
      <span>${likes + (isLiked ? 1 : 0)}</span>
    </button>
    <button class="post-action" data-comment="${escapeHtml(post.id)}" aria-label="View comments">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.8-.9L4 20l1.3-4.3a7.5 7.5 0 1 1 14.7-4.2Z" /></svg>
      <span>${comments}</span>
    </button>
    <button class="post-action ${isSaved ? "is-saved" : ""}" data-save="${escapeHtml(post.id)}" aria-label="${isSaved ? "Remove saved post" : "Save post"}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4V4.75Z" /></svg>
      <span>${isSaved ? "Saved" : "Save"}</span>
    </button>
    <button class="post-action" data-share="${escapeHtml(post.id)}" aria-label="Share post">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>
      <span>Share</span>
    </button>
  </div>`;
}

function renderPost(post) {
  const name = escapeHtml(post.name || post.ownerdetails?.fullname || "StreamTweet creator");
  const handle = escapeHtml(post.handle || (post.ownerdetails?.username ? `@${post.ownerdetails.username}` : "@community"));
  const initial = escapeHtml(post.initials || name.slice(0, 1).toUpperCase());
  const avatarUrl = post.ownerDetails?.avatar || post.ownerdetails?.avatar || post.avatarUrl;
  const avatar = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" />`
    : initial;
  const copy = `<div class="post-copy"><p>${escapeHtml(post.text || post.description || "")}</p>${post.tags ? `<p class="hashtags">${escapeHtml(post.tags)}</p>` : ""}</div>`;
  const header = `<div class="post-header"><div class="post-avatar" style="--avatar-bg:${post.avatar || "#f1eafa"}">${avatar}</div><div class="post-user"><strong>${name}</strong><span>${handle} · ${escapeHtml(post.time || timeAgo(post.createdAt))}</span></div><button class="post-more" aria-label="More options">···</button></div>`;

  if (post.kind === "video" || post.thumbnail) {
    const image = post.photo || post.thumbnail;
    return `<article class="post-card" data-post-id="${escapeHtml(post.id)}" data-kind="video">
      ${header}${copy}
      <button class="post-media" data-media="${escapeHtml(post.videoUrl || "")}" aria-label="Play ${escapeHtml(post.title || "video")}">
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(post.title || "Video thumbnail")}" loading="lazy" />` : `<span class="video-placeholder"><span>▶</span></span>`}
        <span class="media-shade"></span><span class="play-button"><svg viewBox="0 0 24 24"><path d="m9 6 10 6-10 6V6Z" /></svg></span>
        <span class="media-caption"><strong>${escapeHtml(post.title || "A moment worth sharing")}</strong><span>${escapeHtml(post.duration || "VIDEO")}</span></span>
      </button>
      ${postActions(post)}
    </article>`;
  }

  return `<article class="post-card text-post" data-post-id="${escapeHtml(post.id)}" data-kind="thought">
    ${header}${copy}${postActions(post)}
  </article>`;
}

function visiblePosts() {
  const entries = state.videos || posts;
  return entries.filter((post) => {
    const text = `${post.name || ""} ${post.handle || ""} ${post.title || ""} ${post.text || ""} ${post.description || ""} ${post.tags || ""}`.toLowerCase();
    const matchesQuery = text.includes(state.search.trim().toLowerCase());
    const matchesFilter =
      state.filter === "all" ||
      (state.filter === "videos" && (post.kind === "video" || post.thumbnail)) ||
      (state.filter === "thoughts" && post.kind === "thought") ||
      (state.filter === "saved" && state.saved.has(post.id));
    return matchesQuery && matchesFilter;
  });
}

function renderFeed() {
  const visible = visiblePosts();
  feed.innerHTML = visible.map(renderPost).join("");
  emptyState.classList.toggle("hidden", visible.length > 0);
  document.querySelector(".feed-footer").classList.toggle("hidden", visible.length === 0);
}

function updateUserInterface() {
  const user = state.currentUser;
  const displayName = user?.fullname || user?.username || "Your corner";
  const avatarText = displayName.slice(0, 1).toUpperCase();
  document.querySelector("#sidebar-name").textContent = displayName;
  document.querySelector("#sidebar-handle").textContent = user?.username ? `@${user.username}` : "Make yourself at home";
  document.querySelector("#sidebar-avatar").textContent = avatarText;
  document.querySelector("#auth-action").textContent = user ? "↗" : "↗";
  document.querySelector("#auth-action").setAttribute("aria-label", user ? "Sign out" : "Sign in");
  document.querySelector("#top-signin").classList.toggle("hidden", Boolean(user));
  const topAvatar = document.querySelector("#top-avatar");
  topAvatar.classList.toggle("hidden", !user);
  topAvatar.textContent = avatarText;
  document.querySelector("#rail-signin").classList.toggle("hidden", Boolean(user));
}

function openModal(dialog) {
  if (!dialog.open) dialog.showModal();
}

function setLoading(button, loading, label) {
  button.disabled = loading;
  const span = button.querySelector("span");
  if (span) span.textContent = loading ? label : span.dataset.original;
}

function setupSubmitLabels() {
  document.querySelectorAll(".submit-button").forEach((button) => {
    const label = button.querySelector("span");
    label.dataset.original = label.textContent;
  });
}

async function loadVideos() {
  if (!state.currentUser?._id || !getToken()) return;
  try {
    const result = await request(`/videos/get-all-videos?userid=${encodeURIComponent(state.currentUser._id)}&limit=20&sortBy=createdAt&sortType=desc`);
    const data = result.data;
    const videos = Array.isArray(data) ? data : data?.docs || data?.videos || [];
    state.videos = videos.map((video) => ({
      ...video,
      id: video._id,
      kind: "video",
      videoUrl: video.videofile,
      avatarUrl: video.ownerdetails?.avatar || state.currentUser.avatar,
      name: video.ownerdetails?.fullname || state.currentUser.fullname,
      handle: video.ownerdetails?.username ? `@${video.ownerdetails.username}` : `@${state.currentUser.username}`,
    }));
    renderFeed();
  } catch (error) {
    showToast(`Your videos couldn’t be loaded: ${error.message}`);
  }
}

async function restoreSession() {
  if (!getToken()) {
    updateUserInterface();
    renderFeed();
    return;
  }
  try {
    const result = await request("/users/get-current-user");
    state.currentUser = result.data;
    sessionStorage.setItem(USER_KEY, JSON.stringify(state.currentUser));
    updateUserInterface();
    await loadVideos();
  } catch (error) {
    if (error.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      state.currentUser = null;
      showToast("Your session expired. Log in to reconnect.");
    } else {
      showToast(`Your session couldn’t be restored: ${error.message}`);
    }
    updateUserInterface();
    renderFeed();
  }
}

async function signOut() {
  try {
    if (getToken()) await request("/users/logout", { method: "POST" });
  } catch (error) {
    showToast(`Couldn’t sign out: ${error.message}`);
    return;
  }
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  state.currentUser = null;
  state.videos = null;
  updateUserInterface();
  renderFeed();
  showToast("You’re signed out. Come back anytime!");
}

document.querySelectorAll("[data-action='signin'], #top-signin").forEach((button) => {
  button.addEventListener("click", () => openModal(authModal));
});

document.querySelectorAll("[data-action='create']").forEach((button) => {
  button.addEventListener("click", () => {
    if (!state.currentUser) {
      openModal(authModal);
      showToast("Log in to share a video with your community.");
      return;
    }
    openModal(uploadModal);
  });
});

document.querySelector("#auth-action").addEventListener("click", () => {
  if (state.currentUser) signOut();
  else openModal(authModal);
});
document.querySelector("#top-avatar").addEventListener("click", signOut);

document.querySelector("#show-register").addEventListener("click", () => {
  authModal.close();
  openModal(registerModal);
});
document.querySelector("#show-login").addEventListener("click", () => {
  registerModal.close();
  openModal(authModal);
});

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector(".submit-button");
  const errorBox = document.querySelector("#login-error");
  const identity = form.elements.identity.value.trim();
  const password = form.elements.password.value;
  errorBox.classList.add("hidden");
  setLoading(submit, true, "Logging in…");
  try {
    const result = await request("/users/login", {
      method: "POST",
      body: JSON.stringify({ [identity.includes("@") ? "email" : "username"]: identity, password }),
    });
    const user = result.data?.loggeduser;
    const token = result.data?.accessToken;
    if (!user || !token) throw new Error("The server didn’t return a user session.");
    state.currentUser = user;
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(TOKEN_KEY, token);
    updateUserInterface();
    await loadVideos();
    form.reset();
    authModal.close();
    showToast(`Welcome back, ${user.fullname || user.username}!`);
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove("hidden");
  } finally {
    setLoading(submit, false, "");
  }
});

document.querySelector("#register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector(".submit-button");
  const errorBox = document.querySelector("#register-error");
  errorBox.classList.add("hidden");
  setLoading(submit, true, "Making your account…");
  const body = new FormData();
  body.append("fullname", form.elements.fullname.value.trim());
  body.append("email", form.elements.email.value.trim());
  body.append("username", form.elements.username.value.trim());
  body.append("password", form.elements.password.value);
  body.append("avatar", form.elements.avatar.files[0]);

  try {
    await request("/users/register", { method: "POST", body });
    const identity = form.elements.username.value.trim();
    const password = form.elements.password.value;
    const result = await request("/users/login", {
      method: "POST",
      body: JSON.stringify({ username: identity, password }),
    });
    const user = result.data?.loggeduser;
    const token = result.data?.accessToken;
    if (!user || !token) throw new Error("Your account was created, but the server didn’t return a user session. Please log in.");
    state.currentUser = user;
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(TOKEN_KEY, token);
    updateUserInterface();
    await loadVideos();
    form.reset();
    document.querySelector("#register-avatar-name").textContent = "JPG or PNG";
    registerModal.close();
    showToast(`Welcome to the community, ${user.fullname || user.username}!`);
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove("hidden");
  } finally {
    setLoading(submit, false, "");
  }
});

document.querySelector("#upload-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector(".submit-button");
  const errorBox = document.querySelector("#upload-error");
  errorBox.classList.add("hidden");
  setLoading(submit, true, "Sharing…");
  const body = new FormData();
  body.append("title", form.elements.title.value.trim());
  body.append("description", form.elements.description.value.trim());
  body.append("videofile", form.elements.videofile.files[0]);
  body.append("thumbnail", form.elements.thumbnail.files[0]);

  try {
    await request("/videos/upload-video", { method: "POST", body });
    form.reset();
    document.querySelector("#video-file-name").textContent = "MP4 or MOV";
    document.querySelector("#thumbnail-file-name").textContent = "JPG or PNG";
    uploadModal.close();
    await loadVideos();
    showToast("Your video is out in the world. Nice work!");
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove("hidden");
  } finally {
    setLoading(submit, false, "");
  }
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});
document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  renderFeed();
});
document.querySelectorAll(".feed-tab").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll(".feed-tab").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    renderFeed();
  });
});
document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item === button));
    if (view === "saved") {
      state.filter = "saved";
      document.querySelectorAll(".feed-tab").forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.filter === "all");
        tab.setAttribute("aria-selected", String(tab.dataset.filter === "all"));
      });
    } else if (view === "videos") {
      state.filter = "videos";
      document.querySelectorAll(".feed-tab").forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.filter === "videos");
        tab.setAttribute("aria-selected", String(tab.dataset.filter === "videos"));
      });
    } else if (view === "discover") {
      state.filter = "all";
      document.querySelectorAll(".feed-tab").forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.filter === "all");
        tab.setAttribute("aria-selected", String(tab.dataset.filter === "all"));
      });
    } else if (view === "following") {
      showToast("Your following feed is on its way.");
    }
    renderFeed();
    document.querySelector("#sidebar-content").classList.remove("is-open");
    document.querySelector("#mobile-menu").setAttribute("aria-expanded", "false");
  });
});

document.querySelector("#mobile-menu").addEventListener("click", (event) => {
  const menu = document.querySelector("#sidebar-content");
  const open = menu.classList.toggle("is-open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll("[data-search]").forEach((button) => {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.search;
    state.search = searchInput.value;
    renderFeed();
    document.querySelector(".feed-column").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

feed.addEventListener("click", async (event) => {
  const likeButton = event.target.closest("[data-like]");
  const saveButton = event.target.closest("[data-save]");
  const commentButton = event.target.closest("[data-comment]");
  const shareButton = event.target.closest("[data-share]");
  const mediaButton = event.target.closest("[data-media]");
  if (likeButton) {
    const id = likeButton.dataset.like;
    state.liked.has(id) ? state.liked.delete(id) : state.liked.add(id);
    renderFeed();
  } else if (saveButton) {
    const id = saveButton.dataset.save;
    state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id);
    renderFeed();
  } else if (commentButton) {
    showToast("Comments are coming soon.");
  } else if (shareButton) {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied. Share the good stuff!");
    } catch {
      showToast("Copy the page address to share this post.");
    }
  } else if (mediaButton) {
    const url = mediaButton.dataset.media;
    if (url) {
      const player = document.createElement("video");
      player.controls = true;
      player.autoplay = true;
      player.src = url;
      player.className = "inline-player";
      mediaButton.replaceWith(player);
    } else {
      showToast("This preview is here to set the mood. Sign in to explore your video library.");
    }
  }
});

document.querySelector("#video-file").addEventListener("change", (event) => {
  document.querySelector("#video-file-name").textContent = event.target.files[0]?.name || "MP4 or MOV";
});
document.querySelector("#thumbnail-file").addEventListener("change", (event) => {
  document.querySelector("#thumbnail-file-name").textContent = event.target.files[0]?.name || "JPG or PNG";
});
document.querySelector("#register-avatar").addEventListener("change", (event) => {
  document.querySelector("#register-avatar-name").textContent = event.target.files[0]?.name || "JPG or PNG";
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape") document.querySelector("#sidebar-content").classList.remove("is-open");
});

setupSubmitLabels();
renderFeed();
updateUserInterface();
restoreSession();
