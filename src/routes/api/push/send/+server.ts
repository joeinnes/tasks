import { json } from "@sveltejs/kit";
import { Receiver } from "@upstash/qstash";
import { QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY } from "$env/static/private";
import { getSubscription } from "$lib/server/subscriptions";
import { sendPush } from "$lib/server/push";
import type { RequestHandler } from "./$types";

const receiver = new Receiver({
  currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey:    QSTASH_NEXT_SIGNING_KEY,
});

export const POST: RequestHandler = async ({ request }) => {
  const body      = await request.text();
  const signature = request.headers.get("upstash-signature") ?? "";

  const valid = await receiver.verify({ body, signature }).catch(() => false);
  if (!valid) return new Response("Unauthorized", { status: 401 });

  const { userId } = JSON.parse(body);
  const record = await getSubscription(userId);
  if (record) await sendPush(record.subscription).catch(console.error);

  return json({ ok: true });
};
