// dashboardRoutes.js
const express = require('express')
const router = express.Router()
const dashboardController = require('../controllers/dashboardController')
const authenticate = require('../middleware/authMiddleware')

router.get('/overview', authenticate, dashboardController.getDashboardOverview)

module.exports = router