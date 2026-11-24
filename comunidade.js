/* ============================================================
   ANIVERSE — Comunidade
   Publicações, curtidas, ranking de animes mais comentados,
   perfis públicos e moderação básica.
   ============================================================ */
"use strict";
ANIVERSE.pathPrefix = "../";

const BANNED = ["http://", "https://", "www.", ".com", ".net", ".xyz", "click aqui", "clique aqui", "grátis", "senha", "cpf", "idiota", "burro", "lixo", "morra", "otario"];
function isSpammy(text) {
  const t = text.toLowerCase();
  return BANNED.some(b => t.includes(b)) || /(.)\1{9,}/.test(t);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("post-send").addEventListener("click", publish);
  document.getElementById("post-text").addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) publish();
  });
  loadFeed();
  loadRanking();
});

async function publish() {
  const ta = document.getElementById("post-text");
  const text = ta.value.trim();
  if (text.length < 5) return toast("Escreva uma publicação um pouco maior.", "error");
  if (isSpammy(text)) return toast("Publicação bloqueada: conteúdo não permitido (links ou termos inadequados).", "error");
  if (!ANIVERSE.user) { toast("Faça login para publicar. 👤", "info"); return; }
  try {
    await db.collection("posts").add({
      uid: ANIVERSE.user.uid,
      author: ANIVERSE.userData?.displayName || ANIVERSE.user.displayName || "Usuário",
      avatar: ANIVERSE.user.photoURL || "",
      text, likes: 0, likedBy: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    ta.value = "";
    toast("Publicado! 🎉", "success");
  } catch (e) { toast("Erro ao publicar: " + e.message, "error"); }
}

function loadFeed() {
  db.collection("posts").orderBy("createdAt", "desc").limit(30)
    .onSnapshot(snap => {
      const feed = document.getElementById("post-feed");
      const posts = [];
      snap.forEach(d => posts.push({ id: d.id, ...d.data() }));
      if (!posts.length) {
        feed.innerHTML = `<div class="no-results"><div class="big">🌸</div><p>Nenhuma publicação ainda. Seja o primeiro a postar!</p></div>`;
        return;
      }
      feed.innerHTML = posts.map(p => {
        const liked = ANIVERSE.user && (p.likedBy || []).includes(ANIVERSE.user.uid);
        const avatar = p.avatar || "https://api.dicebear.com/7.x/shapes/svg?seed=" + encodeURIComponent(p.uid);
        return `
        <article class="post" data-id="${p.id}">
          <div class="post-head">
            <a href="#" class="pub-profile" data-uid="${esc(p.uid)}" data-name="${esc(p.author)}" data-avatar="${esc(avatar)}"><img src="${esc(avatar)}" alt=""></a>
            <div><div class="ph-name">${esc(p.author)}</div>
            <div class="ph-time">${p.createdAt?.toDate ? timeAgo(p.createdAt.toDate().getTime()) : ""}</div></div>
          </div>
          <div class="post-body">${esc(p.text)}</div>
          <div class="post-actions">
            <button class="like-btn ${liked ? "liked" : ""}" data-like="${p.id}">
              <span>${liked ? "💜" : "🤍"}</span> <span class="like-count">${p.likes || 0}</span>
            </button>
            ${p.uid === ANIVERSE.user?.uid ? `<button class="like-btn del-post" data-del="${p.id}">🗑️ Excluir</button>` : ""}
          </div>
        </article>`;
      }).join("");

      $$("[data-like]", feed).forEach(btn => btn.addEventListener("click", async () => {
        if (!ANIVERSE.user) return toast("Faça login para curtir. 👤", "info");
        const id = btn.dataset.like;
        const ref = db.collection("posts").doc(id);
        try {
          await db.runTransaction(async t => {
            const doc = await t.get(ref);
            if (!doc.exists) return;
            const d = doc.data();
            const arr = d.likedBy || [];
            if (arr.includes(ANIVERSE.user.uid)) {
              t.update(ref, { likedBy: arr.filter(u => u !== ANIVERSE.user.uid), likes: Math.max(0, (d.likes || 0) - 1) });
            } else {
              t.update(ref, { likedBy: [...arr, ANIVERSE.user.uid], likes: (d.likes || 0) + 1 });
            }
          });
        } catch (e) { toast("Erro ao curtir.", "error"); }
      }));

      $$(".del-post", feed).forEach(btn => btn.addEventListener("click", async () => {
        try { await db.collection("posts").doc(btn.dataset.del).delete(); toast("Publicação excluída.", "info"); }
        catch { toast("Erro ao excluir.", "error"); }
      }));

      $$(".pub-profile", feed).forEach(a => a.addEventListener("click", e => {
        e.preventDefault();
        const d = a.dataset;
        showProfileModal(d.uid, d.name, d.avatar);
      }));
    }, () => {
      document.getElementById("post-feed").innerHTML = `<div class="no-results"><div class="big">⚠️</div><p>Não foi possível carregar o feed. Verifique as regras do Firestore.</p></div>`;
    });
}

/* ranking: contagem de comentários por anime */
function loadRanking() {
  db.collection("comments").get()
    .then(snap => {
      const count = {};
      snap.forEach(d => {
        const a = d.data().animeId;
        if (a) count[a] = (count[a] || 0) + 1;
      });
      const top = Object.entries(count).sort((x, y) => y[1] - x[1]).slice(0, 5);
      const box = document.getElementById("ranking");
      if (!top.length) { box.innerHTML = `<p style="color:var(--text-dim);font-size:.86rem">Sem dados ainda.</p>`; return; }
      box.innerHTML = top.map(([id, n], i) => `
        <div class="rank-item">
          <span class="rank-pos">${i + 1}º</span>
          <div><div class="wi-name"><a href="anime.html?id=${id}" style="color:var(--text)">Anime #${id}</a></div>
          <div class="wi-sub">${n} comentário${n > 1 ? "s" : ""}</div></div>
        </div>`).join("");
    })
    .catch(() => { document.getElementById("ranking").innerHTML = `<p style="color:var(--text-dim);font-size:.86rem">Ranking indisponível.</p>`; });
}

/* perfil público simples via modal */
function showProfileModal(uid, name, avatar) {
  const old = document.getElementById("pub-modal");
  if (old) old.remove();
  const modal = document.createElement("div");
  modal.id = "pub-modal";
  modal.style.cssText = "position:fixed;inset:0;z-index:9995;background:rgba(0,0,0,.6);display:grid;place-items:center;padding:20px;backdrop-filter:blur(4px)";
  modal.innerHTML = `
    <div class="form-card" style="max-width:380px;width:100%;text-align:center">
      <img src="${esc(avatar)}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;margin:0 auto 14px;border:3px solid var(--primary)">
      <h2 style="font-size:1.2rem">${esc(name)}</h2>
      <p style="color:var(--text-dim);font-size:.85rem;margin:8px 0 20px">Membro da comunidade Aniverse</p>
      <button class="btn btn-primary" id="pub-close" style="width:100%;justify-content:center">Fechar</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
  document.getElementById("pub-close").addEventListener("click", () => modal.remove());
}
