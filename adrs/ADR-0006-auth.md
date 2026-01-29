## ADR-0006 — Autenticación y autorización (MVP)

### Contexto

- La aplicación necesita autenticación real para producción.
- Actualmente usa `DEMO_MODE` con `userId` pasado en body/query, lo cual es inseguro.
- Necesitamos eliminar dependencia de `userId` en body/query para endpoints protegidos.
- Requerimos mantener `DEMO_MODE` para desarrollo local.

### Decisión

- **NextAuth.js (Auth.js v5)** con **Email Magic Link** como provider principal.
- Razones:
  - Nativo de Next.js, integración sencilla con App Router.
  - Magic link elimina necesidad de gestionar contraseñas (más seguro para MVP).
  - Soporta múltiples providers (OAuth, credentials) si se necesita después.
  - Configuración mínima, funciona con Prisma existente.
- **Autorización**:
  - `DEMO_MODE=true`: usa demo session (`demo@pipos.local`), pero NO acepta `userId` arbitrario en body/query.
  - `DEMO_MODE=false`: requiere sesión válida; sin sesión → 401.
- **Endpoints protegidos**: todos excepto `/api/exercises` (público).

### Alternativas consideradas

- **Clerk/Supabase Auth**: servicios externos, más rápido de setup pero dependencia externa y coste potencial.
- **Custom JWT**: más control pero más complejidad y riesgo de seguridad.
- **OAuth solo (Google)**: requiere cuenta Google, menos universal que email.

### Consecuencias

- Beneficios:
  - Seguridad: `userId` viene de sesión verificada, no de input del cliente.
  - Escalabilidad: fácil añadir OAuth después sin cambiar código.
  - UX: magic link es simple para usuarios.
- Costes:
  - Requiere email service (SendGrid, Resend, etc.) para producción.
  - Migración de endpoints existentes (refactor de `userId` en body/query).
  - Tests necesitan mock de sesión.

### Cómo validar

- Tests: endpoints protegidos devuelven 401 sin sesión, 200 con sesión válida.
- En `DEMO_MODE=true`: demo session funciona, pero `userId` en body es ignorado.
- En `DEMO_MODE=false`: sin sesión → 401, con sesión → acceso normal.
