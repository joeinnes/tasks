import webpush from "web-push";
import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const { VAPID_SUBJECT, VAPID_PRIVATE_KEY } = env;
  const { PUBLIC_VAPID_KEY } = publicEnv;
  if (!VAPID_SUBJECT || !PUBLIC_VAPID_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("Missing VAPID env: VAPID_SUBJECT, PUBLIC_VAPID_KEY, VAPID_PRIVATE_KEY");
  }
  webpush.setVapidDetails(VAPID_SUBJECT, PUBLIC_VAPID_KEY, VAPID_PRIVATE_KEY);
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
