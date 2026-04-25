/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event: PushEvent) => {
  let title = "Tasks";
  let body  = "You have tasks due today.";
  try {
    const d = event.data?.json();
    if (d?.title) title = d.title;
    if (d?.body)  body  = d.body;
  } catch { /* use defaults */ }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  "/favicon.svg",
      badge: "/favicon-maskable.svg",
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
