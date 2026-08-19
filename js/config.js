// ============================================================================
//  config.js — Claves públicas de tu proyecto Supabase.
//  Supabase → Project Settings → API → "Project URL" y "anon public" key.
//  La "anon key" es pública por diseño; la seguridad la dan las políticas RLS.
//  Mientras estén en blanco, el sitio funciona en modo solo-lectura (sin login).
// ============================================================================

export const SUPABASE_URL = "https://fnkoqrnnxmsuqblrpswl.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_7gyf_kewGxKJzVllbOqU9A_jrFH346m";

// Código para unirse al "grupo viajero" (rol editor). Cámbialo si quieres.
export const INVITE_CODE = "viaje26";

// Buckets de Storage (no cambiar salvo que renombres en Supabase)
export const BUCKETS = { avatars: "avatars", diario: "diario" };
