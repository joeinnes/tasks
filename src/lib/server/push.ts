import webpush from "web-push";
import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(env.VAPID_SUBJECT, publicEnv.PUBLIC_VAPID_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
}

export async function sendPush(subscription: PushSubscriptionJSON) {
  ensureConfigured();
  await webpush.sendNotification(
    subscription as webpush.PushSubscription,
    JSON.stringify({
      title: "Tasks today",
      body:  "Tap to see your tasks for today.",
    })
  );
}
