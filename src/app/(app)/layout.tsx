import { redirect } from "next/navigation";
import { Nav } from "@/src/app/components/Nav";
import { getUserIdFromSession } from "@/src/server/auth/getSession";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getUserIdFromSession();

  if (!userId) {
    redirect("/auth/signin");
  }

  return (
    <>
      <div className="min-h-screen pb-16">{children}</div>
      <Nav />
    </>
  );
}

