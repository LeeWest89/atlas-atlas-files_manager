// utils/transform.js
// for transforming format of files in filescontroller

const transformFile = (file) => ({
  id: file._id,
  userId: file.userId,
  name: file.name,
  type: file.type,
  isPublic: file.isPublic,
  parentId: file.parentId,
});

module.exports = transformFile;