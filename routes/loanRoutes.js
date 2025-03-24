const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const authenticate = require('../middleware/authMiddleware');
const { isVerified, isAdmin } = require('../middleware/roleMiddleware');

// All loan routes require authentication
router.use(authenticate);

// User routes
router.post('/apply', isVerified, loanController.applyLoan);
router.get('/my-loans', isVerified, loanController.getUserLoans);
router.get('/:loanId', isVerified, loanController.getLoanDetails);

// Admin routes
router.get('/admin/all', isAdmin, loanController.getAllLoans);
router.put('/:loanId/process', isAdmin, loanController.processLoanApplication);

module.exports = router;
