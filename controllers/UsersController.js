// import sha1 from 'sha1';
// import dbClient from '../utils/db';
// import redisClient from '../utils/redis';
const sha1 = require('sha1');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const UsersController = {
  async postNew(request, response) {
    try {
      const { email, password } = request.body;

      // check if user entered email and password:
      if (!email) {
        return response.status(400).json({ error: 'Missing email' });
      }
      if (!password) {
        return response.status(400).json({ error: 'Missing password' });
      }

      // check if email already exists:
      const existingUser = await dbClient.users.findOne({ email });
      if (existingUser) {
        return response.status(400).json({ error: 'Email already exists' });
      }

      const hashedPassword = sha1(password);

      const newUser = await dbClient.users.insertOne({
        email,
        password: hashedPassword,
      });
      const userResponse = {
        email: newUser.ops[0].email,
        id: newUser.ops[0]._id,
      };
      return response.status(201).json(userResponse);
    } catch (error) {
      console.error('Error in postNew:', error);
      return response.status(500).json({ error: 'Internal Server Error ' });
    }
  },

  async getMe(request, response) {
    // retrieve the user base on the token used
    const token = request.headers['x-token'];
    // console.log('Token:', token);
    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    // console.log('Redis:', userId);
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
    // console.log('DB:', user);
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userRes = {
      id: user._id,
      email: user.email,
    };
    return (response.status(200).json(userRes));
  },
};

module.exports = UsersController;
