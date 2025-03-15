const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const authenticate = require('../middleware/authMiddleware');
const { isVerified } = require('../middleware/roleMiddleware');

// All account routes require authentication
router.use(authenticate);

// Regular user routes
router.post('/', isVerified, accountController.createAccount);
router.get('/my-accounts', isVerified, accountController.getMyAccounts);
router.get('/:id', isVerified, accountController.getAccountById);
router.put('/:id', isVerified, accountController.updateAccount);
router.delete('/:id', isVerified, accountController.deleteAccount);

module.exports = router;