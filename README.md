# El Gran Viaje · Bali · Tailandia · Japón

Blog de viaje de una sola página (HTML/CSS/JS, sin build). Muestra públicamente
destinos, vuelos, mapa y diario; con **login (Supabase)** para que el grupo cree
su perfil, puntúe lugares, publique en el diario (con fotos), comente y se escriba.

## Estructura del proyecto

```
index.html         Página completa (secciones + toda la UI)
css/styles.css     Estilos (paleta cálida, tipografías Playfair + DM Sans + Noto Serif JP)
js/config.js       ← Pega aquí tus claves de Supabase
js/backend.js      Capa de datos sobre Supabase (auth, perfiles, diario, ratings, mensajes)
supabase/schema.sql  SQL para crear las tablas, políticas (RLS) y realtime
CLAUDE.md          Contexto del proyecto para Claude Code
```

## Ver el sitio localmente

Como usa módulos JS, **no** funciona abriéndolo con doble clic (`file://`).
Levanta un servidor estático desde la carpeta del proyecto:

```bash
python -m http.server 8765
```

Luego abre http://localhost:8765. (En GitHub Pages funciona directo, sin nada de esto.)

## Configurar Supabase (login, perfiles, fotos, diario)

1. Crea un proyecto gratis en https://supabase.com.
2. **SQL:** panel → *SQL Editor* → *New query* → pega todo `supabase/schema.sql` → *Run*.
3. **Storage:** panel → *Storage* → *New bucket* → crea dos buckets **públicos**:
   `avatars` y `diario` (marca *Public bucket*). Las políticas de subida ya vienen en el SQL.
4. **Auth (recomendado):** *Authentication → Providers → Email* → **desactiva**
   "Confirm email" para que puedan entrar al registrarse sin confirmar correo.
5. **Claves:** *Project Settings → API*. Copia *Project URL* y la *anon public* key
   y pégalas en `js/config.js`:

   ```js
   export const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
   export const SUPABASE_ANON_KEY = "eyJhbGci...";
   ```

La `anon key` es pública por diseño; la seguridad la dan las políticas RLS del SQL.

### Grupo viajero (roles)

- Cualquiera puede registrarse → rol **viewer** (puede comentar y puntuar).
- Quien ponga el **código de invitación** al registrarse (o luego con "Unirme al grupo")
  pasa a **editor**: puede publicar/editar/borrar entradas del diario y ver "Preparación".
- El código está en `js/config.js` (`INVITE_CODE`, por defecto `viaje26`).

## Publicar en GitHub Pages

1. Sube esta carpeta a un repo (ej. `viaje-asia`).
2. Repo → *Settings → Pages* → *Branch: main* → `/root` → *Save*.
3. Queda en `https://TU-USUARIO.github.io/viaje-asia/`.

> El sitio funciona sin Supabase (modo solo-lectura: hero, destinos, vuelos, mapa,
> alojamientos y puntuaciones locales). Al pegar las claves se activan login,
> perfiles, diario con fotos, comentarios, reacciones y mensajes.
