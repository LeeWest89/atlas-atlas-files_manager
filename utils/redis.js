/* Setup for RedisClint Class */
import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  /* RedisClient Class */
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (error) => {
      console.error(error);
    });

    this.getA = promisify(this.client.get).bind(this.client);
    this.setA = promisify(this.client.set).bind(this.client);
    this.delA = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    /* Checks if Redis is connected */
    return (this.client.connected);
  }

  async get(key) {
    /* returns the Redis value stored for this key */
    return (this.getA(key));
  }

  async set(key, value, duration) {
    /* takes a string key, a value and a duration in second as arguments to store it in Redis */
    return (this.setA(key, value, 'EX', duration));
  }

  async del(key) {
    /* takes a string key as argument and remove the value in Redis for this key */
    return (this.delA(key));
  }
}

const redisClient = new RedisClient();
export default redisClient;
