// transactionRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware'); // Default import
const { isAdmin, isVerified } = require('../middleware/roleMiddleware'); // Named imports
const transactionController = require('../controllers/transactionController'); // Controller import

router.post(
  '/',
  authenticate,
  isVerified,
  transactionController.createTransaction // Proper controller reference
);

router.get(
  '/',
  authenticate,
  isVerified,
  transactionController.getTransactions
);

router.get(
  '/:id',
  authenticate,
  isVerified,
  transactionController.getTransactionById
);


module.exports = router;