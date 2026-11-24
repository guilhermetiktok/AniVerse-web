/* ============================================================
   ANIVERSE — Perfil do usuário
   Edição de perfil, listas, avaliações, histórico e preferências.
   ============================================================ */
"use strict";
ANIVERSE.pathPrefix = "../";

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("aniverse:auth", e => {
    if (e.detail.user) { showApp(); } else { showGuest(); }
  });
});

function showGuest() {
  document.getElementById("profile-guest").style.display = "block";
  document.getElementById("profile-app").style.display = "none";
}
async function showApp() {
  document.getElementById("profile-guest").style.display = "none";
  document.getElementById("profile-app").style.display = "block";
  await renderHeader();
  await renderLists();
  renderRatings();
  renderHistory();
  bindTabs();
  bindEdit();
  await bindPrefs();
}

async function renderHeader() {
  const u = ANIVERSE.user, d = ANIVERSE.userData || {};
  const avatar = d.photoURL || u.photoURL || "https://api.dicebear.com/7.x/shapes/svg?seed=" + encodeURIComponent(u.uid);
  document.querySelector("#pf-avatar img").src = avatar;
  document.getElementById("pf-name").textContent = d.displayName || u.displayName || "Usuário";
  document.getElementById("pf-bio").textContent = d.bio || "Este usuário ainda não escreveu uma biografia.";
  document.getElementById("pf-since").textContent = d.createdAt?.toDate
    ? d.createdAt.toDate().toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—";
  /* contagem e média */
  const lists = await getUserLists();
  const allIds = [...new Set(Object.values(lists).flat())];
  document.getElementById("pf-count").textContent = allIds.length;
  const ratings = storageGet(LS.ratings, {});
  const vals = Object.values(ratings);
  document.getElementById("pf-avg").textContent = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) + "/10" : "—";
  /* migrar favoritos locais para a conta na primeira entrada */
  const local = getLocalLists();
  const localIds = Object.values(local).flat();
  if (localIds.length) {
    try {
      for (const [list, ids] of Object.entries(local)) {
        if (!ids.length) continue;
        const ref = db.collection("users").doc(u.uid).collection("lists").doc(list);
        const snap = await ref.get();
        const merged = [...new Set([...(snap.exists ? snap.data().animeIds || [] : []), ...ids])];
        await ref.set({ animeIds: merged, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
      localStorage.removeItem(LS.lists);
      toast("Seus favoritos salvos no navegador foram sincronizados com sua conta 💜", "success");
    } catch {}
  }
}

/* ---------- Listas ---------- */
async function renderLists() {
  const box = document.getElementById("lists-container");
  box.innerHTML = "<p style='color:var(--text-dim)'>Carregando suas listas...</p>";
  const lists = await getUserLists();
  const cache = storageGet(LS.cache, {});
  let html = "";
  for (const key of USER_LISTS) {
    const ids = lists[key] || [];
    if (!ids.length) { html += `<div class="filters" style="margin-bottom:16px"><h3>${LIST_LABELS[key]}</h3><p style="color:var(--text-dim);font-size:.86rem">Nenhum anime nesta lista ainda.</p></div>`; continue; }
    let cards = "";
    for (const id of ids.slice(0, 12)) {
      const hit = Object.values(cache).find(c => Array.isArray(c.data) && c.data.some(a => a.mal_id === id));
      const a = hit ? hit.data.find(x => x.mal_id === id) : null;
      cards += a ? animeCard(a) : `<div class="anime-card visible" data-id="${id}"><div class="cover" style="display:grid;place-items:center;color:var(--text-dim);font-size:.8rem">Anime #${id}</div>
        <div class="card-body"><div class="card-title">Anime #${id}</div>
        <button class="btn btn-ghost remove-btn" data-list="${key}" data-id="${id}" style="padding:7px 14px;font-size:.76rem;margin-top:8px;color:var(--danger);border-color:rgba(248,113,113,.4)">Remover</button></div></div>`;
    }
    html += `<div class="filters" style="margin-bottom:16px"><h3>${LIST_LABELS[key]} <span class="accent">(${ids.length})</span></h3>
      <div class="card-row">${cards}</div>
      ${ids.length > 12 ? `<p style="color:var(--text-dim);font-size:.8rem;margin-top:10px">Exibindo 12 de ${ids.length}.</p>` : ""}</div>`;
  }
  box.innerHTML = html;
  bindFavButtons(box); paintFavStates(box);
  $$(".remove-btn", box).forEach(b => b.addEventListener("click", async () => {
    const fake = { mal_id: +b.dataset.id, title: "#" + b.dataset.id };
    await toggleListAnime(b.dataset.list, fake);
    renderLists();
  }));
  bindAddToList();
}

function bindAddToList() {
  const input = document.getElementById("add-q");
  const results = document.getElementById("add-results");
  const run = debounce(async q => {
    if (q.trim().length < 3) { results.innerHTML = ""; return; }
    try {
      const data = await jikanFetch(`/anime?q=${encodeURIComponent(q)}&limit=5&sfw=true`);
      results.innerHTML = data.map(a => `
        <div class="watch-item">
          <img src="${esc(a.images?.jpg?.small_image_url || "")}" style="width:38px;height:52px;object-fit:cover;border-radius:6px" alt="">
          <div><div class="wi-name">${esc(a.title)}</div><div class="wi-sub">${a.year || "—"} • ★ ${a.score ?? "—"}</div></div>
          <button class="btn-watch add-pick" data-id="${a.mal_id}">＋</button>
        </div>`).join("");
      $$(".add-pick", results).forEach(b => b.addEventListener("click", async () => {
        const list = document.getElementById("add-list").value;
        const full = await jikanFetch(`/anime/${b.dataset.id}`, 24*3600*1000);
        await toggleListAnime(list, full);
        renderLists();
      }));
    } catch { results.innerHTML = `<p style="color:var(--text-dim);font-size:.84rem">Busca indisponível.</p>`; }
  }, 450);
  input.addEventListener("input", e => run(e.target.value));
}

/* ---------- Avaliações ---------- */
async function renderRatings() {
  const box = document.getElementById("ratings-container");
  const ratings = storageGet(LS.ratings, {});
  const entries = Object.entries(ratings).sort((a,b)=>b[1]-a[1]);
  if (!entries.length) { box.innerHTML = `<p style="color:var(--text-dim)">Você ainda não avaliou nenhum anime. Visite a página de um anime e dê sua nota de 0 a 10! ⭐</p>`; return; }
  box.innerHTML = "";
  for (const [id, score] of entries) {
    try {
      const a = await jikanFetch(`/anime/${id}`, 24*3600*1000);
      box.insertAdjacentHTML("beforeend", `
        <div class="watch-item">
          <img src="${esc(a.images?.jpg?.small_image_url || "")}" style="width:44px;height:62px;object-fit:cover;border-radius:8px" alt="">
          <div><div class="wi-name"><a href="anime.html?id=${id}">${esc(a.title)}</a></div><div class="wi-sub">${a.year || "—"}</div></div>
          <span class="stat" style="margin-left:auto;color:var(--warning)">★ ${score}/10</span>
        </div>`);
    } catch {
      box.insertAdjacentHTML("beforeend", `<div class="watch-item"><div class="wi-name">Anime #${id}</div><span class="stat" style="margin-left:auto;color:var(--warning)">★ ${score}/10</span></div>`);
    }
  }
}

/* ---------- Histórico ---------- */
function renderHistory() {
  const box = document.getElementById("history-container");
  const h = storageGet(LS.history, []);
  if (!h.length) { box.innerHTML = `<p style="color:var(--text-dim)">Seu histórico de navegação aparecerá aqui conforme você visita páginas de animes.</p>`; return; }
  box.innerHTML = h.slice(0, 20).map(x => `
    <div class="watch-item">
      <span class="wi-icon">🎬</span>
      <div><div class="wi-name"><a href="anime.html?id=${x.id}">${esc(x.title)}</a></div>
      <div class="wi-sub">${(x.genres || []).map(esc).join(" • ") || "Anime"}</div></div>
    </div>`).join("");
}

/* ---------- Tabs ---------- */
function bindTabs() {
  $$(".ptab").forEach(t => t.addEventListener("click", () => {
    $$(".ptab").forEach(x => x.classList.remove("on"));
    t.classList.add("on");
    ["lists","ratings","history","edit","prefs"].forEach(k => {
      document.getElementById("tab-" + k).style.display = k === t.dataset.tab ? "block" : "none";
    });
  }));
}

/* ---------- Editar perfil ---------- */
function bindEdit() {
  const d = ANIVERSE.userData || {};
  document.getElementById("edit-name").value = d.displayName || ANIVERSE.user?.displayName || "";
  document.getElementById("edit-photo").value = d.photoURL || "";
  document.getElementById("edit-bio").value = d.bio || "";
  document.getElementById("save-profile").addEventListener("click", async () => {
    const name = document.getElementById("edit-name").value.trim();
    const photo = document.getElementById("edit-photo").value.trim();
    const bio = document.getElementById("edit-bio").value.trim();
    const msg = document.getElementById("pf-msg");
    if (name.length < 2) { msg.textContent = "O nome deve ter pelo menos 2 caracteres."; msg.className = "form-msg show error"; return; }
    if (photo && !/^https:\/\//.test(photo)) { msg.textContent = "A foto deve ser uma URL segura (https)."; msg.className = "form-msg show error"; return; }
    try {
      await db.collection("users").doc(ANIVERSE.user.uid).update({ displayName: name, photoURL: photo, bio });
      ANIVERSE.userData = { ...(ANIVERSE.userData||{}), displayName: name, photoURL: photo, bio };
      msg.textContent = "Perfil atualizado com sucesso! ✅";
      msg.className = "form-msg show success";
      renderHeader(); updateAuthUI();
      toast("Perfil salvo! 💜", "success");
    } catch (e) { msg.textContent = "Erro ao salvar: " + e.message; msg.className = "form-msg show error"; }
  });
  document.getElementById("logout-btn").addEventListener("click", logout);
}

/* ---------- Preferências ---------- */
async function bindPrefs() {
  const d = ANIVERSE.userData || {};
  const prefs = d.prefs || { notifEpisodes: true, notifNews: true, notifReplies: true };
  const ep = document.getElementById("p-ep"), nw = document.getElementById("p-news"), rp = document.getElementById("p-replies");
  ep.checked = prefs.notifEpisodes !== false;
  nw.checked = prefs.notifNews !== false;
  rp.checked = prefs.notifReplies !== false;
  const save = async () => {
    try {
      await db.collection("users").doc(ANIVERSE.user.uid).update({
        prefs: { notifEpisodes: ep.checked, notifNews: nw.checked, notifReplies: rp.checked }
      });
      toast("Preferências salvas ✅", "success");
    } catch (e) { toast("Erro ao salvar preferências.", "error"); }
  };
  [ep, nw, rp].forEach(el => el.addEventListener("change", save));
}
