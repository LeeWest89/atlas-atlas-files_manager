import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { error } from 'console';

const { ObjectId } = require('mongodb');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const FilesController = {
  async postUpload(request, response) {
    const {
      name, type, parentId, isPublic, data,
    } = request.body;
    const token = request.headers['x-token'];

    if (!token) {
      return (response.status(401).json({ error: 'Unauthorized' }));
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return (response.status(400).json({ error: 'Missing name' }));
    }

    if (!data && type !== 'folder') {
      return (response.status(400).json({ error: 'Missing data' }));
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return (response.status(400).json({ error: 'Missing type' }));
    }

    try {
      if (parentId) {
        const pFile = await dbClient.files.findOne({ _id: ObjectId(parentId) });

        if (!pFile) {
          return (response.status(400).json({ error: 'Parent not found' }));
        }

        if (pFile.type !== 'folder') {
          return (response.status(400).json({ error: 'Parent is not a folder' }));
        }
      }

      let localPath = '';

      if (type !== 'folder') {
        if (!fs.existsSync(FOLDER_PATH)) {
          fs.mkdirSync(FOLDER_PATH, { recursive: true });
        }

        const fileId = uuidv4();
        localPath = path.join(FOLDER_PATH, fileId);
        const fileData = Buffer.from(data, 'base64');

        fs.writeFileSync(localPath, fileData);
      }

      const newFile = {
        userId,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0,
        localPath,
      };

      const insertedFile = await dbClient.files.insertOne(newFile);
      return (response.status(201).send({
        id: insertedFile.insertedId,
        userId,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0,
      }));
    } catch (error) {
      console.error(error);
      return (error);
    }
  },

  async getShow(request, response) {
    const { id } = request.params;
    const token = request.headers['x-token'];

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const file = await dbClient.files.findOne({ _id: ObjectId(id), userId });

      if (!file) {
        return response.status(404).json({ error: 'Not found' });
      }

      return response.status(200).json(file);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getIndex(request, response) {
    const { parentId = '0', page = 0 } = request.query;
    const token = request.headers['x-token'];

    if (!token) {
      console.log('No token provided')
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      console.log('User not found for provided token')
      return response.status(401).json({ error: 'Unauthorized' });
    }
    // pagination limit
    const limit = 20;
    const skip = parseInt(page, 10) * limit;
    const parentIdInt = parseInt(parentId, 10);

    try {
      const files = await dbClient.files.aggregate([
        { $match: { parentId: parentIdInt, userId }},
        { $skip: skip },
        { $limit: limit }
      ]).toArray();

      console.log(`Files retrieved for user ${userId} with parentId ${parentId}:`, files);

      const transformedFiles = files.map(file => ({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      }));

      return response.status(200).json(transformedFiles);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

module.exports = FilesController;
