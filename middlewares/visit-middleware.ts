const kv = await Deno.openKv();

export function visitCounter(actionKey: string) {
  return async (c, next) => {
    const visitsKey = ["visits", actionKey];
    let visitsCount = (await kv.get<number>(visitsKey)).value ?? 0;
    visitsCount++;

    await kv.set(visitsKey, visitsCount);
    await next();
  };
}