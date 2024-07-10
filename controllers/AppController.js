import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const AppController = {
  async getStatus(request, response) {
    const redisStatus = redisClient.isAlive();
    const dbStatus = dbClient.isAlive();

    if (redisStatus && dbStatus) {
      response.status(200).json({ redis: true, db: true});
    } else {
      response.status(500).json({ redis: redisStatus, db: dbStatus });
    }
  }
};

module.exports = AppController;
