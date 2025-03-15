const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');

router.get('/me', authenticate, userController.getCurrentUser);
router.put('/profile', authenticate, userController.updateProfile);
router.put('/security/mfa', authenticate, userController.updateSecurity);

module.exports = router;