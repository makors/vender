import { RedisClient } from "bun";

const redisClient = new RedisClient("redis://redis:6379");

export async function login(req: Bun.BunRequest<'/auth/login'>) {
    const { privateCode } = await req.json();


    if (privateCode !== process.env["PRIVATE_CODE"]) {
        return new Response("Invalid private code", { status: 401 });
    }

    const token = crypto.randomUUID();

    await redisClient.set(`login:${token}`, privateCode);
    await redisClient.expire(`login:${token}`, 60 * 60 * 24); // 24 hours
    
    return Response.json({ token });
};

export async function isLoggedIn(bearerToken: string) {
    const privateCode = await redisClient.get(`login:${bearerToken}`);
    return privateCode === process.env["PRIVATE_CODE"]; // CURRENT private code (might have changed)
}