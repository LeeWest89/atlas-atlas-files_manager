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
  },

  async getStats(request, response) {
    try {
      const numUsers = await dbClient.nbUsers();
      const numFiles = await dbClient.nbFiles();
      response.status(200).json({ user: numUsers, files: numFiles });
    } catch (err) {
      response.status(500).json({ error: err.message });
    }
  }
};

module.exports = AppController;
