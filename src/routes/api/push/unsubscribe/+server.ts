import { json, error } from "@sveltejs/kit";
import { Client } from "@upstash/qstash";
import { env } from "$env/dynamic/private";
import { getSubscription, removeSubscription } from "$lib/server/subscriptions";
import type { RequestHandler } from "./$types";

const qstash = new Client({ token: env.QSTASH_TOKEN });

export const POST: RequestHandler = async ({ request }) => {
  const { userId } = await request.json();
  if (!userId) error(400, "Bad request");

  const existing = await getSubscription(userId);
  if (existing?.scheduleId) {
    await qstash.schedules.delete(existing.scheduleId).catch(() => {});
  }

  await removeSubscription(userId);
  return json({ ok: true });
};
