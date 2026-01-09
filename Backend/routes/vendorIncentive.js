const express = require('express');
const router = express.Router();
const vendorIncentiveController = require('../controllers/vendorIncentiveController');
const { authorizeVendor } = require('../middleware/auth');

// All routes are protected for vendors
router.use(authorizeVendor);

// Scheme discovery
router.get('/schemes', vendorIncentiveController.getAvailableSchemes);

// Reward history
router.get('/history', vendorIncentiveController.getIncentiveHistory);

// Claiming
router.post('/claims/:claimId', vendorIncentiveController.claimReward);

module.exports = router;
