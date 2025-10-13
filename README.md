# Río Cuarto Grimoire (JS + Express + MongoDB)

Versión funcional fullstack del proyecto con persistencia real en MongoDB, autenticación básica por JWT y frontend React sin TypeScript.

## Estructura

- Frontend (Vite + React + Tailwind + shadcn-ui): en el root (`/`)
- API (Express en funciones serverless de Vercel): `/api`
  - `/api/index.js`: app Express envuelta con serverless-http
  - `/api/lib/db.js`: conexión Mongoose (singleton)
  - `/api/models/Location.js`: modelo `Location`

## Variables de entorno

Configúralas en tu entorno local y en Vercel (Project Settings → Environment Variables):

- `MONGO_URI` = cadena de conexión de MongoDB (Atlas o local)
- `JWT_SECRET` = secreto para firmar JWT (cualquier string largo y aleatorio)
- `ADMIN_USERNAME` = usuario admin (por defecto "admin" si no se define)
- `ADMIN_PASSWORD` = contraseña admin (por defecto "admin" si no se define)

## Scripts

- `npm run dev` → levanta Vite para el frontend
- `vercel dev` → recomendado para correr frontend + funciones `/api` localmente
- `npm run build` → build de frontend (directorío `dist/`)

## Correr localmente

1) Instalar deps

```sh
npm install
```

2) Iniciar entorno de desarrollo solo-frontend (sin API):

```sh
npm run dev
```

3) Iniciar fullstack con funciones serverless (requiere Vercel CLI):

```sh
# instalar si no lo tienes
npm i -g vercel
# arranca frontend + /api con variables de entorno cargadas
vercel dev
```

La app quedará disponible en http://localhost:3000 (o el puerto indicado) y la API bajo http://localhost:3000/api/*.

## Endpoints de la API

- `POST /api/auth/login` → { username, password } → { token }
- `GET /api/locations` → lista todas las ubicaciones
- `POST /api/locations` (auth) → crea una ubicación
- `PUT /api/locations/:id` (auth) → actualiza una ubicación
- `DELETE /api/locations/:id` (auth) → elimina una ubicación

Modelo `Location`:

```json
{
  "name": "String",
  "description": "String",
  "lat": 0,
  "lng": 0,
  "type": "power|mission|refuge|danger",
  "visible": true,
  "sphere": "String",
  "narration": "String"
}
```

## Autenticación (Narrador)

En el panel de control (/control) hay un formulario de login. Al iniciar sesión se guarda `authToken` en `localStorage` y se habilitan las acciones de crear/editar/eliminar. Las rutas mutadoras de la API exigen header `Authorization: Bearer <token>`.

## Deploy en Vercel

1) Conecta el repo a Vercel
2) Define variables en Project Settings → Environment Variables:
   - `MONGO_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
3) Deploy (automático en push a la rama o manual)

La configuración `vercel.json` enruta todo `/api/(.*)` a `/api/index.js` (Express serverless). El frontend se construye con `npm run build` y se sirve como estático.

## Notas de migración

- Se removió por completo TypeScript. Todos los archivos son `.js`/`.jsx` y los configs de Vite/Tailwind están en JS.
- Se simplificaron los tipos en componentes shadcn-ui para funcionar en JS.
- El contexto `POIContext` ahora consume la API real en vez de datos hardcodeados.

## Desarrollo futuro (ideas)

- Edición inline de ubicaciones (PUT) desde el panel
- Paginación o límites en `GET /api/locations`
- Clustering en el mapa si hay muchos pines
- Caché/fallback si la API falla
