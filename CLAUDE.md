# Viaje Asia 2026-27 — contexto para Claude Code

Blog de viaje de **una sola página** (HTML/CSS/JS sin build) para el viaje
**Bali → Tailandia → Japón**, 26 dic 2026 – 1 feb 2027 (**38 días**). Viajan Martín
(dueño), Sergio y Matías. Se abre sirviéndolo por HTTP (no `file://`, usa módulos).

## Cómo correrlo localmente
```
python -m http.server 8765
```
Luego http://localhost:8765. En GitHub Pages funciona directo.

## Estructura
```
index.html          Toda la página (secciones + UI) con estilos vía css/
css/styles.css      Design system (paleta cálida, Playfair + DM Sans + Noto Serif JP)
js/config.js        Claves públicas de Supabase (URL + publishable key) + INVITE_CODE
js/backend.js       Capa de datos sobre Supabase (expone window._fb; realtime, Storage)
js/features.js      "¿Dónde estamos ahora?" (banner + parada pulsando en mapa) + Galería
supabase/schema.sql Tablas, RLS y realtime para pegar en Supabase
manifest.json + sw.js  PWA (instalable + offline)
assets/             Íconos PWA
```

## Secciones (orden del `<nav>`)
`resumen` (hero + countdown + banner "¿dónde estamos?") · `destinos` (tarjetas por país
con checklists + puntuaciones) · `diario` · `galeria` · `vuelos` · `mapa` (Leaflet,
marcadores numerados 1→8) · `alojamientos` · `preparacion` (oculta, solo editores).

## Backend: Supabase (NO Firebase)
Se migró de Firebase a Supabase. **Toda** la lógica de datos está encapsulada en
`window._fb` (definido en `js/backend.js`); el resto del código lo usa sin saber de
Supabase. Auth por email, perfiles con avatar y fotos del diario en **Storage**.

### Roles / permisos
- **Público**: ve todo, no interactúa.
- **Viewer** (registrado sin código): comenta y reacciona.
- **Grupo viajero / editor** (registro con `INVITE_CODE`, hoy `viaje26`): además
  **puntúa lugares**, publica/edita/borra el diario y ve "Preparación".
- Reforzado en UI + lógica + RLS (la BD rechaza escrituras no autorizadas).

## Reglas al editar (mantener consistencia)
- **Fuente de verdad del itinerario: el Excel** `Planeacion Viaje (4).xlsx`. Los checklists
  de destinos deben tener **solo actividades que aparezcan en el Excel** (no inventar, no
  poner tiempos de traslado).
- Bangkok → Chiang Mai es **bus nocturno**, no vuelo.
- Colores solo con las variables ya definidas (`--bali --thai --japan --gold --ink --warm
  --moss --ember --ocean`). Tarjetas blancas, radios grandes, transiciones 150-250ms.
- Mobile siempre (grids `auto-fill/minmax`). Nada de relleno; lo pendiente se marca como
  tal (`.aloj-pending`, candado en secciones de solo-editores).

## Estado de reservas (al 18 ago 2026)
**Confirmado:** vuelos SCL→Bali (IB6652/6226/6288), Bali→Phuket (AirAsia HF8YMD),
Krabi→Bangkok (AirAsia J6LHRB), Chiang Mai→Bangkok→Osaka (FD3438 + XJ610), Tokyo→SCL
(1 feb, NRT). Alojamientos: Canggu, Ubud, Nusa Penida, Sanur (Bali) y **Krabi — TAN Hostel
x Cafe, Ao Nang (8-13 ene, efectivo)**.
**Por reservar:** alojamientos de Phuket, Bangkok, Chiang Mai, Osaka, Kyoto y Tokyo.

## Deploy
GitHub Pages desde el repo (Settings → Pages → branch main / root). `js/config.js` lleva la
publishable key de Supabase (es pública por diseño; la seguridad la dan las políticas RLS).
