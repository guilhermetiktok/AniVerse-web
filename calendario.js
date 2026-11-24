/* ============================================================
   ANIVERSE — Calendário de lançamentos
   Temporada atual, próximos lançamentos e arquivo por ano/estação,
   agrupados por dia da semana quando há dados.
   ============================================================ */
"use strict";
ANIVERSE.pathPrefix = "../";

const DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
let mode = "now";
let currentItems = [];

const STATUS = {
  "Currently Airing": ["Em exibição", "status-airing"],
  "Finished Airing": ["Finalizado", "status-complete"],
  "Not yet aired": ["A estrear", "status-upcoming"]
};

function pill(a) {
  const [label, cls] = STATUS[a.status] || [a.status || "—", "status-upcoming"];
  return `<span class="status-pill ${cls}">${esc(label)}</span>`;
}

function calItem(a) {
  const broadcast = a.broadcast?.string
    ? `📡 ${esc(a.broadcast.string)}${a.broadcast.time ? " • " + esc(a.broadcast.time) + " (JST)" : ""}`
    : "📡 Dia/horário não informado pela API";
  const season = a.season ? `${esc(a.season[0].toUpperCase() + a.season.slice(1))} ${a.year ?? ""}` : (a.year ?? "—");
  return `
  <div class="cal-item">
    <a href="anime.html?id=${a.mal_id}"><img src="${esc(a.images?.jpg?.image_url || "")}" alt="" loading="lazy"></a>
    <div class="cal-info">
      <div class="ci-title"><a href="anime.html?id=${a.mal_id}">${esc(a.title)}</a></div>
      <div class="ci-sub">🗓️ ${season} • 🎬 ${a.episodes ?? "?"} eps • ★ ${a.score ?? "—"}</div>
      <div class="ci-sub">${broadcast}</div>
    </div>
    ${pill(a)}
    <button class="btn-watch cal-add" data-id="${a.mal_id}" title="Adicionar à lista">＋ Lista</button>
  </div>`;
}

function groupByDay(items) {
  const groups = {};
  items.forEach(a => {
    const day = a.broadcast?.day || "Sem dia definido";
    (groups[day] = groups[day] || []).push(a);
  });
  return groups;
}

function renderList(items) {
  const list = document.getElementById("cal-list");
  const count = document.getElementById("cal-count");
  const dayTabs = document.getElementById("day-tabs");
  if (!items.length) {
    list.innerHTML = `<div class="no-results"><div class="big">🌙</div><p>Nenhum anime encontrado para este período.</p></div>`;
    count.textContent = "0 animes";
    dayTabs.style.display = "none";
    return;
  }
  const groups = groupByDay(items);
  const days = Object.keys(groups);
  const useTabs = mode === "now" && days.length > 1;
  dayTabs.style.display = useTabs ? "flex" : "none";
  count.textContent = `${items.length} animes`;

  const paint = filterDay => {
    const show = filterDay ? (groups[filterDay] || []) : items;
    list.innerHTML = show.map(calItem).join("");
    bindCalButtons();
    if (useTabs) {
      dayTabs.innerHTML = [`<button class="cal-day ${!filterDay ? "on" : ""}" data-day="">Todos (${items.length})</button>`]
        .concat(days.map(d => `<button class="cal-day ${filterDay === d ? "on" : ""}" data-day="${esc(d)}">${esc(d)} (${groups[d].length})</button>`)).join("");
      $$(".cal-day", dayTabs).forEach(b => b.addEventListener("click", () => paint(b.dataset.day || null)));
    }
  };
  paint(null);
}

function bindCalButtons() {
  $$(".cal-add").forEach(b => b.addEventListener("click", async () => {
    const full = await jikanFetch(`/anime/${b.dataset.id}`, 24*3600*1000);
    await toggleListAnime("watching", full);
  }));
}

async function load() {
  const list = document.getElementById("cal-list");
  list.innerHTML = Array.from({length:4}, () => `<div class="skel shimmer" style="height:110px"></div>`).join("");
  try {
    if (mode === "now") currentItems = await jikanFetch("/seasons/now?limit=24&sfw=true");
    else if (mode === "upcoming") currentItems = await jikanFetch("/seasons/upcoming?limit=24&sfw=true");
    else {
      const now = new Date();
      let year = now.getFullYear();
      const seasons = ["winter","spring","summer","fall"];
      const cur = seasons[Math.floor(((now.getMonth() + 1) % 12) / 3)];
      let idx = seasons.indexOf(cur) - 1;
      if (idx < 0) { idx = 3; year -= 1; }
      currentItems = await jikanFetch(`/seasons/${year}/${seasons[idx]}?limit=24&sfw=true`);
    }
    renderList(currentItems);
  } catch (e) {
    console.error(e);
    list.innerHTML = `<div class="no-results"><div class="big">⚠️</div><h3>Calendário indisponível</h3><p>A API pode estar fora do ar ou com limite de requisições. Aguarde um instante e tente novamente.</p><button class="load-more" onclick="load()">Tentar novamente</button></div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $$("#cal-tabs .ptab").forEach(t => t.addEventListener("click", () => {
    $$("#cal-tabs .ptab").forEach(x => x.classList.remove("on"));
    t.classList.add("on");
    mode = t.dataset.mode;
    load();
  }));
  load();
});
