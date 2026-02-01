# MVP Readiness - F4 — Public Route Check: /exercise/[slug]

## Diagnóstico

### Cómo protege rutas el layout

- **Archivo:** `src/app/(app)/layout.tsx`
- **Mecanismo:** Server component que llama a `getUserIdFromSession()`. Si no hay `userId`, hace `redirect("/auth/signin")` antes de renderizar.
- **No usa AuthGuard:** El layout no envuelve hijos en `<AuthGuard>`; la protección es el redirect en el propio layout.
- **Alcance:** Todas las rutas bajo `(app)/` reciben este layout: `week`, `onboarding`, `profile`, `session/[dayIndex]`, `log/*`, **y `exercise/[slug]`**.

### ¿Es `/exercise/[slug]` accesible sin sesión?

**No.** Cualquier petición a `/exercise/[slug]` pasa por `(app)/layout.tsx`. Si no hay sesión, `getUserIdFromSession()` devuelve `null` y se ejecuta `redirect("/auth/signin")` antes de llegar a la página del ejercicio. El usuario sin sesión no ve el contenido del ejercicio.

### Contenido de la página ejercicio

- **Archivo:** `src/app/(app)/exercise/[slug]/page.tsx`
- **Datos:** Solo lee `Exercise` por `slug` desde Prisma (GET público en esencia; el listado de ejercicios ya es público vía `/api/exercises`).
- **UI:** Breadcrumb "← Semana" a `/week`; no depende de sesión para mostrar nombre, entorno, media, descripción, cues, etc.
- **Conclusión:** No hay razón funcional para exigir sesión; la ruta es buena candidata a pública.

---

## Opciones para hacerla pública

### Opción A: Mover a `src/app/exercise/[slug]`

- **Qué hacer:** Mover la carpeta `src/app/(app)/exercise/` a `src/app/exercise/` (fuera del grupo `(app)`).
- **Efecto:** La ruta queda bajo solo el root layout (`src/app/layout.tsx`), que no hace redirect. `/exercise/[slug]` será accesible sin sesión.
- **Ventajas:** Un solo cambio de ubicación; no se toca la lógica del layout ni se añaden condiciones por path. Mínimo impacto.
- **Desventaja:** La página deja de tener la barra inferior `Nav` (Semana / Perfil), porque esa Nav la inyecta `(app)/layout.tsx`. El breadcrumb "← Semana" sigue en la página; si el usuario no está logueado y pulsa "Semana", irá a `/week` y el layout de `(app)` le redirigirá a signin (comportamiento aceptable).
- **Archivos a mover:** `src/app/(app)/exercise/[slug]/page.tsx`, `src/app/(app)/exercise/[slug]/not-found.tsx` (y la carpeta `[slug]`) a `src/app/exercise/[slug]/`. Eliminar la carpeta `(app)/exercise` si queda vacía.
- **Enlaces existentes:** Los enlaces a `/exercise/${slug}` (p. ej. en `(app)/session/[dayIndex]/page.tsx`) siguen siendo válidos; la URL no cambia.

### Opción B: Excluir del guard en el layout (route groups)

- **Qué hacer:** Crear grupos de ruta bajo `(app)`: uno “protegido” y otro “público”. El layout de `(app)` deja de hacer redirect y solo renderiza `children`. Un nuevo layout bajo `(app)/(protected)/` aplica el redirect + Nav; otro bajo `(app)/(public)/` solo pasa los hijos. Mover `week`, `onboarding`, `profile`, `session`, `log` bajo `(app)/(protected)/` y `exercise` bajo `(app)/(public)/`.
- **Efecto:** `/exercise/[slug]` sigue bajo `(app)` pero solo pasa por un layout que no redirige; el redirect solo se aplica a rutas bajo `(protected)`.
- **Ventajas:** La ruta ejercicio sigue “dentro” de la app y podría reutilizar el mismo layout (por ejemplo Nav) si en el futuro se quisiera Nav también en la página pública (p. ej. condicional por sesión).
- **Desventajas:** Hay que tocar el layout actual, crear dos layouts nuevos y mover todas las rutas de `(app)` a `(protected)` o `(public)`. Más archivos y más cambios que la Opción A.
- **Sin hacks:** Es el patrón estándar de App Router con route groups; no hace falta leer pathname ni headers en el layout.

---

## Recomendación mínima

- **Recomendación:** **Opción A** (mover a `src/app/exercise/[slug]`).
- **Motivo:** Un único cambio estructural (mover la carpeta `exercise` fuera de `(app)`), sin modificar layouts ni añadir route groups. La URL `/exercise/[slug]` se mantiene; solo cambia la ubicación en el árbol de rutas. La pérdida de la barra Nav en la página de ejercicio es asumible para una ruta pública y se puede revisar más adelante si se quiere Nav condicional.

**Resumen:** Hoy `/exercise/[slug]` no es accesible sin sesión porque está bajo `(app)/layout.tsx`, que redirige si no hay `userId`. Para hacerla pública con el mínimo cambio: mover `(app)/exercise/` a `app/exercise/` (Opción A). No se ha implementado ningún cambio en este paso.
