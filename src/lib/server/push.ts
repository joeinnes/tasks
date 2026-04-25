import webpush from "web-push";
import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "$env/static/private";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export async function sendPush(subscription: PushSubscriptionJSON) {
  await webpush.sendNotification(
    subscription as webpush.PushSubscription,
    JSON.stringify({
      title: "Tasks today",
      body:  "Tap to see your tasks for today.",
    })
  );
}
