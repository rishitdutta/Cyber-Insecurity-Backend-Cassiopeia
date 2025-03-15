const investmentController = require('../controllers/investmentController');
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);

/**
 * @route POST /create
 * @description Create new investment
 * @access Private
 * @body { amount: number, type: string, accountNumber: string }
 */
router.post('/create', investmentController.createInvestment);

router.get('/', investmentController.getInvestments);

module.exports = router;