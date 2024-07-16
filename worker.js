const Bull = require('bull');
const { ObjectId } = require('mongodb');
const fs = require('fs').promises;
const dbClient = require('./utils/db');
const imageThumbnail = require('image-thumbnail');

const fileQueue = new Bull('fileQueue');
console.log('Worker is running...');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId });

  if (!file) {
    throw new Error('File not found');
  }

  const thumbnailSizes = [500, 250, 100];
  const promises = thumbnailSizes.map(async (size) => {
    try {
      const thumbnail = await imageThumbnail(file.localPath, { width: size });
      const thumbnailPath = `${file.localPath}_${size}`;

      await fs.writeFile(thumbnailPath, thumbnail);

      console.log(`Thumbnail generated for ${file.name} with size ${size}`);
    } catch (error){
      console.error(`Error generating thumbnail for ${file.name} with size ${size}:`, error);
    }
  });

  await Promise.all(promises);

  return Promise.resolve();
});

module.exports = { fileQueue };
