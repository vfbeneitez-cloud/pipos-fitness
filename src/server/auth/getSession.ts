import { auth } from "@/src/server/auth";
import { prisma } from "@/src/server/db/prisma";

const DEMO_EMAIL = "demo@pipos.local";

/**
 * Obtiene userId desde sesión. Soporta DEMO_MODE.
 * - Si DEMO_MODE=true: devuelve demo user (demo@pipos.local) si no hay sesión real.
 * - Si DEMO_MODE=false: requiere sesión válida, devuelve null si no hay.
 */
export async function getUserIdFromSession(): Promise<string | null> {
  const isDemoMode = process.env.DEMO_MODE === "true";

  if (isDemoMode) {
    const session = await auth();
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (user) return user.id;
    }
    // Fallback a demo user en DEMO_MODE
    const demoUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
    if (demoUser) return demoUser.id;
    // Crear demo user si no existe
    const newDemoUser = await prisma.user.create({ data: { email: DEMO_EMAIL } });
    return newDemoUser.id;
  }

  // Producción: requiere sesión válida
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  return user?.id ?? null;
}
