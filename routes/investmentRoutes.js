const investmentController = require('../controllers/investmentController');
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);

router.post('/user/investment', investmentController.Investment)
router.post('/user/investment-verify', investmentController.verifyInvestmentOtp)

module.exports = router;