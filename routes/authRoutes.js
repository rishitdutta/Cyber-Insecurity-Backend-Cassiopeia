const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authMiddleware');



// Authentication routes
router.post('/signup', authController.validateSignupInput, authController.initiateSignup);
router.post('/verify', authController.otpLimiter, authController.verifySignup);
router.post('/login', authController.initiateLogin);
router.post('/verify-login', authController.otpLimiter, authController.verifyLogin);
router.post('/profile', authenticate, authController.completeProfile);

// Password reset routes
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.otpLimiter, authController.resetPassword);




// router.post('/user/investment-verif', investmentController.createAsset)

module.exports = router;