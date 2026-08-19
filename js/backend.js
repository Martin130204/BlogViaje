// ============================================================================
//  backend.js — Capa de datos sobre Supabase.
//  Reimplementa la misma interfaz `window._fb` que usaba el sitio con Firebase,
//  así el resto de la app funciona sin cambios. Mejora: las fotos (avatar y
//  diario) se suben a Supabase Storage en vez de guardarse como base64.
//
//  Expone: window._fb (métodos), window._currentUser ({uid,email}|null),
//          window._fbReady, y dispara los eventos 'auth-changed' y 'firebase-ready'.
// ============================================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY, INVITE_CODE, BUCKETS } from "./config.js";

const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!configured) {
  console.info("[viaje-asia] Supabase sin configurar: el sitio funciona en modo solo-lectura (login desactivado). Pega tus claves en js/config.js — ver README.");
} else {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Timestamp compatible con la API de Firestore que espera el código (toDate/toMillis/seconds)
  const ts = (iso) => {
    const ms = iso ? new Date(iso).getTime() : Date.now();
    return { toDate: () => new Date(ms), toMillis: () => ms, seconds: Math.floor(ms / 1000) };
  };
  const dataURLtoBlob = (dataURL) => {
    const [meta, b64] = dataURL.split(",");
    const mime = (meta.match(/:(.*?);/) || [, "image/jpeg"])[1];
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };
  const uploadImage = async (bucket, path, dataURL) => {
    const blob = dataURLtoBlob(dataURL);
    const { error } = await sb.storage.from(bucket).upload(path, blob, { upsert: true, contentType: blob.type });
    if (error) { console.error("upload:", error); return null; }
    return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };
  // Suscripción realtime: corre `run` una vez y de nuevo ante cualquier cambio en la tabla.
  const live = (table, run) => {
    run();
    const ch = sb.channel(`rt_${table}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => run())
      .subscribe();
    return () => { sb.removeChannel(ch); };
  };
  const mapProfile = (r) => r ? {
    uid: r.id, email: r.email, username: r.username || "",
    displayName: r.display_name || "", avatarUrl: r.avatar_url || "",
    bio: r.bio || "", role: r.role || "viewer",
  } : null;
  const mapEntry = (r) => ({
    id: r.id, author: r.author, date: r.date, place: r.place, country: r.country,
    title: r.title, text: r.body || "", photos: r.photos || [], ts: ts(r.created_at),
  });

  const _fb = {};

  // ── DIARIO ─────────────────────────────────────────────────────────────────
  _fb.saveDiarioEntry = async (entry) => {
    try {
      const uid = window._currentUser ? window._currentUser.uid : null;
      let photoUrls = [];
      if (entry.photos && entry.photos.length) {
        photoUrls = await Promise.all(entry.photos.map((p, i) =>
          p.startsWith("data:")
            ? uploadImage(BUCKETS.diario, `${uid}/${Date.now()}_${i}.jpg`, p)
            : Promise.resolve(p)
        ));
        photoUrls = photoUrls.filter(Boolean);
      }
      const { data, error } = await sb.from("diario").insert({
        author: entry.author, author_uid: uid, date: entry.date, place: entry.place,
        country: entry.country, title: entry.title, body: entry.text, photos: photoUrls,
      }).select("id").single();
      if (error) throw error;
      return data.id;
    } catch (e) { console.error("saveDiarioEntry:", e); return null; }
  };
  _fb.deleteDiarioEntry = async (id) => {
    const { error } = await sb.from("diario").delete().eq("id", id);
    if (error) console.error("deleteDiarioEntry:", error);
  };
  _fb.updateDiarioEntry = async (id, d) => {
    const { error } = await sb.from("diario").update({
      title: d.title, body: d.text, date: d.date, place: d.place, country: d.country,
    }).eq("id", id);
    if (error) { console.error("updateDiarioEntry:", error); return false; }
    return true;
  };
  _fb.listenDiario = (cb) => live("diario", async () => {
    const { data } = await sb.from("diario").select("*").order("created_at", { ascending: false });
    cb((data || []).map(mapEntry));
  });

  // ── RATINGS ─────────────────────────────────────────────────────────────────
  _fb.saveRatingFlat = async (place, value, uid, name) => {
    const { error } = await sb.from("ratings").upsert(
      { uid, place, value, name }, { onConflict: "uid,place" });
    if (error) console.error("saveRatingFlat:", error);
  };
  _fb.listenAllRatings = (cb) => live("ratings", async () => {
    const { data } = await sb.from("ratings").select("*");
    const all = {};
    (data || []).forEach((r) => {
      if (!all[r.place]) all[r.place] = {};
      all[r.place][r.uid] = { value: r.value, name: r.name || r.uid };
    });
    cb(all);
  });

  // ── CHECKLIST ────────────────────────────────────────────────────────────────
  _fb.saveCheck = async (key, done) => {
    const { error } = await sb.from("checklist").upsert({ id: key, done });
    if (error) console.error("saveCheck:", error);
  };
  _fb.saveChecklist = _fb.saveCheck; // alias usado por la sección de preparación
  _fb.listenChecklist = (cb) => live("checklist", async () => {
    const { data } = await sb.from("checklist").select("*");
    const checks = {};
    (data || []).forEach((r) => { checks[r.id] = r.done; });
    cb(checks);
  });

  // ── AUTH ──────────────────────────────────────────────────────────────────────
  _fb.login = async (emailOrUsername, password) => {
    let email = emailOrUsername.trim();
    if (!email.includes("@") || email.startsWith("@")) {
      const uname = email.replace(/^@/, "").toLowerCase();
      const { data } = await sb.from("profiles").select("email").eq("username", uname).maybeSingle();
      if (data && data.email) email = data.email;
      else return { ok: false, msg: 'Usuario "@' + uname + '" no encontrado. Prueba con tu correo.' };
    }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      let msg = "Error al iniciar sesión";
      if (/Invalid login/i.test(error.message)) msg = "Correo o contraseña incorrectos";
      if (/Email not confirmed/i.test(error.message)) msg = "Confirma tu correo antes de entrar";
      return { ok: false, msg };
    }
    return { ok: true };
  };
  _fb.logout = async () => { await sb.auth.signOut(); };
  _fb.register = async (email, password, code, username) => {
    const role = code === INVITE_CODE ? "editor" : "viewer";
    if (username) {
      const { data } = await sb.from("profiles").select("id").eq("username", username).maybeSingle();
      if (data) return { ok: false, msg: "Ese nombre de usuario ya está en uso" };
    }
    const { data, error } = await sb.auth.signUp({
      email, password, options: { data: { username: username || "", role, email } },
    });
    if (error) {
      let msg = "Error al crear cuenta";
      if (/already registered/i.test(error.message)) msg = "Ese correo ya tiene una cuenta";
      if (/at least 6/i.test(error.message)) msg = "La contraseña debe tener al menos 6 caracteres";
      return { ok: false, msg };
    }
    // Si hay sesión inmediata (confirmación de email desactivada) aseguramos la fila de perfil.
    if (data.user) {
      await sb.from("profiles").upsert({
        id: data.user.id, email, username: username || "", role,
      }, { onConflict: "id" });
    }
    return { ok: true, role };
  };
  _fb.getUserRole = async (uid) => {
    const { data } = await sb.from("profiles").select("role").eq("id", uid).maybeSingle();
    return data ? data.role : "viewer";
  };

  // ── COMENTARIOS ──────────────────────────────────────────────────────────────
  _fb.saveComment = async (entryId, c) => {
    const { error } = await sb.from("comments").insert(
      { entry_id: entryId, author: c.author, uid: c.uid, body: c.text });
    if (error) { console.error("saveComment:", error); return false; }
    return true;
  };
  _fb.listenComments = (entryId, cb) => live("comments", async () => {
    const { data } = await sb.from("comments").select("*")
      .eq("entry_id", entryId).order("created_at", { ascending: true });
    cb((data || []).map((r) => ({ id: r.id, author: r.author, text: r.body, uid: r.uid })));
  });
  _fb.deleteComment = async (entryId, commentId) => {
    const { error } = await sb.from("comments").delete().eq("id", commentId);
    if (error) console.error("deleteComment:", error);
  };

  // ── REACCIONES ───────────────────────────────────────────────────────────────
  _fb.toggleReaction = async (entryId, emoji, uid, name) => {
    const { data } = await sb.from("reactions").select("id")
      .eq("entry_id", entryId).eq("emoji", emoji).eq("uid", uid).maybeSingle();
    if (data) { await sb.from("reactions").delete().eq("id", data.id); return false; }
    await sb.from("reactions").insert({ entry_id: entryId, emoji, uid, name });
    return true;
  };
  _fb.listenReactions = (entryId, cb) => live("reactions", async () => {
    const { data } = await sb.from("reactions").select("*").eq("entry_id", entryId);
    const counts = {}, userReacted = {};
    (data || []).forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
      userReacted[r.emoji] = userReacted[r.emoji] || {};
      userReacted[r.emoji][r.uid] = true;
    });
    cb(counts, userReacted);
  });

  // ── PERFIL / AVATAR ──────────────────────────────────────────────────────────
  _fb.saveProfile = async (uid, d) => {
    const row = { id: uid };
    if (d.displayName !== undefined) row.display_name = d.displayName;
    if (d.bio !== undefined) row.bio = d.bio;
    if (d.role !== undefined) row.role = d.role;
    if (d.email !== undefined) row.email = d.email;
    if (d.username !== undefined) row.username = d.username || null;
    if (d.avatarUrl !== undefined) row.avatar_url = d.avatarUrl;
    const { error } = await sb.from("profiles").upsert(row, { onConflict: "id" });
    if (error) { console.error("saveProfile:", error); return false; }
    return true;
  };
  _fb.getProfile = async (uid) => {
    const { data } = await sb.from("profiles").select("*").eq("id", uid).maybeSingle();
    return mapProfile(data);
  };
  _fb.listenProfile = (uid, cb) => live("profiles", async () => {
    const { data } = await sb.from("profiles").select("*").eq("id", uid).maybeSingle();
    cb(mapProfile(data));
  });
  _fb.uploadAvatar = async (uid, base64) =>
    uploadImage(BUCKETS.avatars, `${uid}/avatar_${Date.now()}.jpg`, base64);

  _fb.listenMembers = (cb) => live("profiles", async () => {
    const { data } = await sb.from("profiles").select("*").eq("role", "editor");
    cb((data || []).map(mapProfile));
  });
  _fb.listenAllUsers = (cb) => live("profiles", async () => {
    const { data } = await sb.from("profiles").select("*");
    cb((data || []).map(mapProfile));
  });
  _fb.upgradeToEditor = async (uid) => {
    const { error } = await sb.from("profiles").update({ role: "editor" }).eq("id", uid);
    if (error) { console.error("upgradeToEditor:", error); return false; }
    return true;
  };
  _fb.downgradeToViewer = async (uid) => {
    const { error } = await sb.from("profiles").update({ role: "viewer" }).eq("id", uid);
    if (error) { console.error("downgradeToViewer:", error); return false; }
    return true;
  };

  // ── USERNAME ──────────────────────────────────────────────────────────────────
  _fb.checkUsername = async (username) => {
    if (!username || username.length < 3) return { available: false, msg: "Mínimo 3 caracteres" };
    const { data } = await sb.from("profiles").select("id").eq("username", username).maybeSingle();
    if (data) {
      if (window._currentUser && data.id === window._currentUser.uid) return { available: true, own: true };
      return { available: false, msg: "Ya está en uso" };
    }
    return { available: true };
  };
  _fb.saveUsername = async (uid, newUsername) => {
    const { error } = await sb.from("profiles").update({ username: newUsername || null }).eq("id", uid);
    if (error) { console.error("saveUsername:", error); return false; }
    return true;
  };

  // ── MENSAJES PRIVADOS ──────────────────────────────────────────────────────────
  _fb.listenMessages = (convId, cb) => live("messages", async () => {
    const { data } = await sb.from("messages").select("*")
      .eq("conv_id", convId).order("created_at", { ascending: true });
    cb((data || []).map((r) => ({ id: r.id, text: r.body, from: r.from_uid, ts: ts(r.created_at) })));
  });
  _fb.sendMessage = async (convId, msg) => {
    const now = new Date().toISOString();
    const { error } = await sb.from("messages").insert(
      { conv_id: convId, from_uid: msg.from, body: msg.text });
    if (error) { console.error("sendMessage:", error); return false; }
    await sb.from("conversations").upsert({
      id: convId, participants: convId.split("_"), last_msg: msg.text,
      last_from: msg.from, last_ts: now,
    }, { onConflict: "id" });
    return true;
  };
  _fb.listenInbox = (uid, cb) => live("conversations", async () => {
    const { data } = await sb.from("conversations").select("*")
      .contains("participants", [uid]).order("last_ts", { ascending: false });
    cb((data || []).map((c) => ({
      id: c.id, participants: c.participants, lastMsg: c.last_msg,
      lastFrom: c.last_from, lastTs: c.last_ts ? ts(c.last_ts) : null,
    })));
  });

  window._fb = _fb;

  // ── ESTADO DE SESIÓN ────────────────────────────────────────────────────────────
  let readyFired = false;
  const applySession = (session) => {
    const u = session && session.user
      ? { uid: session.user.id, email: session.user.email } : null;
    window._currentUser = u;
    document.dispatchEvent(new CustomEvent("auth-changed", { detail: u }));
    if (!readyFired) {
      readyFired = true; window._fbReady = true;
      document.dispatchEvent(new Event("firebase-ready"));
      console.log("Supabase ✅");
    }
    if (u) _fb.getProfile(u.uid).then((p) => { window._initProfile = p; window._initUsername = p && p.username; });
    else { window._initProfile = null; window._initUsername = null; }
  };

  sb.auth.onAuthStateChange((_event, session) => applySession(session));
  // Dispara el estado inicial por si onAuthStateChange tardara
  sb.auth.getSession().then(({ data }) => { if (!readyFired) applySession(data.session); });
}
