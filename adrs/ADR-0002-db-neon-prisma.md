## ADR-0002 — DB Postgres en Neon + Prisma v7

### Contexto

- Necesitamos una base de datos relacional para modelar usuarios, perfiles, ejercicios, planes y logs.
- El proyecto ya usa Prisma v7 con `schema.prisma`, `prisma.config.ts` y migraciones iniciales.
- Se busca compatibilidad con despliegues serverless.

### Decisión

- Usar **PostgreSQL** alojado en **Neon** como base de datos principal.
- Usar **Prisma v7** como ORM y sistema de migraciones:
  - `prisma.config.ts` define:
    - `schema: "prisma/schema.prisma"`,
    - `migrations.path: "prisma/migrations"`,
    - `migrations.seed: "tsx prisma/seed.ts"`,
    - `datasource.url` leída desde `env("DATABASE_URL")`.
  - El cliente Prisma se crea en `src/server/db/prisma.ts` usando:
    - `@prisma/adapter-neon` (`PrismaNeon`) con `connectionString = process.env.DATABASE_URL`,
    - `@neondatabase/serverless` configurado con `neonConfig.webSocketConstructor = ws`,
    - patrón de singleton en dev (`globalThis`) para evitar múltiples conexiones.

### Alternativas consideradas

- **Otras bases de datos (MySQL, SQLite, Mongo)**:
  - descartadas por menor encaje con features actuales (JSONB, enums, ecosistema) o por no necesitarse en esta fase.
- **Prisma con conexión HTTP en vez de Neon adapter**:
  - más simple, pero menos optimizado para entornos serverless soportados por Neon.

### Consecuencias

- Beneficios:
  - tipado end-to-end a partir de `schema.prisma`;
  - migraciones reproducibles (`migrate dev/deploy`) y seed centralizado;
  - compatibilidad con Neon y despliegues serverless.
- Costes:
  - dependencias adicionales (`@prisma/adapter-neon`, `@neondatabase/serverless`, `ws`);
  - necesidad de gestionar correctamente `DATABASE_URL` en todos los entornos.

### Cómo validar

- En un entorno limpio:
  - definir `DATABASE_URL` en `.env`,
  - ejecutar `npx prisma migrate dev` y `npx prisma db seed`,
  - levantar la app con `npm run dev` y verificar que APIs que usan Prisma responden sin errores de conexión.
- Revisar que no hay conexiones Prisma creadas fuera de `src/server/db/prisma.ts`.
