# Viaje Asia 2026-27 — contexto para Claude Code

Blog de viaje de **una sola página** (HTML/CSS/JS sin build) para el viaje
**Bali → Tailandia → Japón**, 26 dic 2026 – 1 feb 2027 (**38 días**). Viajan Martín
(dueño), Sergio y Matías. Se sirve por HTTP (no `file://`, usa módulos).

- **Repo:** GitHub `Martin130204/BlogViaje` · **En vivo:** https://martin130204.github.io/BlogViaje/
- **Carpeta:** `C:\Users\Usuario\OneDrive\Imágenes\Escritorio\AsiaClaude`

## Cómo correrlo localmente
```
python -m http.server 8765
```
Luego http://localhost:8765.

## Deploy
`git push origin main` → GitHub Pages actualiza solo en 1-2 min. La carpeta local está
sincronizada con el repo; si se editó algo por la web de GitHub, hacer `git pull` primero.

## Estructura
```
index.html            Toda la página (secciones + script principal inline)
css/styles.css        Design system (paleta cálida, Playfair + DM Sans; japonés con fuente del sistema)
js/config.js          Claves públicas de Supabase (URL + publishable key) + INVITE_CODE (viaje26)
js/vendor/supabase.js Librería Supabase AUTO-ALOJADA (se carga antes de backend.js; NO usar esm.sh)
js/backend.js         Capa de datos sobre Supabase (expone window._fb; Storage). Realtime DESACTIVADO.
js/features.js        Banner "¿dónde estamos?" + parada pulsando en mapa + Galería + zoom de fotos
supabase/schema.sql   Tablas, RLS (y publicación realtime, aunque no se use) para pegar en Supabase
assets/img/           Fotos de portada de destinos (optimizadas)
sw.js                 KILL-SWITCH: no hay service worker; se auto-elimina para sanar cachés viejas
```
> **No hay service worker / PWA.** Se eliminó porque causaba páginas en blanco y caché rota.
> `index.html` desregistra cualquier SW anterior y limpia cachés. El sitio carga siempre fresco.

## Secciones (orden actual)
`resumen` (hero + countdown + banner "¿dónde estamos?") · `destinos` (tarjetas por país con
checklists + puntuaciones) · `diario` · `galeria` · `mapa` (Leaflet, marcadores numerados 1→8) ·
`vuelos` · `alojamientos` · `datos`/Info y `preparacion` (**ocultas, solo editores**).

## Backend: Supabase (NO Firebase)
Migrado de Firebase a Supabase (proyecto `fnkoqrnnxmsuqblrpswl`). **Toda** la lógica de datos está
en `window._fb` (`js/backend.js`). Auth por email, perfiles con avatar y fotos del diario en
**Storage** (buckets `avatars`, `diario`). **Sin realtime** (WebSockets desconectados por
rendimiento móvil): los datos cargan una vez, los cambios se ven al recargar.

### Roles / permisos
- **Público**: ve todo, no interactúa.
- **Viewer** (registrado sin código): comenta y reacciona.
- **Grupo viajero / editor** (registro con `INVITE_CODE` = `viaje26`): además **puntúa lugares**,
  publica/edita/borra el diario y ve Info + "Preparación".
- A los no-miembros NO se les muestran puntuación/checklist ni el formulario del diario
  (solo lectura: lista de actividades y publicaciones). Reforzado en UI + lógica + RLS.

## Reglas al editar
- **Fuente de verdad del itinerario: el Excel** `C:\Users\Usuario\Downloads\Planeacion Viaje (4).xlsx`.
  Los checklists de destinos deben tener **solo actividades del Excel** (no inventar, no tiempos de traslado).
- Bangkok → Chiang Mai es **bus nocturno**, no vuelo.
- Colores solo con las variables (`--bali --thai --japan --gold --ink --warm --moss --ember --ocean`).
- Mobile primero; mantenerlo **liviano** (evitar librerías pesadas, realtime, animaciones costosas).
- PDFs de reservas en `C:\Users\Usuario\OneDrive\Imágenes\Escritorio\Viaje Sudeste\Reservas\`.

## Estado de reservas
**Vuelos confirmados:** SCL→Bali (IB6652/6226/6288), Bali→Phuket (AirAsia HF8YMD 5 ene),
Krabi→Bangkok (Thai AirAsia FD3211, KBV→DMK T2, 13 ene 12:50→14:15, PNR J6LHRB),
Chiang Mai→Bangkok→Osaka (FD3438 + XJ610, 19 ene), Tokyo→SCL (1 feb, NRT).
Bangkok→Chiang Mai = bus nocturno (15 ene).

**Alojamientos confirmados (con N° reserva / PIN):**
- Canggu — **Wita Homestay Berawa** (28-30 dic · 5581.430.113 · PIN 2420)
- Ubud — **Soka Suarsena Monkey Forest** (30 dic-2 ene · 5024.137.801 · PIN 7244)
- Nusa Penida — **Grand Puri Hotel** (2-4 ene · 6093.678.782 · PIN 2890)
- Sanur — **Olivia Sanur Workstay Suites** (4-5 ene · 5388.821.533 · PIN 1303)
- Krabi — **TAN Hostel x Cafe, Ao Nang** (8-13 ene, efectivo · 5634.567.411 · PIN 7190)
- Osaka — **Estate Kuromon Bekkan D** (19-23 ene · 5514.672.129 · PIN 1206)

**Por reservar:** Phuket, Bangkok, Chiang Mai (Tailandia) · Kyoto, Tokyo (Japón).

## Pendiente
1. Confirmar que carga bien en iPhone tras eliminar el service worker (se estaba probando).
2. Agregar alojamientos que falten cuando se reserven.
3. Mejoras opcionales "Nivel 3": modo oscuro, clima por ciudad, indicador "hoy". (Presupuesto: descartado.)
