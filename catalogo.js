/* ============================================================
   ANIVERSE — Catálogo com filtros, busca e paginação
   ============================================================ */
"use strict";
ANIVERSE.pathPrefix = "../";

const state = { q: "", genres: [], year: "", minScore: 0, status: "", sort: "popularity", page: 1, hasMore: false };

function buildQuery() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.genres.length) p.set("genres", state.genres.join(","));
  if (state.year) p.set("start_date", state.year + "-01-01");
  if (state.minScore) p.set("min_score", state.minScore);
  if (state.status) p.set("status", state.status);
  p.set("order_by", state.sort === "popularity" ? "members" : state.sort);
  p.set("sort", state.sort === "title" ? "asc" : "desc");
  p.set("limit", "24");
  p.set("page", String(state.page));
  p.set("sfw", "true");
  return "/anime?" + p.toString();
}

async function loadCatalog(append = false) {
  const grid = document.getElementById("catalog-grid");
  const count = document.getElementById("result-count");
  const more = document.getElementById("btn-more");
  if (!append) grid.innerHTML = skeletonCards(12);
  more.style.display = "none";
  try {
    const res = await fetch("https://api.jikan.moe/v4" + buildQuery());
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    const items = json.data || [];
    const total = json.pagination?.items?.total ?? items.length;
    if (!append) grid.innerHTML = "";
    if (!items.length && !append) {
      grid.innerHTML = `<div class="no-results" style="grid-column:1/-1"><div class="big">🔍</div><h3>Nenhum resultado encontrado</h3><p>Tente ajustar os filtros ou buscar por outro nome.</p></div>`;
      count.textContent = "0 resultados";
      return;
    }
    grid.insertAdjacentHTML("beforeend", items.map(a => animeCard(a)).join(""));
    state.hasMore = json.pagination?.has_next_page || false;
    more.style.display = state.hasMore ? "block" : "none";
    count.textContent = `${total.toLocaleString("pt-BR")} animes encontrados` + (state.q ? ` para "${state.q}"` : "");
    bindFavButtons(grid); paintFavStates(grid); initScrollFx();
  } catch (e) {
    console.error(e);
    if (!append) grid.innerHTML = `<div class="no-results" style="grid-column:1/-1"><div class="big">⚠️</div><h3>Catálogo indisponível</h3><p>A API está fora do ar ou o limite de requisições foi atingido. Aguarde um instante e tente novamente.</p><button class="load-more" onclick="loadCatalog()">Tentar novamente</button></div>`;
    else toast("Não foi possível carregar mais animes.", "error");
  }
}

async function loadGenreChips() {
  const box = document.getElementById("f-genres");
  try {
    const genres = await jikanFetch("/genres/anime");
    const top = genres.filter(g => g.count > 800).sort((a, b) => b.count - a.count).slice(0, 24);
    box.innerHTML = top.map(g =>
      `<button class="chip" data-gid="${g.mal_id}">${esc(g.name)}</button>`).join("");
    box.addEventListener("click", e => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      chip.classList.toggle("on");
      const id = chip.dataset.gid;
      state.genres = chip.classList.contains("on")
        ? [...state.genres, id]
        : state.genres.filter(x => x !== id);
      state.page = 1; loadCatalog();
    });
  } catch {
    box.innerHTML = `<span class="search-empty">Gêneros indisponíveis.</span>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  if (params.get("q")) { state.q = params.get("q"); document.getElementById("f-q").value = state.q; }
  if (params.get("sort") === "score") document.getElementById("f-sort").value = "score";

  document.getElementById("f-q").addEventListener("input", debounce(e => {
    state.q = e.target.value.trim(); state.page = 1; loadCatalog();
  }, 500));
  document.getElementById("f-year").addEventListener("change", e => {
    state.year = e.target.value.trim(); state.page = 1; loadCatalog();
  });
  document.getElementById("f-score").addEventListener("input", e => {
    state.minScore = +e.target.value;
    document.getElementById("f-score-v").textContent = state.minScore;
    state.page = 1; loadCatalog();
  });
  document.getElementById("f-status").addEventListener("change", e => {
    state.status = e.target.value; state.page = 1; loadCatalog();
  });
  document.getElementById("f-sort").addEventListener("change", e => {
    state.sort = e.target.value; state.page = 1; loadCatalog();
  });
  document.getElementById("f-clear").addEventListener("click", () => {
    Object.assign(state, { q: "", genres: [], year: "", minScore: 0, status: "", sort: "popularity", page: 1 });
    document.getElementById("f-q").value = "";
    document.getElementById("f-year").value = "";
    document.getElementById("f-score").value = 0;
    document.getElementById("f-score-v").textContent = "0";
    document.getElementById("f-status").value = "";
    document.getElementById("f-sort").value = "popularity";
    $$(".chip.on").forEach(c => c.classList.remove("on"));
    loadCatalog();
  });
  document.getElementById("btn-more").addEventListener("click", () => {
    state.page++; loadCatalog(true);
  });

  loadGenreChips();
  loadCatalog();
});
