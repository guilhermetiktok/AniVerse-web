/* ============================================================
   ANIVERSE — Página individual do anime
   Detalhes, personagens, episódios, onde assistir, curiosidades,
   avaliação, comentários moderados e recomendações.
   ============================================================ */
"use strict";
ANIVERSE.pathPrefix = "../";

const animeId = +new URLSearchParams(location.search).get("id");
let ANIME = null;
const RANK_LABEL = { 1: "🏆 Ouro", 2: "🥈 Prata", 3: "🥉 Bronze" };

async function loadDetail() {
  const hero = document.getElementById("detail-hero");
  const body = document.getElementById("detail-body");
  if (!animeId) { body.innerHTML = `<div class="no-results"><div class="big">❓</div>Anime não informado.</div>`; return; }
  try {
    ANIME = await jikanFetch(`/anime/${animeId}`, 24 * 3600 * 1000);
  } catch {
    body.innerHTML = `<div class="no-results"><div class="big">⚠️</div><h3>Não foi possível carregar este anime</h3><p>A API pode estar temporariamente indisponível. <a href="catalogo.html" style="color:var(--accent)">Voltar ao catálogo</a></p></div>`;
    return;
  }
  trackVisit(ANIME);
  document.title = `${ANIME.title} — Aniverse`;
  const bg = ANIME.trailer?.images?.maximum_image_url || ANIME.images?.jpg?.large_image_url || "";
  const studios = (ANIME.studios || []).map(s => s.name).join(", ") || "—";
  const genres = (ANIME.genres || []).concat(ANIME.themes || []);
  const synonyms = [ANIME.title_english, ANIME.title_japanese].filter(Boolean).join(" • ");

  hero.innerHTML = `
    <div class="dh-bg" style="background-image:url('${esc(bg)}')"></div>
    <div class="dh-overlay"></div>
    <div class="container detail-grid">
      <div class="detail-poster"><img src="${esc(ANIME.images?.jpg?.large_image_url || "")}" alt="${esc(ANIME.title)}"></div>
      <div>
        <h1 class="detail-title">${esc(ANIME.title)}</h1>
        ${synonyms ? `<p class="detail-alt">${esc(synonyms)}</p>` : ""}
        <div class="detail-stats">
          <span class="stat">⭐ Nota <b>${ANIME.score ? ANIME.score.toFixed(2) : "—"}</b></span>
          <span class="stat">📅 <b>${esc(String(ANIME.year || (ANIME.aired?.prop?.from?.year ?? "—")))}</b></span>
          <span class="stat">🎬 <b>${ANIME.episodes ?? "?"}</b> episódios</span>
          <span class="stat">📡 <b>${esc(ANIME.status)}</b></span>
        </div>
        <div class="hero-actions" style="margin-top:18px">
          <button class="btn btn-primary btn-fav" id="d-fav">♥ Favoritar</button>
          <select id="d-list" class="btn btn-ghost" style="cursor:pointer;background:var(--bg-3);border-color:rgba(139,92,246,.4)">
            <option value="">+ Adicionar a uma lista</option>
            ${USER_LISTS.map(l => `<option value="${l}">${LIST_LABELS[l]}</option>`).join("")}
          </select>
        </div>
        <p class="detail-synopsis" style="margin-top:20px">${esc(stripTags(ANIME.synopsis || "Sinopse indisponível."))}</p>
      </div>
    </div>`;

  body.innerHTML = `
    <div class="grid-2" style="margin-top:30px">
      <aside>
        <div class="filters">
          <h3>📋 Informações</h3>
          <table class="info-table">
            <tr><td>Tipo</td><td>${esc(ANIME.type || "—")}</td></tr>
            <tr><td>Estúdio</td><td>${esc(studios)}</td></tr>
            <tr><td>Gêneros</td><td>${genres.map(g => `<span class="tag">${esc(g.name)}</span>`).join(" ") || "—"}</td></tr>
            <tr><td>Classificação</td><td>${esc(ANIME.rating || "—")}</td></tr>
            <tr><td>Duração</td><td>${esc(ANIME.duration || "—")}</td></tr>
            <tr><td>Popularidade</td><td>#${ANIME.popularity ?? "—"} no MyAnimeList</td></tr>
            <tr><td>Rank</td><td>${ANIME.rank ? `#${ANIME.rank} ${RANK_LABEL[ANIME.rank] || ""}` : "—"}</td></tr>
            <tr><td>Fonte</td><td>${esc(ANIME.source || "—")}</td></tr>
          </table>
        </div>
        <div class="filters" style="margin-top:20px">
          <h3>💡 Curiosidades</h3>
          <ul style="list-style:none;display:flex;flex-direction:column;gap:12px;font-size:.88rem;color:var(--text-dim);line-height:1.6">
            ${ANIME.background ? `<li>📝 ${esc(stripTags(ANIME.background))}</li>` : ""}
            <li>🔥 Este anime tem <b style="color:var(--accent)">${(ANIME.members ?? 0).toLocaleString("pt-BR")}</b> membros acompanhando no MyAnimeList.</li>
            ${ANIME.score ? `<li>⭐ Com <b style="color:var(--accent)">${(ANIME.scored_by ?? 0).toLocaleString("pt-BR")}</b> votos, a nota média é ${ANIME.score.toFixed(2)}/10.</li>` : ""}
            ${(ANIME.producers?.length || ANIME.licensors?.length) ? `<li>🏢 Licenciado por: ${esc((ANIME.licensors || []).map(l => l.name).join(", ") || "informação indisponível")}.</li>` : ""}
            ${ANIME.trailer?.embed_url ? `<li>🎞️ <a href="${esc(ANIME.trailer.url)}" target="_blank" rel="noopener" style="color:var(--accent)">Assistir trailer oficial no YouTube</a></li>` : ""}
          </ul>
        </div>
      </aside>
      <section>
        <section class="section" style="padding-top:0">
          <div class="section-head"><h2>👥 Personagens principais</h2></div>
          <div class="char-grid" id="char-grid"><div class="skel shimmer" style="grid-column:1/-1;height:120px"></div></div>
        </section>
        <section class="section">
          <div class="section-head"><h2>📺 Episódios</h2></div>
          <div id="ep-wrap"><p style="color:var(--text-dim);font-size:.9rem">Carregando episódios...</p></div>
        </section>
        <section class="section">
          <div class="section-head"><h2>▶️ Onde assistir</h2></div>
          <div id="stream-wrap"><p style="color:var(--text-dim);font-size:.9rem">Verificando plataformas oficiais...</p></div>
        </section>
        <section class="section">
          <div class="section-head"><h2>🎬 Semelhantes</h2></div>
          <div class="card-row" id="reco-grid"></div>
        </section>
        <section class="section">
          <div class="section-head"><h2>💬 Comentários</h2></div>
          <div id="comments-wrap"></div>
        </section>
      </section>
    </div>`;

  /* ações de lista */
  const favBtn = document.getElementById("d-fav");
  favBtn.addEventListener("click", async () => {
    await toggleFavorite(ANIME, null);
    favBtn.classList.toggle("toggled", await inList("favorites", animeId));
  });
  favBtn.classList.toggle("toggled", await inList("favorites", animeId));
  document.getElementById("d-list").addEventListener("change", async e => {
    if (!e.target.value) return;
    await toggleListAnime(e.target.value, ANIME);
    e.target.value = "";
  });

  loadCharacters(); loadEpisodes(); loadStreaming(); loadRecommendations(); initComments();
}

async function loadCharacters() {
  const grid = document.getElementById("char-grid");
  try {
    const chars = await jikanFetch(`/anime/${animeId}/characters`);
    const mains = chars.filter(c => c.role === "Main").slice(0, 8);
    const list = mains.length ? mains : chars.slice(0, 8);
    if (!list.length) { grid.innerHTML = `<p style="color:var(--text-dim)">Nenhum personagem cadastrado.</p>`; return; }
    grid.innerHTML = list.map(c => `
      <div class="char-card reveal">
        <img src="${esc(c.character?.images?.jpg?.image_url || "")}" alt="${esc(c.character?.name || "")}" loading="lazy">
        <div class="cc-body">
          <div class="cc-name">${esc(c.character?.name || "")}</div>
          <div class="cc-role">${esc(c.role === "Main" ? "Protagonista" : c.role === "Supporting" ? "Coadjuvante" : "Participação")} • ${esc((c.voice_actors?.[0]?.person?.name) || "")}</div>
        </div>
      </div>`).join("");
    initScrollFx();
  } catch { grid.innerHTML = `<p style="color:var(--text-dim)">Personagens indisponíveis no momento.</p>`; }
}

async function loadEpisodes() {
  const wrap = document.getElementById("ep-wrap");
  try {
    const eps = await jikanFetch(`/anime/${animeId}/episodes`);
    if (!eps.length) {
      wrap.innerHTML = `<p style="color:var(--text-dim);font-size:.9rem">Nenhum episódio detalhado disponível${ANIME.episodes ? ` — este anime possui ${ANIME.episodes} episódios no total.` : "."}</p>`;
      return;
    }
    wrap.innerHTML = `<div class="episode-list">${eps.slice(0, 24).map(ep => `
      <div class="ep-item">EP ${ep.mal_id} — ${esc(ep.title || "Episódio " + ep.mal_id)}
      ${ep.aired ? `<br><small style="color:var(--text-dim)">${new Date(ep.aired).toLocaleDateString("pt-BR")}</small>` : ""}</div>`).join("")}</div>
      ${eps.length > 24 ? `<p style="color:var(--text-dim);font-size:.82rem;margin-top:10px">Exibindo 24 de ${eps.length} episódios.</p>` : ""}`;
  } catch {
    wrap.innerHTML = `<p style="color:var(--text-dim);font-size:.9rem">Não foi possível carregar a lista de episódios (a API pode ter limite para este título).</p>`;
  }
}

async function loadStreaming() {
  const wrap = document.getElementById("stream-wrap");
  const platforms = {
    "crunchyroll": { name: "Crunchyroll", color: "#f47521", url: "https://www.crunchyroll.com/" },
    "netflix": { name: "Netflix", color: "#e50914", url: "https://www.netflix.com/" },
    "prime video": { name: "Prime Video", color: "#00a8e1", url: "https://www.primevideo.com/" },
    "hulu": { name: "Hulu", color: "#1ce783", url: "https://www.hulu.com/" },
    "disney+": { name: "Disney+", color: "#2563eb", url: "https://www.disneyplus.com/" },
    "hidive": { name: "HIDIVE", color: "#00aeef", url: "https://www.hidive.com/" }
  };
  try {
    const data = await jikanFetch(`/anime/${animeId}/streaming`);
    const entries = (data || []).map(s => {
      const key = Object.keys(platforms).find(k => s.name.toLowerCase().includes(k));
      return key ? { ...platforms[key], url: s.url } : { name: s.name, color: "var(--primary)", url: s.url };
    });
    if (!entries.length) {
      wrap.innerHTML = `<div class="watch-item"><span class="wi-icon">🔎</span><div><div class="wi-name">Nenhuma plataforma oficial encontrada</div><div class="wi-sub">Não foi possível localizar uma opção licenciada para este anime. Verifique o catálogo das principais plataformas.</div></div></div>`;
      return;
    }
    wrap.innerHTML = `<div class="watch-list">${entries.map(p => `
      <div class="watch-item">
        <span class="wi-icon" style="color:${p.color}">▶️</span>
        <div><div class="wi-name">${esc(p.name)}</div><div class="wi-sub">Streaming oficial licenciado</div></div>
        <a class="btn-watch" href="${esc(p.url)}" target="_blank" rel="noopener nofollow">Assistir ↗</a>
      </div>`).join("")}</div>
      <p style="font-size:.76rem;color:var(--text-dim);margin-top:12px">A Aniverse não hospeda episódios. Os links levam apenas a serviços oficiais licenciados.</p>`;
  } catch {
    wrap.innerHTML = `<p style="color:var(--text-dim);font-size:.9rem">Não foi possível verificar as plataformas no momento.</p>`;
  }
}

async function loadRecommendations() {
  const grid = document.getElementById("reco-grid");
  try {
    let data = await jikanFetch(`/anime/${animeId}/recommendations`);
    let list = data.slice(0, 6).map(r => r.entry);
    if (!list.length) {
      const g = (ANIME.genres?.[0]?.mal_id);
      if (g) list = await jikanFetch(`/anime?genres=${g}&order_by=score&sort=desc&limit=6&sfw=true`);
    }
    if (!list.length) { grid.innerHTML = `<p style="color:var(--text-dim)">Sem recomendações disponíveis.</p>`; return; }
    grid.innerHTML = list.map(a => animeCard(a)).join("");
    bindFavButtons(grid); paintFavStates(grid);
  } catch { grid.innerHTML = `<p style="color:var(--text-dim)">Recomendações indisponíveis.</p>`; }
}

/* ---------- Comentários + avaliações (Firestore, moderados) ---------- */
const BANNED = ["http://", "https://", "www.", ".com", ".net", ".xyz", "click aqui", "clique aqui", "grátis agora", "sua senha", "idiota", "burro", "lixo", "morra"];
function isSpammy(text) {
  const t = text.toLowerCase();
  return BANNED.some(b => t.includes(b)) || /(.)\1{9,}/.test(t);
}

function initComments() {
  const wrap = document.getElementById("comments-wrap");
  wrap.innerHTML = `
    <div class="form-card" style="padding:22px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <b>Sua avaliação:</b>
        <div class="rating-input" id="rate-input">${[1,2,3,4,5,6,7,8,9,10].map(n => `<button data-v="${n}">★</button>`).join("")}</div>
        <span id="rate-label" class="accent" style="font-weight:700">—</span>
      </div>
      <div class="comment-form" style="margin-top:0">
        <input type="text" id="comment-input" maxlength="300" placeholder="${ANIVERSE.user ? "Compartilhe sua opinião (sem links)..." : "Faça login para comentar"}" ${ANIVERSE.user ? "" : "disabled"}>
        <button class="btn btn-primary" id="comment-send" style="padding:10px 22px" ${ANIVERSE.user ? "" : "disabled"}>Enviar</button>
      </div>
    </div>
    <div id="comment-list"><p style="color:var(--text-dim);font-size:.9rem">Carregando comentários...</p></div>`;

  /* avaliação 0–10 */
  let myRate = storageGet(LS.ratings, {})[animeId] || 0;
  const label = document.getElementById("rate-label");
  function paintRate() {
    $$("#rate-input button").forEach(b => b.classList.toggle("on", +b.dataset.v <= myRate));
    label.textContent = myRate ? `${myRate}/10` : "—";
  }
  paintRate();
  document.getElementById("rate-input").addEventListener("click", async e => {
    const b = e.target.closest("button"); if (!b) return;
    myRate = +b.dataset.v;
    const ratings = storageGet(LS.ratings, {});
    ratings[animeId] = myRate;
    storageSet(LS.ratings, ratings);
    if (ANIVERSE.user) {
      try { await db.collection("ratings").doc(`${ANIVERSE.user.uid}_${animeId}`).set({ uid: ANIVERSE.user.uid, animeId, score: myRate, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); } catch {}
    }
    paintRate();
    toast(`Avaliação salva: ${myRate}/10 ⭐`, "success");
  });

  /* envio de comentário */
  document.getElementById("comment-send").addEventListener("click", submitComment);
  document.getElementById("comment-input").addEventListener("keydown", e => { if (e.key === "Enter") submitComment(); });

  async function submitComment() {
    const input = document.getElementById("comment-input");
    const text = input.value.trim();
    if (text.length < 2) { toast("Escreva um comentário um pouco maior.", "error"); return; }
    if (isSpammy(text)) { toast("Seu comentário contém conteúdo não permitido (links ou termos inadequados).", "error"); return; }
    if (!ANIVERSE.user) { toast("Faça login para comentar.", "info"); return; }
    try {
      await db.collection("comments").add({
        animeId, uid: ANIVERSE.user.uid,
        author: ANIVERSE.userData?.displayName || ANIVERSE.user.displayName || "Usuário",
        avatar: ANIVERSE.user.photoURL || "",
        text, score: myRate,
        likes: 0, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      input.value = "";
      toast("Comentário publicado! 💬", "success");
    } catch (e) { toast("Erro ao publicar: " + e.message, "error"); }
  }

  /* listagem em tempo real */
  db.collection("comments").where("animeId", "==", animeId).orderBy("createdAt", "desc").limit(30)
    .onSnapshot(snap => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      const el = document.getElementById("comment-list");
      if (!list.length) {
        el.innerHTML = `<p style="color:var(--text-dim);font-size:.9rem">Nenhum comentário ainda. Seja o primeiro! 🌸</p>`;
        return;
      }
      el.innerHTML = list.map(c => `
        <div class="comment">
          <img src="${esc(c.avatar || "https://api.dicebear.com/7.x/shapes/svg?seed=" + encodeURIComponent(c.uid))}" alt="">
          <div class="cm-bubble">
            <span class="cm-author">${esc(c.author)}</span>
            ${c.score ? `<span style="color:var(--warning);font-size:.78rem"> ★ ${c.score}/10</span>` : ""}
            <span style="color:var(--text-dim);font-size:.72rem;float:right">${c.createdAt?.toDate ? timeAgo(c.createdAt.toDate().getTime()) : ""}</span>
            <div>${esc(c.text)}</div>
          </div>
        </div>`).join("");
    }, () => {
      document.getElementById("comment-list").innerHTML = `<p style="color:var(--text-dim);font-size:.9rem">Comentários indisponíveis no momento.</p>`;
    });
}

document.addEventListener("DOMContentLoaded", loadDetail);
