# Deploy: Frontend en Vercel + Backend en Render

## 1) Backend (Render)

### Opcion A: Blueprint (recomendada)
1. Sube el repo a GitHub.
2. En Render: `New` -> `Blueprint`.
3. Selecciona tu repo.
4. Render leera `render.yaml` y creara el servicio `stephfit-server`.

### Opcion B: Manual
1. En Render: `New` -> `Web Service`.
2. Repo: este proyecto.
3. Root Directory: `server`
4. Build Command: `npm ci`
5. Start Command: `npm start`

### Variables de entorno en Render (obligatorias)
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (ej: `7d`)
- `GEMINI_API_KEY` (si quieres IA con Gemini)
- `NODE_ENV=production`

Render asigna `PORT` automaticamente.

### Health check
- Endpoint: `/api/health`

---

## 2) Frontend (Vercel)

1. En Vercel: `Add New...` -> `Project`.
2. Selecciona el repo.
3. Configura:
- Framework Preset: `Vite`
- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`

### Variable de entorno en Vercel (obligatoria)
- `VITE_API_URL=https://TU-SERVICIO-RENDER.onrender.com/api`

El archivo `client/vercel.json` ya incluye rewrite para SPA.

---

## 3) Verificacion rapida post-deploy

1. Backend:
- `https://TU-SERVICIO-RENDER.onrender.com/api/health` debe responder `{ "status": "ok" }`.

2. Frontend:
- Login/registro funciona.
- Navegar a rutas internas (ej: `/routines`, `/exercises/123`) no da 404.
- Generar rutina IA responde desde el backend de Render.

---

## 4) Si falla CORS o llamadas API

Revisa:
- `VITE_API_URL` en Vercel.
- Que el backend Render este arriba (en plan free puede dormir).
- Logs de Render para errores 4xx/5xx.
