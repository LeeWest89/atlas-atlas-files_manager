const express = require('express');
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');
const AuthController = require('../controllers/AuthController');
const FilesController = require('../controllers/FilesController');

const router = express.Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.get('/connect', AuthController.getConnect); // 4
router.get('/disconnect', AuthController.getDisconnect); // 4
router.get('/users/me', UsersController.getMe); // 4
router.post('/users', UsersController.postNew);
router.post('/files', FilesController.postUpload); // 5
router.get('/files/:id', FilesController.getShow); // 6
router.get('/files', FilesController.getIndex); // 6

module.exports = router;
