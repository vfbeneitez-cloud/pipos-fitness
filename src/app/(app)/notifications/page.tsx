"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

type EmailPrefs = {
  emailNotificationsEnabled: boolean;
  emailNotificationHourUtc: number;
};

type PushPrefs = {
  pushNotificationsEnabled: boolean;
  pushQuietHoursStartUtc: number;
  pushQuietHoursEndUtc: number;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[] | null | undefined>(undefined);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailPrefs, setEmailPrefs] = useState<EmailPrefs | null>(null);
  const [emailPrefsSaving, setEmailPrefsSaving] = useState(false);
  const [pushPrefs, setPushPrefs] = useState<PushPrefs | null>(null);
  const [pushPrefsSaving, setPushPrefsSaving] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setError(null);
    setItems(undefined);
    try {
      const res = await fetch(`/api/notifications?unreadOnly=${unreadOnly ? "1" : "0"}`);
      if (res.status === 404) {
        setItems(null);
        return;
      }
      const data = (await res.json()) as NotificationItem[] | { error_code?: string };
      if (!res.ok) {
        setError((data as { message?: string }).message ?? "Error al cargar.");
        setItems(null);
        return;
      }
      setItems(data as NotificationItem[]);
    } catch {
      setError("Error de red. Reintenta.");
      setItems(null);
    }
  }, [unreadOnly]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const fetchEmailPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/preferences");
      if (res.status === 404) return;
      const data = (await res.json()) as EmailPrefs;
      setEmailPrefs(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchEmailPrefs();
  }, [fetchEmailPrefs]);

  const fetchPushPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/push/preferences");
      if (res.status === 404) return;
      const data = (await res.json()) as PushPrefs;
      setPushPrefs(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPushPrefs();
  }, [fetchPushPrefs]);

  const handlePushPrefsChange = useCallback(
    async (updates: Partial<PushPrefs>) => {
      if (!pushPrefs) return;
      setPushPrefsSaving(true);
      try {
        const res = await fetch("/api/notifications/push/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...pushPrefs, ...updates }),
        });
        if (res.ok) {
          const data = (await res.json()) as PushPrefs;
          setPushPrefs(data);
        }
      } finally {
        setPushPrefsSaving(false);
      }
    },
    [pushPrefs],
  );

  const handleActivatePush = useCallback(async () => {
    setPushError(null);
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setPushError("Push no configurado.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPushError("Permiso denegado.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await reg.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const subJson = sub.toJSON();
      const res = await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });
      if (res.ok) {
        setPushSubscribed(true);
        await handlePushPrefsChange({ pushNotificationsEnabled: true });
      } else {
        const d = (await res.json()) as { message?: string };
        setPushError(d.message ?? "Error al suscribirse.");
      }
    } catch (e) {
      setPushError(e instanceof Error ? e.message : "Error inesperado.");
    }
  }, [handlePushPrefsChange]);

  const handleDeactivatePush = useCallback(async () => {
    setPushError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/notifications/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      setPushSubscribed(false);
      await handlePushPrefsChange({ pushNotificationsEnabled: false });
      fetchPushPrefs();
    } catch {
      setPushError("Error al desactivar.");
    }
  }, [handlePushPrefsChange, fetchPushPrefs]);

  useEffect(() => {
    const checkSub = async () => {
      try {
        if ("serviceWorker" in navigator && "PushManager" in window) {
          const reg = await navigator.serviceWorker.getRegistration();
          const sub = reg ? await reg.pushManager.getSubscription() : null;
          setPushSubscribed(!!sub);
        }
      } catch {
        // ignore
      }
    };
    checkSub();
  }, []);

  const handleEmailPrefsChange = useCallback(async (enabled: boolean, hourUtc: number) => {
    setEmailPrefsSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailNotificationsEnabled: enabled,
          emailNotificationHourUtc: hourUtc,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as EmailPrefs;
        setEmailPrefs(data);
      }
    } finally {
      setEmailPrefsSaving(false);
    }
  }, []);

  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (res.ok) await fetchList();
      } catch {
        // ignore
      }
    },
    [fetchList],
  );

  if (items === undefined) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Notificaciones
        </h1>
        <p className="text-zinc-500">Cargando…</p>
      </main>
    );
  }

  if (items === null) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Notificaciones
        </h1>
        <p className="text-zinc-500">{error ?? "Las notificaciones no están disponibles."}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 pb-20">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Notificaciones
      </h1>

      <label className="mb-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={unreadOnly}
          onChange={(e) => setUnreadOnly(e.target.checked)}
          className="rounded"
        />
        Solo no leídas
      </label>

      {items.length === 0 ? (
        <p className="text-zinc-500">No hay notificaciones.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border p-4 ${
                n.readAt
                  ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/50"
                  : "border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/10"
              }`}
            >
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{n.title}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{n.message}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {new Date(n.createdAt).toLocaleString("es-ES")}
              </p>
              {!n.readAt && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(n.id)}
                  className="mt-2 text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Marcar como leída
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {emailPrefs !== null && (
        <section className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <h2 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">Email</h2>
          <p className="mb-3 text-xs text-zinc-500">
            Recibir notificaciones por email (hora en UTC).
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={emailPrefs.emailNotificationsEnabled}
                onChange={(e) =>
                  handleEmailPrefsChange(e.target.checked, emailPrefs.emailNotificationHourUtc)
                }
                disabled={emailPrefsSaving}
                className="rounded"
              />
              Activar emails
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span>Hora (UTC):</span>
              <select
                value={emailPrefs.emailNotificationHourUtc}
                onChange={(e) =>
                  handleEmailPrefsChange(
                    emailPrefs.emailNotificationsEnabled,
                    parseInt(e.target.value, 10),
                  )
                }
                disabled={emailPrefsSaving}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      {pushPrefs !== null && (
        <section className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <h2 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">Push</h2>
          <p className="mb-3 text-xs text-zinc-500">
            Notificaciones push en el navegador (quiet hours en UTC).
          </p>
          {pushError && (
            <p className="mb-2 text-sm text-amber-600 dark:text-amber-400">{pushError}</p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            {pushSubscribed ? (
              <button
                type="button"
                onClick={handleDeactivatePush}
                disabled={pushPrefsSaving}
                className="rounded bg-zinc-200 px-3 py-1 text-sm dark:bg-zinc-600"
              >
                Desactivar push
              </button>
            ) : (
              <button
                type="button"
                onClick={handleActivatePush}
                disabled={pushPrefsSaving}
                className="rounded bg-zinc-200 px-3 py-1 text-sm dark:bg-zinc-600"
              >
                Activar push
              </button>
            )}
            <label className="flex items-center gap-2 text-sm">
              <span>Quiet start (UTC):</span>
              <select
                value={pushPrefs.pushQuietHoursStartUtc}
                onChange={(e) =>
                  handlePushPrefsChange({
                    pushQuietHoursStartUtc: parseInt(e.target.value, 10),
                  })
                }
                disabled={pushPrefsSaving}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span>Quiet end (UTC):</span>
              <select
                value={pushPrefs.pushQuietHoursEndUtc}
                onChange={(e) =>
                  handlePushPrefsChange({
                    pushQuietHoursEndUtc: parseInt(e.target.value, 10),
                  })
                }
                disabled={pushPrefsSaving}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      <p className="mt-6 text-sm text-zinc-500">
        <Link href="/week" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
          ← Volver a Semana
        </Link>
      </p>
    </main>
  );
}
