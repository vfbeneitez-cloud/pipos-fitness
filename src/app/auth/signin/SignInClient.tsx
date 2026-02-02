"use client";

import { signIn } from "next-auth/react";

type Props = {
  googleAuthEnabled: boolean;
  error?: string | null;
};

export function SignInClient({ googleAuthEnabled, error }: Props) {
  const showUnavailable = !googleAuthEnabled || error === "google_not_available";

  return (
    <main>
      <h1>Inicia sesión</h1>

      {showUnavailable ? (
        <p>El acceso con Google no está disponible ahora mismo. Inténtalo más tarde.</p>
      ) : (
        <button onClick={() => signIn("google", { callbackUrl: "/week" })}>
          Continuar con Google
        </button>
      )}
    </main>
  );
}
