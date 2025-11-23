const mongoose = require('mongoose');
const { MIN_ORDER_VALUE } = require('../utils/constants');

/**
 * Cart Schema
 * 
 * User shopping cart
 * Validates minimum order value (₹2,000)
 */
const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true,
    // One cart per user
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price cannot be negative'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  subtotal: {
    type: Number,
    default: 0,
    min: [0, 'Subtotal cannot be negative'],
  },
  // Validation flags
  meetsMinimumOrder: {
    type: Boolean,
    default: false,
    // True if subtotal >= MIN_ORDER_VALUE
  },
}, {
  timestamps: true,
});

// Indexes
cartSchema.index({ userId: 1 }); // User's cart

// Virtual: Calculate subtotal from items
cartSchema.virtual('calculatedSubtotal').get(function () {
  if (this.items && this.items.length > 0) {
    return this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }
  return 0;
});

// Pre-save hook: Calculate subtotal and validate minimum order
cartSchema.pre('save', function (next) {
  // Calculate subtotal from items
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => {
      item.totalPrice = item.quantity * item.unitPrice;
      return sum + item.totalPrice;
    }, 0);
  } else {
    this.subtotal = 0;
  }

  // Check if meets minimum order value
  this.meetsMinimumOrder = this.subtotal >= MIN_ORDER_VALUE;

  next();
});

// Instance method: Add item to cart
cartSchema.methods.addItem = function (productId, quantity, unitPrice) {
  const existingItemIndex = this.items.findIndex(
    item => item.productId.toString() === productId.toString()
  );

  if (existingItemIndex >= 0) {
    // Update existing item
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].totalPrice = 
      this.items[existingItemIndex].quantity * this.items[existingItemIndex].unitPrice;
  } else {
    // Add new item
    this.items.push({
      productId,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      addedAt: new Date(),
    });
  }
  
  // Recalculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.meetsMinimumOrder = this.subtotal >= MIN_ORDER_VALUE;
};

// Instance method: Remove item from cart
cartSchema.methods.removeItem = function (productId) {
  this.items = this.items.filter(
    item => item.productId.toString() !== productId.toString()
  );
  
  // Recalculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.meetsMinimumOrder = this.subtotal >= MIN_ORDER_VALUE;
};

// Instance method: Update item quantity
cartSchema.methods.updateItemQuantity = function (productId, quantity) {
  const item = this.items.find(
    item => item.productId.toString() === productId.toString()
  );

  if (item) {
    item.quantity = quantity;
    item.totalPrice = item.quantity * item.unitPrice;
    
    // Recalculate subtotal
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.meetsMinimumOrder = this.subtotal >= MIN_ORDER_VALUE;
  }
};

// Instance method: Clear cart
cartSchema.methods.clear = function () {
  this.items = [];
  this.subtotal = 0;
  this.meetsMinimumOrder = false;
};

// Instance method: Validate cart before checkout
// @param {string} paymentPreference - 'partial' (30% advance) or 'full' (100% payment)
cartSchema.methods.validateForCheckout = function (paymentPreference = 'full') {
  if (!this.items || this.items.length === 0) {
    return { valid: false, message: 'Cart is empty' };
  }

  // Skip minimum order value check if user chooses partial payment (30% advance)
  // For partial payment, user can pay 30% now and remaining 70% later, so no minimum required
  if (paymentPreference === 'partial') {
    return { valid: true, message: 'Cart is valid for checkout (partial payment)' };
  }

  // For full payment, enforce minimum order value
  if (!this.meetsMinimumOrder) {
    return {
      valid: false,
      message: `Minimum order value is ₹${MIN_ORDER_VALUE}. Current total: ₹${this.subtotal}`,
      currentTotal: this.subtotal,
      minimumRequired: MIN_ORDER_VALUE,
    };
  }

  return { valid: true, message: 'Cart is valid for checkout' };
};

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;

