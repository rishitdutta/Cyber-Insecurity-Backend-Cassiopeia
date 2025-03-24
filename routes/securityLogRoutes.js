const express = require('express');
const router = express.Router();
const securityLogController = require('../controllers/securityLogController');
const authenticate = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Get user's security logs/notifications
router.get('/my-logs', securityLogController.getUserLogs);

// Get all logs (admin only)
router.get('/all', securityLogController.getAllLogs);

// Get log by ID
router.get('/:id', securityLogController.getLogById);

module.exports = router;
