import webpush from "web-push";
import { VAPID_PRIVATE_KEY, VAPID_SUBJECT } from "$env/static/private";
import { PUBLIC_VAPID_KEY } from "$env/static/public";

webpush.setVapidDetails(VAPID_SUBJECT, PUBLIC_VAPID_KEY, VAPID_PRIVATE_KEY);

export async function sendPush(subscription: PushSubscriptionJSON) {
  await webpush.sendNotification(
    subscription as webpush.PushSubscription,
    JSON.stringify({
      title: "Tasks today",
      body:  "Tap to see your tasks for today.",
    })
  );
}
