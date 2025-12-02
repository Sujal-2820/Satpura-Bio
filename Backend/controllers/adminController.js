/**
 * Admin Controller
 * 
 * Handles all admin-related operations
 */

const Admin = require('../models/Admin');
// const User = require('../models/User');
const Vendor = require('../models/Vendor');
// const Seller = require('../models/Seller');
const Product = require('../models/Product');
const ProductAssignment = require('../models/ProductAssignment');
const CreditPurchase = require('../models/CreditPurchase');
const Seller = require('../models/Seller');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const VendorEarning = require('../models/VendorEarning');
const BankAccount = require('../models/BankAccount');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Commission = require('../models/Commission');
const PaymentHistory = require('../models/PaymentHistory');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');
const Offer = require('../models/Offer');
const CreditRepayment = require('../models/CreditRepayment');
const razorpayService = require('../services/razorpayService');
const { VENDOR_COVERAGE_RADIUS_KM, MIN_VENDOR_PURCHASE, DELIVERY_TIMELINE_HOURS, ORDER_STATUS, PAYMENT_STATUS } = require('../utils/constants');

const { sendOTP } = require('../utils/otp');
const { getTestOTPInfo } = require('../services/smsIndiaHubService');
const { findPhoneInModel } = require('../utils/phoneNormalize');
const { OTP_EXPIRY_MINUTES } = require('../utils/constants');
const { generateToken } = require('../middleware/auth');
const { isSpecialBypassNumber, SPECIAL_BYPASS_OTP } = require('../utils/phoneValidation');

// Auto-finalize expired status update grace periods (runs in background)
async function processExpiredStatusUpdates() {
  try {
    const now = new Date();
    const expiredStatusUpdates = await Order.find({
      'statusUpdateGracePeriod.isActive': true,
      'statusUpdateGracePeriod.expiresAt': { $lte: now },
    });

    if (expiredStatusUpdates.length === 0) {
      return;
    }

    for (const order of expiredStatusUpdates) {
      order.statusUpdateGracePeriod.isActive = false;
      order.statusUpdateGracePeriod.finalizedAt = now;
      order.statusUpdateGracePeriod.previousPaymentStatus = undefined;
      order.statusUpdateGracePeriod.previousRemainingAmount = undefined;

      order.statusTimeline.push({
        status: order.status,
        timestamp: now,
        updatedBy: 'system',
        note: `Status update finalized after 1-hour grace period expired. Status is now locked at ${order.status}.`,
      });

      await order.save();
      console.log(`✅ Order ${order.orderNumber} status update finalized after grace period expired`);
    }
  } catch (error) {
    console.error('Failed to process expired status updates:', error);
  }
}

/**
 * @desc    Admin login (Step 1: Phone only)
 * @route   POST /api/admin/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Special bypass number - skip all checks and proceed to OTP
    if (isSpecialBypassNumber(phone)) {
      return res.status(200).json({
        success: true,
        data: {
          requiresOtp: true,
          message: 'OTP sent to phone',
          phone: phone,
          expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
        },
      });
    }

    // Find admin by phone - handle both +91 and non-prefix formats
    let admin = await findPhoneInModel(Admin, phone);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated',
      });
    }

    // Clear any existing OTP before generating new one
    admin.clearOTP();
    
    // Generate new unique OTP
    const otpCode = admin.generateOTP();
    await admin.save();

    // Send OTP to phone via SMS
    try {
      await sendOTP(admin.phone, otpCode, 'login');
      console.log(`✅ OTP sent to admin phone: ${admin.phone}`);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      // Continue even if SMS fails - OTP is stored in database and can be retrieved for testing
    }

    res.status(200).json({
      success: true,
      data: {
        requiresOtp: true,
        message: 'OTP sent to phone',
        phone: admin.phone,
        expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request OTP for admin
 * @route   POST /api/admin/auth/request-otp
 * @access  Public
 */
exports.requestOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Special bypass number - skip all checks and proceed to OTP
    if (isSpecialBypassNumber(phone)) {
      return res.status(200).json({
        success: true,
        data: {
          message: 'OTP sent successfully',
          expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
        },
      });
    }

    // Find admin - handle both +91 and non-prefix formats
    let admin = await findPhoneInModel(Admin, phone);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Clear any existing OTP before generating new one
    admin.clearOTP();
    
    // Check if this is a test phone number - use default OTP 123456
    const testOTPInfo = getTestOTPInfo(admin.phone);
    let otpCode;
    if (testOTPInfo.isTest) {
      // For test numbers, set OTP directly to 123456
      otpCode = testOTPInfo.defaultOTP;
      admin.otp = {
        code: otpCode,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      };
    } else {
      // Generate new unique OTP for regular numbers
      otpCode = admin.generateOTP();
    }
    await admin.save();

    // Send OTP to phone via SMS
    try {
      await sendOTP(admin.phone, otpCode, 'login');
      console.log(`✅ OTP sent to admin phone: ${admin.phone}`);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      // Continue even if SMS fails - OTP is stored in database and can be retrieved for testing
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'OTP sent successfully',
        expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP and complete login
 * @route   POST /api/admin/auth/verify-otp
 * @access  Public
 */
exports.verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required',
      });
    }

    // Special bypass number - accept OTP 123456 and create/find admin
    if (isSpecialBypassNumber(phone)) {
      if (otp !== SPECIAL_BYPASS_OTP) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired OTP',
        });
      }

      // Find or create admin for special bypass number
      let admin = await findPhoneInModel(Admin, phone);
      
      if (!admin) {
        // Create admin if doesn't exist
        admin = new Admin({
          phone: phone,
          name: 'Special Bypass Admin',
          role: 'admin',
          isActive: true,
        });
        await admin.save();
        console.log(`✅ Special bypass admin created: ${phone}`);
      }

      admin.lastLogin = new Date();
      await admin.save();

      // Generate JWT token
      const token = generateToken({
        adminId: admin._id,
        phone: admin.phone,
        role: admin.role,
        type: 'admin',
      });

      return res.status(200).json({
        success: true,
        data: {
          token,
          admin: {
            id: admin._id,
            phone: admin.phone,
            name: admin.name,
            role: admin.role,
          },
        },
      });
    }

    // Find admin - handle both +91 and non-prefix formats
    let admin = await findPhoneInModel(Admin, phone);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Verify OTP
    const isOtpValid = admin.verifyOTP(otp);

    if (!isOtpValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Clear OTP after successful verification
    admin.clearOTP();
    admin.lastLogin = new Date();
    await admin.save();

    // Log successful login
    console.log(`\n✅ Admin logged in: ${admin.phone} (Role: ${admin.role}) at ${new Date().toISOString()}\n`);

    // Generate JWT token
    const token = generateToken({
      adminId: admin._id,
      phone: admin.phone,
      role: admin.role,
      type: 'admin',
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        admin: {
          id: admin._id,
          phone: admin.phone,
          name: admin.name,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin logout
 * @route   POST /api/admin/auth/logout
 * @access  Private (Admin)
 */
exports.logout = async (req, res, next) => {
  try {
    // TODO: Implement token blacklisting or refresh token invalidation
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get admin profile
 * @route   GET /api/admin/auth/profile
 * @access  Private (Admin)
 */
exports.getProfile = async (req, res, next) => {
  try {
    // Admin is attached by authorizeAdmin middleware
    const admin = req.admin;
    
    res.status(200).json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          phone: admin.phone,
          name: admin.name,
          role: admin.role,
          lastLogin: admin.lastLogin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard overview
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin)
 */
exports.getDashboard = async (req, res, next) => {
  try {
    // Aggregate counts
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      totalVendors,
      approvedVendors,
      pendingVendors,
      totalSellers,
      approvedSellers,
      pendingSellers,
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,
      totalPayments,
      pendingPayments,
      completedPayments,
      pendingCreditPurchases,
      pendingWithdrawals,
    ] = await Promise.all([
      // Users
      User.countDocuments(),
      User.countDocuments({ isActive: true, isBlocked: false }),
      User.countDocuments({ isBlocked: true }),
      
      // Vendors
      Vendor.countDocuments(),
      Vendor.countDocuments({ status: 'approved', isActive: true }),
      Vendor.countDocuments({ status: 'pending' }),
      
      // Sellers
      Seller.countDocuments(),
      Seller.countDocuments({ status: 'approved', isActive: true }),
      Seller.countDocuments({ status: 'pending' }),
      
      // Products
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      
      // Orders
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: { $in: ['awaiting', 'processing', 'dispatched'] } }),
      Order.countDocuments({ status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] } }),
      Order.countDocuments({ status: 'cancelled' }),
      
      // Payments
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: 'fully_paid' }),
      
      // Credit Purchases
      CreditPurchase.countDocuments({ status: 'pending' }),
      
      // Withdrawal Requests
      WithdrawalRequest.countDocuments({ status: 'pending' }),
    ]);

    // Calculate revenue (from completed orders)
    const revenueStats = await Order.aggregate([
      {
        $match: {
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
        },
      },
    ]);

    // Calculate revenue by time period (last 30 days, last 7 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [revenueLast30Days, revenueLast7Days] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
            paymentStatus: PAYMENT_STATUS.FULLY_PAID,
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
            paymentStatus: PAYMENT_STATUS.FULLY_PAID,
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Calculate outstanding vendor credits
    const creditStats = await Vendor.aggregate([
      {
        $match: {
          status: 'approved',
          isActive: true,
          creditUsed: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: '$creditUsed' },
          totalLimit: { $sum: '$creditPolicy.limit' },
          vendorCount: { $sum: 1 },
        },
      },
    ]);

    // Calculate pending payments amount
    const pendingPaymentStats = await Payment.aggregate([
      {
        $match: {
          status: 'pending',
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate pending withdrawals amount
    const pendingWithdrawalStats = await WithdrawalRequest.aggregate([
      {
        $match: {
          status: 'pending',
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Extract aggregated data
    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const averageOrderValue = revenueStats[0]?.averageOrderValue || 0;
    const revenueLast30DaysAmount = revenueLast30Days[0]?.totalRevenue || 0;
    const revenueLast7DaysAmount = revenueLast7Days[0]?.totalRevenue || 0;
    const totalOutstandingCredits = creditStats[0]?.totalOutstanding || 0;
    const totalCreditLimit = creditStats[0]?.totalLimit || 0;
    const pendingPaymentsAmount = pendingPaymentStats[0]?.totalAmount || 0;
    const pendingWithdrawalsAmount = pendingWithdrawalStats[0]?.totalAmount || 0;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          // User statistics
          users: {
            total: totalUsers,
            active: activeUsers,
            blocked: blockedUsers,
          },
          // Vendor statistics
          vendors: {
            total: totalVendors,
            approved: approvedVendors,
            pending: pendingVendors,
          },
          // Seller statistics
          sellers: {
            total: totalSellers,
            approved: approvedSellers,
            pending: pendingSellers,
          },
          // Product statistics
          products: {
            total: totalProducts,
            active: activeProducts,
          },
          // Order statistics
          orders: {
            total: totalOrders,
            pending: pendingOrders,
            processing: processingOrders,
            delivered: deliveredOrders,
            cancelled: cancelledOrders,
          },
          // Revenue statistics
          revenue: {
            total: totalRevenue,
            last30Days: revenueLast30DaysAmount,
            last7Days: revenueLast7DaysAmount,
            averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          },
          // Payment statistics
          payments: {
            total: totalPayments,
            pending: pendingPayments,
            completed: completedPayments,
            pendingAmount: pendingPaymentsAmount,
          },
          // Credit statistics
          credits: {
            outstanding: totalOutstandingCredits,
            totalLimit: totalCreditLimit,
            utilization: totalCreditLimit > 0
              ? Math.round((totalOutstandingCredits / totalCreditLimit) * 100 * 100) / 100
              : 0,
            pendingPurchases: pendingCreditPurchases,
          },
          // Withdrawal statistics
          withdrawals: {
            pending: pendingWithdrawals,
            pendingAmount: pendingWithdrawalsAmount,
          },
        },
        summary: {
          totalEntities: totalUsers + totalVendors + totalSellers,
          totalRevenue: totalRevenue,
          pendingActions: pendingOrders + pendingCreditPurchases + pendingWithdrawals,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// PRODUCT MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all products with filtering and pagination
 * @route   GET /api/admin/products
 * @access  Private (Admin)
 */
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};

    if (category) {
      query.category = category.toLowerCase();
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product details
 * @route   GET /api/admin/products/:productId
 * @access  Private (Admin)
 */
exports.getProductDetails = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).select('-__v');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Get vendor assignments for this product
    const assignments = await ProductAssignment.find({ productId, isActive: true })
      .populate('vendorId', 'name phone location')
      .select('-__v');

    res.status(200).json({
      success: true,
      data: {
        product,
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/admin/products
 * @access  Private (Admin)
 */
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      category,
      priceToVendor,
      priceToUser,
      actualStock,
      displayStock,
      stock, // Legacy field support
      stockUnit,
      images, // Array of image objects {url, publicId, isPrimary, order}
      expiry,
      brand,
      weight,
      tags,
      specifications,
      sku,
      batchNumber,
      attributeStocks, // Array of stock entries per attribute combination
    } = req.body;

    // Validate required fields
    if (!name || !description || !category || priceToVendor === undefined || priceToUser === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, description, category, priceToVendor, priceToUser',
      });
    }

    // Validate stock fields
    const actualStockValue = actualStock !== undefined ? actualStock : (stock !== undefined ? stock : 0);
    const displayStockValue = displayStock !== undefined ? displayStock : (stock !== undefined ? stock : 0);

    if (actualStockValue < 0 || displayStockValue < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock quantities cannot be negative',
      });
    }

    // Validate prices
    if (priceToVendor < 0 || priceToUser < 0) {
      return res.status(400).json({
        success: false,
        message: 'Prices cannot be negative',
      });
    }

    // Validate category against fertilizer categories
    const { isValidCategory } = require('../utils/fertilizerCategories');
    const categoryLower = category.toLowerCase();
    if (!isValidCategory(categoryLower)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${require('../utils/fertilizerCategories').FERTILIZER_CATEGORIES.map(c => c.id).join(', ')}`,
      });
    }

    // Create product
    const productData = {
      name,
      description,
      category: categoryLower,
      priceToVendor,
      priceToUser,
      actualStock: actualStockValue,
      displayStock: displayStockValue,
      stock: displayStockValue, // Legacy field for backward compatibility
    };

    if (images && Array.isArray(images)) {
      // Validate and normalize image objects
      const validImages = images
        .filter(img => img && img.url) // Must have URL
        .map((img, index) => ({
          url: img.url,
          publicId: img.publicId || '',
          isPrimary: index === 0, // First image is primary
          order: index,
        }))
        .slice(0, 4); // Max 4 images
      
      if (validImages.length > 0) {
        productData.images = validImages;
      }
    }

    if (expiry) productData.expiry = expiry;
    if (brand) productData.brand = brand;
    if (weight) productData.weight = weight;
    if (stockUnit) {
      // Store unit in weight.unit for consistency
      productData.weight = { ...(productData.weight || {}), unit: stockUnit };
    }
    // Handle tags - normalize: trim, lowercase, remove empty strings
    if (tags && Array.isArray(tags)) {
      productData.tags = tags
        .map(tag => String(tag).trim().toLowerCase())
        .filter(tag => tag.length > 0);
    }
    // Handle specifications (attributes) - Mongoose will convert plain object to Map
    if (specifications && typeof specifications === 'object' && !Array.isArray(specifications)) {
      // Filter out empty values and convert to strings
      const cleanSpecs = {};
      Object.keys(specifications).forEach(key => {
        const value = specifications[key];
        if (value !== null && value !== undefined && value !== '') {
          cleanSpecs[key] = String(value);
        }
      });
      if (Object.keys(cleanSpecs).length > 0) {
        productData.specifications = cleanSpecs;
      }
    }
    if (sku) productData.sku = sku.toUpperCase();
    if (batchNumber) productData.batchNumber = batchNumber.trim();
    
    // Handle attributeStocks array
    if (attributeStocks && Array.isArray(attributeStocks) && attributeStocks.length > 0) {
      // Validate and normalize attributeStocks
      const validAttributeStocks = attributeStocks
        .filter(stock => stock && stock.attributes && Object.keys(stock.attributes).length > 0)
        .map(stock => {
          // Convert attributes object to Map-compatible format
          const attributesMap = {};
          Object.keys(stock.attributes).forEach(key => {
            const value = stock.attributes[key];
            if (value !== null && value !== undefined && value !== '') {
              attributesMap[key] = String(value);
            }
          });
          
          // Validate prices
          const vendorPriceValue = parseFloat(stock.vendorPrice);
          const userPriceValue = parseFloat(stock.userPrice);
          
          if (isNaN(vendorPriceValue) || vendorPriceValue < 0) {
            throw new Error(`Invalid vendor price for attribute stock entry`);
          }
          if (isNaN(userPriceValue) || userPriceValue < 0) {
            throw new Error(`Invalid user price for attribute stock entry`);
          }
          if (userPriceValue <= vendorPriceValue) {
            throw new Error(`User price must be greater than vendor price for attribute stock entry`);
          }
          
          return {
            attributes: attributesMap,
            actualStock: parseFloat(stock.actualStock) || 0,
            displayStock: parseFloat(stock.displayStock) || 0,
            stockUnit: stock.stockUnit || stockUnit || 'kg',
            vendorPrice: vendorPriceValue,
            userPrice: userPriceValue,
            ...(stock.batchNumber && { batchNumber: String(stock.batchNumber).trim() }),
            ...(stock.expiry && { expiry: stock.expiry }),
          };
        })
        .filter(stock => Object.keys(stock.attributes).length > 0); // Only include entries with at least one attribute
      
      if (validAttributeStocks.length > 0) {
        productData.attributeStocks = validAttributeStocks;
      }
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      data: {
        product,
        message: 'Product created successfully',
      },
    });
  } catch (error) {
    // Handle duplicate SKU
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists',
      });
    }
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/admin/products/:productId
 * @access  Private (Admin)
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;

    // Find product
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Normalize and validate category if provided
    if (updateData.category) {
      const { isValidCategory } = require('../utils/fertilizerCategories');
      const categoryLower = updateData.category.toLowerCase();
      if (!isValidCategory(categoryLower)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category. Must be one of: ${require('../utils/fertilizerCategories').FERTILIZER_CATEGORIES.map(c => c.id).join(', ')}`,
        });
      }
      updateData.category = categoryLower;
    }

    // Normalize SKU if provided
    if (updateData.sku) {
      updateData.sku = updateData.sku.toUpperCase();
    }

    // Handle stock fields
    if (updateData.actualStock !== undefined) {
      product.actualStock = updateData.actualStock;
    }
    if (updateData.displayStock !== undefined) {
      product.displayStock = updateData.displayStock;
      product.stock = updateData.displayStock; // Sync legacy field
    }
    // Legacy stock field support
    if (updateData.stock !== undefined && updateData.displayStock === undefined) {
      product.displayStock = updateData.stock;
      product.actualStock = updateData.actualStock !== undefined ? updateData.actualStock : updateData.stock;
      product.stock = updateData.stock;
    }
    
    // Handle stockUnit
    if (updateData.stockUnit !== undefined) {
      product.weight = product.weight || {};
      product.weight.unit = updateData.stockUnit;
    }
    
    // Handle batchNumber
    if (updateData.batchNumber !== undefined) {
      product.batchNumber = updateData.batchNumber.trim();
    }

    // Handle isActive separately - only update if explicitly provided, otherwise keep current value
    if (updateData.isActive !== undefined) {
      product.isActive = updateData.isActive;
    } else {
      // If isActive is not provided, default to true (active) unless it was explicitly set to false
      // This ensures products don't accidentally become inactive
      if (product.isActive === undefined) {
        product.isActive = true;
      }
    }

    // Handle tags
    if (updateData.tags !== undefined) {
      if (Array.isArray(updateData.tags)) {
        // Normalize tags: trim, lowercase, remove empty strings
        product.tags = updateData.tags
          .map(tag => String(tag).trim().toLowerCase())
          .filter(tag => tag.length > 0);
      } else {
        product.tags = [];
      }
    }

    // Handle specifications (attributes) - Mongoose will convert plain object to Map
    if (updateData.specifications !== undefined) {
      if (updateData.specifications && typeof updateData.specifications === 'object' && !Array.isArray(updateData.specifications)) {
        // Filter out empty values and convert to strings
        const cleanSpecs = {};
        Object.keys(updateData.specifications).forEach(key => {
          const value = updateData.specifications[key];
          if (value !== null && value !== undefined && value !== '') {
            cleanSpecs[key] = String(value);
          }
        });
        // Mongoose will convert plain object to Map automatically
        product.specifications = cleanSpecs;
      } else {
        // Clear specifications if empty or invalid
        product.specifications = {};
      }
    }

    // Handle images separately for validation
    if (updateData.images !== undefined) {
      if (Array.isArray(updateData.images)) {
        // Validate image objects
        const validImages = updateData.images
          .filter(img => img && img.url) // Must have URL
          .map((img, index) => ({
            url: img.url,
            publicId: img.publicId || '',
            isPrimary: index === 0, // First image is primary
            order: index,
          }))
          .slice(0, 4); // Max 4 images
        
        product.images = validImages;
      } else {
        product.images = [];
      }
    }

    // Handle attributeStocks array
    if (updateData.attributeStocks !== undefined) {
      if (Array.isArray(updateData.attributeStocks) && updateData.attributeStocks.length > 0) {
        // Validate and normalize attributeStocks
        const validAttributeStocks = updateData.attributeStocks
          .filter(stock => stock && stock.attributes && Object.keys(stock.attributes).length > 0)
          .map(stock => {
            // Convert attributes object to Map-compatible format
            const attributesMap = {};
            Object.keys(stock.attributes).forEach(key => {
              const value = stock.attributes[key];
              if (value !== null && value !== undefined && value !== '') {
                attributesMap[key] = String(value);
              }
            });
            
            // Validate prices
            const vendorPriceValue = parseFloat(stock.vendorPrice);
            const userPriceValue = parseFloat(stock.userPrice);
            
            if (isNaN(vendorPriceValue) || vendorPriceValue < 0) {
              throw new Error(`Invalid vendor price for attribute stock entry`);
            }
            if (isNaN(userPriceValue) || userPriceValue < 0) {
              throw new Error(`Invalid user price for attribute stock entry`);
            }
            if (userPriceValue <= vendorPriceValue) {
              throw new Error(`User price must be greater than vendor price for attribute stock entry`);
            }
            
            return {
              attributes: attributesMap,
              actualStock: parseFloat(stock.actualStock) || 0,
              displayStock: parseFloat(stock.displayStock) || 0,
              stockUnit: stock.stockUnit || product.weight?.unit || 'kg',
              vendorPrice: vendorPriceValue,
              userPrice: userPriceValue,
              ...(stock.batchNumber && { batchNumber: String(stock.batchNumber).trim() }),
              ...(stock.expiry && { expiry: stock.expiry }),
            };
          })
          .filter(stock => Object.keys(stock.attributes).length > 0); // Only include entries with at least one attribute
        
        product.attributeStocks = validAttributeStocks;
      } else {
        // Clear attributeStocks if empty array or null
        product.attributeStocks = [];
      }
    }

    // Update other fields (excluding handled fields)
    const excludedFields = ['actualStock', 'displayStock', 'stock', 'stockUnit', 'batchNumber', 'isActive', 'tags', 'specifications', 'images', 'attributeStocks'];
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && !excludedFields.includes(key)) {
        product[key] = updateData[key];
      }
    });

    await product.save();

    res.status(200).json({
      success: true,
      data: {
        product,
        message: 'Product updated successfully',
      },
    });
  } catch (error) {
    // Handle duplicate SKU
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists',
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/admin/products/:productId
 * @access  Private (Admin)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if product has active assignments
    const activeAssignments = await ProductAssignment.countDocuments({
      productId,
      isActive: true,
    });

    if (activeAssignments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product. It has ${activeAssignments} active vendor assignment(s). Please remove assignments first or deactivate the product.`,
      });
    }

    // Delete product
    await Product.findByIdAndDelete(productId);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign product to vendor
 * @route   POST /api/admin/products/:productId/assign
 * @access  Private (Admin)
 */
exports.assignProductToVendor = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { vendorId, region, notes } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required',
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if vendor exists and is approved
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (vendor.status !== 'approved' || !vendor.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Vendor must be approved and active to receive product assignments',
      });
    }

    // Check if assignment already exists
    const existingAssignment = await ProductAssignment.findOne({
      productId,
      vendorId,
    });

    if (existingAssignment) {
      // Update existing assignment
      existingAssignment.isActive = true;
      if (region) existingAssignment.region = region;
      if (notes) existingAssignment.notes = notes;
      existingAssignment.assignedBy = req.admin._id;
      existingAssignment.assignedAt = new Date();
      await existingAssignment.save();

      return res.status(200).json({
        success: true,
        data: {
          assignment: existingAssignment,
          message: 'Product assignment updated successfully',
        },
      });
    }

    // Create new assignment
    const assignment = await ProductAssignment.create({
      productId,
      vendorId,
      region,
      notes,
      assignedBy: req.admin._id,
    });

    // TODO: Create Inventory entry for vendor when Inventory model is created

    res.status(201).json({
      success: true,
      data: {
        assignment,
        message: 'Product assigned to vendor successfully',
      },
    });
  } catch (error) {
    // Handle duplicate assignment
    if (error.code === 11000 && error.keyPattern?.productId && error.keyPattern?.vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Product is already assigned to this vendor',
      });
    }
    next(error);
  }
};

/**
 * @desc    Toggle product visibility (active/inactive)
 * @route   PUT /api/admin/products/:productId/visibility
 * @access  Private (Admin)
 */
exports.toggleProductVisibility = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Toggle visibility
    product.isActive = !product.isActive;
    await product.save();

    res.status(200).json({
      success: true,
      data: {
        product,
        message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// VENDOR MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all vendors with filtering and pagination
 * @route   GET /api/admin/vendors
 * @access  Private (Admin)
 */
exports.getVendors = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = 'false',
    } = req.query;

    // Build query
    const query = {};

    // By default, exclude deleted vendors unless explicitly requested
    if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true };
    }

    if (status) {
      query.status = status;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const vendors = await Vendor.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v -otp')
      .populate('approvedBy', 'name email')
      .populate('deletedBy', 'name email')
      .lean();
    
    // Manually populate nested banInfo fields if they exist
    const mongoose = require('mongoose');
    const adminIdsToPopulate = new Set();
    
    vendors.forEach(vendor => {
      if (vendor.banInfo?.bannedBy && mongoose.Types.ObjectId.isValid(vendor.banInfo.bannedBy)) {
        adminIdsToPopulate.add(vendor.banInfo.bannedBy);
      }
      if (vendor.banInfo?.revokedBy && mongoose.Types.ObjectId.isValid(vendor.banInfo.revokedBy)) {
        adminIdsToPopulate.add(vendor.banInfo.revokedBy);
      }
    });
    
    // Fetch all admins at once for efficiency
    const adminsMap = new Map();
    if (adminIdsToPopulate.size > 0) {
      const adminIdsArray = Array.from(adminIdsToPopulate).map(id => new mongoose.Types.ObjectId(id));
      const admins = await Admin.find({ _id: { $in: adminIdsArray } })
        .select('name phone')
        .lean();
      admins.forEach(admin => {
        adminsMap.set(admin._id.toString(), { name: admin.name, phone: admin.phone });
      });
    }
    
    // Populate the banInfo fields
    vendors.forEach(vendor => {
      if (vendor.banInfo?.bannedBy) {
        const adminId = vendor.banInfo.bannedBy.toString();
        vendor.banInfo.bannedBy = adminsMap.get(adminId) || null;
      }
      if (vendor.banInfo?.revokedBy) {
        const adminId = vendor.banInfo.revokedBy.toString();
        vendor.banInfo.revokedBy = adminsMap.get(adminId) || null;
      }
    });

    const total = await Vendor.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        vendors,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single vendor details
 * @route   GET /api/admin/vendors/:vendorId
 * @access  Private (Admin)
 */
exports.getVendorDetails = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId)
      .select('-__v -otp')
      .populate('approvedBy', 'name email');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Get vendor's credit purchases
    const purchases = await CreditPurchase.find({ vendorId })
      .populate('items.productId', 'name sku')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-__v');

    // Get vendor's product assignments
    const assignments = await ProductAssignment.find({ vendorId, isActive: true })
      .populate('productId', 'name sku category')
      .select('-__v');

    // Calculate credit statistics
    const creditRemaining = vendor.creditPolicy.limit - vendor.creditUsed;
    const creditUtilization = vendor.creditPolicy.limit > 0
      ? (vendor.creditUsed / vendor.creditPolicy.limit) * 100
      : 0;

    res.status(200).json({
      success: true,
      data: {
        vendor,
        creditInfo: {
          limit: vendor.creditPolicy.limit,
          used: vendor.creditUsed,
          remaining: creditRemaining,
          utilization: Math.round(creditUtilization * 100) / 100,
          dueDate: vendor.creditPolicy.dueDate,
        },
        escalationInfo: {
          count: vendor.escalationCount || 0,
          history: vendor.escalationHistory || [],
          canBan: (vendor.escalationCount || 0) > 3,
        },
        banInfo: vendor.banInfo || {},
        purchases,
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve vendor registration
 * @route   POST /api/admin/vendors/:vendorId/approve
 * @access  Private (Admin)
 */
exports.approveVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (vendor.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already approved',
      });
    }

    // Check geographic rule: No vendor within 20km radius
    // Using MongoDB geospatial query
    const nearbyVendors = await Vendor.find({
      _id: { $ne: vendorId }, // Exclude current vendor
      status: 'approved',
      isActive: true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [vendor.location.coordinates.lng, vendor.location.coordinates.lat],
          },
          $maxDistance: VENDOR_COVERAGE_RADIUS_KM * 1000, // Convert km to meters
        },
      },
    });

    if (nearbyVendors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve vendor. Another approved vendor exists within ${VENDOR_COVERAGE_RADIUS_KM}km radius.`,
        nearbyVendor: {
          id: nearbyVendors[0]._id,
          name: nearbyVendors[0].name,
          distance: 'within 20km',
        },
      });
    }

    // Approve vendor and set default credit policy
    vendor.status = 'approved';
    vendor.isActive = true;
    vendor.approvedAt = new Date();
    vendor.approvedBy = req.admin._id;
    
    // Set default credit policy (no limit, 30 days repayment, 2% penalty)
    if (!vendor.creditPolicy) {
      vendor.creditPolicy = {
        repaymentDays: 30,
        penaltyRate: 2,
      };
    } else {
      // Ensure defaults if missing
      if (!vendor.creditPolicy.repaymentDays) {
        vendor.creditPolicy.repaymentDays = 30;
      }
      if (vendor.creditPolicy.penaltyRate === undefined || vendor.creditPolicy.penaltyRate === null) {
        vendor.creditPolicy.penaltyRate = 2;
      }
    }
    
    await vendor.save();

    // TODO: Send notification to vendor (SMS/Email)
    console.log(`✅ Vendor approved: ${vendor.name} (${vendor.phone})`);

    res.status(200).json({
      success: true,
      data: {
        vendor,
        message: 'Vendor approved successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject vendor registration
 * @route   POST /api/admin/vendors/:vendorId/reject
 * @access  Private (Admin)
 */
exports.rejectVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (vendor.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already rejected',
      });
    }

    // Reject vendor
    vendor.status = 'rejected';
    vendor.isActive = false;
    await vendor.save();

    // TODO: Send rejection notification to vendor with reason
    console.log(`❌ Vendor rejected: ${vendor.name} (${vendor.phone})${reason ? ` - Reason: ${reason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        vendor,
        message: 'Vendor rejected successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set/Update vendor credit policy
 * @route   PUT /api/admin/vendors/:vendorId/credit-policy
 * @access  Private (Admin)
 */
exports.updateVendorCreditPolicy = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { repaymentDays, penaltyRate } = req.body;

    // Validate vendor ID
    if (!vendorId || !require('mongoose').Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID',
      });
    }

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (vendor.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Can only set credit policy for approved vendors. Current status: ' + vendor.status,
      });
    }

    // Validate input values
    if (repaymentDays !== undefined && (isNaN(repaymentDays) || repaymentDays <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Repayment days must be a valid number greater than 0',
      });
    }

    if (penaltyRate !== undefined && (isNaN(penaltyRate) || penaltyRate < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Penalty rate must be a valid number greater than or equal to 0',
      });
    }

    // Ensure creditPolicy object exists
    if (!vendor.creditPolicy) {
      vendor.creditPolicy = {
        repaymentDays: 30,
        penaltyRate: 2,
      };
    }

    // Update credit policy (no credit limit)
    if (repaymentDays !== undefined) {
      vendor.creditPolicy.repaymentDays = repaymentDays;
    }
    if (penaltyRate !== undefined) {
      vendor.creditPolicy.penaltyRate = penaltyRate;
    }

    // Calculate due date if repayment days is set
    if (repaymentDays !== undefined && vendor.creditUsed > 0) {
      // Set due date based on repayment days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + repaymentDays);
      vendor.creditPolicy.dueDate = dueDate;
    }

    await vendor.save();

    res.status(200).json({
      success: true,
      data: {
        vendor,
        creditPolicy: vendor.creditPolicy,
        message: 'Credit policy updated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all vendor purchase requests (global)
 * @route   GET /api/admin/vendors/purchases
 * @access  Private (Admin)
 */
exports.getAllVendorPurchases = async (req, res, next) => {
  try {
    const { status, vendorId, page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (vendorId) {
      query.vendorId = vendorId;
    }

    // Search functionality (by vendor name or purchase amount)
    if (search) {
      // If search is provided, we'll need to populate vendor first and filter
      // For now, we can search by amount or use text search if available
      const searchNum = parseFloat(search);
      if (!isNaN(searchNum)) {
        // Search by amount
        query.totalAmount = { $gte: searchNum * 0.9, $lte: searchNum * 1.1 }; // Allow 10% tolerance
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with vendor population
    const purchases = await CreditPurchase.find(query)
      .populate('vendorId', 'name phone email location')
      .populate('items.productId', 'name sku category priceToVendor')
      .populate('reviewedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    // If search was provided and it's a string, filter by vendor name
    let filteredPurchases = purchases;
    if (search && isNaN(parseFloat(search))) {
      filteredPurchases = purchases.filter(purchase => {
        const vendorName = purchase.vendorId?.name || '';
        return vendorName.toLowerCase().includes(search.toLowerCase());
      });
    }

    // Get total count (after search filter if applicable)
    let total = await CreditPurchase.countDocuments(query);
    if (search && isNaN(parseFloat(search))) {
      // Recalculate total for string searches (approximate)
      total = filteredPurchases.length;
    }

    res.status(200).json({
      success: true,
      data: {
        purchases: filteredPurchases,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendor purchase requests (vendor-specific)
 * @route   GET /api/admin/vendors/:vendorId/purchases
 * @access  Private (Admin)
 */
exports.getVendorPurchases = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { vendorId };

    if (status) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const purchases = await CreditPurchase.find(query)
      .populate('items.productId', 'name sku category priceToVendor')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const total = await CreditPurchase.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        purchases,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve vendor purchase request
 * @route   POST /api/admin/vendors/purchases/:requestId/approve
 * @access  Private (Admin)
 */
exports.approveVendorPurchase = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    const purchase = await CreditPurchase.findById(requestId)
      .populate('items.productId', 'name sku priceToVendor');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase request not found',
      });
    }

    if (purchase.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Purchase request is already ${purchase.status}`,
      });
    }

    const vendor = await Vendor.findById(purchase.vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Update vendor credit used (no limit check)
    const newCreditUsed = (vendor.creditUsed || 0) + purchase.totalAmount;

    // Validate and reserve admin stock
    for (const item of purchase.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'One of the requested products no longer exists.',
        });
      }

      const adminStock = product.displayStock ?? product.stock ?? 0;
      if (item.quantity > adminStock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient admin stock for ${product.name}. Available: ${adminStock}, Requested: ${item.quantity}`,
        });
      }

      product.displayStock = Math.max(0, adminStock - item.quantity);
      product.actualStock = Math.max(0, (product.actualStock ?? adminStock) - item.quantity);
      await product.save();

      await ProductAssignment.findOneAndUpdate(
        { productId: item.productId, vendorId: vendor._id },
        {
          $setOnInsert: {
            assignedBy: req.admin._id,
            assignedAt: new Date(),
            stock: 0,
            isActive: true,
            notes: 'Auto-assigned during purchase approval',
          },
        },
        { upsert: true, new: true }
      );
    }

    const expectedDeliveryAt = new Date(Date.now() + (DELIVERY_TIMELINE_HOURS || 24) * 60 * 60 * 1000);

    // Approve purchase
    purchase.status = 'approved';
    purchase.reviewedBy = req.admin._id;
    purchase.reviewedAt = new Date();
    purchase.deliveryStatus = 'scheduled';
    purchase.expectedDeliveryAt = expectedDeliveryAt;
    purchase.deliveryNotes = `Stock scheduled for delivery within ${DELIVERY_TIMELINE_HOURS || 24} hours.`;
    await purchase.save();

    // Update vendor credit
    vendor.creditUsed = newCreditUsed;
    if (vendor.creditPolicy.dueDate === undefined && vendor.creditPolicy.repaymentDays) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + vendor.creditPolicy.repaymentDays);
      vendor.creditPolicy.dueDate = dueDate;
    }
    await vendor.save();

    // TODO: Create Inventory entries for vendor when Inventory model is created
    // TODO: Send notification to vendor

    console.log(`✅ Purchase approved: ₹${purchase.totalAmount} for vendor ${vendor.name}`);

    res.status(200).json({
      success: true,
      data: {
        purchase,
        vendor: {
          id: vendor._id,
          name: vendor.name,
          creditUsed: vendor.creditUsed,
        },
        message: 'Purchase request approved successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject vendor purchase request
 * @route   POST /api/admin/vendors/purchases/:requestId/reject
 * @access  Private (Admin)
 */
exports.rejectVendorPurchase = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const purchase = await CreditPurchase.findById(requestId);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase request not found',
      });
    }

    if (purchase.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Purchase request is already ${purchase.status}`,
      });
    }

    // Reject purchase
    purchase.status = 'rejected';
    purchase.reviewedBy = req.admin._id;
    purchase.reviewedAt = new Date();
    if (reason) {
      purchase.rejectionReason = reason;
    }
    await purchase.save();

    // TODO: Send rejection notification to vendor with reason

    console.log(`❌ Purchase rejected: ₹${purchase.totalAmount}${reason ? ` - Reason: ${reason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        purchase,
        message: 'Purchase request rejected successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ban vendor (temporary or permanent) - requires >3 escalations
 * @route   PUT /api/admin/vendors/:vendorId/ban
 * @access  Private (Admin)
 */
exports.banVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { banType = 'temporary', banReason, banExpiry } = req.body; // banType: 'temporary' or 'permanent'

    if (!['temporary', 'permanent'].includes(banType)) {
      return res.status(400).json({
        success: false,
        message: "banType must be 'temporary' or 'permanent'",
      });
    }

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Check if vendor is already banned
    if (vendor.banInfo.isBanned) {
      return res.status(400).json({
        success: false,
        message: `Vendor is already banned (${vendor.banInfo.banType}). Please unban first if you want to change the ban type.`,
      });
    }

    // Set ban information
    vendor.banInfo.isBanned = true;
    vendor.banInfo.banType = banType;
    vendor.banInfo.bannedAt = new Date();
    vendor.banInfo.bannedBy = req.admin._id;
    vendor.banInfo.banReason = banReason || 'Banned due to multiple order escalations';

    // Set ban expiry for temporary bans
    if (banType === 'temporary') {
      if (banExpiry) {
        vendor.banInfo.banExpiry = new Date(banExpiry);
      } else {
        // Default: 30 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        vendor.banInfo.banExpiry = expiryDate;
      }
    } else {
      // Permanent ban - no expiry
      vendor.banInfo.banExpiry = undefined;
    }

    // Update vendor status
    vendor.status = banType === 'temporary' ? 'temporarily_banned' : 'permanently_banned';
    vendor.isActive = false;

    await vendor.save();

    // TODO: Send notification to vendor
    console.log(`🚫 Vendor banned: ${vendor.name} (${vendor.phone}) - Type: ${banType}${banReason ? ` - Reason: ${banReason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
          status: vendor.status,
          banInfo: vendor.banInfo,
        },
        message: `Vendor ${banType === 'temporary' ? 'temporarily' : 'permanently'} banned successfully`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke temporary ban
 * @route   PUT /api/admin/vendors/:vendorId/unban
 * @access  Private (Admin)
 */
exports.unbanVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { revocationReason } = req.body;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Check if vendor is banned
    if (!vendor.banInfo.isBanned) {
      return res.status(400).json({
        success: false,
        message: 'Vendor is not currently banned',
      });
    }

    // Can only unban temporary bans (permanent bans require deletion)
    if (vendor.banInfo.banType === 'permanent') {
      return res.status(400).json({
        success: false,
        message: 'Cannot unban a permanently banned vendor. Use delete vendor instead if needed.',
      });
    }

    // Revoke ban
    vendor.banInfo.isBanned = false;
    vendor.banInfo.banType = 'none';
    vendor.banInfo.revokedAt = new Date();
    vendor.banInfo.revokedBy = req.admin._id;
    vendor.banInfo.revocationReason = revocationReason || 'Ban revoked by admin';

    // Update vendor status
    vendor.status = 'approved';
    vendor.isActive = true;

    await vendor.save();

    // TODO: Send notification to vendor
    console.log(`✅ Vendor ban revoked: ${vendor.name} (${vendor.phone})${revocationReason ? ` - Reason: ${revocationReason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
          status: vendor.status,
          banInfo: vendor.banInfo,
        },
        message: 'Vendor ban revoked successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Permanently delete vendor (soft delete - activities persist) - requires >3 escalations
 * @route   DELETE /api/admin/vendors/:vendorId
 * @access  Private (Admin)
 */
exports.deleteVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { deletionReason } = req.body;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Check if vendor is already deleted
    if (vendor.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already deleted',
      });
    }

    // Check escalation count (requires >3 escalations)
    if ((vendor.escalationCount || 0) <= 3) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vendor. Requires more than 3 escalations. Current escalation count: ' + (vendor.escalationCount || 0),
      });
    }

    // Soft delete vendor (activities persist)
    vendor.isDeleted = true;
    vendor.deletedAt = new Date();
    vendor.deletedBy = req.admin._id;
    vendor.deletionReason = deletionReason || 'Deleted due to multiple order escalations';
    vendor.status = 'permanently_banned';
    vendor.isActive = false;

    // Also update ban info if not already set
    if (!vendor.banInfo.isBanned) {
      vendor.banInfo.isBanned = true;
      vendor.banInfo.banType = 'permanent';
      vendor.banInfo.bannedAt = new Date();
      vendor.banInfo.bannedBy = req.admin._id;
      vendor.banInfo.banReason = 'Permanently banned and deleted';
    }

    await vendor.save();

    // TODO: Send notification
    console.log(`🗑️ Vendor deleted: ${vendor.name} (${vendor.phone})${deletionReason ? ` - Reason: ${deletionReason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
          isDeleted: vendor.isDeleted,
          deletedAt: vendor.deletedAt,
        },
        message: 'Vendor deleted successfully (soft delete - activities persist)',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// SELLER MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all sellers with filtering and pagination
 * @route   GET /api/admin/sellers
 * @access  Private (Admin)
 */
exports.getSellers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { sellerId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { area: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const sellers = await Seller.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v -otp')
      .populate('approvedBy', 'name email');

    const total = await Seller.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        sellers,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single seller details
 * @route   GET /api/admin/sellers/:sellerId
 * @access  Private (Admin)
 */
exports.getSellerDetails = async (req, res, next) => {
  try {
    const { sellerId } = req.params;

    const seller = await Seller.findById(sellerId)
      .select('-__v -otp')
      .populate('approvedBy', 'name email')
      .populate('assignedVendor', 'name phone');

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found',
      });
    }

    // Get seller's withdrawal requests
    const withdrawals = await WithdrawalRequest.find({ sellerId })
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-__v');

    // Get user count (referrals) - TODO: When User model has sellerId field
    // const referralCount = await User.countDocuments({ sellerId: seller.sellerId });

    res.status(200).json({
      success: true,
      data: {
        seller,
        wallet: {
          balance: seller.wallet.balance,
          pending: seller.wallet.pending,
          available: seller.wallet.balance - seller.wallet.pending,
        },
        withdrawals,
        // referralCount, // TODO: Implement when User model is ready
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new seller (IRA Partner)
 * @route   POST /api/admin/sellers
 * @access  Private (Admin)
 */
exports.createSeller = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      area,
      location,
      assignedVendor,
      monthlyTarget,
      sellerId, // Optional: If not provided, will auto-generate
    } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required',
      });
    }

    // Check if phone already exists
    const existingPhone = await Seller.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered',
      });
    }

    // Generate unique sellerId if not provided
    let generatedSellerId = sellerId;
    if (!generatedSellerId) {
      // Find the highest existing sellerId number
      const lastSeller = await Seller.findOne()
        .sort({ sellerId: -1 })
        .select('sellerId');

      let nextNumber = 1001;
      if (lastSeller && lastSeller.sellerId) {
        const match = lastSeller.sellerId.match(/\d+$/);
        if (match) {
          nextNumber = parseInt(match[0]) + 1;
        }
      }

      // Generate sellerId: IRA-XXXX format
      generatedSellerId = `IRA-${nextNumber}`;
    }

    // Check if sellerId already exists
    const existingSellerId = await Seller.findOne({ sellerId: generatedSellerId.toUpperCase() });
    if (existingSellerId) {
      return res.status(400).json({
        success: false,
        message: `Seller ID ${generatedSellerId} already exists`,
      });
    }

    // Create seller
    const sellerData = {
      sellerId: generatedSellerId.toUpperCase(),
      name,
      phone,
      email: email?.toLowerCase(),
      area,
      monthlyTarget: monthlyTarget || 0,
      status: 'approved', // Auto-approve when created by admin
      isActive: true,
      approvedAt: new Date(),
      approvedBy: req.admin._id,
    };

    if (location) sellerData.location = location;
    if (assignedVendor) sellerData.assignedVendor = assignedVendor;

    const seller = await Seller.create(sellerData);

    // TODO: Send notification to seller

    console.log(`✅ Seller created: ${seller.sellerId} - ${seller.name} (${seller.phone})`);

    res.status(201).json({
      success: true,
      data: {
        seller,
        message: 'Seller created and approved successfully',
      },
    });
  } catch (error) {
    // Handle duplicate sellerId or phone
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'sellerId' ? 'Seller ID' : 'Phone number'} already exists`,
      });
    }
    next(error);
  }
};

/**
 * @desc    Update seller
 * @route   PUT /api/admin/sellers/:sellerId
 * @access  Private (Admin)
 */
exports.updateSeller = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const updateData = req.body;

    const seller = await Seller.findById(sellerId);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found',
      });
    }

    // Don't allow updating sellerId
    if (updateData.sellerId) {
      delete updateData.sellerId;
    }

    // Normalize email if provided
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }

    // Update seller
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        seller[key] = updateData[key];
      }
    });

    await seller.save();

    res.status(200).json({
      success: true,
      data: {
        seller,
        message: 'Seller updated successfully',
      },
    });
  } catch (error) {
    // Handle duplicate phone or email
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'phone' ? 'Phone number' : 'Email'} already exists`,
      });
    }
    next(error);
  }
};

/**
 * @desc    Approve seller registration
 * @route   POST /api/admin/sellers/:sellerId/approve
 * @access  Private (Admin)
 */
exports.approveSeller = async (req, res, next) => {
  try {
    const { sellerId } = req.params;

    const seller = await Seller.findById(sellerId);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found',
      });
    }

    if (seller.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Seller is already approved',
      });
    }

    // Approve seller
    seller.status = 'approved';
    seller.isActive = true;
    seller.approvedAt = new Date();
    seller.approvedBy = req.admin._id;
    await seller.save();

    // TODO: Send notification to seller (SMS/Email)
    console.log(`✅ Seller approved: ${seller.sellerId} - ${seller.name} (${seller.phone})`);

    res.status(200).json({
      success: true,
      data: {
        seller: {
          id: seller._id,
          sellerId: seller.sellerId,
          name: seller.name,
          phone: seller.phone,
          status: seller.status,
          isActive: seller.isActive,
        },
        message: 'Seller approved successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject seller registration
 * @route   POST /api/admin/sellers/:sellerId/reject
 * @access  Private (Admin)
 */
exports.rejectSeller = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const { reason } = req.body;

    const seller = await Seller.findById(sellerId);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found',
      });
    }

    if (seller.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Seller is already rejected',
      });
    }

    // Reject seller
    seller.status = 'rejected';
    seller.isActive = false;
    if (reason) {
      seller.rejectionReason = reason;
    }
    await seller.save();

    // TODO: Send notification to seller (SMS/Email)
    console.log(`❌ Seller rejected: ${seller.sellerId} - ${seller.name} (${seller.phone})${reason ? ` - Reason: ${reason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        seller: {
          id: seller._id,
          sellerId: seller.sellerId,
          name: seller.name,
          phone: seller.phone,
          status: seller.status,
        },
        message: 'Seller rejected successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set seller monthly target
 * @route   PUT /api/admin/sellers/:sellerId/target
 * @access  Private (Admin)
 */
exports.setSellerTarget = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const { monthlyTarget } = req.body;

    if (monthlyTarget === undefined || monthlyTarget < 0) {
      return res.status(400).json({
        success: false,
        message: 'Monthly target is required and must be non-negative',
      });
    }

    const seller = await Seller.findById(sellerId);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found',
      });
    }

    // Update monthly target
    seller.monthlyTarget = monthlyTarget;
    await seller.save();

    res.status(200).json({
      success: true,
      data: {
        seller: {
          id: seller._id,
          sellerId: seller.sellerId,
          name: seller.name,
          monthlyTarget: seller.monthlyTarget,
        },
        message: 'Monthly target updated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all seller withdrawal requests (global)
 * @route   GET /api/admin/sellers/withdrawals
 * @access  Private (Admin)
 */
exports.getAllSellerWithdrawals = async (req, res, next) => {
  try {
    const { status, sellerId, page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (sellerId) {
      query.sellerId = sellerId;
    }

    // Search functionality (by seller name or amount)
    if (search) {
      const searchNum = parseFloat(search);
      if (!isNaN(searchNum)) {
        // Search by amount
        query.amount = { $gte: searchNum * 0.9, $lte: searchNum * 1.1 }; // Allow 10% tolerance
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with seller population
    const withdrawals = await WithdrawalRequest.find(query)
      .populate('sellerId', 'sellerId name phone email wallet')
      .populate('bankAccountId')
      .populate('reviewedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    // If search was provided and it's a string, filter by seller name
    let filteredWithdrawals = withdrawals;
    if (search && isNaN(parseFloat(search))) {
      filteredWithdrawals = withdrawals.filter(withdrawal => {
        const sellerName = withdrawal.sellerId?.name || '';
        return sellerName.toLowerCase().includes(search.toLowerCase());
      });
    }

    // Get total count (after search filter if applicable)
    let total = await WithdrawalRequest.countDocuments(query);
    if (search && isNaN(parseFloat(search))) {
      // Recalculate total for string searches (approximate)
      total = filteredWithdrawals.length;
    }

    res.status(200).json({
      success: true,
      data: {
        withdrawals: filteredWithdrawals,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get seller withdrawal requests (seller-specific)
 * @route   GET /api/admin/sellers/:sellerId/withdrawals
 * @access  Private (Admin)
 */
exports.getSellerWithdrawals = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { sellerId };

    if (status) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const withdrawals = await WithdrawalRequest.find(query)
      .populate('sellerId', 'sellerId name phone email wallet')
      .populate('bankAccountId')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const total = await WithdrawalRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create payment intent for seller withdrawal
 * @route   POST /api/admin/sellers/withdrawals/:requestId/payment-intent
 * @access  Private (Admin)
 */
exports.createSellerWithdrawalPaymentIntent = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { amount } = req.body;

    const withdrawal = await WithdrawalRequest.findById(requestId)
      .populate('sellerId', 'sellerId name phone email wallet')
      .populate('bankAccountId');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (withdrawal.userType !== 'seller') {
      return res.status(400).json({
        success: false,
        message: 'This is not a seller withdrawal request',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal request is already ${withdrawal.status}`,
      });
    }

    // Use withdrawal amount if not provided
    const paymentAmount = amount || withdrawal.amount;

    // Ensure seller is populated
    if (!withdrawal.sellerId || !withdrawal.sellerId._id) {
      return res.status(400).json({
        success: false,
        message: 'Seller information not found',
      });
    }

    // Create Razorpay order
    // Receipt must be max 40 characters (Razorpay requirement)
    const receiptPrefix = `swd_${withdrawal._id.toString().slice(-8)}_`;
    const timestamp = Date.now().toString().slice(-8);
    const receipt = (receiptPrefix + timestamp).slice(0, 40); // Ensure max 40 chars
    
    const razorpayOrder = await razorpayService.createOrder({
      amount: paymentAmount,
      currency: 'INR',
      receipt: receipt,
      notes: {
        withdrawalRequestId: withdrawal._id.toString(),
        sellerId: withdrawal.sellerId._id.toString(),
        sellerIdCode: withdrawal.sellerId.sellerId || 'Unknown Seller',
        type: 'seller_withdrawal',
      },
    });

    // Get Razorpay Key ID
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_key';

    res.status(200).json({
      success: true,
      data: {
        paymentIntent: {
          id: razorpayOrder.id,
          amount: paymentAmount,
          currency: 'INR',
          status: razorpayOrder.status,
          razorpayOrderId: razorpayOrder.id,
          keyId: keyId,
          receipt: razorpayOrder.receipt,
          createdAt: new Date(),
          isTestMode: !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET,
        },
        message: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
          ? 'Payment intent created successfully'
          : 'Payment intent created (Test Mode)',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve seller withdrawal request
 * @route   POST /api/admin/sellers/withdrawals/:requestId/approve
 * @access  Private (Admin)
 */
exports.approveSellerWithdrawal = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { paymentReference, paymentMethod, paymentDate, adminRemarks } = req.body;

    const withdrawal = await WithdrawalRequest.findById(requestId)
      .populate('sellerId')
      .populate('bankAccountId');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (withdrawal.userType !== 'seller') {
      return res.status(400).json({
        success: false,
        message: 'This is not a seller withdrawal request',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal request is already ${withdrawal.status}`,
      });
    }

    const seller = await Seller.findById(withdrawal.sellerId);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found',
      });
    }

    // Calculate available balance using wallet.pending (seller-specific)
    // Note: wallet.pending already includes this withdrawal amount, so we add it back for validation
    const availableBalance = seller.wallet.balance - (seller.wallet.pending - withdrawal.amount);

    if (withdrawal.amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₹${Math.round(availableBalance * 100) / 100}, Requested: ₹${withdrawal.amount}`,
      });
    }

    // Approve withdrawal
    withdrawal.status = 'approved';
    withdrawal.reviewedBy = req.admin._id;
    withdrawal.reviewedAt = new Date();
    if (paymentReference) withdrawal.paymentReference = paymentReference;
    if (paymentMethod) withdrawal.paymentMethod = paymentMethod;
    if (paymentDate) withdrawal.paymentDate = new Date(paymentDate);
    if (adminRemarks) withdrawal.adminRemarks = adminRemarks;
    
    // Store payment gateway details if provided
    if (req.body.gatewayPaymentId) withdrawal.gatewayPaymentId = req.body.gatewayPaymentId;
    if (req.body.gatewayOrderId) withdrawal.gatewayOrderId = req.body.gatewayOrderId;
    if (req.body.gatewaySignature) withdrawal.gatewaySignature = req.body.gatewaySignature;
    
    await withdrawal.save();

    // Update seller wallet
    seller.wallet.balance -= withdrawal.amount;
    seller.wallet.pending -= withdrawal.amount;
    if (seller.wallet.pending < 0) seller.wallet.pending = 0;
    await seller.save();

    // Log to payment history
    try {
      const bankAccount = withdrawal.bankAccountId;
      await PaymentHistory.create({
        activityType: 'seller_withdrawal_approved',
        sellerId: seller._id,
        withdrawalRequestId: withdrawal._id,
        bankAccountId: bankAccount?._id,
        amount: withdrawal.amount,
        status: 'completed',
        paymentMethod: paymentMethod || 'razorpay',
        bankDetails: bankAccount ? {
          accountHolderName: bankAccount.accountHolderName,
          accountNumber: bankAccount.accountNumber,
          ifscCode: bankAccount.ifscCode,
          bankName: bankAccount.bankName,
        } : undefined,
        processedBy: req.admin._id,
        description: `Seller withdrawal of ₹${withdrawal.amount} approved and paid for ${seller.sellerId}`,
        metadata: {
          sellerIdCode: seller.sellerId,
          sellerName: seller.name,
          sellerPhone: seller.phone,
          paymentReference,
          gatewayPaymentId: req.body.gatewayPaymentId,
          gatewayOrderId: req.body.gatewayOrderId,
          adminRemarks,
        },
      });
    } catch (historyError) {
      console.error('Error logging withdrawal history:', historyError);
      // Don't fail approval if history logging fails
    }

    console.log(`✅ Seller withdrawal approved: ₹${withdrawal.amount} for seller ${seller.sellerId} (${seller.phone})`);

    res.status(200).json({
      success: true,
      data: {
        withdrawal,
        seller: {
          id: seller._id,
          sellerId: seller.sellerId,
          name: seller.name,
        },
        message: 'Withdrawal approved successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject seller withdrawal request
 * @route   POST /api/admin/sellers/withdrawals/:requestId/reject
 * @access  Private (Admin)
 */
exports.rejectSellerWithdrawal = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const withdrawal = await WithdrawalRequest.findById(requestId);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal request is already ${withdrawal.status}`,
      });
    }

    const seller = await Seller.findById(withdrawal.sellerId);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found',
      });
    }

    // Reject withdrawal
    withdrawal.status = 'rejected';
    withdrawal.reviewedBy = req.admin._id;
    withdrawal.reviewedAt = new Date();
    if (reason) {
      withdrawal.rejectionReason = reason;
    }
    await withdrawal.save();

    // Update seller wallet (remove from pending)
    seller.wallet.pending -= withdrawal.amount;
    if (seller.wallet.pending < 0) seller.wallet.pending = 0;
    await seller.save();

    // Log to payment history
    try {
      await PaymentHistory.create({
        activityType: 'seller_withdrawal_rejected',
        sellerId: seller._id,
        withdrawalRequestId: withdrawal._id,
        amount: withdrawal.amount,
        status: 'rejected',
        processedBy: req.admin._id,
        description: `Seller withdrawal of ₹${withdrawal.amount} rejected${reason ? ` - Reason: ${reason}` : ''}`,
        metadata: {
          sellerIdCode: seller.sellerId,
          sellerName: seller.name,
          reason,
        },
      });
    } catch (historyError) {
      console.error('Error logging withdrawal history:', historyError);
      // Don't fail rejection if history logging fails
    }

    // TODO: Send rejection notification to seller with reason

    console.log(`❌ Withdrawal rejected: ₹${withdrawal.amount}${reason ? ` - Reason: ${reason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        withdrawal,
        seller: {
          id: seller._id,
          sellerId: seller.sellerId,
          name: seller.name,
          wallet: {
            balance: seller.wallet.balance,
            pending: seller.wallet.pending,
          },
        },
        message: 'Withdrawal rejected successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// VENDOR WITHDRAWAL MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all vendor withdrawal requests (global)
 * @route   GET /api/admin/vendors/withdrawals
 * @access  Private (Admin)
 */
exports.getAllVendorWithdrawals = async (req, res, next) => {
  try {
    const { status, vendorId, page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    const query = {
      userType: 'vendor',
    };

    if (status) {
      query.status = status;
    }

    if (vendorId) {
      query.vendorId = vendorId;
    }

    // Search functionality (by vendor name or amount)
    if (search) {
      const searchNum = parseFloat(search);
      if (!isNaN(searchNum)) {
        // Search by amount
        query.amount = { $gte: searchNum * 0.9, $lte: searchNum * 1.1 }; // Allow 10% tolerance
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with vendor population
    const withdrawals = await WithdrawalRequest.find(query)
      .populate('vendorId', 'name phone email')
      .populate('bankAccountId')
      .populate('reviewedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    // If search was provided and it's a string, filter by vendor name
    let filteredWithdrawals = withdrawals;
    if (search && isNaN(parseFloat(search))) {
      filteredWithdrawals = withdrawals.filter(withdrawal => {
        const vendorName = withdrawal.vendorId?.name || '';
        return vendorName.toLowerCase().includes(search.toLowerCase());
      });
    }

    // Get total count (after search filter if applicable)
    let total = await WithdrawalRequest.countDocuments(query);
    if (search && isNaN(parseFloat(search))) {
      total = filteredWithdrawals.length;
    }

    res.status(200).json({
      success: true,
      data: {
        withdrawals: filteredWithdrawals,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create payment intent for vendor withdrawal
 * @route   POST /api/admin/vendors/withdrawals/:requestId/payment-intent
 * @access  Private (Admin)
 */
exports.createVendorWithdrawalPaymentIntent = async (req, res, next) => {
  try {
    console.log('🔍 [createVendorWithdrawalPaymentIntent] Starting...');
    console.log('🔍 [createVendorWithdrawalPaymentIntent] Request params:', req.params);
    console.log('🔍 [createVendorWithdrawalPaymentIntent] Request body:', req.body);

    const { requestId } = req.params;
    const { amount } = req.body;

    console.log('🔍 [createVendorWithdrawalPaymentIntent] Looking for withdrawal:', requestId);

    const withdrawal = await WithdrawalRequest.findById(requestId)
      .populate('vendorId');

    console.log('🔍 [createVendorWithdrawalPaymentIntent] Withdrawal found:', withdrawal ? 'Yes' : 'No');
    if (withdrawal) {
      console.log('🔍 [createVendorWithdrawalPaymentIntent] Withdrawal status:', withdrawal.status);
      console.log('🔍 [createVendorWithdrawalPaymentIntent] Withdrawal userType:', withdrawal.userType);
      console.log('🔍 [createVendorWithdrawalPaymentIntent] Withdrawal amount:', withdrawal.amount);
      console.log('🔍 [createVendorWithdrawalPaymentIntent] Vendor populated:', withdrawal.vendorId ? 'Yes' : 'No');
      if (withdrawal.vendorId) {
        console.log('🔍 [createVendorWithdrawalPaymentIntent] Vendor ID:', withdrawal.vendorId._id);
        console.log('🔍 [createVendorWithdrawalPaymentIntent] Vendor name:', withdrawal.vendorId.name);
      }
    }

    if (!withdrawal) {
      console.error('❌ [createVendorWithdrawalPaymentIntent] Withdrawal not found');
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (withdrawal.userType !== 'vendor') {
      console.error('❌ [createVendorWithdrawalPaymentIntent] Invalid userType:', withdrawal.userType);
      return res.status(400).json({
        success: false,
        message: 'This is not a vendor withdrawal request',
      });
    }

    if (withdrawal.status !== 'pending') {
      console.error('❌ [createVendorWithdrawalPaymentIntent] Invalid status:', withdrawal.status);
      return res.status(400).json({
        success: false,
        message: `Withdrawal request is already ${withdrawal.status}`,
      });
    }

    // Use withdrawal amount if not provided
    const paymentAmount = amount || withdrawal.amount;
    console.log('🔍 [createVendorWithdrawalPaymentIntent] Payment amount:', paymentAmount);

    // Ensure vendor is populated
    if (!withdrawal.vendorId || !withdrawal.vendorId._id) {
      console.error('❌ [createVendorWithdrawalPaymentIntent] Vendor information not found');
      console.error('❌ [createVendorWithdrawalPaymentIntent] withdrawal.vendorId:', withdrawal.vendorId);
      return res.status(400).json({
        success: false,
        message: 'Vendor information not found',
      });
    }

    console.log('🔍 [createVendorWithdrawalPaymentIntent] Creating Razorpay order...');
    console.log('🔍 [createVendorWithdrawalPaymentIntent] razorpayService available:', typeof razorpayService !== 'undefined' ? 'Yes' : 'No');
    console.log('🔍 [createVendorWithdrawalPaymentIntent] razorpayService.createOrder:', typeof razorpayService?.createOrder === 'function' ? 'Yes' : 'No');

    // Create Razorpay order
    // Receipt must be max 40 characters (Razorpay requirement)
    const receiptPrefix = `wd_${withdrawal._id.toString().slice(-8)}_`;
    const timestamp = Date.now().toString().slice(-8);
    const receipt = (receiptPrefix + timestamp).slice(0, 40); // Ensure max 40 chars
    
    console.log('🔍 [createVendorWithdrawalPaymentIntent] Receipt generated:', receipt, 'Length:', receipt.length);
    
    const razorpayOrder = await razorpayService.createOrder({
      amount: paymentAmount,
      currency: 'INR',
      receipt: receipt,
      notes: {
        withdrawalRequestId: withdrawal._id.toString(),
        vendorId: withdrawal.vendorId._id.toString(),
        vendorName: withdrawal.vendorId.name || 'Unknown Vendor',
        type: 'vendor_withdrawal',
      },
    });

    console.log('✅ [createVendorWithdrawalPaymentIntent] Razorpay order created:', razorpayOrder?.id);

    // Get Razorpay Key ID
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_key';
    console.log('🔍 [createVendorWithdrawalPaymentIntent] Razorpay Key ID:', keyId ? 'Present' : 'Missing');

    const response = {
      success: true,
      data: {
        paymentIntent: {
          id: razorpayOrder.id,
          amount: paymentAmount,
          currency: 'INR',
          status: razorpayOrder.status,
          razorpayOrderId: razorpayOrder.id,
          keyId: keyId,
          receipt: razorpayOrder.receipt,
          createdAt: new Date(),
          isTestMode: !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET,
        },
        message: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
          ? 'Payment intent created successfully'
          : 'Payment intent created (Test Mode)',
      },
    };

    console.log('✅ [createVendorWithdrawalPaymentIntent] Sending success response');
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ [createVendorWithdrawalPaymentIntent] Error occurred:');
    console.error('❌ [createVendorWithdrawalPaymentIntent] Error message:', error.message);
    console.error('❌ [createVendorWithdrawalPaymentIntent] Error stack:', error.stack);
    console.error('❌ [createVendorWithdrawalPaymentIntent] Full error:', error);
    next(error);
  }
};

/**
 * @desc    Approve vendor withdrawal request
 * @route   POST /api/admin/vendors/withdrawals/:requestId/approve
 * @access  Private (Admin)
 */
exports.approveVendorWithdrawal = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { paymentReference, paymentMethod, paymentDate, adminRemarks } = req.body;

    const withdrawal = await WithdrawalRequest.findById(requestId)
      .populate('vendorId')
      .populate('bankAccountId');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (withdrawal.userType !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'This is not a vendor withdrawal request',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal request is already ${withdrawal.status}`,
      });
    }

    const vendor = await Vendor.findById(withdrawal.vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Calculate available balance
    const totalEarningsResult = await VendorEarning.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          status: 'processed',
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$earnings' },
        },
      },
    ]);

    const totalEarnings = totalEarningsResult[0]?.totalEarnings || 0;

    const pendingWithdrawals = await WithdrawalRequest.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          status: 'pending',
          _id: { $ne: withdrawal._id },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const pendingWithdrawalAmount = pendingWithdrawals[0]?.totalAmount || 0;
    const availableBalance = totalEarnings - pendingWithdrawalAmount;

    if (withdrawal.amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₹${Math.round(availableBalance * 100) / 100}, Requested: ₹${withdrawal.amount}`,
      });
    }

    // Approve withdrawal
    withdrawal.status = 'approved';
    withdrawal.reviewedBy = req.admin._id;
    withdrawal.reviewedAt = new Date();
    if (paymentReference) withdrawal.paymentReference = paymentReference;
    if (paymentMethod) withdrawal.paymentMethod = paymentMethod;
    if (paymentDate) withdrawal.paymentDate = new Date(paymentDate);
    if (adminRemarks) withdrawal.adminRemarks = adminRemarks;
    
    // Store payment gateway details if provided
    if (req.body.gatewayPaymentId) withdrawal.gatewayPaymentId = req.body.gatewayPaymentId;
    if (req.body.gatewayOrderId) withdrawal.gatewayOrderId = req.body.gatewayOrderId;
    if (req.body.gatewaySignature) withdrawal.gatewaySignature = req.body.gatewaySignature;
    
    await withdrawal.save();

    // Mark vendor earnings as withdrawn (oldest first until withdrawal amount is covered)
    let remainingAmount = withdrawal.amount;
    const earningsToMark = await VendorEarning.find({
      vendorId: vendor._id,
      status: 'processed',
    }).sort({ processedAt: 1 }); // Oldest first

    for (const earning of earningsToMark) {
      if (remainingAmount <= 0) break;
      
      if (earning.earnings <= remainingAmount) {
        // Mark entire earning as withdrawn
        earning.status = 'withdrawn';
        earning.withdrawnAt = new Date();
        earning.withdrawalRequestId = withdrawal._id;
        remainingAmount -= earning.earnings;
        await earning.save();
      } else {
        // Partial withdrawal - create a new earning record for remaining amount
        const remainingEarning = new VendorEarning({
          vendorId: earning.vendorId,
          orderId: earning.orderId,
          productId: earning.productId,
          productName: earning.productName,
          quantity: earning.quantity,
          userPrice: earning.userPrice,
          vendorPrice: earning.vendorPrice,
          earnings: earning.earnings - remainingAmount,
          status: 'processed',
          processedAt: earning.processedAt,
          notes: `Remaining amount after withdrawal ${withdrawal._id}`,
        });
        await remainingEarning.save();

        // Mark original earning as withdrawn
        earning.earnings = remainingAmount;
        earning.status = 'withdrawn';
        earning.withdrawnAt = new Date();
        earning.withdrawalRequestId = withdrawal._id;
        await earning.save();
        remainingAmount = 0;
      }
    }

    // Log to payment history
    try {
      const bankAccount = withdrawal.bankAccountId;
      await PaymentHistory.create({
        activityType: 'vendor_withdrawal_approved',
        vendorId: vendor._id,
        withdrawalRequestId: withdrawal._id,
        bankAccountId: bankAccount?._id,
        amount: withdrawal.amount,
        status: 'completed',
        paymentMethod: paymentMethod || 'razorpay',
        bankDetails: bankAccount ? {
          accountHolderName: bankAccount.accountHolderName,
          accountNumber: bankAccount.accountNumber,
          ifscCode: bankAccount.ifscCode,
          bankName: bankAccount.bankName,
        } : undefined,
        processedBy: req.admin._id,
        description: `Vendor withdrawal of ₹${withdrawal.amount} approved and paid for ${vendor.name}`,
        metadata: {
          vendorName: vendor.name,
          vendorPhone: vendor.phone,
          paymentReference,
          gatewayPaymentId: req.body.gatewayPaymentId,
          gatewayOrderId: req.body.gatewayOrderId,
          adminRemarks,
        },
      });
    } catch (historyError) {
      console.error('Error logging withdrawal history:', historyError);
      // Don't fail approval if history logging fails
    }

    console.log(`✅ Vendor withdrawal approved: ₹${withdrawal.amount} for vendor ${vendor.name} (${vendor.phone})`);

    res.status(200).json({
      success: true,
      data: {
        withdrawal,
        vendor: {
          id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
        },
        message: 'Withdrawal approved successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject vendor withdrawal request
 * @route   POST /api/admin/vendors/withdrawals/:requestId/reject
 * @access  Private (Admin)
 */
exports.rejectVendorWithdrawal = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { reason, adminRemarks } = req.body;

    const withdrawal = await WithdrawalRequest.findById(requestId)
      .populate('vendorId');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (withdrawal.userType !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'This is not a vendor withdrawal request',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal request is already ${withdrawal.status}`,
      });
    }

    const vendor = await Vendor.findById(withdrawal.vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Reject withdrawal
    withdrawal.status = 'rejected';
    withdrawal.reviewedBy = req.admin._id;
    withdrawal.reviewedAt = new Date();
    if (reason) {
      withdrawal.rejectionReason = reason;
    }
    if (adminRemarks) {
      withdrawal.adminRemarks = adminRemarks;
    }
    await withdrawal.save();

    // Log to payment history
    try {
      await PaymentHistory.create({
        activityType: 'vendor_withdrawal_rejected',
        vendorId: vendor._id,
        withdrawalRequestId: withdrawal._id,
        amount: withdrawal.amount,
        status: 'rejected',
        processedBy: req.admin._id,
        description: `Vendor withdrawal of ₹${withdrawal.amount} rejected${reason ? ` - Reason: ${reason}` : ''}`,
        metadata: {
          vendorName: vendor.name,
          vendorPhone: vendor.phone,
          reason,
          adminRemarks,
        },
      });
    } catch (historyError) {
      console.error('Error logging withdrawal history:', historyError);
      // Don't fail rejection if history logging fails
    }

    console.log(`❌ Vendor withdrawal rejected: ₹${withdrawal.amount}${reason ? ` - Reason: ${reason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        withdrawal,
        vendor: {
          id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
        },
        message: 'Withdrawal rejected successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark vendor withdrawal as completed (after payment processed)
 * @route   PUT /api/admin/vendors/withdrawals/:requestId/complete
 * @access  Private (Admin)
 */
exports.completeVendorWithdrawal = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { paymentReference, paymentMethod, paymentDate } = req.body;

    const withdrawal = await WithdrawalRequest.findById(requestId)
      .populate('vendorId');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (withdrawal.userType !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'This is not a vendor withdrawal request',
      });
    }

    if (withdrawal.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal request must be approved before marking as completed. Current status: ${withdrawal.status}`,
      });
    }

    // Mark as completed
    withdrawal.status = 'completed';
    withdrawal.processedAt = new Date();
    if (paymentReference) withdrawal.paymentReference = paymentReference;
    if (paymentMethod) withdrawal.paymentMethod = paymentMethod;
    if (paymentDate) withdrawal.paymentDate = new Date(paymentDate);
    await withdrawal.save();

    // Log to payment history
    try {
      const vendor = await Vendor.findById(withdrawal.vendorId);
      const bankAccount = await BankAccount.findById(withdrawal.bankAccountId);
      await PaymentHistory.create({
        activityType: 'vendor_withdrawal_completed',
        vendorId: withdrawal.vendorId,
        withdrawalRequestId: withdrawal._id,
        bankAccountId: withdrawal.bankAccountId,
        amount: withdrawal.amount,
        status: 'completed',
        paymentMethod: paymentMethod || 'bank_transfer',
        bankDetails: bankAccount ? {
          accountHolderName: bankAccount.accountHolderName,
          accountNumber: bankAccount.accountNumber,
          ifscCode: bankAccount.ifscCode,
          bankName: bankAccount.bankName,
        } : undefined,
        processedBy: req.admin._id,
        description: `Vendor withdrawal of ₹${withdrawal.amount} completed${paymentReference ? ` - Reference: ${paymentReference}` : ''}`,
        metadata: {
          vendorName: vendor?.name,
          paymentReference,
          paymentDate,
        },
      });
    } catch (historyError) {
      console.error('Error logging withdrawal history:', historyError);
      // Don't fail completion if history logging fails
    }

    console.log(`✅ Vendor withdrawal completed: ₹${withdrawal.amount} for vendor ${withdrawal.vendorId?.name}`);

    res.status(200).json({
      success: true,
      data: {
        withdrawal,
        message: 'Withdrawal marked as completed successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment history for admin
 * @route   GET /api/admin/payment-history
 * @access  Private (Admin)
 */
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const {
      activityType,
      userId,
      vendorId,
      sellerId,
      orderId,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 50,
      search,
    } = req.query;

    const query = {};

    // Filter by activity type
    if (activityType) {
      query.activityType = activityType;
    }

    // Filter by user
    if (userId) {
      query.userId = userId;
    }

    // Filter by vendor
    if (vendorId) {
      query.vendorId = vendorId;
    }

    // Filter by seller
    if (sellerId) {
      query.sellerId = sellerId;
    }

    // Filter by order
    if (orderId) {
      query.orderId = orderId;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build aggregation pipeline for search
    let pipeline = [{ $match: query }];

    // If search is provided, search in description and metadata
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { description: { $regex: search, $options: 'i' } },
            { 'metadata.vendorName': { $regex: search, $options: 'i' } },
            { 'metadata.sellerName': { $regex: search, $options: 'i' } },
            { 'metadata.orderNumber': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Add population and sorting
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      {
        $lookup: {
          from: 'sellers',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller',
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order',
        },
      },
      {
        $project: {
          activityType: 1,
          amount: 1,
          currency: 1,
          status: 1,
          paymentMethod: 1,
          bankDetails: 1,
          description: 1,
          metadata: 1,
          processedBy: 1,
          processedAt: 1,
          createdAt: 1,
          updatedAt: 1,
          userId: 1,
          vendorId: 1,
          sellerId: 1,
          orderId: 1,
          withdrawalRequestId: 1,
          bankAccountId: 1,
          vendorEarningId: 1,
          commissionId: 1,
          user: { $arrayElemAt: ['$user', 0] },
          vendor: { $arrayElemAt: ['$vendor', 0] },
          seller: { $arrayElemAt: ['$seller', 0] },
          order: { $arrayElemAt: ['$order', 0] },
        },
      }
    );

    const [history, totalResult] = await Promise.all([
      PaymentHistory.aggregate(pipeline),
      PaymentHistory.countDocuments(query),
    ]);

    // Calculate summary statistics
    const summaryPipeline = [
      { $match: query },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ];

    const summary = await PaymentHistory.aggregate(summaryPipeline);

    res.status(200).json({
      success: true,
      data: {
        history,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalResult,
          totalPages: Math.ceil(totalResult / limitNum),
        },
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment history statistics
 * @route   GET /api/admin/payment-history/stats
 * @access  Private (Admin)
 */
exports.getPaymentHistoryStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const stats = await PaymentHistory.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalUserPayments: {
            $sum: {
              $cond: [
                { $in: ['$activityType', ['user_payment_advance', 'user_payment_remaining']] },
                '$amount',
                0,
              ],
            },
          },
          totalVendorEarnings: {
            $sum: {
              $cond: [{ $eq: ['$activityType', 'vendor_earning'] }, '$amount', 0],
            },
          },
          totalSellerCommissions: {
            $sum: {
              $cond: [{ $eq: ['$activityType', 'seller_commission'] }, '$amount', 0],
            },
          },
          totalVendorWithdrawals: {
            $sum: {
              $cond: [
                { $in: ['$activityType', ['vendor_withdrawal_requested', 'vendor_withdrawal_approved', 'vendor_withdrawal_completed']] },
                '$amount',
                0,
              ],
            },
          },
          totalSellerWithdrawals: {
            $sum: {
              $cond: [
                { $in: ['$activityType', ['seller_withdrawal_requested', 'seller_withdrawal_approved', 'seller_withdrawal_completed']] },
                '$amount',
                0,
              ],
            },
          },
          totalActivities: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalUserPayments: 0,
        totalVendorEarnings: 0,
        totalSellerCommissions: 0,
        totalVendorWithdrawals: 0,
        totalSellerWithdrawals: 0,
        totalActivities: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all withdrawals (vendors + sellers) for admin dashboard
 * @route   GET /api/admin/withdrawals
 * @access  Private (Admin)
 */
exports.getAllWithdrawals = async (req, res, next) => {
  try {
    const { userType, status, page = 1, limit = 20, search } = req.query;

    const query = {};

    if (userType) {
      query.userType = userType;
    }

    if (status) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build population based on userType
    let withdrawals = await WithdrawalRequest.find(query)
      .populate('vendorId', 'name phone email')
      .populate('sellerId', 'sellerId name phone email wallet')
      .populate('bankAccountId')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      withdrawals = withdrawals.filter(withdrawal => {
        if (withdrawal.userType === 'vendor') {
          return withdrawal.vendorId?.name?.toLowerCase().includes(searchLower) ||
                 withdrawal.vendorId?.phone?.includes(search);
        } else {
          return withdrawal.sellerId?.name?.toLowerCase().includes(searchLower) ||
                 withdrawal.sellerId?.sellerId?.toLowerCase().includes(searchLower) ||
                 withdrawal.sellerId?.phone?.includes(search);
        }
      });
    }

    const total = await WithdrawalRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// USER MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all users with filtering and pagination
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
exports.getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      isActive,
      isBlocked,
      sellerId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }

    if (sellerId) {
      query.sellerId = sellerId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { sellerId: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const users = await User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v -otp')
      .populate('seller', 'sellerId name')
      .populate('assignedVendor', 'name phone');

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user details
 * @route   GET /api/admin/users/:userId
 * @access  Private (Admin)
 */
exports.getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-__v -otp')
      .populate('seller', 'sellerId name phone email')
      .populate('assignedVendor', 'name phone location');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get user's orders count and stats
    const Order = require('../models/Order');
    const Payment = require('../models/Payment');
    
    const ordersCount = await Order.countDocuments({ userId: user._id });
    const totalSpentResult = await Order.aggregate([
      { $match: { userId: user._id, status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] }, paymentStatus: PAYMENT_STATUS.FULLY_PAID } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalSpent = totalSpentResult[0]?.total || 0;

    // Get user's recent orders
    const recentOrders = await Order.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber totalAmount status createdAt paymentStatus')
      .lean();

    // Get user's payments
    const payments = await Payment.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('orderId', 'orderNumber totalAmount')
      .select('-__v');

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          ordersCount,
          totalSpent,
          recentOrders: recentOrders.length,
        },
        recentOrders: recentOrders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          value: order.totalAmount,
          date: order.createdAt,
          status: order.status,
          paymentStatus: order.paymentStatus,
        })),
        payments: payments.map(payment => ({
          id: payment._id,
          paymentId: payment.paymentId,
          amount: payment.amount,
          date: payment.createdAt,
          description: `Payment for Order ${payment.orderId?.orderNumber || 'N/A'}`,
          status: payment.status === 'fully_paid' ? 'completed' : payment.status,
          orderNumber: payment.orderId?.orderNumber,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Block/Unblock user
 * @route   PUT /api/admin/users/:userId/block
 * @access  Private (Admin)
 */
exports.blockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { block = true, reason } = req.body; // block: true to block, false to unblock

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Block/Unblock user
    user.isBlocked = block === true || block === 'true';
    user.isActive = !user.isBlocked; // If blocked, set inactive

    await user.save();

    const action = user.isBlocked ? 'blocked' : 'unblocked';
    console.log(`✅ User ${action}: ${user.name} (${user.phone})${reason ? ` - Reason: ${reason}` : ''}`);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          isBlocked: user.isBlocked,
          isActive: user.isActive,
        },
        message: `User ${action} successfully`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// ORDER & PAYMENT MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all orders with filtering and pagination
 * @route   GET /api/admin/orders
 * @access  Private (Admin)
 */
exports.getOrders = async (req, res, next) => {
  try {
    // Process expired status updates in background (non-blocking)
    processExpiredStatusUpdates().catch(() => {});
    
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      vendorId,
      userId,
      assignedTo,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (vendorId) {
      query.vendorId = vendorId;
    }

    if (userId) {
      query.userId = userId;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    // Search by order number
    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const orders = await Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name phone email location')
      .populate('vendorId', 'name phone location')
      .populate('seller', 'sellerId name phone')
      .select('-__v')
      .lean();

    const total = await Order.countDocuments(query);

    // Filter orders in grace period - show as 'pending' to admin (not accepted yet)
    const filteredOrders = orders.map(order => {
      // If order is in grace period, show status as 'pending' instead of actual status
      if (order.acceptanceGracePeriod?.isActive) {
        return {
          ...order,
          status: 'pending', // Show as pending during grace period
        };
      }
      return order;
    });

    res.status(200).json({
      success: true,
      data: {
        orders: filteredOrders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order details
 * @route   GET /api/admin/orders/:orderId
 * @access  Private (Admin)
 */
exports.getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('userId', 'name phone email location')
      .populate('vendorId', 'name phone location')
      .populate('seller', 'sellerId name phone')
      .populate('items.productId', 'name sku category priceToUser')
      .populate('parentOrderId')
      .populate('childOrderIds')
      .select('-__v');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Get order payments
    const payments = await Payment.find({ orderId })
      .sort({ createdAt: -1 })
      .select('-__v');

    // Calculate payment summary
    const totalPaid = payments
      .filter(p => p.status === 'fully_paid' || p.status === 'partial_paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        order,
        payments,
        paymentSummary: {
          totalAmount: order.totalAmount,
          totalPaid,
          totalPending,
          remaining: order.totalAmount - totalPaid,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all commissions with order and user details
 * @route   GET /api/admin/commissions
 * @access  Private (Admin)
 */
exports.getCommissions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      sellerId,
      userId,
      orderId,
      month,
      year,
      status,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};

    if (sellerId) {
      query.sellerId = sellerId;
    }

    if (userId) {
      query.userId = userId;
    }

    if (orderId) {
      query.orderId = orderId;
    }

    if (month) {
      query.month = parseInt(month);
    }

    if (year) {
      query.year = parseInt(year);
    }

    if (status) {
      query.status = status;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    // Search by seller ID code or order number
    if (search) {
      query.$or = [
        { sellerIdCode: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with population
    const commissions = await Commission.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('sellerId', 'sellerId name phone email')
      .populate('userId', 'name phone email location')
      .populate('orderId', 'orderNumber totalAmount status paymentStatus createdAt deliveryAddress vendorId assignedTo')
      .select('-__v')
      .lean();

    const total = await Commission.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        commissions,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate invoice PDF for order
 * @route   GET /api/admin/orders/:orderId/invoice
 * @access  Private (Admin)
 */
exports.generateInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('userId', 'name phone email location')
      .populate('vendorId', 'name phone location')
      .populate('seller', 'sellerId name phone')
      .populate('items.productId', 'name sku category priceToUser')
      .select('-__v');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Get order payments
    const payments = await Payment.find({ orderId })
      .sort({ createdAt: -1 })
      .select('-__v');

    const totalPaid = payments
      .filter(p => p.status === 'fully_paid' || p.status === 'partial_paid')
      .reduce((sum, p) => sum + p.amount, 0);

    // Format date
    const formatDate = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount || 0);
    };

    // Generate HTML invoice
    const invoiceHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${order.orderNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #10b981;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #10b981;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h1 {
      font-size: 32px;
      color: #1f2937;
      margin-bottom: 5px;
    }
    .invoice-title p {
      color: #6b7280;
      font-size: 14px;
    }
    .details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .detail-section h3 {
      color: #374151;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .detail-section p {
      color: #6b7280;
      font-size: 14px;
      margin: 5px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table thead {
      background: #f3f4f6;
    }
    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      color: #1f2937;
    }
    .items-table tbody tr:hover {
      background: #f9fafb;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-top: 20px;
      margin-left: auto;
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .total-row:last-child {
      border-bottom: none;
    }
    .total-label {
      font-weight: 600;
      color: #374151;
    }
    .total-amount {
      font-weight: bold;
      color: #1f2937;
    }
    .grand-total {
      background: #10b981;
      color: white;
      padding: 15px;
      border-radius: 5px;
      margin-top: 10px;
    }
    .grand-total .total-label {
      color: white;
      font-size: 18px;
    }
    .grand-total .total-amount {
      color: white;
      font-size: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .payment-info {
      background: #fef3c7;
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
    }
    .payment-info h4 {
      color: #92400e;
      margin-bottom: 8px;
    }
    .payment-info p {
      color: #78350f;
      font-size: 13px;
      margin: 3px 0;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .invoice-container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="logo">IRA SATHI</div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <p>Order #${order.orderNumber}</p>
      </div>
    </div>

    <div class="details">
      <div class="detail-section">
        <h3>Bill To</h3>
        <p><strong>${order.userId?.name || 'N/A'}</strong></p>
        <p>${order.deliveryAddress?.phone || order.userId?.phone || 'N/A'}</p>
        <p>${order.deliveryAddress?.address || order.userId?.location || 'N/A'}</p>
        <p>${order.deliveryAddress?.city || ''} ${order.deliveryAddress?.state || ''} - ${order.deliveryAddress?.pincode || ''}</p>
      </div>
      <div class="detail-section">
        <h3>Invoice Details</h3>
        <p><strong>Invoice Date:</strong> ${formatDate(order.createdAt)}</p>
        <p><strong>Order Date:</strong> ${formatDate(order.createdAt)}</p>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Payment Status:</strong> <span style="text-transform: capitalize;">${order.paymentStatus?.replace('_', ' ') || 'Pending'}</span></p>
        ${order.vendorId ? `<p><strong>Vendor:</strong> ${order.vendorId.name || 'N/A'}</p>` : ''}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Quantity</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map((item) => `
          <tr>
            <td>
              <strong>${item.productName || item.productId?.name || 'Product'}</strong>
              ${item.productId?.sku ? `<br><small style="color: #6b7280;">SKU: ${item.productId.sku}</small>` : ''}
            </td>
            <td>${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.unitPrice)}</td>
            <td class="text-right"><strong>${formatCurrency(item.totalPrice)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span class="total-label">Subtotal</span>
        <span class="total-amount">${formatCurrency(order.subtotal)}</span>
      </div>
      ${order.deliveryCharge > 0 ? `
      <div class="total-row">
        <span class="total-label">Delivery Charge</span>
        <span class="total-amount">${formatCurrency(order.deliveryCharge)}</span>
      </div>
      ` : ''}
      <div class="total-row grand-total">
        <span class="total-label">Grand Total</span>
        <span class="total-amount">${formatCurrency(order.totalAmount)}</span>
      </div>
    </div>

    <div class="payment-info">
      <h4>Payment Information</h4>
      <p><strong>Payment Preference:</strong> ${order.paymentPreference === 'partial' ? 'Partial Payment (30% Advance + 70% Remaining)' : 'Full Payment'}</p>
      <p><strong>Upfront Amount:</strong> ${formatCurrency(order.upfrontAmount)}</p>
      ${order.remainingAmount > 0 ? `<p><strong>Remaining Amount:</strong> ${formatCurrency(order.remainingAmount)}</p>` : ''}
      <p><strong>Total Paid:</strong> ${formatCurrency(totalPaid)}</p>
      <p><strong>Balance Due:</strong> ${formatCurrency(order.totalAmount - totalPaid)}</p>
    </div>

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>For any queries, please contact our support team.</p>
      <p style="margin-top: 10px;">Invoice generated on ${formatDate(new Date())}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Set headers for HTML response
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${order.orderNumber}.html"`);
    res.send(invoiceHTML);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get escalated orders (assigned to admin)
 * @route   GET /api/admin/orders/escalated
 * @access  Private (Admin)
 */
exports.getEscalatedOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query for escalated orders (assigned to admin)
    const query = {
      assignedTo: 'admin',
    };

    // Filter by status if provided
    if (status) {
      query.status = status;
    } else {
      // By default, exclude delivered and cancelled escalated orders
      query.status = { $nin: ['delivered', 'cancelled'] };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    // Search by order number
    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const orders = await Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name phone email location')
      .populate('vendorId', 'name phone location')
      .populate('seller', 'sellerId name')
      .populate('items.productId', 'name sku category')
      .select('-__v')
      .lean();

    const total = await Order.countDocuments(query);

    // Transform orders for frontend
    const transformedOrders = orders.map(order => {
      const vendor = order.vendorId || order.escalation?.originalVendorId;
      const user = order.userId;
      
      // Get escalation details
      const escalation = order.escalation || {};
      const escalationEntry = order.statusTimeline?.find(
        entry => entry.status === 'rejected' && entry.updatedBy === 'vendor'
      );
      
      return {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        vendor: vendor?.name || 'N/A',
        vendorId: vendor?._id?.toString() || null,
        vendorPhone: vendor?.phone || null,
        vendorLocation: vendor?.location ? `${vendor.location.city || ''}, ${vendor.location.state || ''}`.trim() : null,
        value: order.totalAmount || 0,
        orderValue: order.totalAmount || 0,
        escalatedAt: escalation.escalatedAt || escalationEntry?.timestamp || order.createdAt,
        escalatedBy: escalation.escalatedBy || 'vendor',
        escalationReason: escalation.escalationReason || 'Not provided',
        escalationType: escalation.escalationType || 'full',
        escalatedItems: escalation.escalatedItems || [],
        isReverted: !!escalation.revertedAt,
        revertedAt: escalation.revertedAt || null,
        revertReason: escalation.revertReason || null,
        status: order.status || 'rejected',
        items: order.items?.map(item => ({
          id: item.productId?._id?.toString() || item._id?.toString(),
          name: item.productId?.name || item.productName,
          quantity: item.quantity,
          price: item.unitPrice,
          totalPrice: item.totalPrice,
        })) || [],
        userId: user?._id?.toString(),
        userName: user?.name,
        userPhone: user?.phone || null,
        userLocation: user?.location ? `${user.location.city || ''}, ${user.location.state || ''}`.trim() : null,
        deliveryAddress: order.deliveryAddress,
        notes: order.notes,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        orders: transformedOrders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fulfill escalated order from warehouse
 * @route   POST /api/admin/orders/:orderId/fulfill
 * @access  Private (Admin)
 */
exports.fulfillOrderFromWarehouse = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { note, deliveryDate, trackingNumber } = req.body;

    const order = await Order.findById(orderId)
      .populate('userId', 'name phone email')
      .populate('items.productId', 'name sku');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order is assigned to admin (escalated)
    if (order.assignedTo !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Order is not escalated to admin. Only escalated orders can be fulfilled from warehouse.',
      });
    }

    // Check if order can be fulfilled
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot fulfill order with status: ${order.status}`,
      });
    }

    // Update order status to accepted (admin is handling fulfillment)
    // Status flow: awaiting -> accepted -> dispatched -> delivered -> fully_paid (if partial payment)
    const previousStatus = order.status;
    order.status = 'accepted'; // Changed from 'processing' to 'accepted' to match status flow
    order.assignedTo = 'admin'; // Keep assigned to admin

    // Add admin fulfillment notes
    if (note) {
      order.notes = `${order.notes || ''}\n[Admin Warehouse Fulfillment] ${note}`.trim();
    }

    // Set delivery date if provided
    if (deliveryDate) {
      order.expectedDeliveryDate = new Date(deliveryDate);
    } else {
      // Default: set delivery date to 4 hours from now
      order.expectedDeliveryDate = new Date(Date.now() + 4 * 60 * 60 * 1000);
    }

    // Add tracking number if provided
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    // Update status timeline
    order.statusTimeline.push({
      status: 'accepted',
      timestamp: new Date(),
      updatedBy: 'admin',
      note: `Order fulfilled from warehouse by admin. Status set to Accepted.${note ? ` Note: ${note}` : ''}`,
    });

    await order.save();

    // TODO: Send notifications
    // - Notify user that order is being processed by admin
    // - Update inventory if needed (when inventory system is implemented)

    console.log(`✅ Escalated order ${order.orderNumber} fulfilled from warehouse by admin. Previous status: ${previousStatus}`);

    res.status(200).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          assignedTo: order.assignedTo,
          expectedDeliveryDate: order.expectedDeliveryDate,
          trackingNumber: order.trackingNumber,
        },
        message: 'Order fulfilled from warehouse successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revert escalation back to vendor
 * @route   POST /api/admin/orders/:orderId/revert-escalation
 * @access  Private (Admin)
 */
exports.revertEscalation = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Revert reason is required',
      });
    }

    const order = await Order.findById(orderId)
      .populate('userId', 'name phone email location')
      .populate('escalation.originalVendorId', 'name phone location');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order is escalated
    if (!order.escalation?.isEscalated || order.assignedTo !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Order is not escalated to admin',
      });
    }

    // Check if order can be reverted (not delivered or cancelled)
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot revert order with status: ${order.status}`,
      });
    }

    // Get original vendor
    const originalVendor = order.escalation.originalVendorId;
    if (!originalVendor) {
      return res.status(400).json({
        success: false,
        message: 'Original vendor not found. Cannot revert escalation.',
      });
    }

    // Revert escalation - assign back to vendor
    // Handle case where vendorId might already be set (no error if same)
    if (order.vendorId && order.vendorId.toString() !== originalVendor._id.toString()) {
      // If vendorId exists but is different, update it
      order.vendorId = originalVendor._id;
    } else if (!order.vendorId) {
      // If vendorId doesn't exist, set it
      order.vendorId = originalVendor._id;
    }
    // If vendorId is already the same, no need to change it
    
    order.assignedTo = 'vendor';
    order.status = 'pending'; // Reset to pending for vendor to handle

    // Update escalation tracking
    order.escalation.revertedAt = new Date();
    order.escalation.revertedBy = req.admin._id;
    order.escalation.revertReason = reason;

    // Add notes
    order.notes = `${order.notes || ''}\n[Admin Revert] Order reverted back to vendor ${originalVendor.name}. Reason: ${reason}`.trim();

    // Update status timeline
    order.statusTimeline.push({
      status: 'pending',
      timestamp: new Date(),
      updatedBy: 'admin',
      note: `Escalation reverted back to vendor ${originalVendor.name}. Reason: ${reason}`,
    });

    await order.save();

    // TODO: Send notification to vendor

    console.log(`✅ Escalation reverted for order ${order.orderNumber} back to vendor ${originalVendor.name}`);

    res.status(200).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          assignedTo: order.assignedTo,
          vendorId: order.vendorId,
          vendor: {
            id: originalVendor._id,
            name: originalVendor.name,
            phone: originalVendor.phone,
            location: originalVendor.location,
          },
        },
        message: 'Escalation reverted successfully. Order assigned back to vendor.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reassign order to different vendor
 * @route   PUT /api/admin/orders/:orderId/reassign
 * @access  Private (Admin)
 */
exports.reassignOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { vendorId, reason } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required',
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order can be reassigned
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot reassign order with status: ${order.status}`,
      });
    }

    // Check if new vendor exists and is approved
    const newVendor = await Vendor.findById(vendorId);
    if (!newVendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (newVendor.status !== 'approved' || !newVendor.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Vendor must be approved and active',
      });
    }

    // Check if vendor is same
    if (order.vendorId && order.vendorId.toString() === vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Order is already assigned to this vendor',
      });
    }

    const oldVendorId = order.vendorId;
    
    // Reassign order
    order.vendorId = vendorId;
    order.assignedTo = 'vendor';
    
    // Add note to order if reason provided
    if (reason) {
      order.notes = `${order.notes || ''}\n[Reassigned by Admin] ${reason}`.trim();
    }

    // Update status timeline
    order.statusTimeline.push({
      status: order.status,
      timestamp: new Date(),
      updatedBy: 'admin',
      note: `Order reassigned to vendor: ${newVendor.name}${reason ? ` - Reason: ${reason}` : ''}`,
    });

    await order.save();

    // TODO: Send notifications
    // - Notify old vendor (if exists)
    // - Notify new vendor
    // - Notify user

    console.log(`✅ Order ${order.orderNumber} reassigned from vendor ${oldVendorId} to ${vendorId}`);

    res.status(200).json({
      success: true,
      data: {
        order,
        oldVendorId,
        newVendor: {
          id: newVendor._id,
          name: newVendor.name,
          phone: newVendor.phone,
        },
        message: 'Order reassigned successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status (for admin-fulfilled orders)
 * @route   PUT /api/admin/orders/:orderId/status
 * @access  Private (Admin)
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, notes, isRevert, finalizeGracePeriod } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    // Valid status transitions for admin (Awaiting -> Accepted -> Dispatched -> Delivered -> Fully paid)
    const validStatuses = ['awaiting', 'accepted', 'processing', 'dispatched', 'delivered', 'fully_paid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Admin can update status for any order (vendor-assigned or admin-assigned)
    // No restriction needed

    const normalizeStatusValue = (value) => {
      if (!value) {
        return ORDER_STATUS.AWAITING;
      }
      const normalized = value.toString().toLowerCase();
      if (normalized === ORDER_STATUS.PENDING) {
        return ORDER_STATUS.AWAITING;
      }
      if (normalized === ORDER_STATUS.PROCESSING) {
        return ORDER_STATUS.ACCEPTED;
      }
      return normalized;
    };

    const paymentPreference = order.paymentPreference || 'partial';
    const normalizedCurrentStatus = normalizeStatusValue(order.status);
    const normalizedNewStatus = status === ORDER_STATUS.FULLY_PAID
      ? ORDER_STATUS.FULLY_PAID
      : normalizeStatusValue(status);

    const statusFlow = paymentPreference === 'partial'
      ? [ORDER_STATUS.AWAITING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.DISPATCHED, ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID]
      : [ORDER_STATUS.AWAITING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.DISPATCHED, ORDER_STATUS.DELIVERED];

    const finalStageStatus = paymentPreference === 'partial'
      ? ORDER_STATUS.FULLY_PAID
      : ORDER_STATUS.DELIVERED;

    // Check if there's an active status update grace period that hasn't expired
    const now = new Date();
    const hasActiveGracePeriod = order.statusUpdateGracePeriod?.isActive && 
                                 order.statusUpdateGracePeriod.expiresAt > now;
    
    // Allow finalizing grace period without status change
    if (finalizeGracePeriod === true && hasActiveGracePeriod) {
      order.statusUpdateGracePeriod.isActive = false;
      order.statusUpdateGracePeriod.finalizedAt = now;
      await order.save();
      return res.status(200).json({
        success: true,
        data: {
          order: {
            id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            statusUpdateGracePeriod: order.statusUpdateGracePeriod,
          },
          message: 'Status update grace period finalized successfully.',
        },
      });
    }

    if (hasActiveGracePeriod) {
      // During grace period, only allow reverting to previous status
      const isReverting = order.statusUpdateGracePeriod.previousStatus === status;
      
      if (!isReverting) {
        return res.status(400).json({
          success: false,
          message: `Cannot update status. Previous status update is still in grace period. Please wait for it to finalize (expires in ${Math.ceil((order.statusUpdateGracePeriod.expiresAt - now) / 1000 / 60)} minutes) or revert to previous status.`,
        });
      }
    } else if (order.statusUpdateGracePeriod?.isActive && order.statusUpdateGracePeriod.expiresAt <= now) {
      // Grace period expired, finalize it
      order.statusUpdateGracePeriod.isActive = false;
      order.statusUpdateGracePeriod.finalizedAt = now;
      order.statusUpdateGracePeriod.previousPaymentStatus = undefined;
      order.statusUpdateGracePeriod.previousRemainingAmount = undefined;
    }

    if (!hasActiveGracePeriod && normalizedCurrentStatus === finalStageStatus) {
      return res.status(400).json({
        success: false,
        message: 'Order has already completed its workflow. Further updates are not allowed.',
      });
    }

    if (normalizedNewStatus === ORDER_STATUS.FULLY_PAID) {
      if (paymentPreference !== 'partial') {
        return res.status(400).json({
          success: false,
          message: 'Fully paid status is only applicable for partial payment orders.',
        });
      }
      if (normalizedCurrentStatus !== ORDER_STATUS.DELIVERED) {
        return res.status(400).json({
          success: false,
          message: 'Order must be delivered before marking as fully paid.',
        });
      }
    }

    // If reverting to previous status during grace period, allow it
    // Also check if isRevert flag is explicitly set
    const isReverting = (hasActiveGracePeriod &&
      order.statusUpdateGracePeriod.previousStatus === normalizedNewStatus) ||
      (isRevert === true);

    const currentIndex = statusFlow.indexOf(normalizedCurrentStatus);
    const newIndex = statusFlow.indexOf(normalizedNewStatus);

    if (newIndex === -1 && normalizedNewStatus !== ORDER_STATUS.FULLY_PAID && !isReverting) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status. ${status} is not part of the workflow for this payment preference.`,
      });
    }

    if (!isReverting && normalizedNewStatus !== ORDER_STATUS.FULLY_PAID && newIndex !== -1 && newIndex <= currentIndex) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}. Invalid transition.`,
      });
    }

    // Store previous status for grace period (only if not reverting)
    const previousStatus = normalizeStatusValue(order.status);
    const isStatusChange = normalizedNewStatus !== previousStatus;

    const startGracePeriod = (extra = {}) => {
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
      order.statusUpdateGracePeriod = {
        isActive: true,
        previousStatus,
        updatedAt: now,
        expiresAt,
        updatedBy: 'admin',
        previousPaymentStatus: undefined,
        previousRemainingAmount: undefined,
        ...extra,
      };
    };

    const finalizeStatusUpdateGracePeriod = () => {
      order.statusUpdateGracePeriod.isActive = false;
      order.statusUpdateGracePeriod.finalizedAt = now;
    };

    if (normalizedNewStatus === ORDER_STATUS.FULLY_PAID) {
      const previousPaymentStatus = order.paymentStatus;
      const previousRemainingAmount = order.remainingAmount;

      order.status = ORDER_STATUS.FULLY_PAID;
      order.paymentStatus = PAYMENT_STATUS.FULLY_PAID;
      order.remainingAmount = 0;

      if (!isReverting && isStatusChange) {
        startGracePeriod({
          previousPaymentStatus,
          previousRemainingAmount,
        });
      } else if (isReverting && order.statusUpdateGracePeriod?.isActive) {
        order.paymentStatus = order.statusUpdateGracePeriod.previousPaymentStatus || previousPaymentStatus;
        if (typeof order.statusUpdateGracePeriod.previousRemainingAmount === 'number') {
          order.remainingAmount = order.statusUpdateGracePeriod.previousRemainingAmount;
        }
        finalizeStatusUpdateGracePeriod();
      }
    } else {
      order.status = normalizedNewStatus;
      
      if (isStatusChange && !isReverting) {
        startGracePeriod();
      } else if (isReverting && order.statusUpdateGracePeriod?.isActive) {
        if (order.statusUpdateGracePeriod.previousPaymentStatus) {
          order.paymentStatus = order.statusUpdateGracePeriod.previousPaymentStatus;
        }
        if (typeof order.statusUpdateGracePeriod.previousRemainingAmount === 'number') {
          order.remainingAmount = order.statusUpdateGracePeriod.previousRemainingAmount;
        }
        finalizeStatusUpdateGracePeriod();
      }
    }

    // Update delivery date if delivered
    if (normalizedNewStatus === ORDER_STATUS.DELIVERED && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    // Add notes if provided
    if (notes) {
      order.notes = `${order.notes || ''}\n[Admin Status Update] ${notes}`.trim();
    }

    const timelineStatus = order.status;
    const timelineNote = isReverting 
      ? (notes ? `Status reverted to ${timelineStatus} from ${previousStatus}. Note: ${notes}` : `Status reverted to ${timelineStatus} from ${previousStatus}`)
      : (notes ? `Status updated from ${previousStatus} to ${timelineStatus}. Note: ${notes}` : `Status updated from ${previousStatus} to ${timelineStatus}`);
    
    order.statusTimeline.push({
      status: timelineStatus,
      timestamp: now,
      updatedBy: 'admin',
      note: timelineNote,
    });

    await order.save();

    const message = isReverting 
      ? `Order status reverted to ${timelineStatus}`
      : isStatusChange
        ? `Order status updated to ${timelineStatus}. You have 1 hour to revert this change.`
        : `Order status updated to ${timelineStatus} successfully`;

    console.log(`✅ Order ${order.orderNumber} status updated to ${status} by admin${isStatusChange ? ' (grace period active)' : ''}`);

    res.status(200).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          statusUpdateGracePeriod: order.statusUpdateGracePeriod,
        },
        message,
        gracePeriod: isStatusChange ? {
          isActive: true,
          expiresAt: order.statusUpdateGracePeriod.expiresAt,
          previousStatus: order.statusUpdateGracePeriod.previousStatus,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all payments with filtering and pagination
 * @route   GET /api/admin/payments
 * @access  Private (Admin)
 */
exports.getPayments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentMethod,
      paymentType,
      userId,
      orderId,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (paymentType) {
      query.paymentType = paymentType;
    }

    if (userId) {
      query.userId = userId;
    }

    if (orderId) {
      query.orderId = orderId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    // Search by payment ID or gateway payment ID
    if (search) {
      query.$or = [
        { paymentId: { $regex: search, $options: 'i' } },
        { gatewayPaymentId: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const payments = await Payment.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('orderId', 'orderNumber totalAmount status')
      .populate('userId', 'name phone email')
      .select('-__v -gatewayResponse')
      .lean();

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// FINANCE & CREDIT MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all vendor credits summary
 * @route   GET /api/admin/finance/credits
 * @access  Private (Admin)
 */
exports.getCredits = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    // Build query for vendors with credit
    const query = {
      status: 'approved',
      isActive: true,
      creditUsed: { $gt: 0 }, // Only vendors with outstanding credit
    };

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get vendors with credit details
    const vendors = await Vendor.find(query)
      .sort({ creditUsed: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('name phone creditLimit creditUsed creditPolicy location')
      .lean();

    // Calculate credit information for each vendor
    const creditDetails = vendors.map(vendor => {
      const remaining = vendor.creditPolicy.limit - vendor.creditUsed;
      const utilization = vendor.creditPolicy.limit > 0
        ? (vendor.creditUsed / vendor.creditPolicy.limit) * 100
        : 0;

      // Check if overdue
      const now = new Date();
      const dueDate = vendor.creditPolicy.dueDate;
      const isOverdue = dueDate && now > dueDate;
      const daysOverdue = isOverdue && dueDate
        ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
        : 0;

      // Calculate penalty if overdue
      let penalty = 0;
      if (isOverdue && vendor.creditPolicy.penaltyRate > 0) {
        const dailyPenaltyRate = vendor.creditPolicy.penaltyRate / 100;
        penalty = vendor.creditUsed * dailyPenaltyRate * daysOverdue;
      }

      // Determine status
      let creditStatus = 'active';
      if (isOverdue) {
        creditStatus = daysOverdue <= 7 ? 'dueSoon' : 'overdue';
      } else if (dueDate) {
        const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 7) {
          creditStatus = 'dueSoon';
        }
      }

      return {
        vendorId: vendor._id,
        vendorName: vendor.name,
        vendorPhone: vendor.phone,
        location: vendor.location,
        creditLimit: vendor.creditPolicy.limit,
        creditUsed: vendor.creditUsed,
        creditRemaining: remaining,
        creditUtilization: Math.round(utilization * 100) / 100,
        dueDate: vendor.creditPolicy.dueDate,
        isOverdue,
        daysOverdue,
        penalty,
        penaltyRate: vendor.creditPolicy.penaltyRate,
        status: creditStatus,
      };
    });

    // Aggregate totals
    const totalOutstanding = vendors.reduce((sum, v) => sum + v.creditUsed, 0);
    const totalLimit = vendors.reduce((sum, v) => sum + v.creditPolicy.limit, 0);
    const overdueCount = creditDetails.filter(c => c.isOverdue).length;
    const dueSoonCount = creditDetails.filter(c => c.status === 'dueSoon' && !c.isOverdue).length;
    const totalPenalty = creditDetails.reduce((sum, c) => sum + c.penalty, 0);

    const total = await Vendor.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        credits: creditDetails,
        summary: {
          totalVendors: total,
          totalOutstanding,
          totalLimit,
          totalRemaining: totalLimit - totalOutstanding,
          totalUtilization: totalLimit > 0
            ? Math.round((totalOutstanding / totalLimit) * 100 * 100) / 100
            : 0,
          overdueCount,
          dueSoonCount,
          totalPenalty: Math.round(totalPenalty * 100) / 100,
        },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendor credit history
 * @route   GET /api/admin/finance/vendors/:vendorId/history
 * @access  Private (Admin)
 */
exports.getVendorCreditHistory = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Build query for credit purchases and payments
    const query = { vendorId };

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const toDate = new Date(endDate);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get credit purchases
    const creditPurchases = await CreditPurchase.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('items.productId', 'name sku')
      .select('-__v');

    // Get payments related to this vendor (through orders)
    const vendorOrders = await Order.find({ vendorId }).select('_id orderNumber');
    const orderIds = vendorOrders.map(o => o._id);
    
    const payments = await Payment.find({ orderId: { $in: orderIds } })
      .sort({ createdAt: -1 })
      .populate('orderId', 'orderNumber totalAmount')
      .select('-__v')
      .limit(limitNum);

    const totalPurchases = await CreditPurchase.countDocuments(query);

    // Transform credit purchases to history format
    const history = [
      ...creditPurchases.map(purchase => ({
        id: purchase._id,
        type: 'credit_purchase',
        amount: purchase.totalAmount,
        date: purchase.createdAt,
        description: `Credit purchase - ${purchase.items.length} item(s)`,
        status: purchase.status,
        products: purchase.items.map(item => ({
          name: item.productId?.name || item.productName,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
      })),
      ...payments.map(payment => ({
        id: payment._id,
        type: 'repayment',
        amount: payment.amount,
        date: payment.createdAt,
        description: `Repayment for Order ${payment.orderId?.orderNumber || 'N/A'}`,
        status: payment.status === 'fully_paid' ? 'completed' : payment.status,
        orderNumber: payment.orderId?.orderNumber,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
          creditLimit: vendor.creditPolicy.limit,
          creditUsed: vendor.creditUsed,
          creditRemaining: vendor.creditPolicy.limit - vendor.creditUsed,
        },
        history: history.slice(0, limitNum),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalPurchases / limitNum),
          totalItems: history.length,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get financial parameters
 * @route   GET /api/admin/finance/parameters
 * @access  Private (Admin)
 */
exports.getFinancialParameters = async (req, res, next) => {
  try {
    const { ADVANCE_PAYMENT_PERCENTAGE, MIN_ORDER_VALUE, MIN_VENDOR_PURCHASE } = require('../utils/constants');

    // Try to get from database, fallback to constants
    const financialParams = await Settings.getSetting('FINANCIAL_PARAMETERS', {
      userAdvancePaymentPercent: ADVANCE_PAYMENT_PERCENTAGE,
      minimumUserOrder: MIN_ORDER_VALUE,
      minimumVendorPurchase: MIN_VENDOR_PURCHASE,
    });

    res.status(200).json({
      success: true,
      data: {
        userAdvancePaymentPercent: financialParams.userAdvancePaymentPercent || ADVANCE_PAYMENT_PERCENTAGE,
        minimumUserOrder: financialParams.minimumUserOrder || MIN_ORDER_VALUE,
        minimumVendorPurchase: financialParams.minimumVendorPurchase || MIN_VENDOR_PURCHASE,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update financial parameters
 * @route   PUT /api/admin/finance/parameters
 * @access  Private (Admin)
 */
exports.updateFinancialParameters = async (req, res, next) => {
  try {
    const { userAdvancePaymentPercent, minimumUserOrder, minimumVendorPurchase } = req.body;
    const adminId = req.admin?.id || req.user?.id; // Get admin ID from auth middleware

    // Validation
    if (userAdvancePaymentPercent !== undefined) {
      if (typeof userAdvancePaymentPercent !== 'number' || userAdvancePaymentPercent < 0 || userAdvancePaymentPercent > 100) {
        return res.status(400).json({
          success: false,
          message: 'Advance payment percentage must be a number between 0 and 100.',
        });
      }
    }

    if (minimumUserOrder !== undefined) {
      if (typeof minimumUserOrder !== 'number' || minimumUserOrder < 0) {
        return res.status(400).json({
          success: false,
          message: 'Minimum order value must be a positive number.',
        });
      }
    }

    if (minimumVendorPurchase !== undefined) {
      if (typeof minimumVendorPurchase !== 'number' || minimumVendorPurchase < 0) {
        return res.status(400).json({
          success: false,
          message: 'Minimum vendor purchase must be a positive number.',
        });
      }
    }

    // Get current values from database or constants
    const { ADVANCE_PAYMENT_PERCENTAGE, MIN_ORDER_VALUE, MIN_VENDOR_PURCHASE } = require('../utils/constants');
    const currentParams = await Settings.getSetting('FINANCIAL_PARAMETERS', {
      userAdvancePaymentPercent: ADVANCE_PAYMENT_PERCENTAGE,
      minimumUserOrder: MIN_ORDER_VALUE,
      minimumVendorPurchase: MIN_VENDOR_PURCHASE,
    });

    // Update only provided values
    const updatedParams = {
      userAdvancePaymentPercent: userAdvancePaymentPercent !== undefined ? userAdvancePaymentPercent : currentParams.userAdvancePaymentPercent,
      minimumUserOrder: minimumUserOrder !== undefined ? minimumUserOrder : currentParams.minimumUserOrder,
      minimumVendorPurchase: minimumVendorPurchase !== undefined ? minimumVendorPurchase : currentParams.minimumVendorPurchase,
    };

    // Save to database
    await Settings.setSetting(
      'FINANCIAL_PARAMETERS',
      updatedParams,
      'Financial parameters: Advance payment %, Minimum order value, Minimum vendor purchase',
      adminId
    );

    res.status(200).json({
      success: true,
      message: 'Financial parameters updated successfully.',
      data: updatedParams,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get credit recovery status
 * @route   GET /api/admin/finance/recovery
 * @access  Private (Admin)
 */
exports.getRecoveryStatus = async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Get all vendors with credit
    const vendorsWithCredit = await Vendor.find({
      status: 'approved',
      isActive: true,
      creditUsed: { $gt: 0 },
    }).select('creditUsed creditPolicy approvedAt');

    // Calculate recovery statistics
    const totalOutstanding = vendorsWithCredit.reduce((sum, v) => sum + v.creditUsed, 0);

    // Get completed credit purchases (for recovery tracking)
    const completedPurchases = await CreditPurchase.find({
      status: 'approved',
      createdAt: { $gte: daysAgo },
    }).select('totalAmount createdAt');

    // Calculate recovered amount (simplified - assumes payments reduce credit)
    // In production, this would track actual repayments
    const recoveredAmount = completedPurchases.length > 0
      ? completedPurchases.reduce((sum, p) => sum + p.totalAmount, 0)
      : 0;

    // Calculate overdue vendors
    const now = new Date();
    const overdueVendors = vendorsWithCredit.filter(vendor => {
      if (!vendor.creditPolicy.dueDate) return false;
      return now > vendor.creditPolicy.dueDate;
    });

    const overdueAmount = overdueVendors.reduce((sum, v) => sum + v.creditUsed, 0);

    // Calculate recovery rate (percentage)
    const totalCreditEver = totalOutstanding + recoveredAmount;
    const recoveryRate = totalCreditEver > 0
      ? (recoveredAmount / totalCreditEver) * 100
      : 0;

    // Calculate average recovery time (simplified)
    const averageRecoveryDays = completedPurchases.length > 0
      ? completedPurchases.reduce((sum, p) => {
          const daysSince = Math.floor((now - p.createdAt) / (1000 * 60 * 60 * 24));
          return sum + daysSince;
        }, 0) / completedPurchases.length
      : 0;

    res.status(200).json({
      success: true,
      data: {
        period: parseInt(period),
        recovery: {
          totalOutstanding,
          overdueAmount,
          recoveredAmount,
          pendingAmount: totalOutstanding - recoveredAmount,
          recoveryRate: Math.round(recoveryRate * 100) / 100,
        },
        statistics: {
          totalVendorsWithCredit: vendorsWithCredit.length,
          overdueVendors: overdueVendors.length,
          completedPurchases: completedPurchases.length,
          averageRecoveryDays: Math.round(averageRecoveryDays * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// ANALYTICS & REPORTING CONTROLLERS
// ============================================================================

/**
 * @desc    Get analytics data
 * @route   GET /api/admin/analytics
 * @access  Private (Admin)
 */
exports.getAnalytics = async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Revenue trends
    const revenueTrends = await Order.aggregate([
      {
        $match: {
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Order trends
    const orderTrends = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          delivered: {
            $sum: {
              $cond: [
                { $in: ['$status', [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID]] },
                1,
                0,
              ],
            },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Top vendors by revenue
    const topVendors = await Order.aggregate([
      {
        $match: {
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: daysAgo },
          vendorId: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$vendorId',
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { revenue: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      {
        $unwind: '$vendor',
      },
      {
        $project: {
          vendorId: '$vendor._id',
          vendorName: '$vendor.name',
          vendorPhone: '$vendor.phone',
          revenue: 1,
          orderCount: 1,
        },
      },
    ]);

    // Top sellers by referrals/revenue
    const topSellers = await Order.aggregate([
      {
        $match: {
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: daysAgo },
          sellerId: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$sellerId',
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          revenue: 1,
          orderCount: 1,
          referralCount: { $size: '$uniqueUsers' },
        },
      },
      {
        $sort: { revenue: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Product performance
    const topProducts = await Order.aggregate([
      {
        $match: {
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $unwind: '$items',
      },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $project: {
          productId: '$product._id',
          productName: '$product.name',
          productSku: '$product.sku',
          category: '$product.category',
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: parseInt(period),
        analytics: {
          revenueTrends,
          orderTrends,
          topVendors,
          topSellers,
          topProducts,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate reports
 * @route   GET /api/admin/reports
 * @access  Private (Admin)
 */
exports.generateReports = async (req, res, next) => {
  try {
    const { type = 'summary', period = 'monthly', format = 'json' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    let periodLabel = '';

    switch (period) {
      case 'daily':
        startDate.setDate(now.getDate() - 1);
        periodLabel = 'Last 24 Hours';
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        periodLabel = 'Last 7 Days';
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        periodLabel = 'Last 30 Days';
        break;
      case 'yearly':
        startDate.setFullYear(now.getFullYear() - 1);
        periodLabel = 'Last Year';
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
        periodLabel = 'Last 30 Days';
    }

    // Generate report data based on type
    let reportData = {};

    if (type === 'summary' || type === 'full') {
      // Order summary
      const orderSummary = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]);

      // Revenue summary
      const revenueSummary = await Order.aggregate([
        {
          $match: {
            status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
            paymentStatus: PAYMENT_STATUS.FULLY_PAID,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
            averageOrderValue: { $avg: '$totalAmount' },
          },
        },
      ]);

      // User registration summary
      const userSummary = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      reportData = {
        period: periodLabel,
        startDate,
        endDate: now,
        orderSummary,
        revenueSummary: revenueSummary[0] || {},
        userSummary,
      };
    }

    // For now, return JSON format
    // TODO: Add CSV/PDF export functionality when needed
    if (format === 'csv' || format === 'pdf') {
      return res.status(501).json({
        success: false,
        message: 'CSV/PDF export functionality will be implemented later',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        report: reportData,
        generatedAt: new Date(),
        format,
        type,
        period,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// OPERATIONS & LOGISTICS CONTROLLERS
// ============================================================================

/**
 * @desc    Get logistics settings
 * @route   GET /api/admin/operations/logistics-settings
 * @access  Private (Admin)
 */
exports.getLogisticsSettings = async (req, res, next) => {
  try {
    const { DELIVERY_TIMELINE_HOURS } = require('../utils/constants');
    
    // Try to get from database, fallback to constants
    const logisticsSettings = await Settings.getSetting('LOGISTICS_SETTINGS', {
      defaultDeliveryTime: DELIVERY_TIMELINE_HOURS === 3 ? '3h' : DELIVERY_TIMELINE_HOURS === 4 ? '4h' : '1d',
      availableDeliveryOptions: ['3h', '4h', '1d'],
      enableExpressDelivery: true,
      enableStandardDelivery: true,
      enableNextDayDelivery: true,
      deliveryTimelineHours: DELIVERY_TIMELINE_HOURS,
    });

    res.status(200).json({
      success: true,
      data: logisticsSettings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update logistics settings
 * @route   PUT /api/admin/operations/logistics-settings
 * @access  Private (Admin)
 */
exports.updateLogisticsSettings = async (req, res, next) => {
  try {
    const { defaultDeliveryTime, availableDeliveryOptions, enableExpressDelivery, enableStandardDelivery, enableNextDayDelivery } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    // Validation
    if (defaultDeliveryTime && !['3h', '4h', '1d'].includes(defaultDeliveryTime)) {
      return res.status(400).json({
        success: false,
        message: 'Default delivery time must be one of: 3h, 4h, 1d',
      });
    }

    // Get current settings
    const { DELIVERY_TIMELINE_HOURS } = require('../utils/constants');
    const currentSettings = await Settings.getSetting('LOGISTICS_SETTINGS', {
      defaultDeliveryTime: DELIVERY_TIMELINE_HOURS === 3 ? '3h' : DELIVERY_TIMELINE_HOURS === 4 ? '4h' : '1d',
      availableDeliveryOptions: ['3h', '4h', '1d'],
      enableExpressDelivery: true,
      enableStandardDelivery: true,
      enableNextDayDelivery: true,
    });

    // Update only provided values
    const updatedSettings = {
      defaultDeliveryTime: defaultDeliveryTime !== undefined ? defaultDeliveryTime : currentSettings.defaultDeliveryTime,
      availableDeliveryOptions: availableDeliveryOptions !== undefined ? availableDeliveryOptions : currentSettings.availableDeliveryOptions,
      enableExpressDelivery: enableExpressDelivery !== undefined ? enableExpressDelivery : currentSettings.enableExpressDelivery,
      enableStandardDelivery: enableStandardDelivery !== undefined ? enableStandardDelivery : currentSettings.enableStandardDelivery,
      enableNextDayDelivery: enableNextDayDelivery !== undefined ? enableNextDayDelivery : currentSettings.enableNextDayDelivery,
    };

    // Save to database
    await Settings.setSetting(
      'LOGISTICS_SETTINGS',
      updatedSettings,
      'Logistics settings: Delivery times and options',
      adminId
    );

    res.status(200).json({
      success: true,
      message: 'Logistics settings updated successfully',
      data: updatedSettings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all platform notifications
 * @route   GET /api/admin/operations/notifications
 * @access  Private (Admin)
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, targetAudience, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    const query = {};
    if (targetAudience) query.targetAudience = targetAudience;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get notifications
    const notifications = await Notification.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create platform notification
 * @route   POST /api/admin/operations/notifications
 * @access  Private (Admin)
 */
exports.createNotification = async (req, res, next) => {
  try {
    const { title, message, targetAudience, priority, isActive, actionUrl, actionText, startDate, endDate } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Notification title is required',
      });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Notification message is required',
      });
    }

    // Create notification
    const notification = new Notification({
      title: title.trim(),
      message: message.trim(),
      targetAudience: targetAudience || 'all',
      priority: priority || 'normal',
      isActive: isActive !== undefined ? isActive : true,
      actionUrl,
      actionText,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      createdBy: adminId,
    });

    await notification.save();

    // Populate createdBy
    await notification.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: {
        notification,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(e => e.message).join(', '),
      });
    }
    next(error);
  }
};

/**
 * @desc    Update platform notification
 * @route   PUT /api/admin/operations/notifications/:notificationId
 * @access  Private (Admin)
 */
exports.updateNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const { title, message, targetAudience, priority, isActive, actionUrl, actionText, startDate, endDate } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Update fields
    if (title !== undefined) notification.title = title.trim();
    if (message !== undefined) notification.message = message.trim();
    if (targetAudience !== undefined) notification.targetAudience = targetAudience;
    if (priority !== undefined) notification.priority = priority;
    if (isActive !== undefined) notification.isActive = isActive;
    if (actionUrl !== undefined) notification.actionUrl = actionUrl;
    if (actionText !== undefined) notification.actionText = actionText;
    if (startDate !== undefined) notification.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) notification.endDate = endDate ? new Date(endDate) : null;
    notification.updatedBy = adminId;

    await notification.save();

    // Populate fields
    await notification.populate('createdBy', 'name email');
    await notification.populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Notification updated successfully',
      data: {
        notification,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(e => e.message).join(', '),
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete platform notification
 * @route   DELETE /api/admin/operations/notifications/:notificationId
 * @access  Private (Admin)
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// OFFERS MANAGEMENT
// ============================================================================

/**
 * @desc    Get all offers (for admin)
 * @route   GET /api/admin/offers
 * @access  Private (Admin)
 */
exports.getOffers = async (req, res, next) => {
  try {
    const { type, isActive } = req.query;
    
    const query = {};
    if (type) {
      query.type = type;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const offers = await Offer.find(query)
      .populate('productIds', 'name priceToUser images primaryImage')
      .populate('linkedProductIds', 'name priceToUser images primaryImage')
      .sort({ order: 1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: {
        offers,
        carouselCount: await Offer.countDocuments({ type: 'carousel', isActive: true }),
        maxCarousels: 6,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single offer
 * @route   GET /api/admin/offers/:id
 * @access  Private (Admin)
 */
exports.getOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const offer = await Offer.findById(id)
      .populate('productIds', 'name priceToUser images primaryImage')
      .populate('linkedProductIds', 'name priceToUser images primaryImage');
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: { offer },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create offer
 * @route   POST /api/admin/offers
 * @access  Private (Admin)
 */
exports.createOffer = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const { type, title, description, image, productIds, specialTag, specialValue, linkedProductIds, order } = req.body;
    
    // Validate required fields based on type
    if (!type || !['carousel', 'special_offer'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer type. Must be "carousel" or "special_offer"',
      });
    }
    
    if (type === 'carousel') {
      if (!image) {
        return res.status(400).json({
          success: false,
          message: 'Image is required for carousel offers',
        });
      }
      
      // Check carousel limit (max 6)
      const carouselCount = await Offer.countDocuments({ type: 'carousel', isActive: true });
      if (carouselCount >= 6) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 6 active carousels allowed. Please delete or deactivate an existing carousel first.',
        });
      }
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one product must be linked to carousel',
        });
      }
    }
    
    if (type === 'special_offer') {
      if (!specialTag || !specialValue) {
        return res.status(400).json({
          success: false,
          message: 'Special tag and special value are required for special offers',
        });
      }
    }
    
    // Validate product IDs if provided
    if (productIds && productIds.length > 0) {
      const validProducts = await Product.countDocuments({ _id: { $in: productIds } });
      if (validProducts !== productIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more product IDs are invalid',
        });
      }
    }
    
    if (linkedProductIds && linkedProductIds.length > 0) {
      const validLinkedProducts = await Product.countDocuments({ _id: { $in: linkedProductIds } });
      if (validLinkedProducts !== linkedProductIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more linked product IDs are invalid',
        });
      }
    }
    
    // Determine order for carousel
    let offerOrder = order;
    if (type === 'carousel' && offerOrder === undefined) {
      const maxOrder = await Offer.findOne({ type: 'carousel' })
        .sort({ order: -1 })
        .select('order');
      offerOrder = maxOrder ? maxOrder.order + 1 : 0;
    }
    
    const offer = new Offer({
      type,
      title,
      description,
      image: type === 'carousel' ? image : undefined,
      productIds: type === 'carousel' ? productIds : undefined,
      specialTag: type === 'special_offer' ? specialTag : undefined,
      specialValue: type === 'special_offer' ? specialValue : undefined,
      linkedProductIds: type === 'special_offer' ? (linkedProductIds || []) : undefined,
      order: type === 'carousel' ? offerOrder : undefined,
      createdBy: adminId,
      updatedBy: adminId,
    });
    
    await offer.save();
    
    const populatedOffer = await Offer.findById(offer._id)
      .populate('productIds', 'name priceToUser images primaryImage')
      .populate('linkedProductIds', 'name priceToUser images primaryImage');
    
    res.status(201).json({
      success: true,
      data: { offer: populatedOffer },
      message: 'Offer created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update offer
 * @route   PUT /api/admin/offers/:id
 * @access  Private (Admin)
 */
exports.updateOffer = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const { id } = req.params;
    const { title, description, image, productIds, specialTag, specialValue, linkedProductIds, isActive, order } = req.body;
    
    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }
    
    // Validate product IDs if provided
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      const validProducts = await Product.countDocuments({ _id: { $in: productIds } });
      if (validProducts !== productIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more product IDs are invalid',
        });
      }
    }
    
    if (linkedProductIds && Array.isArray(linkedProductIds) && linkedProductIds.length > 0) {
      const validLinkedProducts = await Product.countDocuments({ _id: { $in: linkedProductIds } });
      if (validLinkedProducts !== linkedProductIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more linked product IDs are invalid',
        });
      }
    }
    
    // Check carousel limit if activating a carousel
    if (offer.type === 'carousel' && isActive === true && !offer.isActive) {
      const carouselCount = await Offer.countDocuments({ type: 'carousel', isActive: true });
      if (carouselCount >= 6) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 6 active carousels allowed. Please delete or deactivate an existing carousel first.',
        });
      }
    }
    
    // Update fields
    if (title !== undefined) offer.title = title;
    if (description !== undefined) offer.description = description;
    if (offer.type === 'carousel' && image !== undefined) offer.image = image;
    if (offer.type === 'carousel' && productIds !== undefined) offer.productIds = productIds;
    if (offer.type === 'carousel' && order !== undefined) offer.order = order;
    if (offer.type === 'special_offer' && specialTag !== undefined) offer.specialTag = specialTag;
    if (offer.type === 'special_offer' && specialValue !== undefined) offer.specialValue = specialValue;
    if (offer.type === 'special_offer' && linkedProductIds !== undefined) offer.linkedProductIds = linkedProductIds;
    if (isActive !== undefined) offer.isActive = isActive;
    offer.updatedBy = adminId;
    
    await offer.save();
    
    const populatedOffer = await Offer.findById(offer._id)
      .populate('productIds', 'name priceToUser images primaryImage')
      .populate('linkedProductIds', 'name priceToUser images primaryImage');
    
    res.status(200).json({
      success: true,
      data: { offer: populatedOffer },
      message: 'Offer updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete offer
 * @route   DELETE /api/admin/offers/:id
 * @access  Private (Admin)
 */
exports.deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }
    
    await Offer.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Offer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all vendor credit repayments
 * @route   GET /api/admin/finance/repayments
 * @access  Private (Admin)
 */
exports.getRepayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, vendorId, startDate, endDate } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (vendorId) {
      query.vendorId = vendorId;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const toDate = new Date(endDate);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get repayments with vendor and bank account details
    const repayments = await CreditRepayment.find(query)
      .populate('vendorId', 'name phone location')
      .populate('bankAccountId', 'accountHolderName bankName accountNumber ifscCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-gatewayResponse -__v')
      .lean();

    const total = await CreditRepayment.countDocuments(query);

    // Calculate summary statistics
    const summary = await CreditRepayment.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalPenalty: { $sum: '$penaltyAmount' },
          totalPaid: { $sum: '$totalAmount' },
        },
      },
    ]);

    const allStatusSummary = await CreditRepayment.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: null,
          totalCompleted: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalPending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          totalFailed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          totalRepaid: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
          totalPenaltyPaid: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$penaltyAmount', 0] } },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        repayments,
        summary: allStatusSummary[0] || {
          totalCompleted: 0,
          totalPending: 0,
          totalFailed: 0,
          totalRepaid: 0,
          totalPenaltyPaid: 0,
        },
        statusBreakdown: summary,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get repayment details
 * @route   GET /api/admin/finance/repayments/:repaymentId
 * @access  Private (Admin)
 */
exports.getRepaymentDetails = async (req, res, next) => {
  try {
    const { repaymentId } = req.params;

    const repayment = await CreditRepayment.findById(repaymentId)
      .populate('vendorId', 'name phone email location creditLimit creditUsed creditPolicy')
      .populate('bankAccountId', 'accountHolderName bankName accountNumber ifscCode branchName')
      .populate('reviewedBy', 'name email')
      .select('-gatewayResponse -__v')
      .lean();

    if (!repayment) {
      return res.status(404).json({
        success: false,
        message: 'Repayment not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        repayment,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendor repayments
 * @route   GET /api/admin/finance/vendors/:vendorId/repayments
 * @access  Private (Admin)
 */
exports.getVendorRepayments = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const query = {
      vendorId: vendor._id,
    };

    if (status) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const repayments = await CreditRepayment.find(query)
      .populate('bankAccountId', 'accountHolderName bankName accountNumber ifscCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-gatewayResponse -__v')
      .lean();

    const total = await CreditRepayment.countDocuments(query);

    // Calculate vendor repayment summary
    const summary = await CreditRepayment.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          totalRepaid: { $sum: '$amount' },
          totalPenaltyPaid: { $sum: '$penaltyAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
          creditUsed: vendor.creditUsed,
          creditLimit: vendor.creditPolicy?.limit || 0,
        },
        repayments,
        summary: summary[0] || {
          totalRepaid: 0,
          totalPenaltyPaid: 0,
          count: 0,
        },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

