/* ============================================================
   ANIVERSE — Núcleo compartilhado
   Header/Footer, tema, busca, favoritos, toasts, notificações,
   utilidades de API (Jikan) com cache, scroll reveal.
   ============================================================ */
"use strict";

const ANIVERSE = window.ANIVERSE || {};
window.ANIVERSE = ANIVERSE;

/* ---------- Constantes ---------- */
const JIKAN = "https://api.jikan.moe/v4";
const LS = {
  theme: "aniverse_theme",
  favs: "aniverse_favs",
  lists: "aniverse_lists",
  ratings: "aniverse_ratings",
  prefs: "aniverse_prefs",
  cache: "aniverse_cache",
  history: "aniverse_history"
};
const USER_LISTS = ["favorites", "watching", "want", "watched", "dropped", "custom"];
const LIST_LABELS = {
  favorites: "⭐ Favoritos",
  watching: "▶️ Assistindo",
  want: "📌 Quero assistir",
  watched: "✅ Já assisti",
  dropped: "🚫 Abandonados",
  custom: "📁 Minha lista"
};

/* ---------- Utilidades ---------- */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}
function stripTags(str) { return String(str ?? "").replace(/<[^>]*>/g, ""); }
function debounce(fn, ms = 350) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
function timeAgo(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "agora mesmo";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `há ${days} d`;
  return new Date(ts).toLocaleDateString("pt-BR");
}
function storageGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function storageSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/* ---------- Toast ---------- */
function toast(msg, type = "info") {
  let wrap = $("#toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icons = { success: "✅", error: "⚠️", info: "💬" };
  el.innerHTML = `<span>${icons[type] || "💬"}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, 3400);
}

/* ---------- Tema ---------- */
function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  storageSet(LS.theme, theme);
}
function toggleTheme() {
  const next = document.body.classList.contains("light") ? "dark" : "light";
  applyTheme(next);
  toast(next === "light" ? "Modo claro ativado ☀️" : "Modo escuro ativado 🌙", "info");
}
applyTheme(storageGet(LS.theme, "dark"));

/* ---------- Estado do usuário ---------- */
ANIVERSE.user = null;
ANIVERSE.userData = null; // doc Firestore do perfil

auth.onAuthStateChanged(async (u) => {
  ANIVERSE.user = u;
  updateAuthUI();
  if (u) {
    try {
      const snap = await db.collection("users").doc(u.uid).get();
      ANIVERSE.userData = snap.exists ? snap.data() : null;
      if (!snap.exists) {
        await db.collection("users").doc(u.uid).set({
          displayName: u.displayName || "Usuário",
          photoURL: u.photoURL || "",
          bio: "",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          prefs: { notifEpisodes: true, notifNews: true, notifReplies: true }
        });
        ANIVERSE.userData = { displayName: u.displayName || "Usuário" };
      }
      loadNotifications(u.uid);
      document.dispatchEvent(new CustomEvent("aniverse:auth", { detail: { user: u } }));
    } catch (e) {
      console.error("Erro ao carregar perfil:", e);
    }
  } else {
    ANIVERSE.userData = null;
    renderNotifications([]);
    document.dispatchEvent(new CustomEvent("aniverse:auth", { detail: { user: null } }));
  }
});

function updateAuthUI() {
  const chip = $("#avatar-chip"), btn = $("#btn-login-nav");
  if (!chip && !btn) return;
  if (ANIVERSE.user) {
    if (chip) {
      chip.style.display = "block";
      chip.innerHTML = `<img src="${esc(ANIVERSE.user.photoURL || "https://api.dicebear.com/7.x/shapes/svg?seed=" + encodeURIComponent(ANIVERSE.user.uid))}" alt="Perfil">`;
      chip.onclick = () => location.href = ANIVERSE.pathPrefix + "pages/perfil.html";
    }
    if (btn) {
      btn.textContent = "Sair";
      btn.onclick = logout;
    }
  } else {
    if (chip) chip.style.display = "none";
    if (btn) {
      btn.textContent = "Entrar";
      btn.onclick = () => location.href = ANIVERSE.pathPrefix + "pages/login.html";
    }
  }
}

async function logout() {
  try {
    await auth.signOut();
    toast("Você saiu da conta. Até logo! 👋", "success");
    setTimeout(() => location.href = ANIVERSE.pathPrefix + "index.html", 800);
  } catch (e) { toast("Erro ao sair: " + e.message, "error"); }
}

/* ---------- Header / Footer / Menu mobile ---------- */
function buildHeader() {
  const page = document.body.dataset.page || "";
  const p = ANIVERSE.pathPrefix;
  const link = (href, label, key) =>
    `<li><a href="${p}${href}" class="${page === key ? "active" : ""}">${label}</a></li>`;
  const header = $("#site-header");
  if (header) header.innerHTML = `
  <nav class="nav-wrap">
    <a class="logo" href="${p}index.html">アニ<span>VERSE</span></a>
    <ul class="nav-links">
      ${link("index.html", "Início", "home")}
      ${link("pages/catalogo.html", "Animes", "catalogo")}
      ${link("pages/calendario.html", "Calendário", "calendario")}
      ${link("pages/assistir.html", "Assistir", "assistir")}
      ${link("pages/comunidade.html", "Comunidade", "comunidade")}
      ${link("pages/sobre.html", "Sobre nós", "sobre")}
    </ul>
    <div class="nav-actions">
      <div class="search-box hide-mobile">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" id="nav-search" placeholder="Buscar animes..." autocomplete="off">
        <div class="search-results" id="search-results"></div>
      </div>
      <button class="icon-btn hide-mobile" id="btn-theme" title="Alternar tema" aria-label="Alternar tema">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.3 11.3 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button>
      <button class="icon-btn" id="btn-notif" title="Notificações" aria-label="Notificações">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
        <span class="notif-badge" id="notif-badge" style="display:none">0</span>
      </button>
      <a class="avatar-chip" id="avatar-chip" title="Meu perfil"></a>
      <button class="btn-login" id="btn-login-nav">Entrar</button>
      <button class="icon-btn" id="hamburger" aria-label="Abrir menu">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    </div>
  </nav>
  <div class="mobile-menu" id="mobile-menu">
    <a href="${p}index.html">🏠 Início</a>
    <a href="${p}pages/catalogo.html">🎬 Animes</a>
    <a href="${p}pages/calendario.html">📅 Calendário</a>
    <a href="${p}pages/assistir.html">📺 Assistir</a>
    <a href="${p}pages/comunidade.html">👥 Comunidade</a>
    <a href="${p}pages/perfil.html">👤 Meu perfil</a>
    <a href="${p}pages/sobre.html">ℹ️ Sobre nós</a>
    <a href="${p}pages/premium.html">💎 Premium</a>
  </div>
  <div class="notif-panel" id="notif-panel"><h4>🔔 Notificações</h4><div id="notif-list"></div></div>`;

  $("#btn-theme")?.addEventListener("click", toggleTheme);
  const ham = $("#hamburger");
  ham?.addEventListener("click", () => $("#mobile-menu").classList.toggle("open"));
  $$("#mobile-menu a").forEach(a => a.addEventListener("click", () => $("#mobile-menu").classList.remove("open")));
  $("#btn-notif")?.addEventListener("click", toggleNotifPanel);

  /* busca dinâmica */
  const input = $("#nav-search");
  if (input) {
    const box = $("#search-results");
    const run = debounce(async (q) => {
      if (q.trim().length < 3) { box.classList.remove("show"); return; }
      try {
        const data = await jikanFetch(`/anime?q=${encodeURIComponent(q)}&limit=6&sfw=true`);
        if (!data.length) {
          box.innerHTML = `<div class="search-empty">Nenhum anime encontrado para "${esc(q)}"</div>`;
        } else {
          box.innerHTML = data.map(a => `
            <a class="search-item" href="${p}pages/anime.html?id=${a.mal_id}">
              <img src="${esc(a.images?.jpg?.small_image_url || a.images?.jpg?.image_url || "")}" alt="" loading="lazy">
              <div><div class="si-title">${esc(a.title)}</div>
              <div class="si-sub">${esc(a.year || (a.aired?.prop?.from?.year ?? "—"))} • ★ ${a.score ?? "—"}</div></div>
            </a>`).join("");
        }
        box.classList.add("show");
      } catch {
        box.innerHTML = `<div class="search-empty">Busca indisponível no momento.</div>`;
        box.classList.add("show");
      }
    }, 400);
    input.addEventListener("input", e => run(e.target.value));
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && input.value.trim().length >= 2) {
        location.href = `${p}pages/catalogo.html?q=${encodeURIComponent(input.value.trim())}`;
      }
    });
    document.addEventListener("click", e => {
      if (!e.target.closest(".search-box")) box.classList.remove("show");
    });
  }
}

function buildFooter() {
  const p = ANIVERSE.pathPrefix;
  const footer = $("#site-footer");
  if (!footer) return;
  footer.innerHTML = `
  <div class="footer-grid">
    <div>
      <a class="logo" href="${p}index.html">アニ<span>VERSE</span></a>
      <p class="footer-desc">Sua plataforma completa sobre o universo dos animes: catálogo atualizado, calendário de lançamentos, comunidade, recomendações e muito mais — tudo em um só lugar.</p>
      <div class="socials">
        <a href="#" aria-label="Discord" onclick="toast('Em breve! Siga nossas novidades.','info');return false"><svg viewBox="0 0 24 24"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3c-.2.4-.5.9-.6 1.3a18.3 18.3 0 0 0-5.5 0C9.1 3.9 8.8 3.4 8.6 3a19.7 19.7 0 0 0-4.9 1.5A20.4 20.4 0 0 0 .2 18.1a19.9 19.9 0 0 0 6 3c.5-.7.9-1.4 1.3-2.1-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.4 0l.5.4c-.7.4-1.4.7-2.1 1 .4.7.8 1.4 1.3 2.1a19.8 19.8 0 0 0 6-3 20.3 20.3 0 0 0-3.6-13.7ZM8.7 15.3c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.1 1.1 2.1 2.4-.9 2.4-2.1 2.4Zm6.6 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.1 1.1 2.1 2.4-.9 2.4-2.1 2.4Z"/></svg></a>
        <a href="#" aria-label="X" onclick="toast('Em breve! Siga nossas novidades.','info');return false"><svg viewBox="0 0 24 24"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.6 2H8l4.4 5.9L18.9 2Zm-1.1 18h1.7L7.6 3.9H5.8L17.8 20Z"/></svg></a>
        <a href="#" aria-label="Instagram" onclick="toast('Em breve! Siga nossas novidades.','info');return false"><svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.9.1-3.2 0-3.6 0-4.8-.1-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.8s0-3.6.1-4.8C2.4 4 4 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2Zm0 3.6a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-10.4a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9Z"/></svg></a>
        <a href="#" aria-label="YouTube" onclick="toast('Em breve! Siga nossas novidades.','info');return false"><svg viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z"/></svg></a>
      </div>
    </div>
    <div>
      <h4>Navegação</h4>
      <ul class="footer-links">
        <li><a href="${p}index.html">Início</a></li>
        <li><a href="${p}pages/catalogo.html">Animes</a></li>
        <li><a href="${p}pages/calendario.html">Calendário</a></li>
        <li><a href="${p}pages/assistir.html">Assistir</a></li>
        <li><a href="${p}pages/comunidade.html">Comunidade</a></li>
      </ul>
    </div>
    <div>
      <h4>Conta</h4>
      <ul class="footer-links">
        <li><a href="${p}pages/login.html">Entrar</a></li>
        <li><a href="${p}pages/perfil.html">Meu perfil</a></li>
        <li><a href="${p}pages/premium.html">Premium</a></li>
      </ul>
    </div>
    <div>
      <h4>Institucional</h4>
      <ul class="footer-links">
        <li><a href="${p}pages/sobre.html">Sobre nós</a></li>
        <li><a href="${p}pages/privacidade.html">Política de Privacidade</a></li>
        <li><a href="${p}pages/termos.html">Termos de Uso</a></li>
      </ul>
    </div>
  </div>
  <div class="container">
    <div class="dev-banner">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      <span>Este projeto está em constante desenvolvimento. Novas funcionalidades, melhorias e atualizações estão sendo implementadas para proporcionar a melhor experiência possível aos usuários.</span>
    </div>
  </div>
  <div class="footer-bottom">
    <div>© ${new Date().getFullYear()} <b>Aniverse</b> — Todos os direitos reservados. Dados fornecidos pela <a href="https://jikan.moe" target="_blank" rel="noopener">Jikan API (MyAnimeList)</a>.</div>
    <div class="dev-credit">Projeto em desenvolvimento • Desenvolvido por <b>Guilherme Barreto</b></div>
  </div>`;
}

/* ---------- Jikan API com cache ---------- */
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas
async function jikanFetch(path, ttl = CACHE_TTL) {
  const key = path.split("?")[0];
  const cacheAll = storageGet(LS.cache, {});
  const hit = cacheAll[key];
  if (hit && Date.now() - hit.t < ttl) return hit.data;
  const res = await fetch(JIKAN + path);
  if (!res.ok) throw new Error("Jikan " + res.status);
  const json = await res.json();
  const data = json.data;
  cacheAll[key] = { t: Date.now(), data };
  storageSet(LS.cache, cacheAll);
  return data;
}

/* ---------- Favoritos / listas (LocalStorage + Firestore) ---------- */
function getLocalLists() { return storageGet(LS.lists, {}); }
function saveLocalLists(l) { storageSet(LS.lists, l); }

async function getUserLists() {
  if (ANIVERSE.user) {
    try {
      const snap = await db.collection("users").doc(ANIVERSE.user.uid).collection("lists").get();
      const out = {};
      snap.forEach(d => out[d.id] = d.data().animeIds || []);
      return out;
    } catch { return getLocalLists(); }
  }
  return getLocalLists();
}

async function inList(listName, animeId) {
  const lists = await getUserLists();
  return (lists[listName] || []).includes(animeId);
}

async function toggleListAnime(listName, anime) {
  const id = anime.mal_id ?? anime.id;
  if (!id) return;
  if (ANIVERSE.user) {
    const ref = db.collection("users").doc(ANIVERSE.user.uid).collection("lists").doc(listName);
    try {
      const snap = await ref.get();
      const arr = snap.exists ? (snap.data().animeIds || []) : [];
      const idx = arr.indexOf(id);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(id);
      await ref.set({ animeIds: arr, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      toast(idx >= 0 ? `Removido de ${LIST_LABELS[listName]}` : `Adicionado a ${LIST_LABELS[listName]} 💜`, "success");
      return idx < 0;
    } catch (e) { toast("Erro ao salvar: " + e.message, "error"); return null; }
  } else {
    const lists = getLocalLists();
    const arr = lists[listName] || (lists[listName] = []);
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(id);
    saveLocalLists(lists);
    toast(idx >= 0 ? `Removido de ${LIST_LABELS[listName]}` : `Adicionado a ${LIST_LABELS[listName]} 💜 (salvo no navegador)`, "success");
    return idx < 0;
  }
}

async function toggleFavorite(anime, btn) {
  const added = await toggleListAnime("favorites", anime);
  if (added === null) return;
  if (btn) { btn.classList.toggle("active", added); btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); }
}

/* ---------- Histórico de navegação (recomendações) ---------- */
function trackVisit(anime) {
  const h = storageGet(LS.history, []);
  const entry = { id: anime.mal_id, title: anime.title, genres: (anime.genres || []).map(g => g.name) };
  const filtered = h.filter(x => x.id !== entry.id);
  filtered.unshift(entry);
  storageSet(LS.history, filtered.slice(0, 40));
}

/* ---------- Notificações ---------- */
function toggleNotifPanel() {
  if (!ANIVERSE.user) { toast("Faça login para ver notificações.", "info"); return; }
  $("#notif-panel").classList.toggle("show");
}
let notifUnsub = null;
function loadNotifications(uid) {
  if (notifUnsub) notifUnsub();
  notifUnsub = db.collection("users").doc(uid).collection("notifications")
    .orderBy("createdAt", "desc").limit(20)
    .onSnapshot(snap => {
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      renderNotifications(items);
      const unread = items.filter(n => !n.read).length;
      const badge = $("#notif-badge");
      if (badge) { badge.style.display = unread ? "grid" : "none"; badge.textContent = unread; }
    }, () => renderNotifications([]));
}
function renderNotifications(items) {
  const list = $("#notif-list");
  if (!list) return;
  if (!items.length) { list.innerHTML = `<div class="search-empty">Nenhuma notificação por aqui. 🌙</div>`; return; }
  list.innerHTML = items.map(n => `
    <div class="notif-item ${n.read ? "read" : "unread"}" data-id="${n.id}">
      <span class="ni-dot"></span>
      <div>${esc(n.text)}<small>${n.createdAt?.toDate ? timeAgo(n.createdAt.toDate().getTime()) : ""}</small></div>
    </div>`).join("");
  $$(".notif-item", list).forEach(el => el.addEventListener("click", async () => {
    if (!ANIVERSE.user) return;
    try { await db.collection("users").doc(ANIVERSE.user.uid).collection("notifications").doc(el.dataset.id).update({ read: true }); } catch {}
  }));
}
async function pushNotification(uid, text) {
  try {
    await db.collection("users").doc(uid).collection("notifications").add({
      text, read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch {}
}

/* ---------- Cards de anime ---------- */
function animeCard(a, opts = {}) {
  const img = a.images?.jpg?.image_url || a.images?.jpg?.small_image_url || "";
  const year = a.year || a.aired?.prop?.from?.year || "—";
  const genres = (a.genres || []).slice(0, 2);
  return `
  <article class="anime-card visible" data-id="${a.mal_id}">
    <a class="cover" href="${ANIVERSE.pathPrefix}pages/anime.html?id=${a.mal_id}">
      <img src="${esc(img)}" alt="${esc(a.title)}" loading="lazy">
      ${a.score ? `<span class="score-pill">★ ${a.score.toFixed(1)}</span>` : ""}
    </a>
    <button class="fav-btn" data-fav="${a.mal_id}" title="Favoritar">♥</button>
    <div class="card-body">
      <a class="card-title" href="${ANIVERSE.pathPrefix}pages/anime.html?id=${a.mal_id}">${esc(a.title)}</a>
      <div class="card-meta"><span>${esc(year)}</span><span>${a.episodes ? a.episodes + " eps" : (a.status ? esc(a.status) : "")}</span></div>
      <div class="card-genres">${genres.map(g => `<span class="tag">${esc(g.name)}</span>`).join("")}</div>
    </div>
  </article>`;
}
function skeletonCards(n) {
  return Array.from({ length: n }, () =>
    `<div class="skel shimmer"><div class="sk-cover shimmer"></div><div class="sk-line shimmer"></div><div class="sk-line short shimmer"></div></div>`).join("");
}
function bindFavButtons(scope = document) {
  $$("[data-fav]", scope).forEach(btn => {
    btn.addEventListener("click", async e => {
      e.preventDefault();
      const id = +btn.dataset.fav;
      try {
        const data = await jikanFetch(`/anime/${id}`, 24 * 3600 * 1000);
        await toggleFavorite(data, btn);
      } catch { toast("Não foi possível carregar o anime.", "error"); }
    });
  });
}
async function paintFavStates(scope = document) {
  const btns = $$("[data-fav]", scope);
  if (!btns.length) return;
  const lists = await getUserLists();
  const favs = lists.favorites || [];
  btns.forEach(b => b.classList.toggle("active", favs.includes(+b.dataset.fav)));
}

/* ---------- Scroll reveal / back to top / loader ---------- */
function initScrollFx() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in", "visible"); io.unobserve(e.target); } });
  }, { threshold: .12 });
  $$(".reveal, .anime-card").forEach(el => io.observe(el));

  const top = $("#back-top");
  window.addEventListener("scroll", () => {
    top?.classList.toggle("show", window.scrollY > 500);
  }, { passive: true });
  top?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}
function hideLoader() {
  const l = $("#loader");
  if (l) { setTimeout(() => l.classList.add("hide"), 350); setTimeout(() => l.remove(), 1000); }
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  buildHeader();
  buildFooter();
  updateAuthUI();
  initScrollFx();
  hideLoader();
  window.addEventListener("load", hideLoader);
  setTimeout(hideLoader, 3000);
});
