// import path from 'path';
// import { v4 as uuidv4 } from 'uuid';
// import fs from 'fs';
// import mime from 'mime-types';
// import dbClient from '../utils/db';
// import redisClient from '../utils/redis';
// import transformFile from '../utils/transform';
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const mime = require('mime-types');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const transformFile = require('../utils/transform');

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
      // return correctly formatted file
      return response.status(200).json(transformFile(file));
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getIndex(request, response) {
    const { parentId = '0', page = 0 } = request.query;
    const token = request.headers['x-token'];

    if (!token) {
      console.log('No token provided');
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      console.log('User not found for provided token');
      return response.status(401).json({ error: 'Unauthorized' });
    }

    // Pagination limit
    const limit = 20;
    const skip = parseInt(page, 10) * limit;

    try {
      let files;

      if (parentId === '0') {
        // all files for user
        files = await dbClient.files.aggregate([
          { $match: { userId } },
          { $skip: skip },
          { $limit: limit },
        ]).toArray();
      } else {
        // specific parentId
        files = await dbClient.files.aggregate([
          { $match: { parentId, userId } },
          { $skip: skip },
          { $limit: limit },
        ]).toArray();
      }

      console.log(`Files retrieved for user ${userId} with parentId ${parentId}:`, files);
      // Format files
      const transformedFiles = files.map(transformFile);

      return response.status(200).json(transformedFiles);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async putPublish(request, response) {
    const { id } = request.params;
    const token = request.headers['x-token'];

    if (!token) {
      console.log('No token provided');
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      console.log('User not found for provided token');
      return response.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const file = await dbClient.files.findOne({ _id: ObjectId(id), userId });

      if (!file) {
        return response.status(404).json({ error: 'Not found' });
      }

      await dbClient.files.updateOne(
        { _id: ObjectId(id) }, { $set: { isPublic: true } },
      );
      const updatedFile = await dbClient.files.findOne({ _id: ObjectId(id) });
      return response.status(200).json(transformFile(updatedFile));
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async putUnpublish(request, response) {
    const { id } = request.params;
    const token = request.headers['x-token'];

    if (!token) {
      console.log('No token provided');
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      console.log('User not found for provided token');
      return response.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const file = await dbClient.files.findOne({ _id: ObjectId(id), userId });

      if (!file) {
        return response.status(404).json({ error: 'Not found' });
      }

      await dbClient.files.updateOne(
        { _id: ObjectId(id) }, { $set: { isPublic: false } },
      );

      const updatedFile = await dbClient.files.findOne({ _id: ObjectId(id) });
      return response.status(200).json(transformFile(updatedFile));
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getFile(request, response) {
    const { id } = request.params;
    const token = request.headers['x-token'];

    try {
      if (!ObjectId.isValid(id)) {
        return (response.status(404).json({ error: 'Not found' }));
      }

      const file = await dbClient.files.findOne({ _id: ObjectId(id) });

      if (!file) {
        return (response.status(404).json({ error: 'Not found' }));
      }

      if (file.type === 'folder') {
        return (response.status(400).json({ error: "A folder doesn't have content" }));
      }

      if (!file.isPublic && !token) {
        return response.status(404).json({ error: 'Not found' });
      }

      if (token) {
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId || (!file.isPublic && userId !== file.userId.toString())) {
          return response.status(404).json({ error: 'Not found' });
        }
      }

      if (!fs.existsSync(file.localPath)) {
        return (response.status(404).json({ error: 'Not found' }));
      }

      const mimeType = mime.lookup(file.name) || 'application/octet-stream';

      response.setHeader('Content-Type', mimeType);

      fs.createReadStream(file.localPath).pipe(response);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = FilesController;
