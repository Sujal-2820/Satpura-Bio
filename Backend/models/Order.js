const mongoose = require('mongoose');
const { ORDER_STATUS, DELIVERY_CHARGE, DELIVERY_TIMELINE_HOURS } = require('../utils/constants');

/**
 * Order Schema
 * 
 * User orders with partial fulfillment support
 * Supports order splitting when vendor partially accepts
 * Tracks status, payments, and delivery information
 */
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    // Format: ORD-YYYYMMDD-XXXX (e.g., ORD-20240115-0001)
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  sellerId: {
    type: String,
    // IRA Partner ID linked to user for commission tracking
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    // Reference to Seller for commission calculation
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    // Assigned vendor (null if escalated to admin)
  },
  assignedTo: {
    type: String,
    enum: ['vendor', 'admin'],
    default: 'vendor',
    // Determines who fulfills the order
  },
  // Order items
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
      // Store product name for historical records
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
      // Price at time of order
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price cannot be negative'],
      // quantity * unitPrice
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      // Item-level status for partial acceptance
    },
  }],
  // Pricing breakdown
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative'],
    // Sum of all items
  },
  deliveryCharge: {
    type: Number,
    default: 0,
    min: [0, 'Delivery charge cannot be negative'],
    // ₹50 if partial payment, 0 if full payment
  },
  deliveryChargeWaived: {
    type: Boolean,
    default: false,
    // True if user paid full amount upfront
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative'],
    // subtotal + deliveryCharge
  },
  // Payment information
  paymentPreference: {
    type: String,
    enum: ['partial', 'full'],
    required: true,
    // 30% advance / 70% remaining OR 100% upfront
  },
  upfrontAmount: {
    type: Number,
    required: true,
    // 30% or 100% of totalAmount
  },
  remainingAmount: {
    type: Number,
    default: 0,
    // 70% of totalAmount (if partial payment)
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial_paid', 'fully_paid', 'failed'],
    default: 'pending',
  },
  // Delivery address
  deliveryAddress: {
    name: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    phone: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  // Order status
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING,
  },
  statusTimeline: [{
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: String,
    updatedBy: {
      type: String,
      enum: ['system', 'vendor', 'admin', 'user'],
      default: 'system',
    },
  }],
  // Partial fulfillment support
  isPartialFulfillment: {
    type: Boolean,
    default: false,
  },
  parentOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    // If this is a split order, reference to original
  },
  childOrderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    // If this order was split, references to child orders
  }],
  // Delivery information
  expectedDeliveryDate: {
    type: Date,
    // Calculated: createdAt + DELIVERY_TIMELINE_HOURS
  },
  deliveredAt: Date,
  trackingNumber: {
    type: String,
    trim: true,
    // Tracking number for order fulfillment
  },
  // Cancellation
  cancelledAt: Date,
  cancellationReason: String,
  cancelledBy: {
    type: String,
    enum: ['user', 'vendor', 'admin'],
  },
  // Notes
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Indexes
orderSchema.index({ userId: 1, createdAt: -1 }); // User's orders
orderSchema.index({ vendorId: 1, status: 1 }); // Vendor's orders by status
orderSchema.index({ sellerId: 1, createdAt: -1 }); // Seller's referral orders
orderSchema.index({ status: 1, createdAt: -1 }); // Orders by status
orderSchema.index({ orderNumber: 1 }); // Order number lookup
orderSchema.index({ paymentStatus: 1 }); // Payment status filter
orderSchema.index({ assignedTo: 1, status: 1 }); // Admin escalated orders

// Pre-save hook: Generate order number and calculate expected delivery
orderSchema.pre('save', async function (next) {
  // Generate order number if not provided
  if (!this.orderNumber && this.isNew) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    
    // Find count of orders created today
    const todayStart = new Date(date);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(date);
    todayEnd.setHours(23, 59, 59, 999);
    
    // Use Order model (must be defined at this point)
    const OrderModel = mongoose.models.Order || mongoose.model('Order', orderSchema);
    const todayCount = await OrderModel.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    
    const sequence = String(todayCount + 1).padStart(4, '0');
    this.orderNumber = `ORD-${dateStr}-${sequence}`;
  }

  // Calculate expected delivery date
  if (!this.expectedDeliveryDate && this.isNew) {
    this.expectedDeliveryDate = new Date(Date.now() + DELIVERY_TIMELINE_HOURS * 60 * 60 * 1000);
  }

  // Calculate totals
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  this.totalAmount = this.subtotal + (this.deliveryCharge || 0);

  // Update status timeline
  if (this.isModified('status') && this.status) {
    if (!this.statusTimeline) {
      this.statusTimeline = [];
    }
    this.statusTimeline.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: 'system',
    });
  }

  next();
});

// Instance method: Check if order can be cancelled
orderSchema.methods.canBeCancelled = function () {
  const cancellableStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.AWAITING];
  return cancellableStatuses.includes(this.status) && !this.isPartialFulfillment;
};

// Instance method: Check if order is delivered
orderSchema.methods.isDelivered = function () {
  return this.status === ORDER_STATUS.DELIVERED;
};

// Instance method: Check if payment is complete
orderSchema.methods.isPaymentComplete = function () {
  return this.paymentStatus === 'fully_paid';
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

