const mongoose = require('mongoose');

/**
 * Vendor Schema
 * 
 * Regional distributors (1 per 20km radius)
 * Registration requires location verification via Google Maps API
 * Geographic Coverage Rule: Only 1 vendor allowed per 20 km radius
 */
const vendorSchema = new mongoose.Schema({
  vendorId: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
    // Format: VND-101, VND-102, etc.
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^\+?[1-9]\d{9,14}$/, 'Please provide a valid phone number'],
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },

  // ============================================================================
  // ENHANCED REGISTRATION FIELDS
  // ============================================================================

  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },
  agentName: {
    type: String,
    trim: true,
    // Seller/Agent who referred this vendor
  },
  shopName: {
    type: String,
    trim: true,
    maxlength: [200, 'Shop name cannot exceed 200 characters'],
  },
  shopAddress: {
    type: String,
    trim: true,
    // Detailed shop address (can be different from location.address)
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please provide a valid GST number'],
    // Format: 22AAAAA0000A1Z5
  },
  aadhaarNumber: {
    type: String,
    trim: true,
    match: [/^[0-9]{12}$/, 'Aadhaar number must be 12 digits'],
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please provide a valid PAN number'],
    // Format: ABCDE1234F
  },

  location: {
    address: {
      type: String,
      required: true,
    },
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    coverageRadius: {
      type: Number,
      default: 20, // 20 km radius
    },
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended', 'temporarily_banned', 'permanently_banned'],
    default: 'pending',
  },
  creditLimit: {
    type: Number,
    default: 100000, // Default ₹1,00,000 credit limit for new vendors
  },
  creditUsed: {
    type: Number,
    default: 0,
  },
  creditPolicy: {
    repaymentDays: {
      type: Number,
      default: 30,
    },
    penaltyRate: {
      type: Number,
      default: 2, // 2% default penalty rate (DEPRECATED)
    },
    dueDate: Date,
  },

  // ============================================================================
  // NEW FIELDS FOR CREDIT HISTORY & PERFORMANCE TRACKING
  // ============================================================================

  // Credit performance analytics
  creditHistory: {
    totalCreditTaken: {
      type: Number,
      default: 0,
      // Cumulative credit purchases made
    },
    totalRepaid: {
      type: Number,
      default: 0,
      // Total amount repaid successfully
    },
    totalDiscountsEarned: {
      type: Number,
      default: 0,
      // Total savings from early repayments
    },
    totalInterestPaid: {
      type: Number,
      default: 0,
      // Total interest paid for late repayments
    },
    avgRepaymentDays: {
      type: Number,
      default: 0,
      // Average days taken to repay
    },
    onTimeRepaymentCount: {
      type: Number,
      default: 0,
      // Number of on-time (0-90 days) repayments
    },
    lateRepaymentCount: {
      type: Number,
      default: 0,
      // Number of late (90+ days) repayments
    },
    totalRepaymentCount: {
      type: Number,
      default: 0,
      // Total number of repayments made
    },
    creditScore: {
      type: Number,
      default: 100,
      min: [0, 'Credit score cannot be negative'],
      max: [100, 'Credit score cannot exceed 100'],
      // Calculated credit score (0-100)
    },
    lastRepaymentDate: Date,
    lastRepaymentDays: Number,
  },

  // Purchase incentives earned
  incentivesEarned: [{
    incentiveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseIncentive',
    },
    historyRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorIncentiveHistory',
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    rewardValue: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['pending', 'approved', 'claimed', 'rejected'],
      default: 'pending',
    },
  }],

  // Performance tier/rating
  performanceTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'not_rated'],
    default: 'not_rated',
    // Based on repayment performance
  },
  // Escalation tracking
  escalationCount: {
    type: Number,
    default: 0,
    // Track number of times vendor escalated orders to admin
  },
  escalationHistory: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    escalatedAt: {
      type: Date,
      default: Date.now,
    },
    reason: String,
  }],
  // Ban management
  banInfo: {
    isBanned: {
      type: Boolean,
      default: false,
    },
    banType: {
      type: String,
      enum: ['none', 'temporary', 'permanent'],
      default: 'none',
    },
    bannedAt: Date,
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    banReason: String,
    banExpiry: Date, // For temporary bans
    revokedAt: Date, // When temporary ban was revoked
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    revocationReason: String,
  },
  isDeleted: {
    type: Boolean,
    default: false,
    // Soft delete for permanent ban (vendor ID deleted but activities persist)
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  deletionReason: String,
  otp: {
    code: String,
    expiresAt: Date,
  },
  isActive: {
    type: Boolean,
    default: false, // Inactive until approved by admin // Active by default on registration
  },
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  // Verification documents (images only, max 2MB)
  aadhaarCard: {
    url: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    format: {
      type: String,
      enum: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
    },
    size: {
      type: Number, // File size in bytes
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  panCard: {
    url: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    format: {
      type: String,
      enum: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf'],
    },
    size: {
      type: Number, // File size in bytes
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },

  // ============================================================================
  // ADDITIONAL DOCUMENT UPLOADS
  // ============================================================================

  aadhaarFront: {
    url: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    format: {
      type: String,
      enum: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf'],
    },
    size: {
      type: Number,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  aadhaarBack: {
    url: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    format: {
      type: String,
      enum: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf'],
    },
    size: {
      type: Number,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  pesticideLicense: {
    url: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    format: {
      type: String,
      enum: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf'],
    },
    size: {
      type: Number,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  securityChecks: {
    url: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    format: {
      type: String,
      enum: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf'],
    },
    size: {
      type: Number,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  dealershipForm: {
    url: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
    format: {
      type: String,
      enum: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf'],
    },
    size: {
      type: Number,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },

  // Terms and conditions acceptance
  termsAccepted: {
    type: Boolean,
    default: false,
  },
  termsAcceptedAt: {
    type: Date,
  },
  fcmTokenWeb: {
    type: String,
    trim: true,
  },
  fcmTokenApp: {
    type: String,
    trim: true,
  },

}, {
  timestamps: true,
});

// Index for location-based queries (20km radius)
vendorSchema.index({ 'location.coordinates': '2dsphere' });
// Note: vendorId already has an index from unique: true

// Generate and store OTP (always generates a new unique OTP)
vendorSchema.methods.generateOTP = function () {
  // Use crypto for better randomness (fallback to Math.random if not available)
  let code;
  try {
    const crypto = require('crypto');
    // Generate truly random 6-digit code
    const randomBytes = crypto.randomBytes(3);
    const randomNumber = randomBytes.readUIntBE(0, 3);
    code = (100000 + (randomNumber % 900000)).toString().padStart(6, '0');
  } catch (error) {
    // Fallback to Math.random if crypto is not available
    code = Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Always generate a new OTP (overwrite existing)
  this.otp = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  };
  return code;
};

// Verify OTP
vendorSchema.methods.verifyOTP = function (code) {
  if (!this.otp || !this.otp.code) return false;
  if (Date.now() > this.otp.expiresAt) return false;
  return this.otp.code === code;
};

// Clear OTP after use
vendorSchema.methods.clearOTP = function () {
  this.otp = undefined;
};

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;

