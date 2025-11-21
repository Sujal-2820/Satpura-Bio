/**
 * Vendor Controller
 * 
 * Handles all vendor-related operations
 */

const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ProductAssignment = require('../models/ProductAssignment');
const CreditPurchase = require('../models/CreditPurchase');

const { generateOTP, sendOTP } = require('../config/sms');
const { generateToken } = require('../middleware/auth');
const { OTP_EXPIRY_MINUTES, MIN_VENDOR_PURCHASE, VENDOR_COVERAGE_RADIUS_KM } = require('../utils/constants');

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

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ phone });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor with this phone number already exists',
      });
    }

    // CRITICAL: Verify 20km radius rule - Only 1 vendor allowed per 20km radius
    // Use transaction to prevent race conditions during concurrent registrations
    if (location.coordinates && location.coordinates.lat && location.coordinates.lng) {
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          // Check if another approved or pending vendor exists within 20km
          // Using MongoDB geospatial query with 2dsphere index
          const nearbyVendors = await Vendor.find({
            phone: { $ne: phone }, // Exclude current vendor if exists
            status: { $in: ['pending', 'approved'] }, // Check both pending and approved
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
            status: { $in: ['pending', 'approved'] },
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

    // Create vendor
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
        message: 'Registration request submitted. OTP sent to phone.',
        vendorId: vendor._id,
        requiresApproval: true,
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

    let vendor = await Vendor.findOne({ phone });

    // If vendor doesn't exist, create pending registration
    if (!vendor) {
      vendor = new Vendor({
        phone,
        status: 'pending',
      });
    }

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

    const vendor = await Vendor.findOne({ phone });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
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

    // Check if vendor is approved and active
    if (vendor.status !== 'approved' || !vendor.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account is pending approval or inactive. Please contact admin.',
      });
    }

    // Clear OTP after successful verification
    vendor.clearOTP();
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

    // Build query - only orders assigned to this vendor
    const query = { vendorId: vendor._id };

    if (status) {
      query.status = status;
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
    order.vendorId = null; // Remove vendor assignment
    order.assignedTo = 'admin'; // Escalate to admin
    
    // Track escalation
    if (vendor) {
      vendor.escalationCount = (vendor.escalationCount || 0) + 1;
      vendor.escalationHistory.push({
        orderId: order._id,
        escalatedAt: new Date(),
        reason: 'Order rejected by vendor',
      });
      await vendor.save();
    }
    order.status = 'rejected'; // Mark as rejected by vendor

    // Add rejection details
    order.notes = `${order.notes || ''}\n[Vendor Rejection] Reason: ${reason}${notes ? ` | Notes: ${notes}` : ''}`.trim();

    // Update status timeline
    order.statusTimeline.push({
      status: 'rejected',
      timestamp: new Date(),
      updatedBy: 'vendor',
      note: `Order rejected by vendor. Reason: ${reason}`,
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

    // Generate new order number for admin order
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const adminOrder = await Order.create({
      orderNumber,
      userId: order.userId,
      sellerId: order.sellerId,
      vendorId: null, // Not assigned to any vendor
      assignedTo: 'admin',
      items: adminOrderItems,
      totalAmount: rejectedTotal,
      status: 'rejected', // Escalated to admin
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      parentOrderId: order._id, // Link to original order
      deliveryAddress: order.deliveryAddress,
      notes: `[Escalated from Order ${order.orderNumber}] Items rejected by vendor.${notes ? ` ${notes}` : ''}`,
      statusTimeline: [{
        status: 'rejected',
        timestamp: new Date(),
        updatedBy: 'system',
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
 * @desc    Get inventory items (assigned products)
 * @route   GET /api/vendors/inventory
 * @access  Private (Vendor)
 */
exports.getInventory = async (req, res, next) => {
  try {
    const vendor = req.vendor;
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

    // Days until due
    const daysUntilDue = vendor.creditPolicy.dueDate && !isOverdue
      ? Math.ceil((vendor.creditPolicy.dueDate - now) / (1000 * 60 * 60 * 24))
      : null;

    res.status(200).json({
      success: true,
      data: {
        credit: {
          limit: creditLimit,
          used: creditUsed,
          remaining: creditRemaining,
          utilization: Math.round(creditUtilization * 100) / 100,
          dueDate: vendor.creditPolicy.dueDate,
          repaymentDays: vendor.creditPolicy.repaymentDays,
          penaltyRate: vendor.creditPolicy.penaltyRate,
        },
        status: {
          isOverdue,
          daysOverdue,
          daysUntilDue,
          penalty: Math.round(penalty * 100) / 100,
          status: isOverdue ? 'overdue' : daysUntilDue !== null && daysUntilDue <= 7 ? 'dueSoon' : 'active',
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
    const { items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required',
      });
    }

    // Calculate total amount
    let totalAmount = 0;
    const purchaseItems = items.map(item => {
      const itemTotal = (item.quantity || 0) * (item.pricePerUnit || 0);
      totalAmount += itemTotal;
      return {
        productId: item.productId,
        productName: item.productName || '',
        quantity: item.quantity || 0,
        pricePerUnit: item.pricePerUnit || 0,
        totalPrice: itemTotal,
      };
    });

    // Validate minimum purchase value
    if (totalAmount < MIN_VENDOR_PURCHASE) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase value is ₹${MIN_VENDOR_PURCHASE.toLocaleString('en-IN')}. Your total: ₹${totalAmount.toLocaleString('en-IN')}`,
      });
    }

    // Check credit limit
    const creditLimit = vendor.creditPolicy.limit;
    const creditUsed = vendor.creditUsed;
    const availableCredit = creditLimit - creditUsed;

    if (totalAmount > availableCredit) {
      return res.status(400).json({
        success: false,
        message: `Insufficient credit limit. Available: ₹${availableCredit.toLocaleString('en-IN')}, Requested: ₹${totalAmount.toLocaleString('en-IN')}`,
      });
    }

    // Create credit purchase request
    const purchase = await CreditPurchase.create({
      vendorId: vendor._id,
      items: purchaseItems,
      totalAmount,
      status: 'pending',
      notes,
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

