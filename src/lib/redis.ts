import "dotenv/config";
import Redis from 'ioredis';

const RedisClient = Redis.default || Redis;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const publisher = new RedisClient(redisUrl);

export const subscriber = new RedisClient(redisUrl);

export const redis = new RedisClient(redisUrl);

publisher.on('error', (err) => console.error('Redis publisher error:', err.message));
subscriber.on('error', (err) => console.error('Redis subscriber error:', err.message));
redis.on('error', (err) => console.error('Redis error:', err.message));
