const Category = require('../models/Category');
const Product = require('../models/Product');

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
exports.getCategories = async (req, res, next) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ order: 1 });
        res.status(200).json({
            success: true,
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all categories (Admin)
 * @route   GET /api/admin/categories
 * @access  Private (Admin)
 */
exports.getAdminCategories = async (req, res, next) => {
    try {
        const categories = await Category.find().sort({ order: 1 });
        res.status(200).json({
            success: true,
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create category
 * @route   POST /api/admin/categories
 * @access  Private (Admin)
 */
exports.createCategory = async (req, res, next) => {
    try {
        const { name, description, image, order, isActive } = req.body;

        const category = await Category.create({
            name,
            description,
            image,
            order,
            isActive,
        });

        res.status(201).json({
            success: true,
            data: category,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists',
            });
        }
        next(error);
    }
};

/**
 * @desc    Update category
 * @route   PUT /api/admin/categories/:id
 * @access  Private (Admin)
 */
exports.updateCategory = async (req, res, next) => {
    try {
        const { name, description, image, order, isActive } = req.body;

        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }

        category.name = name || category.name;
        category.description = description || category.description;
        category.image = image || category.image;
        category.order = order !== undefined ? order : category.order;
        category.isActive = isActive !== undefined ? isActive : category.isActive;

        await category.save();

        res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/admin/categories/:id
 * @access  Private (Admin)
 */
exports.deleteCategory = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }

        // Check if any products are using this category
        const productCount = await Product.countDocuments({ category: category.name.toLowerCase() });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category while it has ${productCount} products assigned to it`,
            });
        }

        await Category.deleteOne({ _id: req.params.id });

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};
/**
 * @desc    Reorder categories
 * @route   PUT /api/admin/categories/reorder
 * @access  Private (Admin)
 */
exports.reorderCategories = async (req, res, next) => {
    try {
        const { categories } = req.body; // Array of { id, order }

        if (!Array.isArray(categories)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input: categories must be an array',
            });
        }

        // Use Promise.all to update all categories
        await Promise.all(
            categories.map((cat) =>
                Category.findByIdAndUpdate(cat.id, { order: cat.order })
            )
        );

        res.status(200).json({
            success: true,
            message: 'Categories reordered successfully',
        });
    } catch (error) {
        next(error);
    }
};
