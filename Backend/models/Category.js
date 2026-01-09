const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
        maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    image: {
        url: {
            type: String,
            required: [true, 'Category image is required'],
        },
        publicId: {
            type: String,
        },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    order: {
        type: Number,
        default: 0,
    }
}, {
    timestamps: true,
});

// Generate slug before saving
categorySchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
    }
    next();
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
