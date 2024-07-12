import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

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
};

module.exports = FilesController;
