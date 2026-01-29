import { redirect } from "next/navigation";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function Home() {
  if (isDemoMode) {
    redirect("/week");
  }
  redirect("/auth/signin");
}
