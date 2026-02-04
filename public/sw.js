self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  const { title, body, tag, data: payloadData } = data;
  const options = {
    body: body ?? "",
    tag: tag ?? "default",
    data: payloadData ?? {},
  };
  event.waitUntil(self.registration.showNotification(title ?? "Pipos", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.notificationId ? "/notifications" : "/notifications";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && "focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(self.location.origin + url);
    }),
  );
});
