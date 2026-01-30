"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <main>
      <h1>Sign in to your account</h1>

      <button onClick={() => signIn("google", { callbackUrl: "/week" })}>
        Continuar con Google
      </button>
    </main>
  );
}
