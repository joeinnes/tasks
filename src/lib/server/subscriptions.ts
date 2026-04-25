import { Redis } from "@upstash/redis";
import { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from "$env/static/private";

const redis = new Redis({
  url:   UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});

export type StoredSubscription = {
  userId:      string;
  subscription: PushSubscriptionJSON;
  scheduleId:  string;
};

const key = (userId: string) => `push:${userId}`;

export async function getSubscription(userId: string): Promise<StoredSubscription | null> {
  return redis.get<StoredSubscription>(key(userId));
}

export async function upsertSubscription(record: StoredSubscription) {
  await redis.set(key(record.userId), record);
}

export async function removeSubscription(userId: string) {
  await redis.del(key(userId));
}
