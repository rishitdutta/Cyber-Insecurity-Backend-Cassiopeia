const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateUser = require('../middleware/authMiddleware');

router.get('/', authenticateUser, userController.getProfile);
router.get('/all', authenticateUser, userController.getAllUsers);

module.exports = router;