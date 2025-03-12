const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authenticateUser = require('../middleware/authMiddleware');
const isVerified = require('../middleware/roleMiddleware');

router.post('/', authenticateUser, isVerified, transactionController.createTransaction);
router.get('/', authenticateUser, transactionController.getTransactions);
router.patch('/:id', authenticateUser, isVerified, transactionController.updateStatus);

module.exports = router;