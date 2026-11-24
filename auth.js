/* ============================================================
   ANIVERSE — Autenticação (Firebase Auth)
   Google OAuth, e-mail/senha, cadastro, recuperação e sessão.
   ============================================================ */
"use strict";
ANIVERSE.pathPrefix = "../";

function showMsg(text, type) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.className = "form-msg show " + type;
}
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }
function goHome() { location.href = "../index.html"; }

document.addEventListener("DOMContentLoaded", () => {
  /* se já estiver logado, oferece sair / ir ao perfil */
  document.addEventListener("aniverse:auth", e => {
    if (e.detail.user) {
      showMsg(`Você já está logado como ${e.detail.user.email}. Redirecionando...`, "success");
      setTimeout(goHome, 1200);
    }
  });

  document.getElementById("btn-google").addEventListener("click", async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope("profile"); provider.addScope("email");
      await auth.signInWithPopup(provider);
      showMsg("Login com Google realizado! 🎉", "success");
      setTimeout(goHome, 900);
    } catch (e) {
      if (e.code === "auth/popup-closed-by-user") showMsg("Popup fechado antes de concluir o login.", "error");
      else if (e.code === "auth/unauthorized-domain") showMsg("Domínio não autorizado. Adicione o domínio do GitHub Pages no Console do Firebase (Authentication → Settings → Authorized domains).", "error");
      else showMsg("Erro no login Google: " + e.message, "error");
    }
  });

  document.getElementById("btn-login").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;
    if (!validEmail(email)) return showMsg("Informe um e-mail válido.", "error");
    if (pass.length < 6) return showMsg("A senha deve ter pelo menos 6 caracteres.", "error");
    try {
      await auth.signInWithEmailAndPassword(email, pass);
      showMsg("Login realizado! Bem-vindo(a) de volta 🎉", "success");
      setTimeout(goHome, 900);
    } catch (e) {
      const map = {
        "auth/user-not-found": "Conta não encontrada. Crie uma conta primeiro.",
        "auth/wrong-password": "Senha incorreta. Tente novamente ou recupere sua senha.",
        "auth/invalid-credential": "E-mail ou senha inválidos.",
        "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos."
      };
      showMsg(map[e.code] || "Erro ao entrar: " + e.message, "error");
    }
  });

  document.getElementById("btn-register").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;
    if (!validEmail(email)) return showMsg("Informe um e-mail válido.", "error");
    if (pass.length < 6) return showMsg("A senha deve ter pelo menos 6 caracteres.", "error");
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      await db.collection("users").doc(cred.user.uid).set({
        displayName: email.split("@")[0],
        photoURL: "", bio: "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        prefs: { notifEpisodes: true, notifNews: true, notifReplies: true }
      });
      showMsg("Conta criada com sucesso! 🎉", "success");
      setTimeout(goHome, 900);
    } catch (e) {
      const map = {
        "auth/email-already-in-use": "Este e-mail já possui uma conta. Faça login.",
        "auth/invalid-email": "E-mail inválido.",
        "auth/weak-password": "Senha muito fraca. Use ao menos 6 caracteres."
      };
      showMsg(map[e.code] || "Erro ao criar conta: " + e.message, "error");
    }
  });

  document.getElementById("link-reset").addEventListener("click", async e => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    if (!validEmail(email)) return showMsg("Digite seu e-mail no campo acima para receber o link de recuperação.", "error");
    try {
      await auth.sendPasswordResetEmail(email);
      showMsg("Link de recuperação enviado! Verifique sua caixa de entrada 📧", "success");
    } catch (err) {
      showMsg("Erro ao enviar: " + err.message, "error");
    }
  });
});
