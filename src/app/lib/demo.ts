export const DEMO_USER_KEY = "pipos_demo_user_id";

export function getDemoUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEMO_USER_KEY);
}

export function setDemoUserId(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_USER_KEY, userId);
}

export function clearDemoUserId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_USER_KEY);
}
