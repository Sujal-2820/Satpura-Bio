/**
 * User Controller
 * 
 * Handles all user-related operations
 */

const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Address = require('../models/Address');
const Vendor = require('../models/Vendor');
const Seller = require('../models/Seller');
const ProductAssignment = require('../models/ProductAssignment');
const Payment = require('../models/Payment');
const Commission = require('../models/Commission');

const { generateOTP, sendOTP } = require('../config/sms');
const { generateToken } = require('../middleware/auth');
const { OTP_EXPIRY_MINUTES, MIN_ORDER_VALUE, ADVANCE_PAYMENT_PERCENTAGE, REMAINING_PAYMENT_PERCENTAGE, DELIVERY_CHARGE, VENDOR_COVERAGE_RADIUS_KM, VENDOR_ASSIGNMENT_BUFFER_KM, VENDOR_ASSIGNMENT_MAX_RADIUS_KM, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS, IRA_PARTNER_COMMISSION_THRESHOLD, IRA_PARTNER_COMMISSION_RATE_LOW, IRA_PARTNER_COMMISSION_RATE_HIGH } = require('../utils/constants');
const { checkPhoneExists, checkPhoneInRole } = require('../utils/phoneValidation');
const { processOrderEarnings } = require('../services/earningsService');
const PaymentHistory = require('../models/PaymentHistory');
const razorpayService = require('../services/razorpayService');

/**
 * @desc    Request OTP for user
 * @route   POST /api/users/auth/request-otp
 * @access  Public
 */
exports.requestOTP = async (req, res, next) => {
  try {
    const { phone, language } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Check if phone exists in other roles (vendor, seller)
    const phoneCheck = await checkPhoneExists(phone, 'user');
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message,
      });
    }

    let user = await User.findOne({ phone });

    // If user doesn't exist, create pending registration
    // ⚠️ NOTE: Name is not required at OTP request stage - will be set during registration
    if (!user) {
      user = new User({
        phone,
        language: language || 'en',
        name: 'Pending Registration', // Temporary name, will be updated during registration
        isActive: false, // Will be activated after registration
      });
    }

    // Generate and send OTP
    const otpCode = user.generateOTP();
    
    // Save user to database
    try {
    await user.save();
      console.log(`✅ User ${user.phone} saved to database (OTP requested)`);
    } catch (saveError) {
      console.error('❌ Error saving user during OTP request:', saveError);
      // If it's a validation error, provide more details
      if (saveError.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error: ' + Object.values(saveError.errors).map(e => e.message).join(', '),
          errors: saveError.errors,
        });
      }
      // If it's a duplicate key error (phone already exists)
      if (saveError.code === 11000) {
        // Try to find the existing user
        user = await User.findOne({ phone });
        if (user) {
          // Regenerate OTP for existing user
          const otpCode = user.generateOTP();
          await user.save();
          console.log(`✅ OTP regenerated for existing user ${user.phone}`);
        } else {
          return res.status(500).json({
            success: false,
            message: 'Failed to create user. Please try again.',
          });
        }
      } else {
        throw saveError;
      }
    }

    // Log OTP to console for testing
    console.log('\n========================================');
    console.log('📱 USER OTP GENERATED');
    console.log('========================================');
    console.log(`Phone: ${phone}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log(`Expires At: ${new Date(user.otp.expiresAt).toLocaleString()}`);
    console.log('========================================\n');

    try {
      await sendOTP(phone, otpCode);
    } catch (error) {
      console.error('Failed to send OTP:', error);
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
 * @desc    Register user with OTP
 * @route   POST /api/users/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { fullName, phone, otp, sellerId, language, location } = req.body;

    if (!fullName || !phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and OTP are required',
      });
    }

    // Check if phone exists in other roles (vendor, seller)
    const phoneCheck = await checkPhoneExists(phone, 'user');
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message,
      });
    }

    // Validate location if provided
    if (location && (!location.coordinates || !location.coordinates.lat || !location.coordinates.lng)) {
      return res.status(400).json({
        success: false,
        message: 'Location with valid coordinates (lat, lng) is required',
      });
    }

    let user = await User.findOne({ phone });
    const isNewUser = !user;

    // If user doesn't exist, they must have requested OTP first
    // In requestOTP, a user is created with OTP, so user should exist here
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Please request OTP first before registering. User not found.',
      });
    }

    // Verify OTP first before proceeding
    // User should have OTP from requestOTP call
    const isOtpValid = user.verifyOTP(otp);

    if (!isOtpValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Now update user data after OTP verification
    if (isNewUser || user.name === 'Pending Registration') {
      // First-time registration - update all fields
      user.name = fullName;
      user.language = language || 'en';
      if (location) {
        user.location = location;
      }
    } else {
      // Existing user - only update name and language, NOT sellerId
      // sellerId is locked for lifetime once set
      user.name = fullName;
      if (language) user.language = language;
      if (location) {
        user.location = {
          ...user.location,
          ...location,
        };
      }
      
      // If sellerId is already set and user tries to provide a different one, reject
      if (sellerId && user.sellerId && user.sellerId !== sellerId.toUpperCase()) {
        return res.status(400).json({
          success: false,
          message: 'Seller ID can only be set during first-time registration. Your seller ID is already linked for lifetime and cannot be changed.',
        });
      }
    }

    // Validate and set sellerId
    // Rule: sellerId can only be set if:
    // 1. User is new (first-time registration), OR
    // 2. User exists but sellerId was never set before (one-time exception)
    if (sellerId) {
      // If user already has a sellerId, don't allow changing it
      if (!isNewUser && user.sellerId) {
        // SellerId already set, skip validation and don't update
        // (This handles the case where existing user logs in again with same sellerId)
      } else {
        // Validate sellerId exists
        const seller = await Seller.findOne({ sellerId: sellerId.toUpperCase(), status: 'approved', isActive: true });
        if (!seller) {
          return res.status(400).json({
            success: false,
            message: 'Invalid seller ID. Seller not found or inactive.',
          });
        }
        // Set sellerId - this will be linked for lifetime
        user.sellerId = sellerId.toUpperCase();
        user.seller = seller._id;
      }
    }

    // Set user as active
    user.isActive = true;
    user.isBlocked = false;

    // Clear OTP after successful verification
    user.clearOTP();
    
    // Save user to database (first save - before vendor assignment)
    try {
    await user.save();
      console.log(`✅ User registered/updated successfully: ${user.phone} (${user.name})`);
      console.log(`📝 User ID: ${user._id}`);
      console.log(`📍 Location: ${JSON.stringify(user.location)}`);
      console.log(`🔗 Seller ID: ${user.sellerId || 'None'}`);
    } catch (saveError) {
      console.error('❌ Error saving user during registration:', saveError);
      // If it's a validation error, provide more details
      if (saveError.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error: ' + Object.values(saveError.errors).map(e => e.message).join(', '),
          errors: saveError.errors,
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to save user data. Please try again.',
        error: process.env.NODE_ENV === 'development' ? saveError.message : undefined,
      });
    }

    // Assign vendor based on location using STRICT coordinates-only matching (20km + 300m buffer)
    // Coordinates are mandatory for vendor assignment
    let assignedVendor = null;
    if (user.location && user.location.coordinates && user.location.coordinates.lat && user.location.coordinates.lng) {
      try {
        const { vendor, distance, method } = await findVendorByLocation(user.location);
        
        if (vendor) {
          assignedVendor = vendor._id;
          user.assignedVendor = vendor._id;
          await user.save();
          const distanceText = distance ? `${distance.toFixed(2)} km away` : 'unknown distance';
          console.log(`📍 Vendor assigned to user ${user.phone}: ${vendor.name} (${distanceText}, method: ${method})`);
        } else {
          console.log(`⚠️ No vendor found within ${VENDOR_ASSIGNMENT_MAX_RADIUS_KM}km for user ${user.phone}. Orders will be handled by admin.`);
        }
      } catch (geoError) {
        console.warn('Vendor assignment failed during registration:', geoError);
        // Don't fail registration if vendor assignment fails - user can still register
      }
    } else {
      console.log(`⚠️ User ${user.phone} registered without coordinates. Vendor assignment skipped. Orders will be handled by admin.`);
    }

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      role: 'user',
      phone: user.phone,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          sellerId: user.sellerId,
          email: user.email,
          location: user.location,
          assignedVendor: assignedVendor ? assignedVendor.toString() : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login with OTP
 * @route   POST /api/users/auth/login
 * @access  Public
 */
exports.loginWithOtp = async (req, res, next) => {
  try {
    const { phone, otp, sellerId } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required',
      });
    }

    // Check if phone exists in other roles first
    const phoneCheck = await checkPhoneExists(phone, 'user');
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message,
      });
    }

    // Check if phone exists in user role
    const userCheck = await checkPhoneInRole(phone, 'user');
    const user = userCheck.data;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.',
        requiresRegistration: true, // Flag for frontend to redirect
      });
    }

    // Check if user is blocked
    if (user.isBlocked || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked or deactivated. Please contact support.',
      });
    }

    // Verify OTP
    const isOtpValid = user.verifyOTP(otp);

    if (!isOtpValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Update sellerId if provided
    // Rule: sellerId can only be set if not already set (lifetime lock)
    if (sellerId) {
      // Check if sellerId is already set and different
      if (user.sellerId && user.sellerId !== sellerId.toUpperCase()) {
        return res.status(400).json({
          success: false,
          message: 'Seller ID cannot be changed. Your seller ID is already linked for lifetime and cannot be changed.',
        });
      }
      
      // Only set if not already set
      if (!user.sellerId) {
        const seller = await Seller.findOne({ sellerId: sellerId.toUpperCase(), status: 'approved', isActive: true });
        if (!seller) {
          return res.status(400).json({
            success: false,
            message: 'Invalid seller ID. Seller not found or inactive.',
          });
        }
        user.sellerId = sellerId.toUpperCase();
        user.seller = seller._id;
        await user.save();
      }
    }

    // Clear OTP after successful verification
    user.clearOTP();
    await user.save();

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      role: 'user',
      phone: user.phone,
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          sellerId: user.sellerId,
          location: user.location,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP (legacy - use loginWithOtp)
 * @route   POST /api/users/auth/verify-otp
 * @access  Public
 */
exports.verifyOTP = async (req, res, next) => {
  return exports.loginWithOtp(req, res, next);
};

/**
 * @desc    User logout
 * @route   POST /api/users/auth/logout
 * @access  Private (User)
 */
exports.logout = async (req, res, next) => {
  try {
    // TODO: Implement token blacklisting
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private (User)
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = req.userDetails || await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Populate seller if linked
    await user.populate('seller', 'sellerId name phone area');

    // Check vendor availability if user has coordinates
    let vendorAvailability = {
      vendorAvailable: false,
      canPlaceOrder: false,
      isInBufferZone: false,
      assignedVendor: null,
      distance: null,
    };

    if (user.location && user.location.coordinates && user.location.coordinates.lat && user.location.coordinates.lng) {
      try {
        const { vendor, distance, method } = await findVendorByLocation(user.location);
        
        if (vendor) {
          vendorAvailability = {
            vendorAvailable: true,
            canPlaceOrder: true,
            isInBufferZone: method === 'coordinates_buffer', // Within 20km to 20.3km buffer
            assignedVendor: {
              id: vendor._id,
              name: vendor.name,
            },
            distance: distance ? parseFloat(distance.toFixed(2)) : null,
          };
        } else {
          // No vendor found - user cannot place orders
          vendorAvailability = {
            vendorAvailable: false,
            canPlaceOrder: false,
            isInBufferZone: false,
            assignedVendor: null,
            distance: distance ? parseFloat(distance.toFixed(2)) : null,
          };
        }
      } catch (error) {
        console.error('Error checking vendor availability in getProfile:', error);
        // Keep default values (vendorAvailable: false)
      }
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          sellerId: user.sellerId,
          seller: user.seller ? {
            sellerId: user.seller.sellerId,
            name: user.seller.name,
            phone: user.seller.phone,
            area: user.seller.area,
          } : null,
          location: user.location,
          language: user.language,
          createdAt: user.createdAt,
        },
        vendorAvailability: vendorAvailability,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private (User)
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name, email, location } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (location) {
      user.location = {
        ...user.location,
        ...location,
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          location: user.location,
        },
        message: 'Profile updated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Seller ID (IRA Partner ID) - Read-only after registration
 * @route   GET /api/users/profile/seller-id
 * @access  Private (User)
 * @note    Seller ID can only be set during first-time registration and is locked for lifetime.
 *          This endpoint only returns the current seller ID (if any).
 */
exports.getSellerID = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).populate('seller', 'sellerId name phone area');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sellerId: user.sellerId || null,
        seller: user.seller ? {
          sellerId: user.seller.sellerId,
          name: user.seller.name,
          phone: user.seller.phone,
          area: user.seller.area,
        } : null,
        message: user.sellerId 
          ? 'Seller ID is linked for lifetime. Cannot be changed.'
          : 'No seller ID linked. Seller ID can only be set during first-time registration.',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// PRODUCT & CATALOG CONTROLLERS
// ============================================================================

/**
 * @desc    Get product categories
 * @route   GET /api/users/products/categories
 * @access  Public
 */
exports.getCategories = async (req, res, next) => {
  try {
    const { getCategoryNames, getAllCategories } = require('../utils/fertilizerCategories');
    
    // Get all fertilizer categories
    const allCategories = getAllCategories();
    
    // Get product counts for each category
    const categoryCounts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    
    // Create a map of category counts
    const countMap = {};
    categoryCounts.forEach(item => {
      countMap[item._id] = item.count;
    });
    
    // Merge category info with counts
    const categoriesWithCounts = allCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      count: countMap[cat.id] || 0,
    }));
    
    res.status(200).json({
      success: true,
      data: {
        categories: categoriesWithCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get products with filtering
 * @route   GET /api/users/products
 * @access  Public
 */
exports.getProducts = async (req, res, next) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      sort = '-createdAt', // Default: newest first
      page = 1,
      limit = 20,
    } = req.query;

    // Build query - only show active products
    const query = { isActive: true };

    // Filter by category
    if (category) {
      // Normalize category to lowercase for matching
      // Categories are stored as lowercase in database (e.g., 'npk', 'organic', 'nitrogen')
      const categoryLower = category.toLowerCase().trim();
      query.category = categoryLower;
      
      // Log for debugging (remove in production)
      console.log(`[getProducts] Filtering by category: "${categoryLower}"`);
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Price range
    if (minPrice || maxPrice) {
      query.priceToUser = {};
      if (minPrice) query.priceToUser.$gte = parseFloat(minPrice);
      if (maxPrice) query.priceToUser.$lte = parseFloat(maxPrice);
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    let sortObj = {};
    if (sort === 'price-asc') sortObj = { priceToUser: 1 };
    else if (sort === 'price-desc') sortObj = { priceToUser: -1 };
    else if (sort === 'name-asc') sortObj = { name: 1 };
    else if (sort === 'name-desc') sortObj = { name: -1 };
    else sortObj = { createdAt: -1 }; // Default: newest first

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(query)
        .select('name description category priceToUser stock images sku tags')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Log for debugging category filtering (remove in production)
    if (category) {
      console.log(`[getProducts] Found ${products.length} products for category "${category.toLowerCase()}" (total: ${total})`);
      if (products.length === 0 && total === 0) {
        // Check if any products exist with similar category names
        const allCategories = await Product.distinct('category', { isActive: true });
        console.log(`[getProducts] Available categories in database:`, allCategories);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get product details
 * @route   GET /api/users/products/:productId
 * @access  Public
 */
exports.getProductDetails = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (!product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product is not available',
      });
    }

    // Convert attributeStocks Map to plain objects for JSON response
    let attributeStocksArray = [];
    if (product.attributeStocks && Array.isArray(product.attributeStocks) && product.attributeStocks.length > 0) {
      attributeStocksArray = product.attributeStocks.map(stock => {
        // Convert attributes Map to plain object
        const attributesObj = {};
        if (stock.attributes instanceof Map) {
          stock.attributes.forEach((value, key) => {
            attributesObj[key] = value;
          });
        } else if (typeof stock.attributes === 'object') {
          Object.assign(attributesObj, stock.attributes);
        }
        
        return {
          attributes: attributesObj,
          actualStock: stock.actualStock,
          displayStock: stock.displayStock,
          stockUnit: stock.stockUnit,
          vendorPrice: stock.vendorPrice,
          userPrice: stock.userPrice,
          batchNumber: stock.batchNumber,
          expiry: stock.expiry,
        };
      });
    }

    res.status(200).json({
      success: true,
      data: {
        product: {
          id: product._id,
          name: product.name,
          description: product.description,
          category: product.category,
          priceToUser: product.priceToUser,
          priceToVendor: product.priceToVendor,
          actualStock: product.actualStock,
          displayStock: product.displayStock,
          stock: product.stock,
          stockUnit: product.weight?.unit || 'kg',
          images: product.images,
          sku: product.sku,
          tags: product.tags,
          specifications: product.specifications,
          brand: product.brand,
          weight: product.weight,
          primaryImage: product.primaryImage,
          isInStock: product.isInStock(),
          attributeStocks: attributeStocksArray.length > 0 ? attributeStocksArray : undefined,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get popular products (based on order count)
 * @route   GET /api/users/products/popular
 * @access  Public
 */
exports.getPopularProducts = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    // Get products ordered most frequently
    let popularProductIds = [];
    try {
      popularProductIds = await Order.aggregate([
        { $match: { status: { $ne: ORDER_STATUS.CANCELLED } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', orderCount: { $sum: 1 } } },
        { $sort: { orderCount: -1 } },
        { $limit: parseInt(limit) },
        { $project: { _id: 1 } },
      ]);
    } catch (error) {
      // If no orders exist or aggregation fails, return empty or top products by stock
      console.warn('Popular products aggregation failed:', error.message);
    }

    const productIds = popularProductIds.map(p => p._id);

    let products = [];
    if (productIds.length > 0) {
      // Get product details
      products = await Product.find({
        _id: { $in: productIds },
        isActive: true,
      })
        .select('name description category priceToUser stock images sku')
        .lean();

      // Sort by order count
      products = productIds
        .map(id => products.find(p => p._id.toString() === id.toString()))
        .filter(Boolean);
    } else {
      // Fallback: Get top products by stock if no orders
      products = await Product.find({ isActive: true })
        .select('name description category priceToUser stock images sku')
        .sort({ stock: -1 })
        .limit(parseInt(limit))
        .lean();
    }

    res.status(200).json({
      success: true,
      data: {
        products: products || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search products
 * @route   GET /api/users/products/search
 * @access  Public
 */
exports.searchProducts = async (req, res, next) => {
  try {
    const { q, category, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    // Use regex search instead of $text (works without text index)
    const searchRegex = new RegExp(q, 'i');
    const query = {
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { tags: searchRegex },
      ],
    };

    if (category) {
      query.category = category.toLowerCase();
    }

    const products = await Product.find(query)
      .select('name description category priceToUser stock images sku')
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: {
        products,
        query: q,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get offers/banners
 * @route   GET /api/users/offers
 * @access  Public
 */
exports.getOffers = async (req, res, next) => {
  try {
    // TODO: Implement offers/banners system
    // For now, return empty array
    // In future, this can be managed by Admin and stored in database
    
    res.status(200).json({
      success: true,
      data: {
        offers: [],
        message: 'No active offers at the moment',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// CART CONTROLLERS
// ============================================================================

/**
 * @desc    Get user cart
 * @route   GET /api/users/cart
 * @access  Private (User)
 */
exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    let cart = await Cart.findOne({ userId }).populate('items.productId', 'name description category priceToUser images sku stock');

    // Create cart if doesn't exist
    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    res.status(200).json({
      success: true,
      data: {
        cart: {
          id: cart._id,
          items: cart.items.map(item => ({
            id: item._id,
            product: {
              id: item.productId._id,
              name: item.productId.name,
              description: item.productId.description,
              category: item.productId.category,
              priceToUser: item.productId.priceToUser,
              images: item.productId.images,
              sku: item.productId.sku,
              stock: item.productId.stock,
            },
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            addedAt: item.addedAt,
          })),
          subtotal: cart.subtotal,
          meetsMinimumOrder: cart.meetsMinimumOrder,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add item to cart
 * @route   POST /api/users/cart
 * @access  Private (User)
 */
exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    // Validate product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unavailable',
      });
    }

    // Check stock
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stock}`,
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Add item to cart
    cart.addItem(productId, quantity, product.priceToUser);
    await cart.save();

    // Populate product details
    await cart.populate('items.productId', 'name description category priceToUser images sku stock');

    res.status(200).json({
      success: true,
      data: {
        cart: {
          id: cart._id,
          items: cart.items.map(item => ({
            id: item._id,
            product: {
              id: item.productId._id,
              name: item.productId.name,
              priceToUser: item.productId.priceToUser,
              images: item.productId.images,
            },
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
          subtotal: cart.subtotal,
          meetsMinimumOrder: cart.meetsMinimumOrder,
        },
        message: 'Item added to cart',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/users/cart/:itemId
 * @access  Private (User)
 */
exports.updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1',
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    // Find item in cart
    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    // Check product stock
    const product = await Product.findById(item.productId);
    if (!product || product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stock}`,
      });
    }

    // Update quantity
    cart.updateItemQuantity(item.productId, quantity);
    await cart.save();

    await cart.populate('items.productId', 'name description category priceToUser images sku stock');

    res.status(200).json({
      success: true,
      data: {
        cart: {
          id: cart._id,
          items: cart.items.map(item => ({
            id: item._id,
            product: {
              id: item.productId._id,
              name: item.productId.name,
              priceToUser: item.productId.priceToUser,
            },
            quantity: item.quantity,
            totalPrice: item.totalPrice,
          })),
          subtotal: cart.subtotal,
          meetsMinimumOrder: cart.meetsMinimumOrder,
        },
        message: 'Cart item updated',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/users/cart/:itemId
 * @access  Private (User)
 */
exports.removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    // Find item
    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    // Remove item
    cart.removeItem(item.productId);
    await cart.save();

    res.status(200).json({
      success: true,
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          subtotal: cart.subtotal,
          meetsMinimumOrder: cart.meetsMinimumOrder,
        },
        message: 'Item removed from cart',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear cart
 * @route   DELETE /api/users/cart
 * @access  Private (User)
 */
exports.clearCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    cart.clear();
    await cart.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Cart cleared',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate cart (check minimum order value)
 * @route   POST /api/users/cart/validate
 * @access  Private (User)
 */
exports.validateCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { paymentPreference = 'full' } = req.body; // Get payment preference from request

    const cart = await Cart.findOne({ userId });
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        data: {
          valid: false,
          message: 'Cart is empty',
        },
      });
    }

    // Use cart's validation method with payment preference
    // If paymentPreference is 'partial', minimum order check is skipped
    const validation = cart.validateForCheckout(paymentPreference);

    if (!validation.valid) {
      return res.status(200).json({
        success: true,
        data: {
          valid: false,
          total: cart.subtotal,
          meetsMinimum: cart.meetsMinimumOrder,
          shortfall: Math.max(0, MIN_ORDER_VALUE - cart.subtotal),
          message: validation.message,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        total: cart.subtotal,
        meetsMinimum: cart.meetsMinimumOrder,
        shortfall: 0,
        message: validation.message,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// VENDOR ASSIGNMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get assigned vendor based on location (20km radius)
 * @route   POST /api/users/vendors/assign
 * @access  Private (User)
 */
exports.getAssignedVendor = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { location } = req.body;

    // STRICT REQUIREMENT: Coordinates are mandatory
    if (!location || !location.coordinates || !location.coordinates.lat || !location.coordinates.lng) {
      return res.status(400).json({
        success: false,
        message: 'Location with coordinates (lat, lng) is required for vendor assignment',
      });
    }

    // Find vendor using STRICT coordinates-only matching (20km + 300m buffer)
    const { vendor, distance, method } = await findVendorByLocation(location);

    // Determine vendor availability status
    let vendorAvailable = false;
    let isInBufferZone = false;
    let canPlaceOrder = false;
    
    if (vendor) {
      vendorAvailable = true;
      isInBufferZone = method === 'coordinates_buffer'; // Within 20km to 20.3km
      canPlaceOrder = true; // Can place order if vendor found (even in buffer zone)
    } else {
      vendorAvailable = false;
      canPlaceOrder = false; // Cannot place order if no vendor found
    }

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: `No vendor found within ${VENDOR_ASSIGNMENT_MAX_RADIUS_KM}km of your location.`,
        data: {
          vendor: null,
          assignedTo: 'admin',
          method: method,
          nearestDistance: distance || null,
          vendorAvailable: false,
          canPlaceOrder: false,
          isInBufferZone: false,
        },
      });
    }

    // Update user's assigned vendor
    const user = await User.findById(userId);
    if (user) {
      user.assignedVendor = vendor._id;
      user.location = {
        ...user.location,
        ...location,
      };
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
          location: vendor.location,
        },
        distance: distance ? distance.toFixed(2) : null, // in km
        method: method,
        vendorAvailable: true,
        canPlaceOrder: true,
        isInBufferZone: isInBufferZone,
        assignedTo: 'vendor',
        method: method, // 'coordinates' or 'city'
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check vendor stock availability
 * @route   POST /api/users/vendors/check-stock
 * @access  Private (User)
 */
exports.checkVendorStock = async (req, res, next) => {
  try {
    const { vendorId, productIds } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required',
      });
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required',
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.status !== 'approved' || !vendor.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found or inactive',
      });
    }

    // Check product assignments and stock
    const assignments = await ProductAssignment.find({
      vendorId,
      productId: { $in: productIds },
      isActive: true,
    }).populate('productId', 'name priceToUser stock');

    const stockStatus = productIds.map(productId => {
      const assignment = assignments.find(a => a.productId._id.toString() === productId.toString());
      const product = assignment ? assignment.productId : null;

      return {
        productId,
        productName: product ? product.name : null,
        available: product ? product.stock > 0 : false,
        stock: product ? product.stock : 0,
        assigned: !!assignment,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        vendorId,
        stockStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Find vendor by location using STRICT coordinates-only matching
 * Uses 20km radius with +300m buffer (20.3km total) for order assignment
 * @param {Object} location - { coordinates: { lat, lng }, address, city, state, pincode }
 * @returns {Promise<Object>} - { vendor: Vendor|null, distance: number|null, method: string }
 */
async function findVendorByLocation(location) {
  try {
    // STRICT REQUIREMENT: Coordinates are mandatory
    if (!location?.coordinates?.lat || !location?.coordinates?.lng) {
      console.log(`⚠️ No coordinates provided for location. Coordinates are required for vendor assignment.`);
      return { vendor: null, distance: null, method: 'no_coordinates' };
    }

    const { lat, lng } = location.coordinates;

    // Get all active approved vendors with coordinates
    const vendorsWithCoords = await Vendor.find({
      status: 'approved',
      isActive: true,
      'banInfo.isBanned': false,
      'location.coordinates.lat': { $exists: true, $ne: null },
      'location.coordinates.lng': { $exists: true, $ne: null },
    });

    if (vendorsWithCoords.length === 0) {
      console.log(`⚠️ No active vendors with coordinates found in database`);
      return { vendor: null, distance: null, method: 'no_vendors' };
    }

    // Calculate distance to all vendors and find nearest within 20.3km (20km + 300m buffer)
    let nearestVendor = null;
    let minDistance = VENDOR_ASSIGNMENT_MAX_RADIUS_KM; // 20.3km (20km + 300m buffer)

    for (const v of vendorsWithCoords) {
      const distance = calculateDistance(
        lat,
        lng,
        v.location.coordinates.lat,
        v.location.coordinates.lng
      );

      // Find the nearest vendor within the extended radius (20.3km)
      if (distance < minDistance) {
        minDistance = distance;
        nearestVendor = v;
      }
    }

    if (nearestVendor) {
      const isWithinStrictRadius = minDistance <= VENDOR_COVERAGE_RADIUS_KM; // Within 20km
      const isWithinBuffer = minDistance <= VENDOR_ASSIGNMENT_MAX_RADIUS_KM; // Within 20.3km

      if (isWithinStrictRadius) {
        console.log(`✅ Vendor found by coordinates (within ${VENDOR_COVERAGE_RADIUS_KM}km): ${nearestVendor.name} (${minDistance.toFixed(2)} km away)`);
        return { vendor: nearestVendor, distance: minDistance, method: 'coordinates' };
      } else if (isWithinBuffer) {
        // User is within 300m buffer (20km to 20.3km) - auto-assign nearest vendor
        console.log(`✅ Vendor found by coordinates (within ${VENDOR_ASSIGNMENT_MAX_RADIUS_KM}km buffer): ${nearestVendor.name} (${minDistance.toFixed(2)} km away)`);
        console.log(`   📍 User is ${(minDistance - VENDOR_COVERAGE_RADIUS_KM).toFixed(2)}km beyond ${VENDOR_COVERAGE_RADIUS_KM}km radius, but within ${VENDOR_ASSIGNMENT_BUFFER_KM}km buffer - auto-assigning`);
        return { vendor: nearestVendor, distance: minDistance, method: 'coordinates_buffer' };
      }
    }

    // No vendor found within 20.3km
    console.log(`⚠️ No vendor found within ${VENDOR_ASSIGNMENT_MAX_RADIUS_KM}km radius`);
    if (nearestVendor) {
      console.log(`   Nearest vendor: ${nearestVendor.name} is ${minDistance.toFixed(2)}km away (beyond ${VENDOR_ASSIGNMENT_MAX_RADIUS_KM}km limit)`);
    }
    return { vendor: null, distance: minDistance < Infinity ? minDistance : null, method: 'out_of_range' };
  } catch (error) {
    console.error('❌ Error in findVendorByLocation:', error);
    return { vendor: null, distance: null, method: 'error' };
  }
}

// ============================================================================
// CHECKOUT & ORDER CONTROLLERS
// ============================================================================

/**
 * @desc    Create order from cart
 * @route   POST /api/users/orders
 * @access  Private (User)
 */
exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      paymentPreference = 'partial', // 'partial' or 'full'
      notes,
    } = req.body;

    // Validate cart
    const cart = await Cart.findOne({ userId }).populate('items.productId', 'name priceToUser isActive stock');
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    // Get delivery address from user's location
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // STRICT REQUIREMENT: Coordinates are mandatory for vendor assignment
    if (!user.location || !user.location.coordinates || !user.location.coordinates.lat || !user.location.coordinates.lng) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address with coordinates is required. Please update your delivery address with location coordinates in settings.',
      });
    }

    const deliveryAddress = {
      name: user.name || 'Home',
      address: user.location.address || '',
      city: user.location.city || '',
      state: user.location.state || '',
      pincode: user.location.pincode || '',
      phone: user.phone || '',
      coordinates: {
        lat: user.location.coordinates.lat,
        lng: user.location.coordinates.lng,
      },
    };

    // Assign vendor based on STRICT coordinates-only matching (20km + 300m buffer)
    let vendorId = null;
    let assignedTo = 'admin';
    
    console.log(`🔍 Attempting vendor assignment for order. Delivery address:`, {
      city: deliveryAddress?.city,
      state: deliveryAddress?.state,
      coordinates: deliveryAddress?.coordinates
    });
    
    try {
      const { vendor, distance, method } = await findVendorByLocation(deliveryAddress);
      
      if (vendor) {
        vendorId = vendor._id;
        assignedTo = 'vendor';
        const distanceText = distance ? `${distance.toFixed(2)} km` : 'unknown distance';
        console.log(`✅ Order assigned to vendor: ${vendor.name} (ID: ${vendor._id}, ${distanceText}, method: ${method})`);
        console.log(`📍 Vendor location: ${vendor.location?.city || 'N/A'}, ${vendor.location?.state || 'N/A'}`);
        } else {
          console.log(`⚠️ No vendor found within ${VENDOR_ASSIGNMENT_MAX_RADIUS_KM}km for delivery address. Order cannot be placed.`);
          // BLOCK order creation if no vendor found (beyond 20.3km)
          return res.status(400).json({
            success: false,
            message: `No vendor available within ${VENDOR_ASSIGNMENT_MAX_RADIUS_KM}km of your location. You cannot place orders at this location.`,
            data: {
              vendorAvailable: false,
              canPlaceOrder: false,
              nearestDistance: distance || null,
            },
          });
        }
    } catch (geoError) {
      console.warn('❌ Vendor assignment failed:', geoError);
      // BLOCK order creation if vendor assignment fails
      return res.status(400).json({
        success: false,
        message: `Failed to assign vendor. You cannot place orders at this location.`,
        data: {
          vendorAvailable: false,
          canPlaceOrder: false,
        },
      });
    }
    
    console.log(`📦 Order will be created with vendorId: ${vendorId || 'null'}, assignedTo: ${assignedTo}`);

    // Get user info for sellerId (user already fetched above)
    const userWithSeller = await User.findById(userId).populate('seller');
    const sellerId = userWithSeller?.sellerId || null;
    const seller = userWithSeller?.seller?._id || null;

    // Validate products exist and are active, and prepare order items with correct prices
    // Orders are always created and assigned to vendor, vendor can then escalate if needed
    const orderItems = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.productId._id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId.name || 'Unknown'} not found`,
        });
      }
      
      // Check if product is active
      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is no longer available`,
        });
      }
      
      // Use the fetched product's priceToUser to ensure accuracy
      const unitPrice = product.priceToUser;
      const quantity = item.quantity;
      const totalPrice = quantity * unitPrice; // Recalculate to ensure accuracy
      
      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        status: 'pending', // Item status for partial acceptance
      });
      
      // Note: Stock validation is removed - orders are always created
      // Vendor will receive the order and can escalate if stock is insufficient
    }

    // Calculate pricing - recalculate subtotal from order items to ensure accuracy
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryCharge = paymentPreference === 'full' ? 0 : DELIVERY_CHARGE;
    const totalAmount = subtotal + deliveryCharge;
    
    // Validate cart minimum order value using calculated totalAmount
    // Skip minimum order check if paymentPreference is 'partial' (30% advance)
    if (paymentPreference === 'full' && totalAmount < MIN_ORDER_VALUE) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value is ₹${MIN_ORDER_VALUE}. Current total: ₹${totalAmount.toFixed(2)}`,
        data: {
          total: totalAmount,
          shortfall: Math.max(0, MIN_ORDER_VALUE - totalAmount),
        },
      });
    }
    
    const upfrontAmount = paymentPreference === 'full' ? totalAmount : Math.round(totalAmount * (ADVANCE_PAYMENT_PERCENTAGE / 100));
    const remainingAmount = paymentPreference === 'full' ? 0 : totalAmount - upfrontAmount;

    // Generate order number before creating order
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const todayStart = new Date(date);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(date);
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayCount = await Order.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    const sequence = String(todayCount + 1).padStart(4, '0');
    const orderNumber = `ORD-${dateStr}-${sequence}`;

    // Create order
    const order = new Order({
      orderNumber, // Explicitly set orderNumber
      userId,
      sellerId,
      seller,
      vendorId,
      assignedTo,
      items: orderItems,
      subtotal,
      deliveryCharge,
      deliveryChargeWaived: paymentPreference === 'full',
      totalAmount,
      paymentPreference,
      upfrontAmount,
      remainingAmount,
      paymentStatus: PAYMENT_STATUS.PENDING,
      deliveryAddress,
      status: ORDER_STATUS.AWAITING,
      notes,
    });

    await order.save();
    
    // Debug: Log order creation with vendor assignment
    console.log(`✅ Order created: ${order.orderNumber}`);
    console.log(`   - vendorId: ${order.vendorId || 'null'}`);
    console.log(`   - assignedTo: ${order.assignedTo}`);
    console.log(`   - deliveryAddress.city: ${order.deliveryAddress?.city || 'N/A'}`);

    // Clear cart after order creation
    cart.clear();
    await cart.save();

    res.status(201).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          items: order.items,
          subtotal: order.subtotal,
          deliveryCharge: order.deliveryCharge,
          totalAmount: order.totalAmount,
          paymentPreference: order.paymentPreference,
          upfrontAmount: order.upfrontAmount,
          remainingAmount: order.remainingAmount,
          paymentStatus: order.paymentStatus,
          status: order.status,
          vendorId: order.vendorId,
          assignedTo: order.assignedTo,
          deliveryAddress: order.deliveryAddress,
          expectedDeliveryDate: order.expectedDeliveryDate,
        },
        message: 'Order created successfully. Please proceed with payment.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user orders
 * @route   GET /api/users/orders
 * @access  Private (User)
 */
exports.getOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    const query = { userId };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('vendorId', 'name phone location')
        .populate('seller', 'sellerId name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders: orders.map(order => {
          // If order is in grace period, show status as 'awaiting' to user (not accepted yet)
          const displayStatus = order.acceptanceGracePeriod?.isActive ? ORDER_STATUS.AWAITING : order.status;
          
          return {
            id: order._id,
            orderNumber: order.orderNumber,
            items: order.items,
            subtotal: order.subtotal,
            deliveryCharge: order.deliveryCharge,
            totalAmount: order.totalAmount,
            paymentPreference: order.paymentPreference,
            upfrontAmount: order.upfrontAmount,
            remainingAmount: order.remainingAmount,
            paymentStatus: order.paymentStatus,
            status: displayStatus,
            vendor: order.vendorId ? {
              id: order.vendorId._id,
              name: order.vendorId.name,
              phone: order.vendorId.phone,
            } : null,
            assignedTo: order.assignedTo,
            deliveryAddress: order.deliveryAddress,
            expectedDeliveryDate: order.expectedDeliveryDate,
            deliveredAt: order.deliveredAt,
            createdAt: order.createdAt,
          };
        }),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order details
 * @route   GET /api/users/orders/:orderId
 * @access  Private (User)
 */
exports.getOrderDetails = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, userId })
      .populate('items.productId', 'name description category priceToUser images sku')
      .populate('vendorId', 'name phone location')
      .populate('seller', 'sellerId name phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Get payments for this order
    const payments = await Payment.find({ orderId: order._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          items: order.items.map(item => ({
            product: item.productId ? {
              id: item.productId._id,
              name: item.productId.name,
              description: item.productId.description,
              category: item.productId.category,
              priceToUser: item.productId.priceToUser,
              images: item.productId.images,
              sku: item.productId.sku,
            } : {
              name: item.productName, // Fallback if product deleted
            },
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            status: item.status,
          })),
          subtotal: order.subtotal,
          deliveryCharge: order.deliveryCharge,
          totalAmount: order.totalAmount,
          paymentPreference: order.paymentPreference,
          upfrontAmount: order.upfrontAmount,
          remainingAmount: order.remainingAmount,
          paymentStatus: order.paymentStatus,
          status: order.status,
          statusTimeline: order.statusTimeline,
          vendor: order.vendorId ? {
            id: order.vendorId._id,
            name: order.vendorId.name,
            phone: order.vendorId.phone,
            location: order.vendorId.location,
          } : null,
          seller: order.seller ? {
            sellerId: order.seller.sellerId,
            name: order.seller.name,
            phone: order.seller.phone,
          } : null,
          assignedTo: order.assignedTo,
          deliveryAddress: order.deliveryAddress,
          expectedDeliveryDate: order.expectedDeliveryDate,
          deliveredAt: order.deliveredAt,
          payments: payments.map(p => ({
            id: p._id,
            paymentId: p.paymentId,
            paymentType: p.paymentType,
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            status: p.status,
            paidAt: p.paidAt,
            createdAt: p.createdAt,
          })),
          createdAt: order.createdAt,
          notes: order.notes,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track order
 * @route   GET /api/users/orders/:orderId/track
 * @access  Private (User)
 */
exports.trackOrder = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, userId })
      .populate('vendorId', 'name phone location')
      .select('orderNumber status statusTimeline expectedDeliveryDate deliveredAt assignedTo');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        order: {
          orderNumber: order.orderNumber,
          status: order.status,
          statusTimeline: order.statusTimeline,
          expectedDeliveryDate: order.expectedDeliveryDate,
          deliveredAt: order.deliveredAt,
          assignedTo: order.assignedTo,
          vendor: order.vendorId ? {
            name: order.vendorId.name,
            phone: order.vendorId.phone,
          } : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order
 * @route   PUT /api/users/orders/:orderId/cancel
 * @access  Private (User)
 */
exports.cancelOrder = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order can be cancelled
    if (!order.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled. Current status: ${order.status}`,
      });
    }

    // Restore stock if payment was made (stock was already reduced)
    const payments = await Payment.find({ orderId: order._id, status: { $in: [PAYMENT_STATUS.PARTIAL_PAID, PAYMENT_STATUS.FULLY_PAID] } });
    const wasPaid = payments.length > 0;
    
    if (wasPaid) {
      // Restore stock for all items
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock = (product.stock || 0) + item.quantity;
          await product.save();
          console.log(`📦 Stock restored for product ${product.name}: ${item.quantity} units. New stock: ${product.stock}`);
        }
      }
      console.log(`⚠️ Refund required for order ${order.orderNumber}. Payments: ${payments.length}`);
      // TODO: Implement refund logic when payment gateway is integrated
    }

    // Update order status
    order.status = ORDER_STATUS.CANCELLED;
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Cancelled by user';
    order.cancelledBy = 'user';
    
    // Update status timeline
    order.statusTimeline.push({
      status: ORDER_STATUS.CANCELLED,
      timestamp: new Date(),
      note: reason || 'Cancelled by user',
      updatedBy: 'user',
    });

    await order.save();

    res.status(200).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          cancelledAt: order.cancelledAt,
          cancellationReason: order.cancellationReason,
        },
        message: 'Order cancelled successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// PAYMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Create payment intent for advance payment (30% or 100%)
 * @route   POST /api/users/payments/create-intent
 * @access  Private (User)
 */
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { orderId, paymentMethod = PAYMENT_METHODS.RAZORPAY } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.paymentStatus === PAYMENT_STATUS.FULLY_PAID) {
      return res.status(400).json({
        success: false,
        message: 'Order is already fully paid',
      });
    }

    // Calculate payment amount
    const amount = order.upfrontAmount; // 30% or 100% based on payment preference

    // Create Razorpay order
    try {
      const razorpayOrder = await razorpayService.createOrder({
        amount: amount,
        currency: 'INR',
        receipt: `receipt_${order.orderNumber}_${Date.now()}`,
        notes: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          userId: userId.toString(),
          paymentType: order.paymentPreference === 'full' ? 'full' : 'advance',
        },
      });

      res.status(200).json({
        success: true,
        data: {
          paymentIntent: {
            id: razorpayOrder.id,
            orderId: order._id.toString(),
            amount: amount,
            currency: 'INR',
            paymentMethod,
            status: razorpayOrder.status,
            razorpayOrderId: razorpayOrder.id,
            keyId: process.env.RAZORPAY_KEY_ID, // Frontend needs this for Razorpay Checkout
          },
          message: razorpayService.isTestMode() 
            ? 'Payment intent created (Test Mode)' 
            : 'Payment intent created successfully',
        },
      });
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create payment order',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Confirm advance payment
 * @route   POST /api/users/payments/confirm
 * @access  Private (User)
 */
exports.confirmPayment = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      orderId,
      paymentIntentId,
      gatewayPaymentId,
      gatewayOrderId,
      gatewaySignature,
      paymentMethod = PAYMENT_METHODS.RAZORPAY,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Validate required Razorpay payment details
    if (!gatewayPaymentId || !gatewayOrderId || !gatewaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification details are required (paymentId, orderId, signature)',
      });
    }

    // Verify Razorpay payment signature
    const isSignatureValid = razorpayService.verifyPaymentSignature(
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature
    );

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification failed.',
      });
    }

    // Fetch payment details from Razorpay (optional, for additional verification)
    let razorpayPayment = null;
    try {
      razorpayPayment = await razorpayService.fetchPayment(gatewayPaymentId);
      
      // Verify payment amount matches order amount
      const paymentAmountInRupees = razorpayPayment.amount / 100;
      if (Math.abs(paymentAmountInRupees - order.upfrontAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Payment amount mismatch. Expected ₹${order.upfrontAmount}, received ₹${paymentAmountInRupees}`,
        });
      }

      // Verify payment status
      if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
        return res.status(400).json({
          success: false,
          message: `Payment not successful. Status: ${razorpayPayment.status}`,
        });
      }
    } catch (paymentError) {
      // In test mode, allow payment even if fetch fails
      if (!razorpayService.isTestMode()) {
        console.error('Error fetching Razorpay payment:', paymentError);
        return res.status(400).json({
          success: false,
          message: 'Failed to verify payment with gateway',
        });
      }
    }
    
    // Generate payment ID explicitly (pre-save hook will also generate, but this ensures it's set)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const todayStart = new Date(date);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(date);
    todayEnd.setHours(23, 59, 59, 999);
    const todayCount = await Payment.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    const sequence = String(todayCount + 1).padStart(4, '0');
    const generatedPaymentId = `PAY-${dateStr}-${sequence}`;
    
    // Create payment record
    const payment = new Payment({
      paymentId: generatedPaymentId, // Explicitly set paymentId
      orderId: order._id,
      userId,
      paymentType: order.paymentPreference === 'full' ? 'full' : 'advance',
      amount: order.upfrontAmount,
      paymentMethod,
      status: order.paymentPreference === 'full' ? PAYMENT_STATUS.FULLY_PAID : PAYMENT_STATUS.PARTIAL_PAID,
      gatewayPaymentId: gatewayPaymentId, // Razorpay payment ID
      gatewayOrderId: gatewayOrderId, // Razorpay order ID
      gatewaySignature: gatewaySignature, // Razorpay signature for verification
      gatewayResponse: razorpayPayment ? {
        status: razorpayPayment.status,
        method: razorpayPayment.method,
        description: razorpayPayment.description,
        created_at: razorpayPayment.created_at,
      } : null,
      paidAt: new Date(),
    });

    await payment.save();

    // Log payment to history
    try {
      await PaymentHistory.create({
        activityType: order.paymentPreference === 'full' ? 'user_payment_advance' : 'user_payment_advance',
        userId: userId,
        orderId: order._id,
        paymentId: payment._id,
        amount: payment.amount,
        paymentMethod: paymentMethod,
        status: 'completed',
        description: `User paid ${order.paymentPreference === 'full' ? 'full' : 'advance'} payment of ₹${payment.amount} for order ${order.orderNumber}`,
        metadata: {
          orderNumber: order.orderNumber,
          paymentType: payment.paymentType,
          paymentId: generatedPaymentId,
        },
      });
    } catch (historyError) {
      console.error('Error logging payment history:', historyError);
      // Don't fail payment if history logging fails
    }

    // Update order payment status
    if (order.paymentPreference === 'full') {
      order.paymentStatus = PAYMENT_STATUS.FULLY_PAID;
    } else {
      order.paymentStatus = PAYMENT_STATUS.PARTIAL_PAID;
    }
    
    // Reduce stock for all items in the order
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        if (product.stock < item.quantity) {
          // If stock is insufficient, log warning but don't fail (order already created)
          console.warn(`⚠️ Insufficient stock for product ${product.name}. Required: ${item.quantity}, Available: ${product.stock}`);
        }
        product.stock = Math.max(0, product.stock - item.quantity);
        await product.save();
        console.log(`📦 Stock reduced for product ${product.name}: ${item.quantity} units. Remaining: ${product.stock}`);
      }
    }
    
    await order.save();

    // Process earnings (vendor earnings and seller commission) when order is fully paid
    if (order.paymentStatus === PAYMENT_STATUS.FULLY_PAID) {
      try {
        await processOrderEarnings(order);
      } catch (earningsError) {
        console.error('Error processing order earnings:', earningsError);
        // Don't fail the payment confirmation if earnings processing fails
      }
    }

    res.status(200).json({
      success: true,
      data: {
        payment: {
          id: payment._id,
          paymentId: payment.paymentId,
          amount: payment.amount,
          paymentType: payment.paymentType,
          status: payment.status,
          paidAt: payment.paidAt,
        },
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
        },
        message: razorpayService.isTestMode() 
          ? 'Payment confirmed successfully (Test Mode)' 
          : 'Payment confirmed successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create payment intent for remaining payment (70%)
 * @route   POST /api/users/payments/create-remaining
 * @access  Private (User)
 */
exports.createRemainingPaymentIntent = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { orderId, paymentMethod = PAYMENT_METHODS.RAZORPAY } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.paymentPreference === 'full') {
      return res.status(400).json({
        success: false,
        message: 'This order was paid in full. No remaining payment required.',
      });
    }

    if (order.paymentStatus === PAYMENT_STATUS.FULLY_PAID) {
      return res.status(400).json({
        success: false,
        message: 'Order is already fully paid',
      });
    }

    if (order.status !== ORDER_STATUS.DELIVERED) {
      return res.status(400).json({
        success: false,
        message: 'Remaining payment can only be made after delivery',
      });
    }

    // Calculate remaining amount
    const amount = order.remainingAmount; // 70%

    // Create Razorpay order for remaining payment
    try {
      const razorpayOrder = await razorpayService.createOrder({
        amount: amount,
        currency: 'INR',
        receipt: `receipt_${order.orderNumber}_remaining_${Date.now()}`,
        notes: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          userId: userId.toString(),
          paymentType: 'remaining',
        },
      });

      res.status(200).json({
        success: true,
        data: {
          paymentIntent: {
            id: razorpayOrder.id,
            orderId: order._id.toString(),
            amount: amount,
            currency: 'INR',
            paymentMethod,
            status: razorpayOrder.status,
            razorpayOrderId: razorpayOrder.id,
            keyId: process.env.RAZORPAY_KEY_ID, // Frontend needs this for Razorpay Checkout
          },
          message: razorpayService.isTestMode() 
            ? 'Remaining payment intent created (Test Mode)' 
            : 'Remaining payment intent created successfully',
        },
      });
    } catch (error) {
      console.error('Error creating Razorpay order for remaining payment:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create remaining payment order',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Confirm remaining payment (70%)
 * @route   POST /api/users/payments/confirm-remaining
 * @access  Private (User)
 */
exports.confirmRemainingPayment = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      orderId,
      gatewayPaymentId,
      gatewayOrderId,
      gatewaySignature,
      paymentMethod = PAYMENT_METHODS.RAZORPAY,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.paymentStatus === PAYMENT_STATUS.FULLY_PAID) {
      return res.status(400).json({
        success: false,
        message: 'Order is already fully paid',
      });
    }

    // Validate required Razorpay payment details
    if (!gatewayPaymentId || !gatewayOrderId || !gatewaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification details are required (paymentId, orderId, signature)',
      });
    }

    // Verify Razorpay payment signature
    const isSignatureValid = razorpayService.verifyPaymentSignature(
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature
    );

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification failed.',
      });
    }

    // Fetch payment details from Razorpay (optional, for additional verification)
    let razorpayPayment = null;
    try {
      razorpayPayment = await razorpayService.fetchPayment(gatewayPaymentId);
      
      // Verify payment amount matches order remaining amount
      const paymentAmountInRupees = razorpayPayment.amount / 100;
      if (Math.abs(paymentAmountInRupees - order.remainingAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Payment amount mismatch. Expected ₹${order.remainingAmount}, received ₹${paymentAmountInRupees}`,
        });
      }

      // Verify payment status
      if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
        return res.status(400).json({
          success: false,
          message: `Payment not successful. Status: ${razorpayPayment.status}`,
        });
      }
    } catch (paymentError) {
      // In test mode, allow payment even if fetch fails
      if (!razorpayService.isTestMode()) {
        console.error('Error fetching Razorpay payment:', paymentError);
        return res.status(400).json({
          success: false,
          message: 'Failed to verify payment with gateway',
        });
      }
    }
    
    // Generate payment ID explicitly (pre-save hook will also generate, but this ensures it's set)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const todayStart = new Date(date);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(date);
    todayEnd.setHours(23, 59, 59, 999);
    const todayCount = await Payment.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    const sequence = String(todayCount + 1).padStart(4, '0');
    const generatedPaymentId = `PAY-${dateStr}-${sequence}`;
    
    // Create payment record
    const payment = new Payment({
      paymentId: generatedPaymentId, // Explicitly set paymentId
      orderId: order._id,
      userId,
      paymentType: 'remaining',
      amount: order.remainingAmount,
      paymentMethod,
      status: PAYMENT_STATUS.FULLY_PAID,
      gatewayPaymentId: gatewayPaymentId, // Razorpay payment ID
      gatewayOrderId: gatewayOrderId, // Razorpay order ID
      gatewaySignature: gatewaySignature, // Razorpay signature for verification
      gatewayResponse: razorpayPayment ? {
        status: razorpayPayment.status,
        method: razorpayPayment.method,
        description: razorpayPayment.description,
        created_at: razorpayPayment.created_at,
      } : null,
      paidAt: new Date(),
    });

    await payment.save();

    // Log payment to history
    try {
      await PaymentHistory.create({
        activityType: 'user_payment_remaining',
        userId: userId,
        orderId: order._id,
        paymentId: payment._id,
        amount: payment.amount,
        paymentMethod: paymentMethod,
        status: 'completed',
        description: `User paid remaining payment of ₹${payment.amount} for order ${order.orderNumber}`,
        metadata: {
          orderNumber: order.orderNumber,
          paymentType: payment.paymentType,
          paymentId: payment.paymentId,
        },
      });
    } catch (historyError) {
      console.error('Error logging payment history:', historyError);
      // Don't fail payment if history logging fails
    }

    // Update order payment status
    order.paymentStatus = PAYMENT_STATUS.FULLY_PAID;
    await order.save();

    // Process earnings (vendor earnings and seller commission) when order is fully paid
    if (order.paymentStatus === PAYMENT_STATUS.FULLY_PAID) {
      try {
        await processOrderEarnings(order);
      } catch (earningsError) {
        console.error('Error processing order earnings:', earningsError);
        // Don't fail the payment confirmation if earnings processing fails
      }
    }

    res.status(200).json({
      success: true,
      data: {
        payment: {
          id: payment._id,
          paymentId: payment.paymentId,
          amount: payment.amount,
          paymentType: payment.paymentType,
          status: payment.status,
          paidAt: payment.paidAt,
        },
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
        },
        message: razorpayService.isTestMode() 
          ? 'Remaining payment confirmed successfully (Test Mode)' 
          : 'Remaining payment confirmed successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment status
 * @route   GET /api/users/payments/:paymentId
 * @access  Private (User)
 */
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { paymentId } = req.params;

    const payment = await Payment.findOne({ _id: paymentId, userId }).populate('orderId', 'orderNumber totalAmount');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        payment: {
          id: payment._id,
          paymentId: payment.paymentId,
          orderId: payment.orderId._id,
          orderNumber: payment.orderId.orderNumber,
          paymentType: payment.paymentType,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          gatewayPaymentId: payment.gatewayPaymentId,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order payments
 * @route   GET /api/users/orders/:orderId/payments
 * @access  Private (User)
 */
exports.getOrderPayments = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const payments = await Payment.find({ orderId: order._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        payments: payments.map(p => ({
          id: p._id,
          paymentId: p.paymentId,
          paymentType: p.paymentType,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          status: p.status,
          gatewayPaymentId: p.gatewayPaymentId,
          paidAt: p.paidAt,
          createdAt: p.createdAt,
        })),
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          upfrontAmount: order.upfrontAmount,
          remainingAmount: order.remainingAmount,
          paymentStatus: order.paymentStatus,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// ADDRESS CONTROLLERS
// ============================================================================

/**
 * @desc    Get user addresses
 * @route   GET /api/users/addresses
 * @access  Private (User)
 */
exports.getAddresses = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        addresses: addresses.map(addr => ({
          id: addr._id,
          name: addr.name,
          phone: addr.phone,
          address: addr.address,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          coordinates: addr.coordinates,
          isDefault: addr.isDefault,
          landmark: addr.landmark,
          addressType: addr.addressType,
          fullAddress: addr.getFullAddress(),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add address
 * @route   POST /api/users/addresses
 * @access  Private (User)
 */
exports.addAddress = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      phone,
      address,
      city,
      state,
      pincode,
      coordinates,
      landmark,
      addressType = 'home',
      isDefault = false,
    } = req.body;

    // Validate required fields
    if (!name || !phone || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, address, city, state, and pincode are required',
      });
    }

    // If this is set as default, it will automatically unset other defaults (via pre-save hook)
    const newAddress = new Address({
      userId,
      name,
      phone,
      address,
      city,
      state,
      pincode,
      coordinates,
      landmark,
      addressType,
      isDefault,
    });

    await newAddress.save();

    res.status(201).json({
      success: true,
      data: {
        address: {
          id: newAddress._id,
          name: newAddress.name,
          phone: newAddress.phone,
          address: newAddress.address,
          city: newAddress.city,
          state: newAddress.state,
          pincode: newAddress.pincode,
          coordinates: newAddress.coordinates,
          isDefault: newAddress.isDefault,
          fullAddress: newAddress.getFullAddress(),
        },
        message: 'Address added successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update address
 * @route   PUT /api/users/addresses/:addressId
 * @access  Private (User)
 */
exports.updateAddress = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;
    const updateData = req.body;

    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        address[key] = updateData[key];
      }
    });

    await address.save();

    res.status(200).json({
      success: true,
      data: {
        address: {
          id: address._id,
          name: address.name,
          phone: address.phone,
          address: address.address,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          coordinates: address.coordinates,
          isDefault: address.isDefault,
          fullAddress: address.getFullAddress(),
        },
        message: 'Address updated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete address
 * @route   DELETE /api/users/addresses/:addressId
 * @access  Private (User)
 */
exports.deleteAddress = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;

    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    await address.deleteOne();

    res.status(200).json({
      success: true,
      data: {
        message: 'Address deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set default address
 * @route   PUT /api/users/addresses/:addressId/default
 * @access  Private (User)
 */
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;

    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    // Set as default (pre-save hook will unset other defaults)
    address.isDefault = true;
    await address.save();

    res.status(200).json({
      success: true,
      data: {
        address: {
          id: address._id,
          isDefault: address.isDefault,
          fullAddress: address.getFullAddress(),
        },
        message: 'Default address updated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// FAVOURITES CONTROLLERS
// ============================================================================

/**
 * @desc    Get user favourites
 * @route   GET /api/users/favourites
 * @access  Private (User)
 */
exports.getFavourites = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // TODO: Implement Favourites model when needed
    // For now, return empty array
    res.status(200).json({
      success: true,
      data: {
        favourites: [],
        message: 'Favourites feature coming soon',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add product to favourites
 * @route   POST /api/users/favourites
 * @access  Private (User)
 */
exports.addToFavourites = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unavailable',
      });
    }

    // TODO: Implement Favourites model when needed
    // For now, return success
    res.status(200).json({
      success: true,
      data: {
        message: 'Product added to favourites (Feature coming soon)',
        product: {
          id: product._id,
          name: product.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove product from favourites
 * @route   DELETE /api/users/favourites/:productId
 * @access  Private (User)
 */
exports.removeFromFavourites = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    // TODO: Implement Favourites model when needed
    // For now, return success
    res.status(200).json({
      success: true,
      data: {
        message: 'Product removed from favourites (Feature coming soon)',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// NOTIFICATIONS CONTROLLERS
// ============================================================================

/**
 * @desc    Get user notifications
 * @route   GET /api/users/notifications
 * @access  Private (User)
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { unreadOnly = false, limit = 50 } = req.query;

    // TODO: Implement Notification model when needed
    // For now, return empty array with message
    res.status(200).json({
      success: true,
      data: {
        notifications: [],
        unreadCount: 0,
        message: 'Notifications feature coming soon',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/users/notifications/:notificationId/read
 * @access  Private (User)
 */
exports.markNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;

    // TODO: Implement Notification model when needed
    res.status(200).json({
      success: true,
      data: {
        message: 'Notification marked as read (Feature coming soon)',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/users/notifications/read-all
 * @access  Private (User)
 */
exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // TODO: Implement Notification model when needed
    res.status(200).json({
      success: true,
      data: {
        message: 'All notifications marked as read (Feature coming soon)',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// SUPPORT CONTROLLERS
// ============================================================================

/**
 * @desc    Create support ticket
 * @route   POST /api/users/support/tickets
 * @access  Private (User)
 */
exports.createSupportTicket = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { subject, description, category, orderId } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Subject and description are required',
      });
    }

    // Validate orderId if provided
    if (orderId) {
      const order = await Order.findOne({ _id: orderId, userId });
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }
    }

    // TODO: Implement SupportTicket model when needed
    // For now, return success with ticket info
    res.status(201).json({
      success: true,
      data: {
        ticket: {
          id: `TICKET_${Date.now()}`,
          subject,
          description,
          category: category || 'general',
          orderId: orderId || null,
          status: 'open',
          createdAt: new Date(),
        },
        message: 'Support ticket created successfully (Feature coming soon)',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user support tickets
 * @route   GET /api/users/support/tickets
 * @access  Private (User)
 */
exports.getSupportTickets = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { status, page = 1, limit = 20 } = req.query;

    // TODO: Implement SupportTicket model when needed
    // For now, return empty array
    res.status(200).json({
      success: true,
      data: {
        tickets: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
        message: 'Support tickets feature coming soon',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get support ticket details
 * @route   GET /api/users/support/tickets/:ticketId
 * @access  Private (User)
 */
exports.getSupportTicketDetails = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { ticketId } = req.params;

    // TODO: Implement SupportTicket model when needed
    res.status(200).json({
      success: true,
      data: {
        ticket: null,
        messages: [],
        message: 'Support ticket details feature coming soon',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send support message
 * @route   POST /api/users/support/tickets/:ticketId/messages
 * @access  Private (User)
 */
exports.sendSupportMessage = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // TODO: Implement SupportTicket and SupportMessage models when needed
    res.status(200).json({
      success: true,
      data: {
        message: 'Support message sent successfully (Feature coming soon)',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initiate support call
 * @route   POST /api/users/support/call
 * @access  Private (User)
 */
exports.initiateSupportCall = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { orderId, reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // TODO: Implement support call service when needed
    // For now, return success with contact info
    res.status(200).json({
      success: true,
      data: {
        message: 'Support call initiated (Feature coming soon)',
        contactInfo: {
          phone: '+91-XXXXXXXXXX', // TODO: Add support phone number
          note: 'Our support team will call you shortly',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

