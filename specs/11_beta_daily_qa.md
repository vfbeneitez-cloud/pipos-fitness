# Beta Daily QA Checklist

Máximo 10 checks. Si falla: abrir issue con etiqueta indicada.

---

## 1) Semana carga y último update

**Paso:** Con sesión, ir a `/week`.

**Esperado:** Semana con días, plan visible, panel "Última actualización del plan" (o "Ver motivo" si existe lastRationale).

**Si falla:** `p0-blocker` (si no carga) / `p1-ux` (si falta panel). Si falta panel: adjuntar Network tab del GET /api/weekly-plan (status + campos lastGeneratedAt/lastRationale).

**Evidencia:** Screenshot de /week con plan y panel de actualización.

---

## 2) Sesión y detalle de ejercicio

**Paso:** Clic en un día → `/session/[dayIndex]`. Clic en un ejercicio → abre `/exercise/[slug]`.

**Esperado:** Lista de ejercicios del día; al clicar, detalle con descripción, puntos clave, media.

**Si falla:** `p0-blocker` (crash) / `p1-ux` (enlace roto).

**Evidencia:** Screenshot de /session y de /exercise/[slug].

---

## 3) Registrar entrenamiento

**Paso:** Ir a `/log/training` o marcar sesión completada desde `/session/[dayIndex]`. Enviar.

**Esperado:** Confirmación (o vuelta a semana/log). No error 500.

**Si falla:** `p0-blocker` (500) / `data` (no guarda).

**Evidencia:** Screenshot del resultado; si 500, status de la respuesta (Network tab).

---

## 4) Registrar comida

**Paso:** Ir a `/log/nutrition`. Marcar comida según plan y enviar.

**Esperado:** Confirmación o vuelta. No error 500.

**Si falla:** `p0-blocker` (500) / `data` (no guarda).

**Evidencia:** Screenshot; si error, status y body de respuesta.

---

## 5) Swap comida

**Paso:** Desde semana/sesión, intercambiar una comida (swap).

**Esperado:** Alternativa mostrada. No error 500.

**Si falla:** `p0-blocker` (500/crash) / `p1-ux` (mensaje técnico).

**Evidencia:** Screenshot de success.

---

## 6) Ejercicio público (sin sesión)

**Paso:** Ventana incógnito, sin iniciar sesión. Ir a `/exercise/[slug]` (usar slug real de un ejercicio).

**Esperado:** Página carga con descripción y media. No redirige a signin.

**Si falla:** `p0-blocker` (exige login cuando debe ser público).

**Evidencia:** Screenshot de /exercise/[slug] en incógnito.

---

## 7) 401: sesión expirada o sin auth

**Paso:** Cerrar sesión (o abrir /week en incógnito sin login). Intentar acceder a `/week`.

**Esperado:** Redirige a `/auth/signin` o muestra mensaje humano + salida; nunca códigos crudos (UNAUTHORIZED, etc.).

**Si falla:** `p1-auth` (no redirige, pantalla en blanco, mensaje técnico).

**Evidencia:** Screenshot de signin tras logout, o del mensaje 401 si aplica.

---

## 8) 429: rate limit (opcional)

**Paso:** Repetir swap o log (training/nutrition) muchas veces en pocos segundos hasta recibir 429.

**Esperado:** Mensaje "Demasiadas solicitudes. Espera Xs y reintenta." (o similar). Header `Retry-After` en respuesta. No crash.

**Si falla:** `p1-ux` (mensaje incomprensible o crash).

**Evidencia:** Screenshot del mensaje; Network tab: status 429, Retry-After.

---

## 9) Not-found / error global

**Paso:** Ir a `/exercise/slug-que-no-existe-12345`.

**Esperado:** "Ejercicio no encontrado." + enlace "Volver a la semana". Salida clara.

**Alternativa (si existe ruta de test):** Provocar error no manejado → global-error debe mostrar "Ha ocurrido un problema." + "Reintentar" y "Volver a la semana".

**Si falla:** `p1-ux` (pantalla en blanco, stack trace visible).

**Evidencia:** Screenshot de not-found o global-error.

---

## 10) Sin jerga interna

**Paso:** Revisar copy visible en flujo normal: semana, sesión, log, perfil, onboarding, errores.

**Esperado:** No aparecen: "onboarding", "logs", "DRAFT", "placeholder", "adherencia", códigos de error crudos ("UNAUTHORIZED", "INVALID_INPUT"), ni rutas internas.

**Si falla:** `p2-copy`.

**Evidencia:** Screenshot de la pantalla donde aparece la jerga.

---

## QA semanal (opcional)

**Swap con datos inválidos / plan inexistente:** Probar swap con plan inexistente o body inválido. Esperado: mensaje humano ("Revisa los datos…"), no stack trace. Si falla: `p1-ux`. Evidencia: screenshot del mensaje de error.
