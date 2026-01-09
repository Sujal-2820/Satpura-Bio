const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authorizeAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/admin/categories
 * @desc    Get all categories for admin
 * @access  Private (Admin)
 */
router.get('/', authorizeAdmin, categoryController.getAdminCategories);

/**
 * @route   POST /api/admin/categories
 * @desc    Create a new category
 * @access  Private (Admin)
 */
router.post('/', authorizeAdmin, categoryController.createCategory);

/**
 * @route   PUT /api/admin/categories/:id
 * @desc    Update a category
 * @access  Private (Admin)
 */
router.put('/:id', authorizeAdmin, categoryController.updateCategory);

/**
 * @route   DELETE /api/admin/categories/:id
 * @desc    Delete a category
 * @access  Private (Admin)
 */
router.delete('/:id', authorizeAdmin, categoryController.deleteCategory);

module.exports = router;
