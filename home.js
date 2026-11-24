/* ============================================================
   ANIVERSE — Página inicial
   Banner, seções via Jikan API e recomendações personalizadas.
   ============================================================ */
"use strict";
ANIVERSE.pathPrefix = "";

async function renderRow(elId, fetcher, emptyMsg) {
  const row = document.getElementById(elId);
  if (!row) return;
  row.innerHTML = skeletonCards(6);
  try {
    const data = await fetcher();
    if (!data.length) { row.innerHTML = `<div class="no-results"><div class="big">🌙</div>${emptyMsg}</div>`; return; }
    row.innerHTML = data.map(a => animeCard(a)).join("");
    bindFavButtons(row);
    paintFavStates(row);
    initScrollFx();
  } catch (e) {
    console.error(e);
    row.innerHTML = `<div class="no-results"><div class="big">⚠️</div>Não foi possível carregar agora. Tente novamente em instantes.</div>`;
  }
}

async function renderHero() {
  try {
    const top = await jikanFetch("/top/anime?limit=8");
    const pick = top.find(a => a.trailer?.images?.maximum_image_url) || top[0];
    if (!pick) return;
    const bg = document.getElementById("hero-bg");
    bg.style.backgroundImage = `url('${pick.trailer?.images?.maximum_image_url || pick.images?.jpg?.large_image_url}')`;
    const genres = (pick.genres || []).map(g => g.name).join(" • ");
    document.getElementById("hero-content").innerHTML = `
      <span class="hero-badge">🔥 Anime em destaque</span>
      <h1 class="hero-title">${esc(pick.title)}</h1>
      <div class="hero-meta">
        <span class="score">★ ${pick.score ? pick.score.toFixed(2) : "—"}</span>
        <span>${esc(pick.year || "—")}</span>
        <span>${pick.episodes ? pick.episodes + " episódios" : ""}</span>
        <span>${esc(genres)}</span>
      </div>
      <p class="hero-synopsis">${esc(stripTags(pick.synopsis || ""))}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="pages/anime.html?id=${pick.mal_id}">Saiba mais</a>
        <button class="btn btn-ghost btn-fav" id="hero-fav">♥ Favoritar</button>
      </div>`;
    document.getElementById("hero-fav").addEventListener("click", async function () {
      this.classList.toggle("toggled");
      await toggleFavorite(pick, null);
      this.classList.toggle("toggled", await inList("favorites", pick.mal_id));
    });
    const fav = await inList("favorites", pick.mal_id);
    if (fav) document.getElementById("hero-fav").classList.add("toggled");
  } catch (e) { console.error("Hero:", e); }
}

async function renderRecommendations() {
  const row = document.getElementById("row-reco");
  const hint = document.getElementById("reco-hint");
  try {
    let ids = [];
    let genreNames = [];
    if (ANIVERSE.user) {
      const lists = await getUserLists();
      ids = Object.values(lists).flat();
      const h = storageGet(LS.history, []);
      genreNames = [...new Set(h.flatMap(x => x.genres || []))];
    } else {
      const lists = getLocalLists();
      ids = Object.values(lists).flat();
      const h = storageGet(LS.history, []);
      genreNames = [...new Set(h.flatMap(x => x.genres || []))];
    }
    let data = [];
    if (genreNames.length) {
      const g = await jikanFetch(`/genres/anime`);
      const match = g.filter(x => genreNames.includes(x.name)).slice(0, 2).map(x => x.mal_id);
      if (match.length) {
        data = await jikanFetch(`/anime?genres=${match.join(",")}&order_by=score&sort=desc&limit=12&sfw=true`);
      }
    }
    if (!data.length && ids.length) {
      try {
        const recs = await jikanFetch(`/anime/${ids[0]}/recommendations`);
        data = recs.slice(0, 12).map(r => r.entry);
      } catch {}
    }
    if (!data.length) data = await jikanFetch("/top/anime?limit=12");
    if (hint) hint.textContent = ids.length || genreNames.length
      ? "Baseado nos seus favoritos e no seu histórico 💜"
      : "Entre na sua conta e favorite animes para receber recomendações personalizadas.";
    row.innerHTML = data.map(a => animeCard(a)).join("");
    bindFavButtons(row); paintFavStates(row); initScrollFx();
  } catch (e) {
    row.innerHTML = `<div class="no-results"><div class="big">⚠️</div>Recomendações indisponíveis no momento.</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderHero();
  renderRow("row-trending", () => jikanFetch("/top/anime?filter=bypopularity&limit=12"), "Nada em alta no momento.");
  renderRow("row-top", () => jikanFetch("/top/anime&limit=12"), "Sem avaliações disponíveis.");
  renderRow("row-season", () => jikanFetch("/seasons/now?limit=12&sfw=true"), "Nenhum anime na temporada atual.");
  renderRow("row-upcoming", () => jikanFetch("/seasons/upcoming?limit=12&sfw=true"), "Nenhum lançamento anunciado.");
  renderRecommendations();
  const hour = new Date().getHours();
  toast((hour < 12 ? "おはよう" : hour < 18 ? "こんにちは" : "こんばんは") + "! Bem-vindo à Aniverse 🌸", "info");
});
