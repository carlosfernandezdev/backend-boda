# Wedding Photobank — Backend

Backend para el banco de fotos y videos de la boda.

**Stack**: Node.js + Express + PostgreSQL + Cloudflare R2 + JWT.

## Estructura

```
src/
├── server.js         # Entry point (listen + shutdown)
├── app.js            # Configuración de Express
├── config/
│   ├── env.js        # Carga y valida variables de entorno
│   ├── db.js         # Pool de Postgres + helper de transacciones
│   └── r2.js         # Cliente de Cloudflare R2
├── routes/           # Definición de endpoints (delegan al controller)
├── controllers/      # Manejo HTTP (parsea req, llama al BO, responde)
├── bo/               # Business Objects: lógica de negocio + validaciones de dominio
├── dao/              # Data Access Objects: queries SQL
├── models/           # DTOs / forma de las entidades
├── middlewares/      # auth, permisos, errorHandler
├── services/         # Servicios externos (R2, metadata)
├── validators/       # Esquemas de validación (Joi)
└── utils/            # errors, asyncHandler, jwt, password

migrations/           # Migrations SQL (incrementales)
scripts/              # Utilidades CLI (createAdmin)
```

**Flujo de una request:**
`route → controller → BO → DAO → DB`
La capa BO es la única que llama al DAO. El controller no toca SQL.

## Setup

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Variables de entorno**:
   ```bash
   cp .env.example .env
   ```
   Generá un `JWT_SECRET` decente:
   ```bash
   openssl rand -hex 32
   ```

3. **Base de datos**:
   ```bash
   createdb wedding_photobank
   psql -d wedding_photobank -f ../schema.sql
   ```
   Si ya corriste el schema antes de las columnas de metadata, aplicá:
   ```bash
   psql -d wedding_photobank -f migrations/001_add_metadata_columns.sql
   ```

4. **Crear el primer admin** (y los novios):
   ```bash
   node scripts/crearUsuario.js admin@boda.com SuperSecret123 admin "Valeria"
   node scripts/crearUsuario.js guille@boda.com pass1234 novio "Guillermo"
   node scripts/crearUsuario.js janeric@boda.com pass1234 novio "Janeric"
   ```

5. **Levantar en dev**:
   ```bash
   npm run dev
   ```

6. **Verificar**:
   ```bash
   curl http://localhost:3000/health
   ```

## Endpoints disponibles

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/health` | — | Healthcheck |
| GET    | `/api` | — | Info de la API |
| POST   | `/api/auth/register` | — | Crea usuario rol `invitado` |
| POST   | `/api/auth/login` | — | Login con correo/contraseña |
| GET    | `/api/auth/me` | Bearer | Usuario actual + permisos |

## Probar auth con curl

**Registrar:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"correo":"juan@test.com","nombre":"Juan","contrasena":"contra123"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"juan@test.com","contrasena":"contra123"}'
```

**Yo (con el token):**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

## Variables de entorno clave

| Variable | Descripción |
|----------|-------------|
| `JWT_SECRET` | Clave para firmar tokens. Generala con `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Vida del token (default `7d`) |
| `R2_ACCOUNT_ID` | ID de cuenta de Cloudflare |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | API tokens del bucket |
| `R2_BUCKET_NAME` | Nombre del bucket en R2 |
| `R2_PUBLIC_URL` | URL pública del bucket |
| `CORS_ORIGIN` | Origen permitido del frontend |

## Próximos pasos

- [x] Auth: register, login, JWT
- [x] Middleware `requirePermiso`
- [ ] Servicio de metadata (exifr para fotos, ffprobe para videos)
- [ ] Servicio R2 (upload, delete)
- [ ] Asignación de etapa por proximidad
- [ ] CRUD de archivos con upload multipart
- [ ] Endpoint de galería con filtros (todo / por usuario / por etapa)
- [ ] CRUD de usuarios (con `PATCH /:id/rol` para promover)
- [ ] CRUD de etapas
