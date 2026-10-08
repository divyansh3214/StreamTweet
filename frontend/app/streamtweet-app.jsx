"use client";

import {
  ArrowDownUp, ArrowLeft, ArrowRight, Bell, Check, ChevronDown, Compass, Film,
  Heart, History, Home, ListVideo, LogIn, LogOut, Menu, MessageCircle, MoreHorizontal,
  Plus, Search, Settings, Sparkles, UserRound, Video, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API = "/api/v1";
const ACCESS_KEY = "streamtweet.access";
const REFRESH_KEY = "streamtweet.refresh";
const USER_KEY = "streamtweet.user";
const fallbackArt = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1800&q=85";

function listFrom(result) {
  const data = result?.data;
  if (Array.isArray(data)) return data;
  for (const key of ["docs", "videos", "playlists", "History", "tweets", "comments", "likedVideos"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(item) {
  return String(item?._id || item?.id || "");
}

function ownerOf(item) {
  const owner = item?.owner || item?.ownerdetails?._id || item?.likedby;
  return typeof owner === "string" ? owner : owner?._id || "";
}

function timeAgo(value) {
  if (!value) return "Just now";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function Avatar({ user, size = "normal" }) {
  const name = user?.fullname || user?.username || "Guest";
  return (
    <span className={`avatar avatar-${size}`}>
      {user?.avatar ? <img src={user.avatar} alt="" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function StreamTweetApp() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");
  const [videos, setVideos] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [liked, setLiked] = useState([]);
  const [likedVideoIds, setLikedVideoIds] = useState(() => new Set());
  const [history, setHistory] = useState([]);
  const [channel, setChannel] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [videoQuery, setVideoQuery] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortType, setSortType] = useState("desc");
  const [mobileNav, setMobileNav] = useState(false);
  const refreshRequest = useRef(null);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 3600);
  }, []);

  const api = useCallback(async (path, options = {}, canRefresh = true) => {
    const headers = new Headers(options.headers || {});
    const token = sessionStorage.getItem(ACCESS_KEY);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    let response;
    try {
      response = await fetch(`${API}${path}`, { ...options, headers, credentials: "same-origin" });
    } catch {
      throw new Error("Could not connect to the API. Check that the backend is running and API_TARGET is configured.");
    }
    let result;
    try {
      result = await response.json();
    } catch {
      if (!response.ok) throw new Error(`The API returned an unexpected response (${response.status}).`);
      result = {};
    }
    if (response.status === 401 && canRefresh && path !== "/users/refresh-token" && sessionStorage.getItem(REFRESH_KEY)) {
      try {
        if (!refreshRequest.current) {
          refreshRequest.current = api("/users/refresh-token", {
            method: "POST",
            body: JSON.stringify({ refreshToken: sessionStorage.getItem(REFRESH_KEY) }),
          }, false).then((refresh) => {
            if (!refresh.data?.accessToken) throw new Error("The refresh endpoint did not return an access token.");
            sessionStorage.setItem(ACCESS_KEY, refresh.data.accessToken);
            if (refresh.data.refreshToken) sessionStorage.setItem(REFRESH_KEY, refresh.data.refreshToken);
            return refresh;
          }).finally(() => {
            refreshRequest.current = null;
          });
        }
        await refreshRequest.current;
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
  }, []);

  const clearSession = useCallback(() => {
    for (const key of [ACCESS_KEY, REFRESH_KEY, USER_KEY]) sessionStorage.removeItem(key);
    setUser(null);
    setVideos([]);
    setTweets([]);
    setLiked([]);
    setLikedVideoIds(new Set());
    setHistory([]);
    setPlaylists([]);
    setActivePlaylist(null);
  }, []);

  const fetchVideos = useCallback(async (term = "") => {
    if (!user) return [];
    const params = new URLSearchParams({
      userid: String(user._id || user.id || ""),
      page: "1",
      limit: "24",
      sortBy,
      sortType,
    });
    if (term) params.set("query", term);
    const result = await api(`/videos/get-all-videos?${params}`);
    const rows = listFrom(result);
    setVideos(rows);
    return rows;
  }, [api, sortBy, sortType, user]);

  const loadPage = useCallback(async (target = page) => {
    if (!user || target === "home") {
      if (user) {
        try { await fetchVideos(); } catch (error) { notify(error.message); }
      }
      return;
    }
    try {
      if (target === "videos") await fetchVideos(videoQuery);
      if (target === "tweets") {
        const result = await api(`/tweets/get-user-tweets?userid=${encodeURIComponent(user._id || user.id)}&page=1&limit=30`);
        setTweets(listFrom(result));
      }
      if (target === "liked") {
        const result = await api("/likes/get-all-liked-videos");
        const videos = listFrom(result).map((like) => like.videodetails).filter(Boolean);
        setLiked(videos);
        setLikedVideoIds(new Set(videos.map(idOf)));
      }
      if (target === "history") setHistory(listFrom(await api("/users/watch-history")));
      if (target === "playlists") {
        const [result] = await Promise.all([
          api(`/playlists/get-user-playlists/${encodeURIComponent(user._id || user.id)}`),
          fetchVideos(),
        ]);
        setPlaylists(listFrom(result));
      }
      if (target === "channel" && user.username) {
        const result = await api(`/users/channel-profile/${encodeURIComponent(user.username)}`);
        setChannel(result.data);
      }
    } catch (error) {
      notify(error.message);
    }
  }, [api, fetchVideos, notify, page, user, videoQuery]);

  useEffect(() => {
    if (!user) return;
    api("/likes/get-all-liked-videos").then((result) => {
      const videos = listFrom(result).map((like) => like.videodetails).filter(Boolean);
      setLiked(videos);
      setLikedVideoIds(new Set(videos.map(idOf)));
    }).catch((error) => notify(`Liked videos could not be loaded: ${error.message}`));
  }, [api, notify, user]);

  useEffect(() => {
    try {
      const savedUser = JSON.parse(sessionStorage.getItem(USER_KEY) || "null");
      if (savedUser && sessionStorage.getItem(ACCESS_KEY)) {
        setUser(savedUser);
        api("/users/get-current-user").then((result) => {
          if (result.data) {
            setUser(result.data);
            sessionStorage.setItem(USER_KEY, JSON.stringify(result.data));
          }
        }).catch((error) => {
          clearSession();
          notify(`Your saved session is no longer available: ${error.message}`);
        });
      }
    } catch {
      sessionStorage.removeItem(USER_KEY);
    }
  }, [api, clearSession, notify]);

  useEffect(() => {
    if (user) loadPage(page);
  }, [user, page, loadPage]);

  const openVideo = async (video) => {
    setActiveVideo(video);
    setComments([]);
    setModal({ type: "video-detail" });
    try {
      const [detail, commentsResult] = await Promise.all([
        api(`/videos/get-video/${encodeURIComponent(idOf(video))}`),
        api(`/comments/get-video-comments/${encodeURIComponent(idOf(video))}?page=1&limit=30`),
      ]);
      setActiveVideo(detail.data || video);
      setComments(listFrom(commentsResult));
    } catch (error) {
      notify(error.message);
    }
  };

  const openChannel = async (username) => {
    if (!username) {
      notify("Enter a username to find a channel.");
      return;
    }
    try {
      const result = await api(`/users/channel-profile/${encodeURIComponent(username)}`);
      setChannel(result.data);
      setPage("channel");
      setModal(null);
    } catch (error) {
      notify(`Channel could not be loaded: ${error.message}`);
    }
  };

  const openPlaylist = async (playlist) => {
    try {
      const result = await api(`/playlists/get-playlist/${encodeURIComponent(idOf(playlist))}`);
      setActivePlaylist(result.data);
      setPage("playlist-detail");
    } catch (error) {
      notify(`Playlist could not be opened: ${error.message}`);
    }
  };

  const deletePlaylist = async (playlist) => {
    if (!window.confirm(`Delete "${playlist.name}"? This action cannot be undone.`)) return;
    try {
      const result = await api(`/playlists/delete-playlist/${encodeURIComponent(idOf(playlist))}`, { method: "DELETE" });
      setPlaylists((current) => current.filter((item) => idOf(item) !== idOf(playlist)));
      if (idOf(activePlaylist) === idOf(playlist)) {
        setActivePlaylist(null);
        setPage("playlists");
      }
      notify(result.message || "Playlist deleted.");
    } catch (error) {
      notify(error.message);
    }
  };

  const addVideoToPlaylist = async (event) => {
    event.preventDefault();
    const videoId = new FormData(event.currentTarget).get("videoId");
    if (!activePlaylist || !videoId) return;
    try {
      const result = await api(`/playlists/add-video/${encodeURIComponent(idOf(activePlaylist))}/${encodeURIComponent(videoId)}`, { method: "POST" });
      const refreshed = await api(`/playlists/get-playlist/${encodeURIComponent(idOf(activePlaylist))}`);
      setActivePlaylist(refreshed.data);
      notify(result.message || "Video added to playlist.");
    } catch (error) {
      notify(error.message);
    }
  };

  const removeVideoFromPlaylist = async (video) => {
    if (!activePlaylist) return;
    try {
      const result = await api(`/playlists/remove-video/${encodeURIComponent(idOf(activePlaylist))}/${encodeURIComponent(idOf(video))}`, { method: "DELETE" });
      setActivePlaylist((current) => ({
        ...current,
        videos: current.videos.filter((item) => idOf(item) !== idOf(video)),
      }));
      notify(result.message || "Video removed from playlist.");
    } catch (error) {
      notify(error.message);
    }
  };

  const requireUser = (feature) => {
    if (user) return true;
    setModal({ type: "login" });
    notify(`Log in to ${feature}.`);
    return false;
  };

  const searchChannel = (event) => {
    event.preventDefault();
    const username = query.trim().replace(/^@/, "");
    if (!username) return;
    if (requireUser("find a channel")) openChannel(username);
  };

  const submitModal = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const val = (key) => String(data.get(key) || "").trim();
    setBusy(true);
    try {
      let result;
      if (modal.type === "login") {
        const identity = val("identity");
        result = await api("/users/login", {
          method: "POST",
          body: JSON.stringify({
            [identity.includes("@") ? "email" : "username"]: identity,
            password: data.get("password"),
          }),
        }, false);
        const nextUser = result.data?.loggeduser;
        if (!nextUser || !result.data?.accessToken) throw new Error("The API did not return the expected login session.");
        sessionStorage.setItem(ACCESS_KEY, result.data.accessToken);
        if (result.data.refreshToken) sessionStorage.setItem(REFRESH_KEY, result.data.refreshToken);
        sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
        setPage("home");
        setModal(null);
        notify(`Welcome back, ${nextUser.fullname || nextUser.username}!`);
      } else if (modal.type === "register") {
        const registration = new FormData();
        for (const key of ["fullname", "email", "username", "password", "avatar", "coverImage"]) {
          const field = data.get(key);
          if (field && (!(field instanceof File) || field.size > 0)) registration.append(key, field);
        }
        result = await api("/users/register", { method: "POST", body: registration }, false);
        setModal({ type: "login" });
        notify(result.message || "Account created. Log in to start exploring.");
      } else if (modal.type === "video-create") {
        result = await api("/videos/upload-video", { method: "POST", body: data });
        setModal(null);
        setPage("videos");
        notify(result.message || "Your video is live.");
        await fetchVideos();
      } else if (modal.type === "tweet-create") {
        result = await api("/tweets/create-tweet", { method: "POST", body: JSON.stringify({ content: val("content") }) });
        setModal(null);
        setPage("tweets");
        notify(result.message || "Update posted.");
        await loadPage("tweets");
      } else if (modal.type === "channel-search") {
        await openChannel(val("username"));
      } else if (modal.type === "playlist-create") {
        result = await api("/playlists/create-playlist", {
          method: "POST",
          body: JSON.stringify({ name: val("name"), description: val("description") }),
        });
        setModal(null);
        setPage("playlists");
        await loadPage("playlists");
        notify(result.message || "Playlist created.");
      } else if (modal.type === "playlist-edit") {
        result = await api(`/playlists/update-playlist/${encodeURIComponent(modal.itemId)}`, {
          method: "PUT",
          body: JSON.stringify({ name: val("name"), description: val("description") }),
        });
        setActivePlaylist(result.data);
        setPlaylists((current) => current.map((item) => idOf(item) === modal.itemId ? result.data : item));
        setModal(null);
        notify(result.message || "Playlist updated.");
      } else if (modal.type === "video-edit") {
        if (!val("title") && !val("description") && !data.get("thumbnail")?.size) {
          throw new Error("Enter a title or description, or choose a thumbnail to update.");
        }
        result = await api(`/videos/update-video/${encodeURIComponent(modal.itemId)}`, { method: "PUT", body: data });
        setModal(null);
        await fetchVideos();
        notify(result.message || "Video updated.");
      } else if (modal.type === "tweet-edit") {
        result = await api(`/tweets/update-tweet/${encodeURIComponent(modal.itemId)}`, {
          method: "PUT", body: JSON.stringify({ content: val("content") }),
        });
        setModal(null);
        await loadPage("tweets");
        notify(result.message || "Update changed.");
      } else if (modal.type === "comment-edit") {
        result = await api(`/comments/update-comment/${encodeURIComponent(modal.itemId)}`, {
          method: "PUT", body: JSON.stringify({ content: val("content") }),
        });
        setModal({ type: "video-detail" });
        const refreshed = await api(`/comments/get-video-comments/${encodeURIComponent(idOf(activeVideo))}?page=1&limit=30`);
        setComments(listFrom(refreshed));
        notify(result.message || "Comment updated.");
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = async (kind, id) => {
    if (!requireUser("like this")) return;
    const route = kind === "video" ? "video" : kind === "tweet" ? "tweet" : "comment";
    try {
      const result = await api(`/likes/toggle-${route}-like/${encodeURIComponent(id)}`, { method: "POST" });
      if (kind === "video") {
        const wasLiked = likedVideoIds.has(id);
        setLikedVideoIds((current) => {
          const next = new Set(current);
          if (wasLiked) next.delete(id);
          else next.add(id);
          return next;
        });
        if (wasLiked) setLiked((current) => current.filter((video) => idOf(video) !== id));
      }
      notify(result.message || "Your like was updated.");
    } catch (error) { notify(error.message); }
  };

  const deleteItem = async (kind, id) => {
    if (!window.confirm(`Delete this ${kind}? This action cannot be undone.`)) return;
    const routes = { video: "videos/delete-video", tweet: "tweets/delete-tweet", comment: "comments/delete-comment" };
    try {
      const result = await api(`/${routes[kind]}/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (kind === "video") await fetchVideos();
      if (kind === "tweet") await loadPage("tweets");
      if (kind === "comment") setComments((current) => current.filter((item) => idOf(item) !== id));
      notify(result.message || `${kind} deleted.`);
    } catch (error) { notify(error.message); }
  };

  const createComment = async (event) => {
    event.preventDefault();
    if (!requireUser("comment")) return;
    const form = event.currentTarget;
    const input = new FormData(form).get("content");
    try {
      const result = await api(`/comments/add-comment/${encodeURIComponent(idOf(activeVideo))}`, {
        method: "POST", body: JSON.stringify({ content: input }),
      });
      form.reset();
      const refreshed = await api(`/comments/get-video-comments/${encodeURIComponent(idOf(activeVideo))}?page=1&limit=30`);
      setComments(listFrom(refreshed));
      notify(result.message || "Comment added.");
    } catch (error) { notify(error.message); }
  };

  const doLogout = async () => {
    try {
      await api("/users/logout", { method: "POST" });
      clearSession();
      setPage("home");
      notify("You have signed out.");
    } catch (error) { notify(`Sign out failed: ${error.message}`); }
  };

  const navigate = (target) => {
    if (target !== "home" && !requireUser("open your space")) return;
    setPage(target);
  };

  const handleHomeAction = (type) => {
    if (type === "login" || type === "register") {
      setModal({ type });
      return;
    }
    if (type === "channel-search") {
      if (requireUser("find a channel")) setModal({ type });
      return;
    }
    if (requireUser(type === "video-create" ? "upload a video" : "share an update")) {
      setModal({ type });
    }
  };

  useEffect(() => {
    const openRegister = () => setModal({ type: "register" });
    window.addEventListener("open-register", openRegister);
    return () => window.removeEventListener("open-register", openRegister);
  }, []);

  const filteredVideos = useMemo(() => {
    if (!query.trim()) return videos;
    const needle = query.toLowerCase();
    return videos.filter((video) => `${video.title || ""} ${video.description || ""}`.toLowerCase().includes(needle));
  }, [query, videos]);

  const navItems = [
    ["home", "Discover", Home], ["videos", "My videos", Film], ["tweets", "Updates", MessageCircle],
    ["liked", "Liked", Heart], ["history", "History", History], ["playlists", "Playlists", ListVideo],
    ["channel", "Channel", UserRound],
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage("home"); }}>
          <span className="brand-mark"><Sparkles size={19} fill="currentColor" /></span>
          <span>stream<span>tweet</span></span>
        </a>
        <div className="nav-caption">YOUR SPACE</div>
        <nav>
          {navItems.map(([key, label, Icon]) => (
            <button key={key} className={`nav-link ${page === key || (page === "playlist-detail" && key === "playlists") ? "active" : ""}`} onClick={() => { navigate(key); setMobileNav(false); }}>
              <Icon size={19} strokeWidth={1.8} /><span>{label}</span>{key === "home" && <span className="nav-pip" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="side-promo">
          <span className="promo-kicker"><Sparkles size={13} /> LITTLE REMINDER</span>
          <strong>Your next favorite thing is one tap away.</strong>
          <button onClick={() => setPage("videos")}>Explore your space <ArrowRight size={15} /></button>
          <span className="promo-orbit" />
        </div>
        <button className={`nav-link settings-link ${page === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}>
          <Settings size={19} strokeWidth={1.8} /><span>Settings</span>
        </button>
        <div className="sidebar-profile">
          <Avatar user={user} size="small" />
          <button className="profile-identity" onClick={() => user ? navigate("settings") : setModal({ type: "login" })}>
            <strong>{user?.fullname || user?.username || "Welcome, friend"}</strong>
            <span>{user?.username ? `@${user.username}` : "Sign in to get started"}</span>
          </button>
          {user ? <button className="icon-btn logout-btn" title="Sign out" onClick={doLogout}><LogOut size={17} /></button> : null}
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-btn" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu"><Menu size={20} /></button>
          <div className="breadcrumb"><span>YOUR SPACE</span><b>/</b><strong>{page === "home" ? "Discover" : page === "playlist-detail" ? activePlaylist?.name || "Playlist" : navItems.find(([key]) => key === page)?.[1] || "Settings"}</strong></div>
          <div className="topbar-actions">
            <form className="search-box" onSubmit={searchChannel} title="Enter a username to open a creator channel">
              <button className="search-submit" type="submit" aria-label="Find a channel"><Search size={17} /></button>
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search content or find a creator channel" placeholder="Search videos or find a channel..." />
              <kbd>⌘ K</kbd>
            </form>
            {user ? <button className="icon-btn notification-button" title="Notifications"><Bell size={18} /><i /></button> : <button className="button button-quiet" onClick={() => setModal({ type: "login" })}>Log in</button>}
            {user ? <button className="avatar-trigger" onClick={() => navigate("settings")}><Avatar user={user} size="small" /><ChevronDown size={14} /></button> : <button className="button button-primary top-join" onClick={() => setModal({ type: "register" })}>Join the vibe <ArrowRight size={16} /></button>}
          </div>
        </header>

        <div className="content-area">
          {page === "home" && <HomePage user={user} videos={filteredVideos} onAction={handleHomeAction} onPage={navigate} onOpenVideo={openVideo} onLike={toggleLike} isVideoLiked={(id) => likedVideoIds.has(id)} />}
          {page === "videos" && <VideosPage videos={filteredVideos} user={user} query={videoQuery} setQuery={setVideoQuery} sortBy={sortBy} setSortBy={setSortBy} sortType={sortType} setSortType={setSortType} onSearch={() => loadPage("videos")} onUpload={() => requireUser("upload a video") && setModal({ type: "video-create" })} onOpen={openVideo} onLike={toggleLike} isVideoLiked={(id) => likedVideoIds.has(id)} onEdit={(video) => setModal({ type: "video-edit", itemId: idOf(video), item: video })} onDelete={(video) => deleteItem("video", idOf(video))} onPublish={async (video) => { try { const result = await api(`/videos/toggle-publish-status/${encodeURIComponent(idOf(video))}`, { method: "PUT" }); await fetchVideos(); notify(result.message || "Visibility updated."); } catch (error) { notify(error.message); } }} />}
          {page === "tweets" && <TweetsPage tweets={tweets.filter((item) => !query || (item.content || "").toLowerCase().includes(query.toLowerCase()))} user={user} onCreate={() => setModal({ type: "tweet-create" })} onLike={toggleLike} onEdit={(item) => setModal({ type: "tweet-edit", itemId: idOf(item), item })} onDelete={(item) => deleteItem("tweet", idOf(item))} />}
          {page === "liked" && <VideosPage title="The replay list" eyebrow="YOUR FAVORITES" description="All the videos you’ve loved, together in one place." videos={liked.filter((item) => !query || (item.title || "").toLowerCase().includes(query.toLowerCase()))} user={user} onOpen={openVideo} onLike={toggleLike} isVideoLiked={(id) => likedVideoIds.has(id)} />}
          {page === "history" && <HistoryPage entries={history.filter((item) => !query || (item.title || "").toLowerCase().includes(query.toLowerCase()))} onOpen={openVideo} />}
          {page === "playlists" && <PlaylistsPage playlists={playlists.filter((item) => !query || `${item.name || ""} ${item.description || ""}`.toLowerCase().includes(query.toLowerCase()))} onCreate={() => requireUser("create a playlist") && setModal({ type: "playlist-create" })} onOpen={openPlaylist} onEdit={(item) => setModal({ type: "playlist-edit", itemId: idOf(item), item })} onDelete={deletePlaylist} />}
          {page === "playlist-detail" && activePlaylist && <PlaylistDetailPage playlist={activePlaylist} videos={videos} user={user} onBack={() => navigate("playlists")} onEdit={() => setModal({ type: "playlist-edit", itemId: idOf(activePlaylist), item: activePlaylist })} onAddVideo={addVideoToPlaylist} onRemoveVideo={removeVideoFromPlaylist} onOpenVideo={openVideo} onLike={toggleLike} isVideoLiked={(id) => likedVideoIds.has(id)} />}
          {page === "channel" && <ChannelPage channel={channel} user={user} onFind={() => setModal({ type: "channel-search" })} onOpenVideo={openVideo} />}
          {page === "settings" && user && <SettingsPage user={user} api={api} setUser={(next) => { setUser(next); sessionStorage.setItem(USER_KEY, JSON.stringify(next)); }} onNotify={notify} onLogout={doLogout} />}
        </div>
      </main>

      {modal && <Modal modal={modal} busy={busy} close={() => setModal(null)} submit={submitModal} activeVideo={activeVideo} comments={comments} user={user} onComment={createComment} onLike={toggleLike} isActiveVideoLiked={likedVideoIds.has(idOf(activeVideo))} onDelete={deleteItem} onEdit={(item) => setModal({ type: "comment-edit", itemId: idOf(item), item })} />}
      {toast && <div className="toast"><span><Check size={16} /></span>{toast}</div>}
    </div>
  );
}

function HomePage({ user, videos, onAction, onPage, onOpenVideo, onLike, isVideoLiked }) {
  const featured = videos[0];
  return (
    <>
      <section className={`hero ${user ? "hero-member" : "hero-guest"}`} style={{ "--hero-image": `url("${featured?.thumbnail || fallbackArt}")` }}>
        <div className="hero-scrim" />
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" /> {user ? `WELCOME BACK, ${(user.fullname || user.username || "FRIEND").toUpperCase()}` : "YOUR WORLD, IN MOTION"}</p>
          <h1>{user ? <>Your corner<br />of the <em>internet.</em></> : <>Watch. Share.<br /><em>Find your people.</em></>}</h1>
          <p className="hero-description">{user ? "The good stuff you made, saved, and haven’t seen yet." : "Good videos, little thoughts, and the people who make it worth scrolling."}</p>
          <div className="hero-actions">
            {user ? <><button className="button button-primary" onClick={() => onAction("video-create")}><Plus size={17} /> Upload something</button><button className="button button-glass" onClick={() => onAction("tweet-create")}>Write a little update</button></> : <><button className="button button-primary" onClick={() => onAction("register")}><Sparkles size={17} /> Get started</button><button className="button button-glass" onClick={() => onAction("login")}>I have an account</button></>}
          </div>
        </div>
        <div className="hero-decoration" aria-hidden="true"><div className="hero-disc"><span><Video size={29} fill="currentColor" /></span></div><i className="hero-star star-one">✳</i><i className="hero-star star-two">✦</i></div>
        <div className="hero-footer"><span>01</span><i /><span>{featured ? "YOUR LATEST MOMENT" : "A STREAMTWEET ORIGINAL"}</span><span className="hero-index-right">SCROLL A LITTLE <ArrowDownUp size={13} /></span></div>
        {featured && <button className="hero-watch" onClick={() => onOpenVideo(featured)}>Play your latest <ArrowRight size={16} /></button>}
      </section>

      <div className="section-intro">
        <div><div className="eyebrow">A GOOD PLACE TO START</div><h2>{user ? "Pick up where you left off." : "A little bit of everything."}</h2><p>{user ? "Your StreamTweet space, made yours." : "The best corners of the internet feel like yours."}</p></div>
        <button className="text-link" onClick={() => onPage(user ? "videos" : "channel")}>{user ? "All your videos" : "Find a channel"} <ArrowRight size={16} /></button>
      </div>

      {user && videos.length > 0 ? (
        <div className="featured-grid">{videos.slice(0, 3).map((video, index) => <VideoCard key={idOf(video)} video={video} index={index} onOpen={onOpenVideo} onLike={onLike} user={user} isLiked={isVideoLiked(idOf(video))} compact={index > 0} />)}</div>
      ) : (
        <div className="discovery-grid">
          <button className="discovery-card discovery-purple" onClick={() => onAction(user ? "video-create" : "register")}><span className="discovery-number">01 / VIDEO</span><span className="discovery-illustration play-illustration"><Video size={38} /></span><strong>Stories worth<br />staying up for.</strong><span className="discovery-link">Explore videos <ArrowRight size={15} /></span></button>
          <button className="discovery-card discovery-green" onClick={() => onAction(user ? "tweet-create" : "register")}><span className="discovery-number">02 / THOUGHTS</span><span className="discovery-illustration thought-illustration">✳</span><strong>Little thoughts.<br />Big main character energy.</strong><span className="discovery-link">Share an update <ArrowRight size={15} /></span></button>
          <button className="discovery-card discovery-pink" onClick={() => onAction("channel-search")}><span className="discovery-number">03 / COMMUNITY</span><span className="discovery-illustration community-illustration"><UserRound size={39} /></span><strong>Find your people.<br />Stay for the good stuff.</strong><span className="discovery-link">Find a channel <ArrowRight size={15} /></span></button>
        </div>
      )}
      {user && videos.length === 0 && <EmptyState icon={<Film />} title="It’s a blank canvas." copy="Your first upload could be the start of something." action="Upload your first video" onClick={() => onAction("video-create")} />}
      <section className="closing-banner"><div className="closing-spark">✳</div><div><span className="eyebrow">YOUR PEOPLE ARE HERE</span><h2>Make something.<br /><em>Share it with someone.</em></h2></div><button className="button button-dark" onClick={() => onAction(user ? "tweet-create" : "register")}>{user ? "Write an update" : "Join the vibe"} <ArrowRight size={16} /></button></section>
    </>
  );
}

function PageHeading({ eyebrow, title, description, action, buttonText }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{buttonText && <button className="button button-primary" onClick={action}><Plus size={17} />{buttonText}</button>}</div>;
}

function VideosPage({ videos, user, onOpen, onLike, isVideoLiked, onUpload, onEdit, onDelete, onPublish, query, setQuery, sortBy, setSortBy, sortType, setSortType, onSearch, title = "Your video universe", eyebrow = "THE WATCH LIST", description = "All the moments you’ve put into the world." }) {
  return <><PageHeading eyebrow={eyebrow} title={title} description={description} action={onUpload} buttonText={onUpload ? "Upload video" : undefined} />
    {onSearch && <form className="filter-bar" onSubmit={(event) => { event.preventDefault(); onSearch(); }}><label className="filter-input"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your videos..." /></label><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort by"><option value="createdAt">Recently added</option><option value="views">Most watched</option><option value="title">Title</option></select><button className="button button-outline" type="button" onClick={() => setSortType(sortType === "asc" ? "desc" : "asc")}><ArrowDownUp size={16} />{sortType === "desc" ? "Newest" : "Oldest"}</button><button className="button button-primary filter-go">Search</button></form>}
    {videos.length ? <div className="video-grid">{videos.map((video, index) => <VideoCard key={idOf(video)} video={video} index={index} user={user} onOpen={onOpen} onLike={onLike} isLiked={isVideoLiked(idOf(video))} onEdit={onEdit} onDelete={onDelete} onPublish={onPublish} />)}</div> : <EmptyState icon={<Film />} title="Nothing on the screen just yet." copy="Try another search, or share the first video in your collection." action={onUpload ? "Upload a video" : undefined} onClick={onUpload} />}
  </>;
}

function VideoCard({ video, index = 0, user, onOpen, onLike, isLiked = false, onEdit, onDelete, onPublish, onRemoveFromPlaylist, showManagement = true, compact = false }) {
  const owner = video.ownerdetails || {};
  const owned = user && ownerOf(video) === String(user._id || user.id);
  return <article className={`video-card ${compact ? "video-card-compact" : ""} ${index === 0 ? "video-card-featured" : ""}`}>
    <button className="video-art" onClick={() => onOpen(video)} style={{ backgroundImage: `url("${video.thumbnail || fallbackArt}")` }}>
      <span className="video-play"><Video size={17} fill="currentColor" /></span><span className="video-duration">{video.duration ? `${Math.floor(video.duration / 60)}:${String(Math.floor(video.duration % 60)).padStart(2, "0")}` : "PLAY"}</span>
      {video.isPublished === false && <span className="unpublished-label">DRAFT</span>}
    </button>
    <div className="video-meta">
      {!compact && <Avatar user={owner} size="small" />}
      <div className="video-info"><button className="video-title" onClick={() => onOpen(video)}>{video.title || "Untitled video"}</button><span>{owner.fullname || owner.username || "Your channel"} · {Number(video.views) || 0} views · {timeAgo(video.createdAt)}</span></div>
      <button className={`icon-btn card-like ${isLiked ? "liked" : ""}`} aria-label={isLiked ? "Unlike video" : "Like video"} aria-pressed={isLiked} onClick={() => onLike("video", idOf(video))}><Heart size={17} fill={isLiked ? "currentColor" : "none"} /></button>
    </div>
    {(!compact && showManagement || onRemoveFromPlaylist) && <div className="video-management">{!compact && showManagement && <><button onClick={() => onOpen(video)}>Details & comments</button>{owned && <><button onClick={() => onEdit(video)}>Edit</button><button onClick={() => onPublish(video)}>{video.isPublished ? "Unpublish" : "Publish"}</button><button className="danger-link" onClick={() => onDelete(video)}>Delete</button></>}</>}{onRemoveFromPlaylist && <button className="danger-link" onClick={() => onRemoveFromPlaylist(video)}>Remove from playlist</button>}</div>}
  </article>;
}

function TweetsPage({ tweets, user, onCreate, onLike, onEdit, onDelete }) {
  return <><PageHeading eyebrow="LITTLE THOUGHTS, OUT LOUD" title="Your updates" description="Tiny moments from your corner of the internet." action={onCreate} buttonText="Write an update" />
    <div className="update-feed">{tweets.length ? tweets.map((tweet) => <article className="update-card" key={idOf(tweet)}><div className="update-top"><Avatar user={tweet.ownerdetails || user} size="small" /><div><strong>{tweet.ownerdetails?.fullname || user?.fullname || "You"}</strong><span>@{tweet.ownerdetails?.username || user?.username} · {timeAgo(tweet.createdAt)}</span></div><button className="icon-btn more-btn" aria-label="More"><MoreHorizontal size={19} /></button></div><p>{tweet.content}</p><div className="update-actions"><button onClick={() => onLike("tweet", idOf(tweet))}><Heart size={17} />Send a little love</button>{ownerOf(tweet) === String(user?._id || user?.id) && <><button onClick={() => onEdit(tweet)}>Edit</button><button className="danger-link" onClick={() => onDelete(tweet)}>Delete</button></>}</div></article>) : <EmptyState icon={<MessageCircle />} title="The feed is feeling quiet." copy="Drop a thought and get the conversation going." action="Write your first update" onClick={onCreate} />}</div>
  </>;
}

function HistoryPage({ entries, onOpen }) {
  return <><PageHeading eyebrow="THE GOOD STUFF, AGAIN" title="Watch history" description="A trail of all the videos you’ve watched lately." />
    {entries.length ? <div className="history-list">{entries.map((entry, index) => { const video = entry.video || entry; return <button className="history-row" key={`${idOf(video)}-${index}`} onClick={() => onOpen(video)}><span className="history-thumb" style={{ backgroundImage: `url("${video.thumbnail || fallbackArt}")` }}><Video size={18} fill="currentColor" /></span><span className="history-copy"><strong>{video.title || "Untitled video"}</strong><small>{video.ownerdetails?.fullname || "StreamTweet creator"} · {Number(video.views) || 0} views</small></span><span className="history-time">{timeAgo(entry.updatedAt || entry.createdAt)}</span><ArrowRight size={17} /></button>; })}</div> : <EmptyState icon={<History />} title="Your watch history starts here." copy="Whenever you play a video, you’ll find it waiting here." />}
  </>;
}

function PlaylistsPage({ playlists, onCreate, onOpen, onEdit, onDelete }) {
  return <>
    <PageHeading eyebrow="YOUR PERSONAL COLLECTIONS" title="Your playlists" description="Gather your favorite videos into a collection of your own." action={onCreate} buttonText="Create playlist" />
    {playlists.length ? <div className="playlist-grid">{playlists.map((playlist) => <article className="playlist-card" key={idOf(playlist)}>
      <button className="playlist-card-open" onClick={() => onOpen(playlist)}>
        <span className="playlist-icon"><ListVideo size={22} /></span>
        <span className="playlist-card-copy"><strong>{playlist.name}</strong><small>{playlist.description || "A collection of videos you love."}</small></span>
        <span className="playlist-count">{playlist.videos?.length || 0} videos</span>
      </button>
      <div className="playlist-card-actions"><button onClick={() => onEdit(playlist)}>Edit</button><button className="danger-link" onClick={() => onDelete(playlist)}>Delete</button><button className="playlist-open-link" onClick={() => onOpen(playlist)}>Open collection <ArrowRight size={14} /></button></div>
    </article>)}</div> : <EmptyState icon={<ListVideo />} title="Your playlists are waiting." copy="Create a collection and start saving the videos you want to revisit." action="Create your first playlist" onClick={onCreate} />}
  </>;
}

function PlaylistDetailPage({ playlist, videos, user, onBack, onEdit, onAddVideo, onRemoveVideo, onOpenVideo, onLike, isVideoLiked }) {
  const playlistVideos = playlist.videos || [];
  const includedIds = new Set(playlistVideos.map(idOf));
  const availableVideos = videos.filter((video) => !includedIds.has(idOf(video)));
  return <>
    <button className="text-link playlist-back" onClick={onBack}><ArrowLeft size={15} /> All playlists</button>
    <PageHeading eyebrow="YOUR PERSONAL COLLECTION" title={playlist.name} description={playlist.description || "A collection of videos you love."} action={onEdit} buttonText="Edit playlist" />
    {availableVideos.length > 0 && <form className="playlist-add-video" onSubmit={onAddVideo}>
      <label htmlFor="playlist-video">Add one of your videos</label>
      <select id="playlist-video" name="videoId" defaultValue="" required>
        <option value="" disabled>Choose a video</option>
        {availableVideos.map((video) => <option key={idOf(video)} value={idOf(video)}>{video.title || "Untitled video"}</option>)}
      </select>
      <button className="button button-primary"><Plus size={16} /> Add video</button>
    </form>}
    {playlistVideos.length ? <div className="video-grid">{playlistVideos.map((video, index) => <VideoCard key={idOf(video)} video={video} index={index} user={user} onOpen={onOpenVideo} onLike={onLike} isLiked={isVideoLiked(idOf(video))} onRemoveFromPlaylist={onRemoveVideo} showManagement={false} />)}</div> : <EmptyState icon={<Film />} title="This playlist is empty for now." copy={availableVideos.length ? "Choose one of your videos above to add it to this collection." : "Upload a video first, then come back to add it here."} />}
  </>;
}

function ChannelPage({ channel, user, onFind, onOpenVideo }) {
  const profile = channel?.user || channel?.channel || channel;
  const videos = channel?.videos || channel?.userVideos || [];
  const channelPlaylists = channel?.playlists || [];
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
  useEffect(() => setSelectedPlaylistId(""), [profile?._id]);
  const channelVideos = profile?._id
    ? videos.filter((video) => ownerOf(video) === String(profile._id))
    : videos;
  const selectedPlaylist = channelPlaylists.find((playlist) => idOf(playlist) === selectedPlaylistId);
  const selectedVideoIds = new Set((selectedPlaylist?.videos || []).map(String));
  const displayedVideos = selectedPlaylist
    ? channelVideos.filter((video) => selectedVideoIds.has(idOf(video)))
    : channelVideos;
  return <><PageHeading eyebrow="YOUR CORNER OF STREAMTWEET" title={profile?.fullname || profile?.username || "Find a channel"} description={profile?.username ? `@${profile.username} · ${displayedVideos.length} videos` : "Look up a creator by their username."} action={profile?.username ? undefined : onFind} buttonText={profile?.username ? undefined : "Find a channel"} />
    {profile?.username ? <><div className="channel-cover" style={{ backgroundImage: `linear-gradient(90deg,rgba(14,13,21,.8),rgba(14,13,21,.1)),url("${profile.coverImage || fallbackArt}")` }}><Avatar user={profile} size="large" /><div><span className="eyebrow">CREATOR SPACE</span><h2>{profile.fullname || profile.username}</h2><span>@{profile.username}</span></div></div>
      {channelPlaylists.length > 0 && <div className="channel-playlist-filter"><label htmlFor="channel-playlist">Browse playlists</label><select id="channel-playlist" value={selectedPlaylistId} onChange={(event) => setSelectedPlaylistId(event.target.value)}><option value="">All videos</option>{channelPlaylists.map((playlist) => <option key={idOf(playlist)} value={idOf(playlist)}>{playlist.name}</option>)}</select></div>}
      {displayedVideos.length ? <div className="video-grid">{displayedVideos.map((video, index) => <VideoCard key={idOf(video)} video={video} index={index} user={user} onOpen={onOpenVideo} onLike={() => {}} />)}</div> : <EmptyState icon={<Film />} title={selectedPlaylist ? "No videos in this playlist yet." : "No videos to show yet."} copy={selectedPlaylist ? "This playlist does not have any videos available on this channel." : "This channel’s next story is still loading."} />}
      <ChannelTweets tweets={channel?.tweets || []} onOpenVideo={onOpenVideo} />
    </> : <EmptyState icon={<Compass />} title="Your next favorite creator is out there." copy="Enter a username to open their channel." action="Find a channel" onClick={onFind} />}
  </>;
}

function ChannelTweets({ tweets, onOpenVideo }) {
  return <section className="channel-updates">
    <div className="section-intro"><div><span className="eyebrow">AROUND THE COMMUNITY</span><h2>Recent updates</h2><p>Thoughts shared by this creator.</p></div></div>
    {tweets.length ? <div className="channel-update-list">{tweets.map((item) => <article className="channel-update" key={idOf(item)}>
      <Avatar user={item.ownerdetails} size="small" />
      <div className="channel-update-content"><p>{item.content}</p>{item.video && <button className="channel-update-video" onClick={() => onOpenVideo(item.video)}><Video size={14} /> On “{item.video.title || "Untitled video"}” <ArrowRight size={13} /></button>}</div>
      <span className="channel-update-time">{timeAgo(item.createdAt)}</span>
    </article>)}</div> : <EmptyState icon={<MessageCircle />} title="No updates to show yet." copy="Posts shared by this creator will appear here." />}
  </section>;
}

function SettingsPage({ user, api, setUser, onNotify, onLogout }) {
  const [busy, setBusy] = useState(false);
  const saveProfile = async (event) => {
    event.preventDefault(); setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const result = await api("/users/update-other-details", { method: "PUT", body: JSON.stringify({ fullname: data.get("fullname"), email: data.get("email") }) });
      const next = result.data || { ...user, fullname: data.get("fullname"), email: data.get("email") };
      setUser(next); onNotify(result.message || "Profile updated.");
    } catch (error) { onNotify(error.message); } finally { setBusy(false); }
  };
  const changePassword = async (event) => {
    event.preventDefault(); setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const result = await api("/users/change-password", { method: "PUT", body: JSON.stringify({ oldpassword: data.get("oldpassword"), newpassword: data.get("newpassword") }) });
      form.reset(); onNotify(result.message || "Password changed.");
    } catch (error) { onNotify(error.message); } finally { setBusy(false); }
  };
  const updateAvatar = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const result = await api("/users/update-avatar", { method: "PUT", body: new FormData(event.currentTarget) });
      if (!result.data?.avatar) throw new Error(result.message || "The API did not return an updated avatar.");
      setUser(result.data); onNotify(result.message || "Avatar updated.");
    } catch (error) { onNotify(error.message); } finally { setBusy(false); }
  };
  return <><PageHeading eyebrow="MAKE YOURSELF AT HOME" title="Account settings" description="A few little details to keep your corner feeling like you." />
    <div className="settings-layout">
      <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><UserRound size={18} /></span><div><h2>Your profile</h2><p>Keep your details current.</p></div></div><form onSubmit={saveProfile} className="settings-form"><label>Full name<input name="fullname" defaultValue={user?.fullname || ""} required /></label><label>Email address<input name="email" type="email" defaultValue={user?.email || ""} required /></label><button className="button button-primary" disabled={busy}>Save changes <ArrowRight size={16} /></button></form></section>
      <section className="settings-card avatar-settings"><div className="settings-card-heading"><span className="settings-icon"><Sparkles size={18} /></span><div><h2>Your picture</h2><p>Give your profile a little personality.</p></div></div><div className="current-avatar"><Avatar user={user} size="large" /><div><strong>{user?.fullname || user?.username}</strong><span>@{user?.username}</span></div></div><form onSubmit={updateAvatar} className="settings-form"><label>Upload a new avatar<input type="file" name="avatar" accept="image/*" required /></label><button className="button button-outline" disabled={busy}>Update avatar <ArrowRight size={16} /></button></form></section>
      <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><Settings size={18} /></span><div><h2>Change password</h2><p>Choose something only you know.</p></div></div><form onSubmit={changePassword} className="settings-form"><label>Current password<input name="oldpassword" type="password" autoComplete="current-password" required /></label><label>New password<input name="newpassword" type="password" autoComplete="new-password" minLength={6} required /></label><button className="button button-outline" disabled={busy}>Update password <ArrowRight size={16} /></button></form></section>
      <section className="settings-card account-exit"><div><h2>Ready to log off?</h2><p>Your space will be right here when you get back.</p></div><button className="button button-danger" onClick={onLogout}><LogOut size={16} /> Sign out</button></section>
    </div>
  </>;
}

function EmptyState({ icon, title, copy, action, onClick }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h2>{title}</h2><p>{copy}</p>{action && <button className="button button-primary" onClick={onClick}>{action} <ArrowRight size={16} /></button>}</div>;
}

function Modal({ modal, busy, close, submit, activeVideo, comments, user, onComment, onLike, isActiveVideoLiked, onDelete, onEdit }) {
  const type = modal.type;
  const title = {
    login: "Welcome back.", register: "Your people are here.", "video-create": "Make a little movie magic.",
    "tweet-create": "What’s on your mind?", "channel-search": "Find your kind of people.",
    "playlist-create": "Start a new collection.", "playlist-edit": "Shape your playlist.",
    "video-edit": "Make a quick edit.", "tweet-edit": "Polish that thought.", "comment-edit": "Edit your comment.",
  }[type] || "Let’s do this.";
  const copy = {
    login: "Log in to your StreamTweet space.", register: "Create an account. Bring your whole vibe.",
    "video-create": "Upload a video to your channel.", "tweet-create": "Share a thought with your community.",
    "channel-search": "Enter a username to open their channel.", "video-edit": "Update this video’s details.",
    "playlist-create": "Give your new collection a name and an optional description.",
    "playlist-edit": "Update the name or description of this collection.",
  }[type] || "";
  if (type === "video-detail") return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="detail-modal"><button className="modal-close" onClick={close}><X size={20} /></button><div className="detail-player-wrap">{activeVideo?.videofile ? <video src={activeVideo.videofile} controls autoPlay playsInline /> : <div className="detail-still" style={{ backgroundImage: `url("${activeVideo?.thumbnail || fallbackArt}")` }}><span><Video size={28} /></span></div>}</div><div className="detail-content"><span className="eyebrow">IN THE STREAM</span><h2>{activeVideo?.title || "A little something to watch."}</h2><p className="detail-description">{activeVideo?.description || "No description provided."}</p><div className="detail-owner"><Avatar user={activeVideo?.ownerdetails} size="small" /><span>{activeVideo?.ownerdetails?.fullname || "StreamTweet creator"} <small>· {Number(activeVideo?.views) || 0} views</small></span><button className={`button button-outline detail-like ${isActiveVideoLiked ? "liked" : ""}`} aria-label={isActiveVideoLiked ? "Unlike video" : "Like video"} aria-pressed={isActiveVideoLiked} onClick={() => onLike("video", idOf(activeVideo))}><Heart size={16} fill={isActiveVideoLiked ? "currentColor" : "none"} /> {isActiveVideoLiked ? "Liked" : "Like"}</button></div><div className="comments-panel"><div className="comments-title"><div><h3>Say something nice.</h3><span>{comments.length} comments</span></div><MessageCircle size={19} /></div>{user ? <form className="comment-form" onSubmit={onComment}><input name="content" maxLength={1000} placeholder="Add to the conversation..." required /><button aria-label="Post comment" className="button button-primary"><ArrowRight size={16} /></button></form> : <p className="comment-signin">Log in to join the conversation.</p>}<div className="comments-list">{comments.map((comment) => <article className="comment-row" key={idOf(comment)}><Avatar user={comment.ownerdetails} size="small" /><div><strong>{comment.ownerdetails?.fullname || "Community member"} <small>{timeAgo(comment.createdAt)}</small></strong><p>{comment.content}</p><div className="comment-actions"><button onClick={() => onLike("comment", idOf(comment))}><Heart size={13} /> Like</button>{ownerOf(comment) === String(user?._id || user?.id) && <><button onClick={() => onEdit(comment)}>Edit</button><button className="danger-link" onClick={() => onDelete("comment", idOf(comment))}>Delete</button></>}</div></div></article>)}</div></div></div></section></div>;
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="form-modal"><button className="modal-close" onClick={close} aria-label="Close"><X size={20} /></button><span className="modal-mark"><Sparkles size={20} /></span><span className="eyebrow">STREAMTWEET / YOUR SPACE</span><h2>{title}</h2><p className="modal-copy">{copy}</p><form className="modal-form" onSubmit={submit}>
    {type === "login" && <><Field label="Email or username" name="identity" autoComplete="username" /><Field label="Password" name="password" type="password" autoComplete="current-password" /><button className="text-link auth-switch" type="button" onClick={() => { close(); window.dispatchEvent(new CustomEvent("open-register")); }}>New here? Create an account <ArrowRight size={14} /></button></>}
    {type === "register" && <><Field label="Full name" name="fullname" /><Field label="Email address" name="email" type="email" /><Field label="Username" name="username" /><Field label="Password (6+ characters)" name="password" type="password" minLength={6} /><Field label="Avatar image" name="avatar" type="file" accept="image/*" required /><Field label="Cover image (optional)" name="coverImage" type="file" accept="image/*" required={false} /></>}
    {type === "video-create" && <><Field label="Video title" name="title" /><Field label="Description" name="description" textarea /><Field label="Video file" name="videofile" type="file" accept="video/*" /><Field label="Thumbnail image" name="thumbnail" type="file" accept="image/*" /></>}
    {type === "tweet-create" && <Field label="Your update" name="content" textarea maxLength={500} />}
    {type === "channel-search" && <Field label="Creator username" name="username" />}
    {type === "playlist-create" && <><Field label="Playlist name" name="name" maxLength={100} /><Field label="Description (optional)" name="description" textarea maxLength={500} required={false} /></>}
    {type === "playlist-edit" && <><Field label="Playlist name" name="name" maxLength={100} defaultValue={modal.item?.name} /><Field label="Description (optional)" name="description" textarea maxLength={500} defaultValue={modal.item?.description} required={false} /></>}
    {type === "video-edit" && <><Field label="Title" name="title" defaultValue={modal.item?.title} required={false} /><Field label="Description" name="description" textarea defaultValue={modal.item?.description} required={false} /><Field label="Replace thumbnail (optional)" name="thumbnail" type="file" accept="image/*" required={false} /></>}
    {type === "tweet-edit" && <Field label="Update text" name="content" textarea defaultValue={modal.item?.content} />}
    {type === "comment-edit" && <Field label="Comment" name="content" textarea defaultValue={modal.item?.content} />}
    <button className="button button-primary modal-submit" disabled={busy}>{busy ? "One sec..." : type === "login" ? "Log in" : type === "register" ? "Create account" : type === "video-create" ? "Upload video" : type === "tweet-create" ? "Share update" : type === "playlist-create" ? "Create playlist" : type.includes("edit") ? "Save changes" : "Open channel"} <ArrowRight size={16} /></button>
  </form></section></div>;
}

function Field({ label, name, type = "text", textarea = false, ...props }) {
  return <label className="field-label">{label}{textarea ? <textarea name={name} rows={4} required {...props} /> : <input name={name} type={type} required {...props} />}</label>;
}
