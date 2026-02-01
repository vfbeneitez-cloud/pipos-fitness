# Auditoría MVP — G1: Quality Gates

## Resumen

| Comando             | Resultado | Detalle               |
| ------------------- | --------- | --------------------- |
| `npm test`          | OK        | 86 tests, 23 archivos |
| `npm run lint`      | FAIL      | 2 errores, 3 warnings |
| `npm run typecheck` | OK        | —                     |
| `npm run build`     | OK        | Compilación exitosa   |

---

## 1) npm test

**Resultado:** OK

- 86 tests pasados en 23 archivos
- Duración ~57s
- **stderr (no bloqueante):** warnings `The current testing environment is not configured to support act(...)` en tests de `week/page.test.tsx` y `profile/page.test.tsx` — típico de React 19 + jsdom en tests con `act()`. Los tests pasan.

---

## 2) npm run lint

**Resultado:** FAIL

### Errores (2)

| Archivo                        | Línea | Regla                                   | Causa                                                     |
| ------------------------------ | ----- | --------------------------------------- | --------------------------------------------------------- |
| `scripts/patch-sentry-cjs.cjs` | 2, 3  | `@typescript-eslint/no-require-imports` | Uso de `require()` en script .cjs; ESLint prohíbe require |
| —                              | —     | —                                       | —                                                         |

### Warnings (3)

| Archivo                              | Línea | Regla                               | Causa                                  |
| ------------------------------------ | ----- | ----------------------------------- | -------------------------------------- |
| `scripts/generate-exercises-seed.ts` | 7     | `@typescript-eslint/no-unused-vars` | `ENVS` declarado pero no usado         |
| `scripts/generate-exercises-seed.ts` | 8     | `@typescript-eslint/no-unused-vars` | `PER_ENV` declarado pero no usado      |
| `src/proxy.ts`                       | 11    | `@typescript-eslint/no-unused-vars` | Parámetro `req` definido pero no usado |

---

## 3) npm run typecheck

**Resultado:** OK

- `tsc --noEmit` completado sin errores

---

## 4) npm run build

**Resultado:** OK

- Prisma generate OK
- Next.js build OK
- Compilación en ~14.5s
- 21 páginas/rutas generadas correctamente
- **Nota:** En un primer intento falló por `.next/lock` (otro build en curso). Tras eliminar el lock, build OK.

---

## Acciones recomendadas

1. **Lint:** Resolver los 2 errores en `patch-sentry-cjs.cjs` (ej. excluir del lint o usar eslint-disable en ese archivo).
2. **Lint:** Limpiar warnings: eliminar variables no usadas o marcar con `_`/eslint-disable según corresponda.
