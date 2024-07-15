// import { v4 as uuidv4 } from 'uuid';
// import sha1 from 'sha1';
// import dbClient from '../utils/db';
// import redisClient from '../utils/redis';
const { v4: uuidv4 } = require('uuid');
const sha1 = require('sha1');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const AuthController = {
  async getConnect(request, response) {
    // sign-in the user by generating a new authentication token
    const baseCred = request.headers.authorization.split(' ')[1];
    const cred = Buffer.from(baseCred, 'base64').toString('ascii');
    const [email, password] = cred.split(':');
    const user = await dbClient.users.findOne({ email, password: sha1(password) });

    if (!user) {
      return (response.status(401).json({ error: 'Unauthorized' }));
    }

    const token = uuidv4();
    const key = `auth_${token}`;

    await redisClient.set(key, user._id.toString(), 24 * 60 * 60);
    return (response.status(200).json({ token }));
  },

  async getDisconnect(request, response) {
    // sign-out the user based on the token
    const token = request.headers['x-token'];

    if (!token) {
      return (response.status(401).json({ error: 'Unauthorized' }));
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return (response.status(401).json({ error: 'Unauthorized' }));
    }

    await redisClient.del(`auth_${token}`);
    return (response.status(204).send());
  },
};

module.exports = AuthController;
