import { getConnInfo } from "hono/deno";
import { RATE_LIMIT } from "../constants/rate-limits.ts";

const kv = await Deno.openKv();

export function rateLimitValidation(actionKey: string) {
  return async (c, next) => {
    const ip = getConnInfo(c)?.remote?.address || "unknown";
    const rateLimitKey = ["rate_limit", actionKey, ip];
    let rateLimitUsage = (await kv.get<number>(rateLimitKey)).value ?? 0;

    if (rateLimitUsage >= RATE_LIMIT[actionKey]) {
      console.log(`Rate limit exceeded for IP: ${ip}`);
      return c.text("Too Many Requests", 429);
    }

    rateLimitUsage++;

    await kv.set(rateLimitKey, rateLimitUsage);
    await next();
  };
}
