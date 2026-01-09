const express = require('express');
const router = express.Router();
const incentiveAdminController = require('../controllers/incentiveAdminController');
const { authorizeAdmin } = require('../middleware/auth');

// All routes are protected by admin authentication
router.use(authorizeAdmin);

// Incentive Schemes (CRUD)
router.get('/', incentiveAdminController.getAllIncentives);
router.post('/', incentiveAdminController.createIncentive);
router.put('/:id', incentiveAdminController.updateIncentive);
router.delete('/:id', incentiveAdminController.deleteIncentive);

// Incentive History & Claims
router.get('/history', incentiveAdminController.getIncentiveHistory);
router.post('/claims/:id/approve', incentiveAdminController.approveClaim);
router.post('/claims/:id/reject', incentiveAdminController.rejectClaim);
router.post('/claims/:id/mark-claimed', incentiveAdminController.markAsClaimed);

module.exports = router;
