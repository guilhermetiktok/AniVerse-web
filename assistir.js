/* ============================================================
   ANIVERSE — Onde Assistir
   Busca de animes + detalhes de plataformas oficiais por título.
   ============================================================ */
"use strict";
ANIVERSE.pathPrefix = "../";

async function showPlatforms(anime, mount) {
  mount.innerHTML = `<p style="color:var(--text-dim);font-size:.9rem">Consultando plataformas oficiais para <b>${esc(anime.title)}</b>...</p>`;
  const platforms = {
    "crunchyroll": { name: "Crunchyroll", color: "#f47521", url: "https://www.crunchyroll.com/" },
    "netflix": { name: "Netflix", color: "#e50914", url: "https://www.netflix.com/" },
    "prime video": { name: "Prime Video", color: "#00a8e1", url: "https://www.primevideo.com/" },
    "hulu": { name: "Hulu", color: "#1ce783", url: "https://www.hulu.com/" },
    "disney": { name: "Disney+", color: "#2563eb", url: "https://www.disneyplus.com/" },
    "hidive": { name: "HIDIVE", color: "#00aeef", url: "https://www.hidive.com/" },
    "tubi": { name: "Tubi", color: "#ff5a76", url: "https://tubitv.com/" }
  };
  try {
    const data = await jikanFetch(`/anime/${anime.mal_id}/streaming`);
    const entries = (data || []).map(s => {
      const key = Object.keys(platforms).find(k => s.name.toLowerCase().includes(k));
      return key ? { ...platforms[key], url: s.url } : { name: s.name, color: "var(--primary)", url: s.url };
    });
    const eps = anime.episodes ? `${anime.episodes} episódios` : "episódios: a confirmar";
    const cover = `
      <div class="provider-card" style="grid-column:1/-1;gap:18px">
        <img src="${esc(anime.images?.jpg?.image_url || "")}" alt="">
        <div>
          <div class="pc-name">${esc(anime.title)}</div>
          <div class="pc-plat">${eps} • ${esc(anime.status || "")} • ★ ${anime.score ?? "—"}</div>
          <p style="font-size:.82rem;color:var(--text-dim);margin-top:8px;max-width:640px">${esc(stripTags(anime.synopsis || "").slice(0, 220))}...</p>
        </div>
      </div>`;
    if (!entries.length) {
      mount.innerHTML = cover + `
        <div class="watch-item" style="grid-column:1/-1">
          <span class="wi-icon">🔎</span>
          <div><div class="wi-name">Nenhuma plataforma oficial encontrada</div>
          <div class="wi-sub">Não foi possível localizar uma opção licenciada para este anime no momento. Verifique diretamente no catálogo das principais plataformas.</div></div>
        </div>`;
      return;
    }
    mount.innerHTML = cover + entries.map(p => `
      <div class="provider-card">
        <span style="width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:${p.color}22;color:${p.color};font-size:1.3rem">▶️</span>
        <div><div class="pc-name" style="color:${p.color === "var(--primary)" ? "var(--text)" : p.color}">${esc(p.name)}</div>
        <div class="pc-plat">Streaming oficial licenciado</div></div>
        <a class="btn-watch" href="${esc(p.url)}" target="_blank" rel="noopener nofollow" style="margin-left:auto">Assistir ↗</a>
      </div>`).join("");
  } catch {
    mount.innerHTML = `<p style="color:var(--text-dim)">Não foi possível verificar as plataformas agora. Tente novamente em instantes.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("watch-q");
  const results = document.getElementById("watch-results");
  const run = debounce(async q => {
    if (q.trim().length < 3) { results.innerHTML = ""; return; }
    results.innerHTML = `<p style="color:var(--text-dim);font-size:.88rem">Buscando...</p>`;
    try {
      const data = await jikanFetch(`/anime?q=${encodeURIComponent(q)}&limit=5&sfw=true`);
      if (!data.length) { results.innerHTML = `<p style="color:var(--text-dim);font-size:.88rem">Nenhum anime encontrado para "${esc(q)}".</p>`; return; }
      results.innerHTML = data.map(a => `
        <div class="watch-item">
          <img src="${esc(a.images?.jpg?.small_image_url || "")}" style="width:42px;height:58px;object-fit:cover;border-radius:8px" alt="">
          <div><div class="wi-name">${esc(a.title)}</div><div class="wi-sub">${a.year || "—"} • ${a.episodes ?? "?"} eps • ★ ${a.score ?? "—"}</div></div>
          <button class="btn-watch pick-platform" data-id="${a.mal_id}">Ver opções</button>
        </div>`).join("");
      $$(".pick-platform", results).forEach(b => b.addEventListener("click", async () => {
        const full = await jikanFetch(`/anime/${b.dataset.id}`, 24*3600*1000);
        showPlatforms(full, results);
        results.scrollIntoView({ behavior: "smooth", block: "start" });
      }));
    } catch {
      results.innerHTML = `<p style="color:var(--text-dim);font-size:.88rem">Busca indisponível no momento.</p>`;
    }
  }, 450);
  input.addEventListener("input", e => run(e.target.value));

  /* populares com link direto para a página de detalhes (onde ficam as plataformas) */
  const row = document.getElementById("watch-popular");
  row.innerHTML = skeletonCards(6);
  jikanFetch("/top/anime?filter=bypopularity&limit=10")
    .then(data => {
      row.innerHTML = data.map(a => animeCard(a)).join("");
      bindFavButtons(row); paintFavStates(row);
    })
    .catch(() => { row.innerHTML = `<div class="no-results"><div class="big">⚠️</div>Indisponível no momento.</div>`; });
});
