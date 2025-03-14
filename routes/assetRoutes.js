// routes/assetRoutes.js
const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const authenticate = require('../middleware/authMiddleware');
const { isAdmin, isVerified } = require('../middleware/roleMiddleware');

// All asset routes require authentication
router.use(authenticate);

// Regular user routes
router.get('/my-assets', assetController.getMyAssets);
router.post('/', isVerified, assetController.createAsset);
router.put('/:id', isVerified, assetController.updateAsset);

// Admin-only routes
router.get('/', isAdmin, assetController.getAllAssets); // All users' assets - admin only
router.get('/:id', isAdmin, assetController.getAssetById); // Get any asset by ID - admin only
router.delete('/:id', isAdmin, assetController.deleteAsset); // Asset deletion - admin only

module.exports = router;