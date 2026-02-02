import { getGoogleOAuthConfig } from "@/src/server/auth/config";
import { SignInClient } from "./SignInClient";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const params = (await (searchParams ?? Promise.resolve({}))) as {
    error?: string;
  };
  const googleAuthEnabled = getGoogleOAuthConfig() !== null;

  return <SignInClient googleAuthEnabled={googleAuthEnabled} error={params.error ?? null} />;
}
