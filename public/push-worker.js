self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Pata Keja";
  const body = payload.body || "You have a new update.";
  const url = typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/notifications";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: {
        url,
        notificationId: payload.notificationId || null
      },
      tag: payload.notificationId || undefined
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  const url = event.notification?.data?.url || "/notifications";

  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          if ("navigate" in client) {
            client.navigate(url);
          }

          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }

      return undefined;
    })
  );
});
