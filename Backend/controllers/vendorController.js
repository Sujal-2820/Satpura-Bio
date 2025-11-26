/**
 * Vendor Controller
 * 
 * Handles all vendor-related operations
 */

const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ProductAssignment = require('../models/ProductAssignment');
const CreditPurchase = require('../models/CreditPurchase');

const { generateOTP, sendOTP } = require('../config/sms');
const { generateToken } = require('../middleware/auth');
const { OTP_EXPIRY_MINUTES, MIN_VENDOR_PURCHASE, MAX_VENDOR_PURCHASE, VENDOR_COVERAGE_RADIUS_KM, DELIVERY_TIMELINE_HOURS } = require('../utils/constants');
const { checkPhoneExists, checkPhoneInRole } = require('../utils/phoneValidation');

const DELIVERY_WINDOW_HOURS = DELIVERY_TIMELINE_HOURS || 24;
const DELIVERY_WINDOW_MS = DELIVERY_WINDOW_HOURS * 60 * 60 * 1000;

async function processPendingDeliveries(vendorId) {
  try {
    const now = new Date();
    const pendingPurchases = await CreditPurchase.find({
      vendorId,
      status: 'approved',
      deliveryStatus: { $in: ['scheduled', 'in_transit'] },
      expectedDeliveryAt: { $lte: now },
    });

    if (!pendingPurchases.length) {
      return;
    }

    for (const purchase of pendingPurchases) {
      for (const item of purchase.items) {
        let assignment = await ProductAssignment.findOne({
          vendorId,
          productId: item.productId,
        });

        if (!assignment) {
          if (!purchase.reviewedBy) {
            console.warn(`⚠️ Unable to auto-create assignment for vendor ${vendorId}. Missing reviewer on purchase ${purchase._id}.`);
            continue;
          }
          assignment = await ProductAssignment.create({
            vendorId,
            productId: item.productId,
            assignedBy: purchase.reviewedBy,
            assignedAt: new Date(),
            stock: 0,
            isActive: true,
            notes: 'Auto-created during approved stock transfer',
          });
        }

        assignment.stock += item.quantity;
        await assignment.save();
      }

      purchase.deliveryStatus = 'delivered';
      purchase.deliveredAt = now;
      purchase.deliveryNotes = 'Stock delivered and added to your inventory.';
      await purchase.save();
    }
  } catch (error) {
    console.error(`Failed to process pending deliveries for vendor ${vendorId}:`, error);
  }
}

/**
 * @desc    Vendor registration
 * @route   POST /api/vendors/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, phone, location } = req.body;

    if (!name || !phone || !location) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and location are required',
      });
    }

    // Check if phone exists in other roles (user, seller)
    const phoneCheck = await checkPhoneExists(phone, 'vendor');
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message,
      });
    }

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ phone });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor with this phone number already exists',
      });
    }

    // CRITICAL: Verify region uniqueness - Only 1 vendor allowed per region (city + state)
    // First check: Region-based check (city + state) - STRICT REGION RULE
    if (location.city && location.state) {
      const cityNormalized = location.city.trim().toLowerCase();
      const stateNormalized = location.state.trim().toLowerCase();
      
      console.log(`🔍 Checking for existing vendor in region: ${location.city}, ${location.state}`);
      
      // Check if another vendor exists in the same region (city + state)
      const existingVendorInRegion = await Vendor.findOne({
        phone: { $ne: phone }, // Exclude current vendor if exists
        status: { $in: ['pending', 'approved'] }, // Check both pending and approved
        isActive: true,
        'banInfo.isBanned': false,
        'location.city': { $regex: new RegExp(`^${cityNormalized}$`, 'i') },
        'location.state': { $regex: new RegExp(`^${stateNormalized}$`, 'i') },
      });

      if (existingVendorInRegion) {
        console.log(`❌ Vendor registration blocked: Another vendor exists in ${location.city}, ${location.state}`);
        console.log(`   Existing vendor: ${existingVendorInRegion.name} (${existingVendorInRegion.phone})`);
        return res.status(400).json({
          success: false,
          message: `A vendor already exists in ${location.city}, ${location.state}. Only one vendor is allowed per region.`,
          existingVendor: {
            id: existingVendorInRegion._id,
            name: existingVendorInRegion.name,
            phone: existingVendorInRegion.phone,
            status: existingVendorInRegion.status,
            location: {
              city: existingVendorInRegion.location.city,
              state: existingVendorInRegion.location.state,
            },
          },
          businessRule: 'Only one vendor is allowed per region (city + state). Please choose a different region.',
        });
      }
      
      console.log(`✅ No existing vendor found in region: ${location.city}, ${location.state}`);
    }

    // CRITICAL: Verify 20km radius rule - Only 1 vendor allowed per 20km radius (for coordinates-based check)
    // Use transaction to prevent race conditions during concurrent registrations
    if (location.coordinates && location.coordinates.lat && location.coordinates.lng) {
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          // Check if another approved vendor exists within 20km
          // Using MongoDB geospatial query with 2dsphere index
          const nearbyVendors = await Vendor.find({
            phone: { $ne: phone }, // Exclude current vendor if exists
            status: 'approved', // Only check approved vendors
            isActive: true, // Only check active vendors
            'banInfo.isBanned': false, // Exclude banned vendors
            'location.coordinates': {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: [location.coordinates.lng, location.coordinates.lat],
                },
                $maxDistance: VENDOR_COVERAGE_RADIUS_KM * 1000, // Convert km to meters (20000 meters)
              },
            },
          }).session(session).limit(1);

          if (nearbyVendors.length > 0) {
            const nearbyVendor = nearbyVendors[0];
            throw new Error(`VENDOR_EXISTS: Another vendor already exists within ${VENDOR_COVERAGE_RADIUS_KM}km radius`);
          }
        });
      } catch (error) {
        await session.endSession();
        if (error.message.startsWith('VENDOR_EXISTS:')) {
          // Get vendor details for error message (outside transaction)
          const nearbyVendor = await Vendor.findOne({
            phone: { $ne: phone },
            status: 'approved',
            isActive: true,
            'banInfo.isBanned': false,
            'location.coordinates': {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: [location.coordinates.lng, location.coordinates.lat],
                },
                $maxDistance: VENDOR_COVERAGE_RADIUS_KM * 1000,
              },
            },
          }).limit(1);
          
          return res.status(400).json({
            success: false,
            message: error.message.replace('VENDOR_EXISTS: ', ''),
            nearbyVendor: nearbyVendor ? {
              id: nearbyVendor._id,
              name: nearbyVendor.name,
              phone: nearbyVendor.phone,
              status: nearbyVendor.status,
              location: nearbyVendor.location,
            } : null,
            businessRule: `Only one vendor is allowed per ${VENDOR_COVERAGE_RADIUS_KM}km radius. Please choose a different location.`,
          });
        }
        throw error;
      } finally {
        await session.endSession();
      }
    }

    // Create vendor - Status set to pending (requires admin approval)
    const vendor = new Vendor({
      name,
      phone,
      location: {
        address: location.address,
        city: location.city,
        state: location.state,
        pincode: location.pincode,
        coordinates: {
          lat: location.coordinates.lat,
          lng: location.coordinates.lng,
        },
        coverageRadius: VENDOR_COVERAGE_RADIUS_KM,
      },
      status: 'pending', // Requires admin approval
      isActive: false, // Inactive until approved
    });

    // Clear any existing OTP before generating new one
    vendor.clearOTP();
    
    // Generate new unique OTP
    const otpCode = vendor.generateOTP();
    await vendor.save();

    // Send OTP via SMS
    try {
      // Enhanced console logging for OTP
      const timestamp = new Date().toISOString();
      console.log('\n' + '='.repeat(60));
      console.log('🔐 VENDOR OTP GENERATED (Registration)');
      console.log('='.repeat(60));
      console.log(`📱 Phone: ${phone}`);
      console.log(`🔢 OTP Code: ${otpCode}`);
      console.log(`⏰ Generated At: ${timestamp}`);
      console.log(`⏳ Expires In: 5 minutes`);
      console.log('='.repeat(60) + '\n');
      
      // Try to send OTP (will use dummy in development)
      await sendOTP(phone, otpCode);
    } catch (error) {
      console.error('Failed to send OTP:', error);
    }

    res.status(201).json({
      success: true,
      data: {
        message: 'Registration successful. OTP sent to phone.',
        vendorId: vendor._id,
        expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request OTP for vendor
 * @route   POST /api/vendors/auth/request-otp
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

    // Check if phone exists in other roles (user, seller)
    const phoneCheck = await checkPhoneExists(phone, 'vendor');
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message,
      });
    }

    // Check if vendor exists - requestOTP is only for existing vendors
    const vendorCheck = await checkPhoneInRole(phone, 'vendor');
    const vendor = vendorCheck.data;

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found. Please register first.',
        requiresRegistration: true,
      });
    }

    // Check vendor status before sending OTP
    if (vendor.status === 'rejected') {
      return res.status(403).json({
        success: false,
        status: 'rejected',
        message: 'Your vendor profile was rejected by the admin. You cannot access the dashboard.',
      });
    }

    // Allow OTP for pending and approved vendors (status check will happen in verifyOTP)
    // Clear any existing OTP before generating new one
    vendor.clearOTP();
    
    // Generate new unique OTP
    const otpCode = vendor.generateOTP();
    await vendor.save();

    // Send OTP via SMS
    try {
      // Enhanced console logging for OTP
      const timestamp = new Date().toISOString();
      console.log('\n' + '='.repeat(60));
      console.log('🔐 VENDOR OTP GENERATED');
      console.log('='.repeat(60));
      console.log(`📱 Phone: ${phone}`);
      console.log(`🔢 OTP Code: ${otpCode}`);
      console.log(`⏰ Generated At: ${timestamp}`);
      console.log(`⏳ Expires In: 5 minutes`);
      console.log('='.repeat(60) + '\n');
      
      // Try to send OTP (will use dummy in development)
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
 * @desc    Verify OTP and complete login/registration
 * @route   POST /api/vendors/auth/verify-otp
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

    // Check if phone exists in other roles first
    const phoneCheck = await checkPhoneExists(phone, 'vendor');
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message,
      });
    }

    // Check if phone exists in vendor role
    const vendorCheck = await checkPhoneInRole(phone, 'vendor');
    const vendor = vendorCheck.data;

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found. Please register first.',
        requiresRegistration: true, // Flag for frontend to redirect
      });
    }

    // Verify OTP
    const isOtpValid = vendor.verifyOTP(otp);

    if (!isOtpValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Check if vendor is banned
    if (vendor.banInfo?.isBanned) {
      const banType = vendor.banInfo.banType || 'temporary'
      const banReason = vendor.banInfo.banReason || 'Account banned by admin'
      return res.status(403).json({
        success: false,
        message: `Vendor account is ${banType === 'permanent' ? 'permanently' : 'temporarily'} banned. ${banReason}. Please contact admin.`,
        banInfo: vendor.banInfo,
      });
    }

    // Check vendor status - Handle pending, rejected, and approved statuses
    if (vendor.status === 'pending') {
      // Clear OTP after successful verification
      vendor.clearOTP();
      await vendor.save();
      
      return res.status(200).json({
        success: true,
        data: {
          status: 'pending',
          message: 'Registration successful. Waiting for admin approval.',
          vendor: {
            id: vendor._id,
            name: vendor.name,
            phone: vendor.phone,
            status: vendor.status,
            isActive: vendor.isActive,
            location: vendor.location,
          },
        },
      });
    }

    if (vendor.status === 'rejected') {
      // Clear OTP after verification
      vendor.clearOTP();
      await vendor.save();
      
      return res.status(403).json({
        success: false,
        status: 'rejected',
        message: 'Your vendor profile was rejected by the admin. You cannot access the dashboard.',
        vendor: {
          id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
          status: vendor.status,
        },
      });
    }

    // Check if vendor is approved and active
    if (vendor.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Vendor account status is ${vendor.status}. Please contact admin.`,
        status: vendor.status,
      });
    }

    if (!vendor.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account is inactive. Please contact admin.',
      });
    }

    // Vendor is approved and active - proceed with login
    // Clear OTP after successful verification
    vendor.clearOTP();
    vendor.lastLogin = new Date();
    await vendor.save();

    // Generate JWT token
    const token = generateToken({
      vendorId: vendor._id,
      phone: vendor.phone,
      role: 'vendor',
      type: 'vendor',
    });

    // Enhanced console logging
    const timestamp = new Date().toISOString();
    console.log('\n' + '='.repeat(60));
    console.log('🔐 VENDOR OTP VERIFIED');
    console.log('='.repeat(60));
    console.log(`📱 Phone: ${phone}`);
    console.log(`👤 Name: ${vendor.name}`);
    console.log(`✅ Status: ${vendor.status}`);
    console.log(`⏰ Logged In At: ${timestamp}`);
    console.log('='.repeat(60) + '\n');

    res.status(200).json({
      success: true,
      data: {
        token,
        status: 'approved',
        vendor: {
          id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
          status: vendor.status,
          isActive: vendor.isActive,
          location: vendor.location,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Vendor logout
 * @route   POST /api/vendors/auth/logout
 * @access  Private (Vendor)
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
 * @desc    Get vendor profile
 * @route   GET /api/vendors/auth/profile
 * @access  Private (Vendor)
 */
exports.getProfile = async (req, res, next) => {
  try {
    // Vendor is attached by authorizeVendor middleware
    const vendor = req.vendor;
    
    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
          email: vendor.email,
          location: vendor.location,
          status: vendor.status,
          isActive: vendor.isActive,
          credit: {
            limit: vendor.creditPolicy.limit,
            used: vendor.creditUsed,
            remaining: vendor.creditPolicy.limit - vendor.creditUsed,
            dueDate: vendor.creditPolicy.dueDate,
            penaltyRate: vendor.creditPolicy.penaltyRate,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard overview
 * @route   GET /api/vendors/dashboard
 * @access  Private (Vendor)
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const vendor = req.vendor;

    // Get pending orders count
    const pendingOrders = await Order.countDocuments({
      vendorId: vendor._id,
      status: 'pending',
    });

    // Get orders awaiting confirmation
    const awaitingOrders = await Order.countDocuments({
      vendorId: vendor._id,
      status: 'awaiting',
    });

    // Get processing orders
    const processingOrders = await Order.countDocuments({
      vendorId: vendor._id,
      status: 'processing',
    });

    // Get assigned products (inventory)
    const assignedProducts = await ProductAssignment.find({
      vendorId: vendor._id,
      isActive: true,
    }).populate('productId', 'name sku category priceToUser imageUrl');

    // Get low stock items (we'll need to check if ProductAssignment has stock info)
    // For now, we'll use assigned products count as a placeholder
    const totalProducts = assignedProducts.length;
    const lowStockProducts = assignedProducts.filter(p => {
      // If ProductAssignment has stock tracking, check here
      // For now, we'll return empty array as placeholder
      return false;
    });

    // Credit information
    const creditLimit = vendor.creditPolicy.limit;
    const creditUsed = vendor.creditUsed;
    const creditRemaining = creditLimit - creditUsed;
    const creditUtilization = creditLimit > 0
      ? (creditUsed / creditLimit) * 100
      : 0;

    // Check if credit is overdue
    const now = new Date();
    const isOverdue = vendor.creditPolicy.dueDate && now > vendor.creditPolicy.dueDate;
    const daysOverdue = isOverdue && vendor.creditPolicy.dueDate
      ? Math.floor((now - vendor.creditPolicy.dueDate) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate penalty if overdue
    let penalty = 0;
    if (isOverdue && vendor.creditPolicy.penaltyRate > 0) {
      const dailyPenaltyRate = vendor.creditPolicy.penaltyRate / 100;
      penalty = creditUsed * dailyPenaltyRate * daysOverdue;
    }

    // Get recent orders
    const recentOrders = await Order.find({
      vendorId: vendor._id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name phone')
      .select('orderNumber status totalAmount paymentStatus createdAt')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        overview: {
          orders: {
            pending: pendingOrders,
            awaiting: awaitingOrders,
            processing: processingOrders,
            total: pendingOrders + awaitingOrders + processingOrders,
          },
          inventory: {
            totalProducts,
            lowStockCount: lowStockProducts.length,
            lowStockItems: lowStockProducts,
          },
          credit: {
            limit: creditLimit,
            used: creditUsed,
            remaining: creditRemaining,
            utilization: Math.round(creditUtilization * 100) / 100,
            dueDate: vendor.creditPolicy.dueDate,
            isOverdue,
            daysOverdue,
            penalty: Math.round(penalty * 100) / 100,
            penaltyRate: vendor.creditPolicy.penaltyRate,
          },
          recentOrders,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// ORDER MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all orders with filtering
 * @route   GET /api/vendors/orders
 * @access  Private (Vendor)
 */
exports.getOrders = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query - orders assigned to this vendor
    // Primary condition: vendorId must match
    // Secondary condition: assignedTo should be 'vendor' (but also include orders where it's not set for compatibility)
    const vendorIdForQuery = vendor._id;
    
    // Build the query - start simple and add conditions
    const query = { 
      vendorId: vendorIdForQuery,
      $or: [
        { assignedTo: 'vendor' },
        { assignedTo: { $exists: false } },
        { assignedTo: null }
      ]
    };
    
    // Debug logging
    console.log(`🔍 Vendor ${vendor.name} fetching orders`);
    console.log(`   Vendor ID: ${vendorIdForQuery}`);
    console.log(`   Vendor ID (string): ${vendorIdForQuery.toString()}`);
    console.log(`📍 Vendor location: ${vendor.location?.city || 'No city'}, ${vendor.location?.state || 'No state'}`);
    console.log(`📋 Base Query structure:`, {
      vendorId: vendorIdForQuery.toString(),
      $or: query.$or
    });

    // Apply status filter if provided (but ignore if it's the string "undefined")
    if (status && status !== 'undefined' && status !== 'null') {
      query.status = status;
      console.log(`📋 Query with status filter '${status}':`, {
        vendorId: query.vendorId.toString(),
        $or: query.$or,
        status: query.status
      });
    } else if (status === 'undefined' || status === 'null') {
      console.log(`⚠️ Ignoring invalid status filter: '${status}'`);
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
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
      .populate('seller', 'sellerId name')
      .populate('items.productId', 'name sku category')
      .select('-__v')
      .lean();

    const total = await Order.countDocuments(query);
    
    // Debug logging - Always log for troubleshooting
    console.log(`📦 Vendor ${vendor.name} (${vendor._id}) orders query result: ${orders.length} orders found (total: ${total})`);
    console.log(`📋 Final Query:`, JSON.stringify(query, null, 2));
    
    // Check if there are any orders with this vendorId at all (regardless of assignedTo)
    const allOrdersForVendor = await Order.find({ vendorId: vendor._id }).countDocuments();
    console.log(`   Total orders with vendorId ${vendor._id.toString()}: ${allOrdersForVendor}`);
    
    if (allOrdersForVendor > 0 && orders.length === 0) {
      // There are orders for this vendor but they don't match the query
      // Get sample orders to see what's in the database
      const sampleOrders = await Order.find({ vendorId: vendor._id })
        .limit(5)
        .select('orderNumber vendorId assignedTo status createdAt')
        .lean();
      console.log(`   ⚠️ Found ${allOrdersForVendor} orders with vendorId, but none match query. Sample orders:`);
      sampleOrders.forEach((o, idx) => {
        console.log(`      [${idx + 1}] Order ${o.orderNumber}:`);
        console.log(`          - vendorId: ${o.vendorId?.toString() || 'null'} (type: ${o.vendorId?.constructor?.name || 'unknown'})`);
        console.log(`          - assignedTo: ${o.assignedTo || 'NOT SET'} (type: ${typeof o.assignedTo})`);
        console.log(`          - status: ${o.status || 'NOT SET'}`);
        console.log(`          - createdAt: ${o.createdAt || 'NOT SET'}`);
        console.log(`          - vendorId match: ${o.vendorId?.toString() === vendor._id.toString() ? 'YES' : 'NO'}`);
      });
      
      // Check if any orders have assignedTo set to something other than 'vendor'
      const ordersWithDifferentAssignedTo = await Order.find({ 
        vendorId: vendor._id,
        assignedTo: { $ne: 'vendor', $exists: true }
      }).countDocuments();
      console.log(`   Orders with vendorId but assignedTo != 'vendor': ${ordersWithDifferentAssignedTo}`);
      
      const ordersWithoutAssignedTo = await Order.find({ 
        vendorId: vendor._id,
        assignedTo: { $exists: false }
      }).countDocuments();
      console.log(`   Orders with vendorId but assignedTo not set: ${ordersWithoutAssignedTo}`);
      
      // Try a simpler query to see if we can find the orders
      const simpleQueryOrders = await Order.find({ vendorId: vendor._id })
        .limit(3)
        .select('orderNumber vendorId assignedTo status')
        .lean();
      console.log(`   Simple query (vendorId only) found ${simpleQueryOrders.length} orders`);
    }

    res.status(200).json({
      success: true,
      data: {
        orders,
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
 * @desc    Get order details
 * @route   GET /api/vendors/orders/:orderId
 * @access  Private (Vendor)
 */
exports.getOrderDetails = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      vendorId: vendor._id,
    })
      .populate('userId', 'name phone email location')
      .populate('seller', 'sellerId name')
      .populate('items.productId', 'name sku category priceToUser imageUrl')
      .select('-__v');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    // Enrich order items with vendor stock info
    const orderObject = order.toObject({ virtuals: true });
    const productIds = orderObject.items
      .map((item) => {
        if (!item.productId) return null;
        return item.productId._id ? item.productId._id.toString() : item.productId.toString();
      })
      .filter(Boolean);

    let assignmentMap = {};
    if (productIds.length > 0) {
      const assignments = await ProductAssignment.find({
        vendorId: vendor._id,
        productId: { $in: productIds },
      })
        .select('productId stock updatedAt lastRestockedAt')
        .lean();

      assignmentMap = assignments.reduce((acc, assignment) => {
        acc[assignment.productId.toString()] = assignment;
        return acc;
      }, {});
    }

    orderObject.items = orderObject.items.map((item) => {
      const productId = item.productId?._id
        ? item.productId._id.toString()
        : item.productId?.toString();
      const assignment = productId ? assignmentMap[productId] : null;
      const vendorStock = assignment?.stock ?? assignment?.vendorStock ?? 0;

      return {
        ...item,
        vendorStock,
        vendorStockUpdatedAt: assignment?.updatedAt || assignment?.lastRestockedAt || null,
      };
    });

    // Get order payments
    const Payment = require('../models/Payment');
    const payments = await Payment.find({ orderId })
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

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
        order: orderObject,
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
 * @desc    Accept order (full availability)
 * @route   POST /api/vendors/orders/:orderId/accept
 * @access  Private (Vendor)
 */
exports.acceptOrder = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { orderId } = req.params;
    const { notes } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      vendorId: vendor._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be accepted. Current status: ${order.status}`,
      });
    }

    // Accept order - change status to 'awaiting' (awaiting dispatch)
    order.status = 'awaiting';
    order.assignedTo = 'vendor';

    // Add note if provided
    if (notes) {
      order.notes = `${order.notes || ''}\n[Vendor] ${notes}`.trim();
    }

    // Update status timeline
    order.statusTimeline.push({
      status: 'awaiting',
      timestamp: new Date(),
      updatedBy: 'vendor',
      note: 'Order accepted by vendor. Ready for processing.',
    });

    await order.save();

    // TODO: Send notification to user

    console.log(`✅ Order ${order.orderNumber} accepted by vendor ${vendor.name}`);

    res.status(200).json({
      success: true,
      data: {
        order,
        message: 'Order accepted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject order (escalate to Admin)
 * @route   POST /api/vendors/orders/:orderId/reject
 * @access  Private (Vendor)
 */
exports.rejectOrder = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { orderId } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      vendorId: vendor._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be rejected. Current status: ${order.status}`,
      });
    }

    // Reject order - escalate to admin
    order.assignedTo = 'admin'; // Escalate to admin
    order.status = 'rejected'; // Mark as rejected by vendor
    
    // Track escalation details
    order.escalation = {
      isEscalated: true,
      escalatedAt: new Date(),
      escalatedBy: 'vendor',
      escalationReason: reason,
      escalationType: 'full',
      escalatedItems: order.items.map(item => ({
        itemId: item._id,
        productId: item.productId,
        productName: item.productName,
        requestedQuantity: item.quantity,
        availableQuantity: 0, // Will be calculated if needed
        escalatedQuantity: item.quantity,
        reason: reason,
      })),
      originalVendorId: order.vendorId, // Keep reference to original vendor
    };
    
    // Keep vendorId for reference but mark as escalated
    // Don't remove vendorId so we can track which vendor escalated

    // Add rejection details
    order.notes = `${order.notes || ''}\n[Vendor Escalation] Reason: ${reason}${notes ? ` | Notes: ${notes}` : ''}`.trim();

    // Update status timeline
    order.statusTimeline.push({
      status: 'rejected',
      timestamp: new Date(),
      updatedBy: 'vendor',
      note: `Order escalated to admin by vendor. Reason: ${reason}`,
    });

    await order.save();

    // TODO: Send notification to admin and user

    console.log(`⚠️ Order ${order.orderNumber} rejected by vendor ${vendor.name}. Reason: ${reason}`);

    res.status(200).json({
      success: true,
      data: {
        order,
        message: 'Order rejected and escalated to admin',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Partially accept order (splits order)
 * @route   POST /api/vendors/orders/:orderId/accept-partial
 * @access  Private (Vendor)
 */
exports.acceptOrderPartially = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { orderId } = req.params;
    const { acceptedItems, rejectedItems, notes } = req.body;

    if (!acceptedItems || !Array.isArray(acceptedItems) || acceptedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one accepted item is required',
      });
    }

    if (!rejectedItems || !Array.isArray(rejectedItems) || rejectedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one rejected item is required for partial acceptance',
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      vendorId: vendor._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be partially accepted. Current status: ${order.status}`,
      });
    }

    // Get original order items for calculations
    const originalItems = order.items.map(item => item.toObject ? item.toObject() : item);
    
    // Calculate accepted order total
    const acceptedTotal = originalItems
      .filter(item => acceptedItems.some(ai => ai.itemId && ai.itemId.toString() === item._id.toString()))
      .reduce((sum, item) => {
        const acceptedItem = acceptedItems.find(ai => ai.itemId && ai.itemId.toString() === item._id.toString());
        const quantity = acceptedItem.quantity || item.quantity;
        return sum + (item.unitPrice * quantity);
      }, 0);

    // Calculate rejected order total
    const rejectedTotal = originalItems
      .filter(item => rejectedItems.some(ri => ri.itemId && ri.itemId.toString() === item._id.toString()))
      .reduce((sum, item) => {
        const rejectedItem = rejectedItems.find(ri => ri.itemId && ri.itemId.toString() === item._id.toString());
        const quantity = rejectedItem.quantity || item.quantity;
        return sum + (item.unitPrice * quantity);
      }, 0);

    // Create vendor order (accepted items)
    const vendorOrderItems = originalItems
      .filter(item => acceptedItems.some(ai => ai.itemId && ai.itemId.toString() === item._id.toString()))
      .map(item => {
        const acceptedItem = acceptedItems.find(ai => ai.itemId && ai.itemId.toString() === item._id.toString());
        return {
          productId: item.productId,
          productName: item.productName,
          quantity: acceptedItem.quantity || item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * (acceptedItem.quantity || item.quantity),
        };
      });

    order.items = vendorOrderItems;
    order.totalAmount = acceptedTotal;
    order.status = 'partially_accepted';
    order.assignedTo = 'vendor';

    if (notes) {
      order.notes = `${order.notes || ''}\n[Vendor Partial Acceptance] ${notes}`.trim();
    }

    // Update status timeline
    order.statusTimeline.push({
      status: 'partially_accepted',
      timestamp: new Date(),
      updatedBy: 'vendor',
      note: 'Order partially accepted. Some items escalated to admin.',
    });

    await order.save();

    // Save vendor order first to get original items
    const originalOrder = await Order.findById(orderId).lean();
    
    // Create admin order (rejected items) - escalated order
    const adminOrderItems = originalOrder.items
      .filter(item => rejectedItems.some(ri => ri.itemId && ri.itemId.toString() === item._id.toString()))
      .map(item => {
        const rejectedItem = rejectedItems.find(ri => ri.itemId && ri.itemId.toString() === item._id.toString());
        return {
          productId: item.productId,
          productName: item.productName,
          quantity: rejectedItem.quantity || item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * (rejectedItem.quantity || item.quantity),
        };
      });

    // Get escalation details
    const escalatedItemsDetails = originalOrder.items
      .filter(item => rejectedItems.some(ri => ri.itemId && ri.itemId.toString() === item._id.toString()))
      .map(item => {
        const rejectedItem = rejectedItems.find(ri => ri.itemId && ri.itemId.toString() === item._id.toString());
        return {
          itemId: item._id,
          productId: item.productId,
          productName: item.productName,
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          escalatedQuantity: rejectedItem.quantity || item.quantity,
          reason: rejectedItem.reason || notes || 'Item not available',
        };
      });

    // Generate new order number for admin order
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const todayStart = new Date(date);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(date);
    todayEnd.setHours(23, 59, 59, 999);
    const todayCount = await Order.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    const sequence = String(todayCount + 1).padStart(4, '0');
    const orderNumber = `ORD-${dateStr}-${sequence}`;

    const adminOrder = await Order.create({
      orderNumber,
      userId: order.userId,
      sellerId: order.sellerId,
      seller: order.seller,
      vendorId: null, // Not assigned to any vendor
      assignedTo: 'admin',
      items: adminOrderItems,
      subtotal: rejectedTotal,
      deliveryCharge: 0,
      totalAmount: rejectedTotal,
      paymentPreference: order.paymentPreference,
      upfrontAmount: order.paymentPreference === 'full' ? rejectedTotal : Math.round(rejectedTotal * 0.3),
      remainingAmount: order.paymentPreference === 'full' ? 0 : rejectedTotal - Math.round(rejectedTotal * 0.3),
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      parentOrderId: order._id, // Link to original order
      deliveryAddress: order.deliveryAddress,
      status: 'rejected', // Escalated to admin
      escalation: {
        isEscalated: true,
        escalatedAt: new Date(),
        escalatedBy: 'vendor',
        escalationReason: notes || 'Items not available',
        escalationType: 'partial',
        escalatedItems: escalatedItemsDetails,
        originalVendorId: vendor._id,
      },
      notes: `[Escalated from Order ${order.orderNumber}] Items rejected by vendor.${notes ? ` ${notes}` : ''}`,
      statusTimeline: [{
        status: 'rejected',
        timestamp: new Date(),
        updatedBy: 'vendor',
        note: 'Order escalated to admin due to partial rejection by vendor',
      }],
    });

    // Link original order to admin order
    order.childOrderIds = order.childOrderIds || [];
    order.childOrderIds.push(adminOrder._id);
    await order.save();

    // TODO: Send notifications to admin and user

    console.log(`⚠️ Order ${order.orderNumber} partially accepted by vendor ${vendor.name}. Admin order created: ${adminOrder.orderNumber}`);

    res.status(200).json({
      success: true,
      data: {
        vendorOrder: order,
        adminOrder,
        message: 'Order partially accepted. Rejected items escalated to admin.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Escalate order with partial quantities (Scenario 3)
 * @route   POST /api/vendors/orders/:orderId/escalate-partial
 * @access  Private (Vendor)
 */
exports.escalateOrderPartial = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { orderId } = req.params;
    const { escalatedItems, reason, notes } = req.body;

    if (!escalatedItems || !Array.isArray(escalatedItems) || escalatedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Escalated items are required',
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Escalation reason is required',
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      vendorId: vendor._id,
    }).populate('items.productId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be escalated. Current status: ${order.status}`,
      });
    }

    const ProductAssignment = require('../models/ProductAssignment');
    const escalatedItemsDetails = [];
    const acceptedItems = [];
    let escalatedTotal = 0;
    let acceptedTotal = 0;

    // Process each item in the order
    for (const orderItem of order.items) {
      const escalatedItem = escalatedItems.find(
        ei => ei.itemId && ei.itemId.toString() === orderItem._id.toString()
      );

      if (escalatedItem) {
        // This item (or part of it) is being escalated
        const assignment = await ProductAssignment.findOne({
          productId: orderItem.productId,
          vendorId: vendor._id,
        });
        const availableStock = assignment?.vendorStock || 0;
        const requestedQty = orderItem.quantity;
        const escalatedQty = escalatedItem.escalatedQuantity || requestedQty;
        const acceptedQty = requestedQty - escalatedQty;

        if (escalatedQty > 0) {
          escalatedItemsDetails.push({
            itemId: orderItem._id,
            productId: orderItem.productId,
            productName: orderItem.productName,
            requestedQuantity: requestedQty,
            availableQuantity: availableStock,
            escalatedQuantity: escalatedQty,
            reason: escalatedItem.reason || reason,
          });
          escalatedTotal += orderItem.unitPrice * escalatedQty;
        }

        if (acceptedQty > 0) {
          acceptedItems.push({
            ...orderItem.toObject(),
            quantity: acceptedQty,
            totalPrice: orderItem.unitPrice * acceptedQty,
          });
          acceptedTotal += orderItem.unitPrice * acceptedQty;
        }
      } else {
        // Item is fully accepted
        acceptedItems.push(orderItem.toObject());
        acceptedTotal += orderItem.totalPrice;
      }
    }

    // Update order with accepted items
    order.items = acceptedItems;
    order.subtotal = acceptedTotal;
    order.totalAmount = acceptedTotal + (order.deliveryCharge || 0);
    order.status = 'partially_accepted';
    order.assignedTo = 'vendor';

    // Create escalated order for admin
    const escalatedOrderItems = escalatedItemsDetails.map(ei => ({
      productId: ei.productId,
      productName: ei.productName,
      quantity: ei.escalatedQuantity,
      unitPrice: order.items.find(item => item.productId.toString() === ei.productId.toString())?.unitPrice || 0,
      totalPrice: (order.items.find(item => item.productId.toString() === ei.productId.toString())?.unitPrice || 0) * ei.escalatedQuantity,
      status: 'pending',
    }));

    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const todayStart = new Date(date);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(date);
    todayEnd.setHours(23, 59, 59, 999);
    const todayCount = await Order.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    const sequence = String(todayCount + 1).padStart(4, '0');
    const escalatedOrderNumber = `ORD-${dateStr}-${sequence}`;

    const escalatedOrder = await Order.create({
      orderNumber: escalatedOrderNumber,
      userId: order.userId,
      sellerId: order.sellerId,
      seller: order.seller,
      vendorId: null,
      assignedTo: 'admin',
      items: escalatedOrderItems,
      subtotal: escalatedTotal,
      deliveryCharge: 0, // Admin handles delivery
      totalAmount: escalatedTotal,
      paymentPreference: order.paymentPreference,
      upfrontAmount: order.paymentPreference === 'full' ? escalatedTotal : Math.round(escalatedTotal * 0.3),
      remainingAmount: order.paymentPreference === 'full' ? 0 : escalatedTotal - Math.round(escalatedTotal * 0.3),
      paymentStatus: order.paymentStatus,
      deliveryAddress: order.deliveryAddress,
      status: 'rejected',
      parentOrderId: order._id,
      escalation: {
        isEscalated: true,
        escalatedAt: new Date(),
        escalatedBy: 'vendor',
        escalationReason: reason,
        escalationType: 'quantity',
        escalatedItems: escalatedItemsDetails,
        originalVendorId: vendor._id,
      },
      notes: `[Escalated from Order ${order.orderNumber}] Partial quantity escalated by vendor. Reason: ${reason}${notes ? ` | Notes: ${notes}` : ''}`,
      statusTimeline: [{
        status: 'rejected',
        timestamp: new Date(),
        updatedBy: 'vendor',
        note: `Partial quantity escalated to admin. Reason: ${reason}`,
      }],
    });

    // Link orders
    order.childOrderIds = order.childOrderIds || [];
    order.childOrderIds.push(escalatedOrder._id);
    order.notes = `${order.notes || ''}\n[Partial Escalation] Some quantities escalated to admin. Reason: ${reason}`.trim();
    order.statusTimeline.push({
      status: 'partially_accepted',
      timestamp: new Date(),
      updatedBy: 'vendor',
      note: `Order partially accepted. Some quantities escalated to admin.`,
    });

    await order.save();

    console.log(`⚠️ Order ${order.orderNumber} partially escalated by vendor ${vendor.name}. Escalated order: ${escalatedOrder.orderNumber}`);

    res.status(200).json({
      success: true,
      data: {
        vendorOrder: order,
        escalatedOrder,
        message: 'Order partially accepted. Escalated quantities sent to admin.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/vendors/orders/:orderId/status
 * @access  Private (Vendor)
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { orderId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    // Valid status transitions for vendor
    const validStatuses = ['awaiting', 'processing', 'dispatched', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      vendorId: vendor._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    // Validate status transition
    const statusFlow = ['pending', 'awaiting', 'processing', 'dispatched', 'delivered'];
    const currentIndex = statusFlow.indexOf(order.status);
    const newIndex = statusFlow.indexOf(status);

    if (newIndex <= currentIndex) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}. Invalid transition.`,
      });
    }

    // Update order status
    order.status = status;

    // Update delivery date if delivered
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      
      // TODO: Trigger remaining payment if partial payment order
      // This would be handled by a background job or payment service
    }

    // Add note if provided
    if (notes) {
      order.notes = `${order.notes || ''}\n[Status Update] ${notes}`.trim();
    }

    // Update status timeline
    order.statusTimeline.push({
      status,
      timestamp: new Date(),
      updatedBy: 'vendor',
      note: notes || `Order status updated to ${status}`,
    });

    await order.save();

    // TODO: Send real-time notification to user (WebSocket/SSE)

    console.log(`✅ Order ${order.orderNumber} status updated to ${status} by vendor ${vendor.name}`);

    res.status(200).json({
      success: true,
      data: {
        order,
        message: `Order status updated to ${status}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order statistics
 * @route   GET /api/vendors/orders/stats
 * @access  Private (Vendor)
 */
exports.getOrderStats = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { period = '30' } = req.query; // days

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Order status breakdown
    const statusBreakdown = await Order.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          createdAt: { $gte: daysAgo },
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

    // Total sales (delivered orders)
    const salesData = await Order.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          status: 'delivered',
          paymentStatus: 'fully_paid',
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
        },
      },
    ]);

    // Daily trends
    const dailyTrends = await Order.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          sales: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'delivered'] }, { $eq: ['$paymentStatus', 'fully_paid'] }] },
                '$totalAmount',
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: parseInt(period),
        statusBreakdown,
        sales: salesData[0] || {
          totalSales: 0,
          orderCount: 0,
          averageOrderValue: 0,
        },
        dailyTrends,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// INVENTORY MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all products available for ordering (not just assigned)
 * @route   GET /api/vendors/products
 * @access  Private (Vendor)
 */
exports.getProducts = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    await processPendingDeliveries(vendor._id);
    const {
      page = 1,
      limit = 20,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query - only show active products
    const query = { isActive: true };

    if (category) {
      query.category = category.toLowerCase();
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

    // Get all active products (vendors can see all products to order)
    const products = await Product.find(query)
      .select('name description category priceToVendor displayStock actualStock images sku weight expiry')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Check which products are assigned to this vendor
    const productIds = products.map(p => p._id);
    let ordersCountMap = {};

    if (productIds.length > 0) {
      const ordersCounts = await Order.aggregate([
        {
          $match: {
            vendorId: vendor._id,
            'items.productId': { $in: productIds },
          },
        },
        { $unwind: '$items' },
        {
          $match: {
            'items.productId': { $in: productIds },
          },
        },
        {
          $group: {
            _id: '$items.productId',
            ordersCount: { $sum: 1 },
          },
        },
      ]);

      ordersCountMap = ordersCounts.reduce((acc, item) => {
        acc[item._id.toString()] = item.ordersCount;
        return acc;
      }, {});
    }
    const assignments = await ProductAssignment.find({
      vendorId: vendor._id,
      productId: { $in: productIds },
      isActive: true,
    }).lean();

    const assignedProductIds = new Set(assignments.map(a => a.productId.toString()));

    // Check for incoming deliveries (approved purchases within 24 hours)
    // Only show if delivery hasn't been completed yet
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const incomingPurchases = await CreditPurchase.find({
      vendorId: vendor._id,
      status: 'approved',
      deliveryStatus: { $in: ['scheduled', 'in_transit'] },
      expectedDeliveryAt: {
        $gte: now, // Only future deliveries
        $lte: twentyFourHoursFromNow, // Within 24 hours
      },
    })
      .select('items expectedDeliveryAt deliveryStatus')
      .lean();

    // Create a map of productId -> incoming delivery info
    const incomingDeliveryMap = {};
    incomingPurchases.forEach((purchase) => {
      purchase.items.forEach((item) => {
        const productIdStr = item.productId?.toString();
        if (productIdStr) {
          if (!incomingDeliveryMap[productIdStr]) {
            incomingDeliveryMap[productIdStr] = {
              isArrivingWithin24Hours: true,
              expectedDeliveryAt: purchase.expectedDeliveryAt,
              deliveryStatus: purchase.deliveryStatus,
            };
          }
        }
      });
    });

    // Enrich products with assignment status and vendor-specific info
    const enrichedProducts = products.map(product => {
      const isAssigned = assignedProductIds.has(product._id.toString());
      const assignment = assignments.find(a => a.productId.toString() === product._id.toString());
      const adminStock = product.displayStock ?? product.stock ?? 0;
      const vendorStock = assignment?.stock ?? 0;
      const incomingDelivery = incomingDeliveryMap[product._id.toString()];
      
      return {
        ...product,
        id: product._id,
        isAssigned,
        assignmentId: assignment?._id || null,
        adminStock,
        vendorStock,
        vendorOrdersCount: ordersCountMap[product._id.toString()] || 0,
        // Stock available for ordering is admin managed stock
        stock: adminStock,
        stockStatus: adminStock > 0 ? 'in_stock' : 'out_of_stock',
        pricePerUnit: product.priceToVendor,
        unit: product.weight?.unit || 'kg',
        primaryImage: product.images?.find(img => img.isPrimary)?.url || product.images?.[0]?.url || null,
        // Incoming delivery info
        isArrivingWithin24Hours: incomingDelivery?.isArrivingWithin24Hours || false,
        expectedDeliveryAt: incomingDelivery?.expectedDeliveryAt || null,
      };
    });

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products: enrichedProducts,
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
 * @desc    Get single product details for vendor
 * @route   GET /api/vendors/products/:productId
 * @access  Private (Vendor)
 */
exports.getProductDetails = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { productId } = req.params;

    const product = await Product.findById(productId)
      .select('name description category priceToVendor displayStock actualStock images sku weight expiry brand specifications tags')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if product is assigned to this vendor
    const assignment = await ProductAssignment.findOne({
      vendorId: vendor._id,
      productId: product._id,
      isActive: true,
    }).lean();

    const vendorOrdersCount = await Order.countDocuments({
      vendorId: vendor._id,
      'items.productId': product._id,
    });

    // Calculate how many orders the vendor has fulfilled for this product
    const ordersAggregation = await Order.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          items: { $elemMatch: { productId: product._id } },
        },
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.productId': product._id,
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$items.quantity' },
        },
      },
    ]);

    const ordersInfo = ordersAggregation[0] || { totalOrders: 0, totalQuantity: 0 };

    res.status(200).json({
      success: true,
      data: {
        product: {
          id: product._id,
          name: product.name,
          description: product.description,
          category: product.category,
          priceToVendor: product.priceToVendor,
          pricePerUnit: product.priceToVendor,
          adminStock: product.displayStock ?? product.stock ?? 0,
          vendorStock: assignment?.stock ?? 0,
          vendorOrdersCount,
          stockStatus: (product.displayStock ?? product.stock ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
          images: product.images,
          primaryImage: product.images?.find(img => img.isPrimary)?.url || product.images?.[0]?.url || null,
          sku: product.sku,
          weight: product.weight,
          unit: product.weight?.unit || 'kg',
          expiry: product.expiry,
          brand: product.brand,
          specifications: product.specifications,
          tags: product.tags,
          isAssigned: !!assignment,
          assignmentId: assignment?._id || null,
          ordersFulfilled: ordersInfo.totalOrders,
          quantitySupplied: ordersInfo.totalQuantity,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory items (assigned products)
 * @route   GET /api/vendors/inventory
 * @access  Private (Vendor)
 */
exports.getInventory = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    await processPendingDeliveries(vendor._id);
    const {
      page = 1,
      limit = 20,
      category,
      search,
      isActive,
      sortBy = 'assignedAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = { vendorId: vendor._id };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get product assignments
    let assignments = await ProductAssignment.find(query)
      .populate('productId', 'name sku category priceToUser imageUrl description')
      .populate('assignedBy', 'name email')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v')
      .lean();

    // Filter by category or search if needed
    if (category) {
      assignments = assignments.filter(a => a.productId && a.productId.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      assignments = assignments.filter(a =>
        a.productId && (
          a.productId.name.toLowerCase().includes(searchLower) ||
          a.productId.sku.toLowerCase().includes(searchLower)
        )
      );
    }

    const total = await ProductAssignment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        inventory: assignments,
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
 * @desc    Get inventory item details
 * @route   GET /api/vendors/inventory/:itemId
 * @access  Private (Vendor)
 */
exports.getInventoryItemDetails = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { itemId } = req.params;

    const assignment = await ProductAssignment.findOne({
      _id: itemId,
      vendorId: vendor._id,
    })
      .populate('productId')
      .populate('assignedBy', 'name email')
      .select('-__v');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found or not assigned to you',
      });
    }

    // Get order count for this product from this vendor
    const orderCount = await Order.countDocuments({
      vendorId: vendor._id,
      'items.productId': assignment.productId._id,
      status: 'delivered',
    });

    res.status(200).json({
      success: true,
      data: {
        assignment,
        statistics: {
          orderCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update inventory stock (placeholder - stock tracking to be added to ProductAssignment model)
 * @route   PUT /api/vendors/inventory/:itemId/stock
 * @access  Private (Vendor)
 */
exports.updateInventoryStock = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { itemId } = req.params;
    const { stock, notes } = req.body;

    if (stock === undefined || stock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid stock quantity is required (≥ 0)',
      });
    }

    const assignment = await ProductAssignment.findOne({
      _id: itemId,
      vendorId: vendor._id,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found or not assigned to you',
      });
    }

    // TODO: When stock tracking is added to ProductAssignment model
    // assignment.stock = stock;
    // assignment.lastStockUpdate = new Date();
    // if (notes) {
    //   assignment.stockNotes = `${assignment.stockNotes || ''}\n[${new Date().toISOString()}] ${notes}`.trim();
    // }
    // await assignment.save();

    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      data: {
        message: 'Stock update functionality will be available when inventory model is enhanced',
        assignment,
        // stock: assignment.stock, // Will be available after model update
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory statistics
 * @route   GET /api/vendors/inventory/stats
 * @access  Private (Vendor)
 */
exports.getInventoryStats = async (req, res, next) => {
  try {
    const vendor = req.vendor;

    // Get all assigned products
    const totalProducts = await ProductAssignment.countDocuments({
      vendorId: vendor._id,
      isActive: true,
    });

    // Get products by category
    const assignments = await ProductAssignment.find({
      vendorId: vendor._id,
      isActive: true,
    }).populate('productId', 'category');

    const categoryBreakdown = {};
    assignments.forEach(assignment => {
      if (assignment.productId && assignment.productId.category) {
        const category = assignment.productId.category;
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      }
    });

    // Get top ordered products
    const topProducts = await Order.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          status: 'delivered',
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
        $sort: { totalQuantity: -1 },
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
        totalProducts,
        categoryBreakdown,
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// CREDIT MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get credit information
 * @route   GET /api/vendors/credit
 * @access  Private (Vendor)
 */
exports.getCreditInfo = async (req, res, next) => {
  try {
    const vendor = req.vendor;

    const creditUsed = vendor.creditUsed || 0;

    // Check for unpaid credits
    const now = new Date();
    const repaymentDays = vendor.creditPolicy.repaymentDays || 30;
    const unpaidPurchases = await CreditPurchase.find({
      vendorId: vendor._id,
      status: 'approved',
      $or: [
        { deliveryStatus: { $in: ['pending', 'scheduled', 'in_transit'] } },
        {
          deliveryStatus: 'delivered',
          deliveredAt: {
            $gte: new Date(now.getTime() - repaymentDays * 24 * 60 * 60 * 1000),
          },
        },
      ],
    }).select('totalAmount deliveredAt deliveryStatus createdAt');

    const totalUnpaidAmount = unpaidPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    // Check if credit is overdue
    const isOverdue = vendor.creditPolicy.dueDate && now > vendor.creditPolicy.dueDate;
    const daysOverdue = isOverdue && vendor.creditPolicy.dueDate
      ? Math.floor((now - vendor.creditPolicy.dueDate) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate penalty if overdue
    let penalty = 0;
    const penaltyRate = vendor.creditPolicy.penaltyRate || 2;
    if (isOverdue && penaltyRate > 0) {
      const dailyPenaltyRate = penaltyRate / 100;
      penalty = creditUsed * dailyPenaltyRate * daysOverdue;
    }

    // Days until due
    const daysUntilDue = vendor.creditPolicy.dueDate && !isOverdue
      ? Math.ceil((vendor.creditPolicy.dueDate - now) / (1000 * 60 * 60 * 24))
      : null;

    res.status(200).json({
      success: true,
      data: {
        credit: {
          used: creditUsed,
          totalUnpaid: totalUnpaidAmount,
          unpaidCount: unpaidPurchases.length,
          dueDate: vendor.creditPolicy.dueDate,
          repaymentDays: vendor.creditPolicy.repaymentDays || 30,
          penaltyRate: penaltyRate,
        },
        status: {
          isOverdue,
          daysOverdue,
          daysUntilDue,
          penalty: Math.round(penalty * 100) / 100,
          status: isOverdue ? 'overdue' : daysUntilDue !== null && daysUntilDue <= 7 ? 'dueSoon' : 'active',
          hasUnpaidCredits: unpaidPurchases.length > 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request credit purchase
 * @route   POST /api/vendors/credit/purchase
 * @access  Private (Vendor)
 */
exports.requestCreditPurchase = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const {
      items,
      notes,
      reason,
      bankDetails = {},
      confirmationText,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product must be included in the request.',
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Provide a brief reason (minimum 10 characters) for the stock request.',
      });
    }

    if (!confirmationText || confirmationText.trim().toLowerCase() !== 'confirm') {
      return res.status(400).json({
        success: false,
        message: 'Type "confirm" to acknowledge the credit policy and submit the request.',
      });
    }

    const requiredBankFields = ['accountName', 'accountNumber', 'bankName', 'ifsc'];
    const missingField = requiredBankFields.find((field) => !bankDetails[field] || !bankDetails[field].trim());
    if (missingField) {
      return res.status(400).json({
        success: false,
        message: 'Complete bank details are required (account holder, number, bank name, IFSC).',
      });
    }

    const sanitizedBankDetails = {
      accountName: bankDetails.accountName.trim(),
      accountNumber: bankDetails.accountNumber.toString().trim(),
      bankName: bankDetails.bankName.trim(),
      ifsc: bankDetails.ifsc.trim().toUpperCase(),
      branch: bankDetails.bankBranch?.trim() || bankDetails.branch?.trim() || '',
    };

    if (sanitizedBankDetails.accountNumber.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Account number looks incomplete.',
      });
    }

    if (sanitizedBankDetails.ifsc.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid IFSC code.',
      });
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    })
      .select('name priceToVendor displayStock stock weight')
      .lean();

    const productMap = products.reduce((acc, product) => {
      acc[product._id.toString()] = product;
      return acc;
    }, {});

    let totalAmount = 0;
    const purchaseItems = items.map((item) => {
      const productId = item.productId?.toString();
      const product = productMap[productId];
      if (!product) {
        throw new Error('One of the selected products is no longer available.');
      }

      const quantity = Number(item.quantity) || 0;
      if (quantity <= 0) {
        throw new Error('Each item must include a valid quantity.');
      }

      const adminStock = product.displayStock ?? product.stock ?? 0;
      if (quantity > adminStock) {
        throw new Error(`Requested quantity for ${product.name} exceeds admin stock.`);
      }

      const unitPrice = Number(product.priceToVendor) || 0;
      const totalPrice = quantity * unitPrice;
      totalAmount += totalPrice;

      return {
        productId: productId,
        productName: product.name,
        quantity,
        unitPrice,
        totalPrice,
        unit: product.weight?.unit || 'kg',
      };
    });

    if (totalAmount < MIN_VENDOR_PURCHASE) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value is ₹${MIN_VENDOR_PURCHASE.toLocaleString('en-IN')}.`,
      });
    }

    if (totalAmount > MAX_VENDOR_PURCHASE) {
      return res.status(400).json({
        success: false,
        message: `Maximum order value is ₹${MAX_VENDOR_PURCHASE.toLocaleString('en-IN')}. Your request: ₹${totalAmount.toLocaleString('en-IN')}.`,
      });
    }

    // Check for unpaid credits
    const now = new Date();
    const repaymentDays = vendor.creditPolicy.repaymentDays || 30;
    const unpaidPurchases = await CreditPurchase.find({
      vendorId: vendor._id,
      status: 'approved',
      $or: [
        { deliveryStatus: { $in: ['pending', 'scheduled', 'in_transit'] } },
        {
          deliveryStatus: 'delivered',
          deliveredAt: {
            $gte: new Date(now.getTime() - repaymentDays * 24 * 60 * 60 * 1000),
          },
        },
      ],
    }).select('totalAmount deliveredAt deliveryStatus createdAt');

    const hasUnpaidCredits = unpaidPurchases.length > 0;
    const totalUnpaidAmount = unpaidPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    if (hasUnpaidCredits) {
      return res.status(400).json({
        success: false,
        message: 'You have unpaid credits from previous purchase requests. Please clear your outstanding payments before making a new request. Failure to repay may result in account suspension or permanent ban.',
        unpaidCredits: {
          count: unpaidPurchases.length,
          totalAmount: totalUnpaidAmount,
          purchases: unpaidPurchases.map((p) => ({
            amount: p.totalAmount,
            deliveredAt: p.deliveredAt,
            deliveryStatus: p.deliveryStatus,
            createdAt: p.createdAt,
          })),
        },
      });
    }

    const purchase = await CreditPurchase.create({
      vendorId: vendor._id,
      items: purchaseItems,
      totalAmount,
      status: 'pending',
      notes: notes?.trim() || undefined,
      reason: reason.trim(),
      bankDetails: sanitizedBankDetails,
      confirmationText: confirmationText.trim(),
      deliveryStatus: 'pending',
    });

    console.log(`✅ Credit purchase requested: ₹${totalAmount} by vendor ${vendor.name} - ${vendor._id}`);

    res.status(201).json({
      success: true,
      data: {
        purchase,
        message: 'Credit purchase request submitted successfully. Awaiting admin approval.',
      },
    });
  } catch (error) {
    if (error.message && error.message.includes('exceeds admin stock')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Get credit purchase requests
 * @route   GET /api/vendors/credit/purchases
 * @access  Private (Vendor)
 */
exports.getCreditPurchases = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { vendorId: vendor._id };

    if (status) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const purchases = await CreditPurchase.find(query)
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v')
      .lean();

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
 * @desc    Get credit purchase details
 * @route   GET /api/vendors/credit/purchases/:requestId
 * @access  Private (Vendor)
 */
exports.getCreditPurchaseDetails = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { requestId } = req.params;

    const purchase = await CreditPurchase.findOne({
      _id: requestId,
      vendorId: vendor._id,
    })
      .populate('reviewedBy', 'name email')
      .populate('items.productId', 'name sku category')
      .select('-__v');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Credit purchase request not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        purchase,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get credit history
 * @route   GET /api/vendors/credit/history
 * @access  Private (Vendor)
 */
exports.getCreditHistory = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { page = 1, limit = 20, period = '30' } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const query = {
      vendorId: vendor._id,
      createdAt: { $gte: daysAgo },
    };

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const purchases = await CreditPurchase.find(query)
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v')
      .lean();

    // Calculate summary
    const summary = await CreditPurchase.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    const total = await CreditPurchase.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        purchases,
        summary,
        period: parseInt(period),
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
// REPORTS & ANALYTICS CONTROLLERS
// ============================================================================

/**
 * @desc    Get reports data
 * @route   GET /api/vendors/reports
 * @access  Private (Vendor)
 */
exports.getReports = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { period = '30', type = 'summary' } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Revenue summary
    const revenueData = await Order.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          status: 'delivered',
          paymentStatus: 'fully_paid',
          createdAt: { $gte: daysAgo },
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

    // Order breakdown
    const orderBreakdown = await Order.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          createdAt: { $gte: daysAgo },
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

    // Payment summary
    const Payment = require('../models/Payment');
    const vendorOrderIds = await Order.distinct('_id', {
      vendorId: vendor._id,
      createdAt: { $gte: daysAgo },
    });

    const paymentData = await Payment.aggregate([
      {
        $match: {
          orderId: { $in: vendorOrderIds },
          status: 'fully_paid',
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: parseInt(period),
        type,
        revenue: revenueData[0] || {
          totalRevenue: 0,
          orderCount: 0,
          averageOrderValue: 0,
        },
        orders: {
          breakdown: orderBreakdown,
          total: orderBreakdown.reduce((sum, item) => sum + item.count, 0),
        },
        payments: {
          breakdown: paymentData,
          total: paymentData.reduce((sum, item) => sum + item.totalAmount, 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get performance analytics
 * @route   GET /api/vendors/reports/analytics
 * @access  Private (Vendor)
 */
exports.getPerformanceAnalytics = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    const { period = '30' } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Sales trends
    const salesTrends = await Order.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          status: 'delivered',
          paymentStatus: 'fully_paid',
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

    // Top products
    const topProducts = await Order.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          status: 'delivered',
          paymentStatus: 'fully_paid',
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

    // User region stats (if user location data available)
    const userRegionStats = await Order.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          status: 'delivered',
          paymentStatus: 'fully_paid',
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $group: {
          _id: {
            city: '$user.location.city',
            state: '$user.location.state',
          },
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          city: '$_id.city',
          state: '$_id.state',
          orderCount: 1,
          totalRevenue: 1,
          uniqueCustomers: { $size: '$uniqueUsers' },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: parseInt(period),
        analytics: {
          salesTrends,
          topProducts,
          userRegionStats,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

