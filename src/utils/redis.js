const Redis = require("ioredis");

let pubClient = null;
let subClient = null;

async function connectRedis(url) {
  if (pubClient && subClient) return { pubClient, subClient };

  const redisUrl = url || process.env.REDIS_URL || "redis://127.0.0.1:6379";
  pubClient = new Redis(redisUrl);
  subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("Redis PubClient Error", err));
  subClient.on("error", (err) => console.error("Redis SubClient Error", err));

  await pubClient.connect();
  await subClient.connect();

  return { pubClient, subClient };
}

function getPubClient() {
  if (!pubClient) throw new Error("Redis not connected. Call connectRedis() first.");
  return pubClient;
}

function getSubClient() {
  if (!subClient) throw new Error("Redis not connected. Call connectRedis() first.");
  return subClient;
}

module.exports = { connectRedis, getPubClient, getSubClient };
