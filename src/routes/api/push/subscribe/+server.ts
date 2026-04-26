import { json, error } from "@sveltejs/kit";
import { Client } from "@upstash/qstash";
import { env } from "$env/dynamic/private";
import { getSubscription, upsertSubscription } from "$lib/server/subscriptions";
import type { RequestHandler } from "./$types";

const qstash = new Client({ token: env.QSTASH_TOKEN });

export const POST: RequestHandler = async ({ request }) => {
  const { userId, subscription, notifTimeUTC } = await request.json();
  if (!userId || !subscription || !notifTimeUTC) error(400, "Bad request");

  // Remove old schedule if updating
  const existing = await getSubscription(userId);
  if (existing?.scheduleId) {
    await qstash.schedules.delete(existing.scheduleId).catch(() => {});
  }

  // Create daily QStash schedule at the user's UTC time
  const [h, m] = notifTimeUTC.split(":").map(Number);
  const { scheduleId } = await qstash.schedules.create({
    destination: `${env.APP_URL}/api/push/send`,
    cron: `${m} ${h} * * *`,
    body: JSON.stringify({ userId }),
    headers: { "Content-Type": "application/json" },
  });

  await upsertSubscription({ userId, subscription, scheduleId });
  return json({ ok: true });
};
