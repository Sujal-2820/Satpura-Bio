/**
 * Seller (IRA Partner) Controller
 * 
 * Handles all seller-related operations
 */

const Seller = require('../models/Seller');
const User = require('../models/User');
const Order = require('../models/Order');
const Commission = require('../models/Commission');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const BankAccount = require('../models/BankAccount');
const PaymentHistory = require('../models/PaymentHistory');

const { generateOTP, sendOTP } = require('../config/sms');
const { generateToken } = require('../middleware/auth');
const { OTP_EXPIRY_MINUTES, IRA_PARTNER_COMMISSION_THRESHOLD, IRA_PARTNER_COMMISSION_RATE_LOW, IRA_PARTNER_COMMISSION_RATE_HIGH, ORDER_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const { checkPhoneExists, checkPhoneInRole } = require('../utils/phoneValidation');

/**
 * @desc    Seller registration
 * @route   POST /api/sellers/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, phone, area, location } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required',
      });
    }

    // Check if phone exists in other roles (user, vendor)
    const phoneCheck = await checkPhoneExists(phone, 'seller');
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message,
      });
    }

    // Check if seller already exists in seller collection
    const existingSeller = await Seller.findOne({ phone });

    if (existingSeller) {
      return res.status(400).json({
        success: false,
        message: 'Seller with this phone number already exists. Please login instead.',
      });
    }

    // Generate unique sellerId in SLR-XXX format
    const lastSeller = await Seller.findOne()
      .sort({ sellerId: -1 })
      .select('sellerId');

    let nextNumber = 101;
    if (lastSeller && lastSeller.sellerId) {
      // Extract number from SLR-XXX or IRA-XXXX format
      const match = lastSeller.sellerId.match(/\d+$/);
      if (match) {
        const lastNum = parseInt(match[0]);
        // If last was IRA-XXXX format, start from 101
        // If last was SLR-XXX format, increment
        if (lastSeller.sellerId.startsWith('SLR-')) {
          nextNumber = lastNum + 1;
        } else {
          // If last was IRA-XXXX, find highest SLR number or start from 101
          const lastSLRSeller = await Seller.findOne({ sellerId: /^SLR-/ })
            .sort({ sellerId: -1 })
            .select('sellerId');
          if (lastSLRSeller && lastSLRSeller.sellerId) {
            const slrMatch = lastSLRSeller.sellerId.match(/\d+$/);
            if (slrMatch) {
              nextNumber = parseInt(slrMatch[0]) + 1;
            }
          }
        }
      }
    }

    const generatedSellerId = `SLR-${nextNumber}`;

    // Check if generated sellerId already exists (shouldn't happen, but safety check)
    const existingSellerId = await Seller.findOne({ sellerId: generatedSellerId });
    if (existingSellerId) {
      // Find next available number
      let found = false;
      let attempt = nextNumber + 1;
      while (!found && attempt < 10000) {
        const testId = `SLR-${attempt}`;
        const exists = await Seller.findOne({ sellerId: testId });
        if (!exists) {
          nextNumber = attempt;
          found = true;
        } else {
          attempt++;
        }
      }
    }

    const finalSellerId = `SLR-${nextNumber}`;

    // Create seller (requires admin approval)
    const sellerData = {
      sellerId: finalSellerId,
      name,
      phone,
      area: area || '',
      status: 'pending', // Requires admin approval
    };

    // Add location if provided
    if (location) {
      sellerData.location = {
        address: location.address || '',
        city: location.city || '',
        state: location.state || '',
        pincode: location.pincode || '',
      };
    }

    const seller = new Seller(sellerData);

    // Clear any existing OTP before generating new one
    seller.clearOTP();
    
    // Generate new unique OTP
    const otpCode = seller.generateOTP();
    await seller.save();

    // Send OTP via SMS
    try {
      // Enhanced console logging for OTP
      const timestamp = new Date().toISOString();
      console.log('\n' + '='.repeat(60));
      console.log('🔐 SELLER OTP GENERATED (Registration)');
      console.log('='.repeat(60));
      console.log(`📱 Phone: ${phone}`);
      console.log(`🆔 Seller ID: ${seller.sellerId}`);
      console.log(`👤 Name: ${seller.name}`);
      console.log(`🔢 OTP Code: ${otpCode}`);
      console.log(`⏰ Generated At: ${timestamp}`);
      console.log(`⏳ Expires In: 5 minutes`);
      console.log(`📊 Status: ${seller.status} (Pending Admin Approval)`);
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
        sellerId: seller.sellerId, // Return the generated sellerId
        sellerIdCode: seller.sellerId,
        requiresApproval: true,
        expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request OTP for seller
 * @route   POST /api/sellers/auth/request-otp
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

    // Check if phone exists in other roles (user, vendor)
    const phoneCheck = await checkPhoneExists(phone, 'seller');
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message,
      });
    }

    let seller = await Seller.findOne({ phone });

    // If seller doesn't exist, create pending registration with sellerId
    if (!seller) {
      // Generate unique sellerId in SLR-XXX format
      const lastSeller = await Seller.findOne()
        .sort({ sellerId: -1 })
        .select('sellerId');

      let nextNumber = 101;
      if (lastSeller && lastSeller.sellerId) {
        const match = lastSeller.sellerId.match(/\d+$/);
        if (match) {
          const lastNum = parseInt(match[0]);
          if (lastSeller.sellerId.startsWith('SLR-')) {
            nextNumber = lastNum + 1;
          } else {
            const lastSLRSeller = await Seller.findOne({ sellerId: /^SLR-/ })
              .sort({ sellerId: -1 })
              .select('sellerId');
            if (lastSLRSeller && lastSLRSeller.sellerId) {
              const slrMatch = lastSLRSeller.sellerId.match(/\d+$/);
              if (slrMatch) {
                nextNumber = parseInt(slrMatch[0]) + 1;
              }
            }
          }
        }
      }

      const generatedSellerId = `SLR-${nextNumber}`;
      seller = new Seller({
        sellerId: generatedSellerId,
        phone,
        status: 'pending',
      });
    }

    // Clear any existing OTP before generating new one
    seller.clearOTP();
    
    // Generate new unique OTP
    const otpCode = seller.generateOTP();
    await seller.save();

    // Send OTP via SMS
    try {
      // Enhanced console logging for OTP
      const timestamp = new Date().toISOString();
      console.log('\n' + '='.repeat(60));
      console.log('🔐 SELLER OTP GENERATED');
      console.log('='.repeat(60));
      console.log(`📱 Phone: ${phone}`);
      console.log(`🆔 Seller ID: ${seller.sellerId || 'Pending'}`);
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
 * @route   POST /api/sellers/auth/verify-otp
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
    const phoneCheck = await checkPhoneExists(phone, 'seller');
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message,
      });
    }

    // Check if phone exists in seller role
    const sellerCheck = await checkPhoneInRole(phone, 'seller');
    let seller = sellerCheck.data;

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found. Please register first.',
        requiresRegistration: true, // Flag for frontend to redirect
      });
    }

    // Verify OTP
    const isOtpValid = seller.verifyOTP(otp);

    if (!isOtpValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // If seller doesn't have sellerId yet (registration completion), generate it
    if (!seller.sellerId) {
      const lastSeller = await Seller.findOne()
        .sort({ sellerId: -1 })
        .select('sellerId');

      let nextNumber = 101;
      if (lastSeller && lastSeller.sellerId) {
        const match = lastSeller.sellerId.match(/\d+$/);
        if (match) {
          const lastNum = parseInt(match[0]);
          if (lastSeller.sellerId.startsWith('SLR-')) {
            nextNumber = lastNum + 1;
          } else {
            const lastSLRSeller = await Seller.findOne({ sellerId: /^SLR-/ })
              .sort({ sellerId: -1 })
              .select('sellerId');
            if (lastSLRSeller && lastSLRSeller.sellerId) {
              const slrMatch = lastSLRSeller.sellerId.match(/\d+$/);
              if (slrMatch) {
                nextNumber = parseInt(slrMatch[0]) + 1;
              }
            }
          }
        }
      }

      const generatedSellerId = `SLR-${nextNumber}`;
      seller.sellerId = generatedSellerId;
      await seller.save();
      console.log(`✅ Seller ID generated: ${generatedSellerId} for seller ${seller.name} (${seller.phone})`);
    }

    // If seller is pending (just registered), return success with pending status
    if (seller.status === 'pending' || !seller.isActive) {
      return res.status(200).json({
        success: true,
        data: {
          seller: {
            id: seller._id,
            sellerId: seller.sellerId,
            name: seller.name,
            phone: seller.phone,
            area: seller.area,
            status: seller.status,
            isActive: seller.isActive,
          },
          requiresApproval: true,
          message: 'Registration successful. Your account is pending admin approval.',
        },
      });
    }

    // If seller is rejected or suspended, return error
    if (seller.status === 'rejected' || seller.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: `Seller account is ${seller.status}. Please contact admin.`,
        sellerId: seller.sellerId,
      });
    }

    // Clear OTP after successful verification
    seller.clearOTP();
    await seller.save();

    // Generate JWT token
    const token = generateToken({
      sellerId: seller._id,
      phone: seller.phone,
      sellerIdCode: seller.sellerId,
      role: 'seller',
      type: 'seller',
    });

    // Enhanced console logging
    const timestamp = new Date().toISOString();
    console.log('\n' + '='.repeat(60));
    console.log('🔐 SELLER OTP VERIFIED');
    console.log('='.repeat(60));
    console.log(`📱 Phone: ${phone}`);
    console.log(`🆔 Seller ID: ${seller.sellerId}`);
    console.log(`👤 Name: ${seller.name}`);
    console.log(`✅ Status: ${seller.status}`);
    console.log(`⏰ Logged In At: ${timestamp}`);
    console.log('='.repeat(60) + '\n');

    res.status(200).json({
      success: true,
      data: {
        token,
        seller: {
          id: seller._id,
          sellerId: seller.sellerId,
          name: seller.name,
          phone: seller.phone,
          area: seller.area,
          status: seller.status,
          isActive: seller.isActive,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Seller logout
 * @route   POST /api/sellers/auth/logout
 * @access  Private (Seller)
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
 * @desc    Get seller profile
 * @route   GET /api/sellers/auth/profile
 * @access  Private (Seller)
 */
exports.getProfile = async (req, res, next) => {
  try {
    // Seller is attached by authorizeSeller middleware
    const seller = req.seller;
    
    res.status(200).json({
      success: true,
      data: {
        seller: {
          id: seller._id,
          sellerId: seller.sellerId,
          name: seller.name,
          phone: seller.phone,
          email: seller.email,
          area: seller.area,
          location: seller.location,
          monthlyTarget: seller.monthlyTarget,
          wallet: {
            balance: seller.wallet.balance,
            pending: seller.wallet.pending,
            available: seller.wallet.balance - seller.wallet.pending,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update seller profile
 * @route   PUT /api/sellers/profile
 * @access  Private (Seller)
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { name, phone, email, area, location } = req.body;

    // Update allowed fields
    if (name !== undefined) seller.name = name;
    if (phone !== undefined) {
      // Check if phone is already taken by another seller
      const existingSeller = await Seller.findOne({ phone, _id: { $ne: seller._id } });
      if (existingSeller) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use by another seller',
        });
      }
      seller.phone = phone;
    }
    if (email !== undefined) seller.email = email;
    if (area !== undefined) seller.area = area;
    if (location !== undefined) seller.location = location;

    await seller.save();

    res.status(200).json({
      success: true,
      data: {
        seller: {
          id: seller._id,
          sellerId: seller.sellerId,
          name: seller.name,
          phone: seller.phone,
          email: seller.email,
          area: seller.area,
          location: seller.location,
        },
        message: 'Profile updated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change seller password
 * @route   PUT /api/sellers/password
 * @access  Private (Seller)
 */
exports.changePassword = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    // Sellers use OTP-based auth, so password might not exist
    // If password doesn't exist, we can't verify current password
    if (!seller.password) {
      return res.status(400).json({
        success: false,
        message: 'Password not set. Please use OTP-based authentication.',
      });
    }

    // For now, since sellers use OTP, we'll just return a message
    // If password functionality is needed, implement bcrypt comparison here
    res.status(501).json({
      success: false,
      message: 'Password change not supported. Sellers use OTP-based authentication.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard overview
 * @route   GET /api/sellers/dashboard
 * @access  Private (Seller)
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const seller = req.seller;

    // Get total referrals count
    const totalReferrals = await User.countDocuments({ sellerId: seller.sellerId });

    // Get current month's sales (completed orders)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const currentMonthSales = await Order.aggregate([
      {
        $match: {
          sellerId: seller.sellerId,
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: currentMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const totalSales = currentMonthSales[0]?.totalSales || 0;
    const orderCount = currentMonthSales[0]?.orderCount || 0;

    // Calculate target progress
    const targetProgress = seller.monthlyTarget > 0
      ? (totalSales / seller.monthlyTarget) * 100
      : 0;

    // Get wallet summary
    const walletBalance = seller.wallet.balance;
    const pendingWithdrawals = seller.wallet.pending;
    const availableBalance = walletBalance - pendingWithdrawals;

    // Get pending withdrawal requests count
    const pendingWithdrawalCount = await WithdrawalRequest.countDocuments({
      sellerId: seller._id,
      status: 'pending',
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalReferrals,
          currentMonthSales: totalSales,
          currentMonthOrders: orderCount,
          monthlyTarget: seller.monthlyTarget,
          targetProgress: Math.round(targetProgress * 100) / 100,
          wallet: {
            balance: walletBalance,
            pending: pendingWithdrawals,
            available: availableBalance,
            pendingWithdrawalCount,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get overview data (referrals, sales, target)
 * @route   GET /api/sellers/dashboard/overview
 * @access  Private (Seller)
 */
exports.getOverview = async (req, res, next) => {
  try {
    const seller = req.seller;

    // Get referrals count
    const totalReferrals = await User.countDocuments({ sellerId: seller.sellerId });

    // Get current month's sales
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const salesData = await Order.aggregate([
      {
        $match: {
          sellerId: seller.sellerId,
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: currentMonthStart },
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

    const totalSales = salesData[0]?.totalSales || 0;
    const orderCount = salesData[0]?.orderCount || 0;
    const averageOrderValue = salesData[0]?.averageOrderValue || 0;

    // Calculate target progress
    const targetProgress = seller.monthlyTarget > 0
      ? (totalSales / seller.monthlyTarget) * 100
      : 0;

    // Get active referrals (users who made purchases this month)
    const activeReferrals = await Order.distinct('userId', {
      sellerId: seller.sellerId,
      status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      createdAt: { $gte: currentMonthStart },
    });

    res.status(200).json({
      success: true,
      data: {
        referrals: {
          total: totalReferrals,
          active: activeReferrals.length,
        },
        sales: {
          currentMonth: totalSales,
          orderCount,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        },
        target: {
          monthlyTarget: seller.monthlyTarget,
          achieved: totalSales,
          progress: Math.round(targetProgress * 100) / 100,
          remaining: seller.monthlyTarget - totalSales,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get wallet data
 * @route   GET /api/sellers/dashboard/wallet
 * @access  Private (Seller)
 */
exports.getWallet = async (req, res, next) => {
  try {
    const seller = req.seller;

    // Get pending withdrawal requests
    const pendingWithdrawals = await WithdrawalRequest.find({
      sellerId: seller._id,
      status: 'pending',
    })
      .sort({ createdAt: -1 })
      .select('amount status createdAt')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        wallet: {
          balance: seller.wallet.balance,
          pending: seller.wallet.pending,
          available: seller.wallet.balance - seller.wallet.pending,
        },
        pendingWithdrawals,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get referrals data (dashboard)
 * @route   GET /api/sellers/dashboard/referrals
 * @access  Private (Seller)
 */
exports.getReferrals = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { limit = 10 } = req.query;

    // Get recent referrals (users linked to seller)
    const referrals = await User.find({ sellerId: seller.sellerId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('name phone email createdAt location')
      .lean();

    // Get current month purchases per referral
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const referralStats = await Promise.all(
      referrals.map(async (referral) => {
        // Get current month purchases for this user
        const userPurchases = await Order.aggregate([
          {
            $match: {
              userId: referral._id,
              sellerId: seller.sellerId,
              status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
              paymentStatus: PAYMENT_STATUS.FULLY_PAID,
              createdAt: { $gte: currentMonthStart },
            },
          },
          {
            $group: {
              _id: null,
              totalPurchases: { $sum: '$totalAmount' },
              orderCount: { $sum: 1 },
            },
          },
        ]);

        const monthlyPurchases = userPurchases[0]?.totalPurchases || 0;
        const orderCount = userPurchases[0]?.orderCount || 0;

        // Determine commission rate based on monthly purchases
        // 3% if >= 50000, 2% if < 50000
        const commissionRate = monthlyPurchases < IRA_PARTNER_COMMISSION_THRESHOLD
          ? IRA_PARTNER_COMMISSION_RATE_LOW
          : IRA_PARTNER_COMMISSION_RATE_HIGH;

        // Calculate commission (simplified - actual calculation happens on order completion)
        const estimatedCommission = monthlyPurchases * (commissionRate / 100);

        return {
          ...referral,
          monthlyPurchases,
          orderCount,
          commissionRate,
          estimatedCommission: Math.round(estimatedCommission * 100) / 100,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        referrals: referralStats,
        totalReferrals: await User.countDocuments({ sellerId: seller.sellerId }),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get performance data
 * @route   GET /api/sellers/dashboard/performance
 * @access  Private (Seller)
 */
exports.getPerformance = async (req, res, next) => {
  try {
    const seller = req.seller;

    // Get current month's performance
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const performanceData = await Order.aggregate([
      {
        $match: {
          sellerId: seller.sellerId,
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: currentMonthStart },
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

    const totalSales = performanceData[0]?.totalSales || 0;
    const orderCount = performanceData[0]?.orderCount || 0;
    const averageOrderValue = performanceData[0]?.averageOrderValue || 0;

    // Get active users count
    const activeUsers = await Order.distinct('userId', {
      sellerId: seller.sellerId,
      status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      createdAt: { $gte: currentMonthStart },
    });

    // Calculate target progress
    const targetProgress = seller.monthlyTarget > 0
      ? (totalSales / seller.monthlyTarget) * 100
      : 0;

    res.status(200).json({
      success: true,
      data: {
        currentMonth: {
          sales: totalSales,
          orders: orderCount,
          activeUsers: activeUsers.length,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        },
        target: {
          monthlyTarget: seller.monthlyTarget,
          achieved: totalSales,
          progress: Math.round(targetProgress * 100) / 100,
          remaining: seller.monthlyTarget - totalSales,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// WALLET & COMMISSION CONTROLLERS
// ============================================================================

/**
 * @desc    Get wallet details
 * @route   GET /api/sellers/wallet
 * @access  Private (Seller)
 */
exports.getWalletDetails = async (req, res, next) => {
  try {
    const seller = req.seller;

    // Get recent commissions (transactions)
    const recentCommissions = await Commission.find({ sellerId: seller._id })
      .populate('userId', 'name phone')
      .populate('orderId', 'orderNumber totalAmount')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-__v')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        wallet: {
          balance: seller.wallet.balance,
          pending: seller.wallet.pending,
          available: seller.wallet.balance - seller.wallet.pending,
        },
        recentCommissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get wallet transaction history
 * @route   GET /api/sellers/wallet/transactions
 * @access  Private (Seller)
 */
exports.getWalletTransactions = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { page = 1, limit = 20, month, year } = req.query;

    // Build query
    const query = { sellerId: seller._id };

    if (month && year) {
      query.month = parseInt(month);
      query.year = parseInt(year);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get commissions grouped by user and month
    const transactions = await Commission.find(query)
      .populate('userId', 'name phone')
      .populate('orderId', 'orderNumber totalAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v')
      .lean();

    // Group commissions by user and month for summary
    const commissionSummary = await Commission.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            userId: '$userId',
            month: '$month',
            year: '$year',
          },
          totalCommission: { $sum: '$commissionAmount' },
          orderCount: { $sum: 1 },
          cumulativePurchases: { $max: '$newCumulativePurchaseAmount' },
          commissionRate: { $max: '$commissionRate' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          userId: '$user._id',
          userName: '$user.name',
          userPhone: '$user.phone',
          month: '$_id.month',
          year: '$_id.year',
          totalCommission: 1,
          orderCount: 1,
          cumulativePurchases: 1,
          commissionRate: 1,
        },
      },
      {
        $sort: { year: -1, month: -1 },
      },
    ]);

    const total = await Commission.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        commissionSummary,
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
 * @desc    Request withdrawal from wallet
 * @route   POST /api/sellers/wallet/withdraw
 * @access  Private (Seller)
 */
exports.requestWithdrawal = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { amount, paymentMethod = 'bank_transfer', paymentDetails, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid withdrawal amount is required (minimum ₹100)',
      });
    }

    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is ₹100',
      });
    }

    // Check available balance
    const availableBalance = seller.wallet.balance - seller.wallet.pending;
    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₹${availableBalance}, Requested: ₹${amount}`,
      });
    }

    // Get bank account if bankAccountId is provided
    let bankAccount = null;
    if (req.body.bankAccountId) {
      bankAccount = await BankAccount.findById(req.body.bankAccountId);
      if (!bankAccount || bankAccount.user.toString() !== seller._id.toString() || bankAccount.userType !== 'Seller') {
        return res.status(400).json({
          success: false,
          message: 'Invalid bank account',
        });
      }
    } else {
      // Get primary bank account
      bankAccount = await BankAccount.findOne({
        user: seller._id,
        userType: 'Seller',
        isPrimary: true,
      });
    }

    // Create withdrawal request
    const withdrawal = await WithdrawalRequest.create({
      userType: 'seller',
      sellerId: seller._id,
      amount,
      paymentMethod,
      paymentDetails: paymentDetails || (bankAccount ? {
        accountNumber: bankAccount.accountNumber,
        ifscCode: bankAccount.ifscCode,
        bankName: bankAccount.bankName,
        accountHolderName: bankAccount.accountHolderName,
      } : undefined),
      bankAccountId: bankAccount?._id,
      notes,
      status: 'pending',
    });

    // Update seller wallet pending amount
    seller.wallet.pending += amount;
    await seller.save();

    // Log to payment history
    try {
      await PaymentHistory.create({
        activityType: 'seller_withdrawal_requested',
        sellerId: seller._id,
        withdrawalRequestId: withdrawal._id,
        bankAccountId: bankAccount?._id,
        amount,
        status: 'pending',
        paymentMethod: paymentMethod || 'bank_transfer',
        bankDetails: bankAccount ? {
          accountHolderName: bankAccount.accountHolderName,
          accountNumber: bankAccount.accountNumber,
          ifscCode: bankAccount.ifscCode,
          bankName: bankAccount.bankName,
        } : paymentDetails,
        description: `Seller ${seller.sellerId} requested withdrawal of ₹${amount}`,
        metadata: {
          sellerIdCode: seller.sellerId,
          sellerName: seller.name,
          availableBalance: availableBalance,
        },
      });
    } catch (historyError) {
      console.error('Error logging withdrawal history:', historyError);
      // Don't fail withdrawal if history logging fails
    }

    console.log(`✅ Withdrawal requested: ₹${amount} by seller ${seller.sellerId} - ${seller.name}`);

    res.status(201).json({
      success: true,
      data: {
        withdrawal,
        wallet: {
          balance: seller.wallet.balance,
          pending: seller.wallet.pending,
          available: seller.wallet.balance - seller.wallet.pending,
        },
        message: 'Withdrawal request submitted successfully. Awaiting admin approval.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get withdrawal requests
 * @route   GET /api/sellers/wallet/withdrawals
 * @access  Private (Seller)
 */
exports.getWithdrawals = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { sellerId: seller._id };

    if (status) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const withdrawals = await WithdrawalRequest.find(query)
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v')
      .lean();

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
// REFERRALS & COMMISSIONS CONTROLLERS
// ============================================================================

/**
 * @desc    Get referral details (specific user)
 * @route   GET /api/sellers/referrals/:referralId
 * @access  Private (Seller)
 */
exports.getReferralDetails = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { referralId } = req.params;

    // Find user (must be linked to this seller)
    const user = await User.findOne({
      _id: referralId,
      sellerId: seller.sellerId,
    }).select('name phone email createdAt location');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found or not linked to your seller ID',
      });
    }

    // Get current month's purchases
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get user's orders for current month
    const currentMonthOrders = await Order.find({
      userId: user._id,
      sellerId: seller.sellerId,
      status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      createdAt: { $gte: currentMonthStart },
    })
      .sort({ createdAt: -1 })
      .select('orderNumber totalAmount createdAt items')
      .lean();

    // Calculate monthly purchase total
    const monthlyPurchaseTotal = currentMonthOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    // Determine commission rate based on monthly purchases
    // 3% if >= 50000, 2% if < 50000
    const commissionRate = monthlyPurchaseTotal < IRA_PARTNER_COMMISSION_THRESHOLD
      ? IRA_PARTNER_COMMISSION_RATE_LOW
      : IRA_PARTNER_COMMISSION_RATE_HIGH;

    // Get commissions for this user this month
    const currentMonthCommissions = await Commission.find({
      sellerId: seller._id,
      userId: user._id,
      month: currentMonth,
      year: currentYear,
    })
      .populate('orderId', 'orderNumber totalAmount')
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

    const totalCommissionEarned = currentMonthCommissions.reduce(
      (sum, comm) => sum + comm.commissionAmount,
      0
    );

    // Get all-time stats
    const allTimeStats = await Order.aggregate([
      {
        $match: {
          userId: user._id,
          sellerId: seller.sellerId,
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
        },
      },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        referral: user,
        currentMonth: {
          month: currentMonth,
          year: currentYear,
          purchaseTotal: monthlyPurchaseTotal,
          orderCount: currentMonthOrders.length,
          orders: currentMonthOrders,
          commissionRate,
          commissionEarned: totalCommissionEarned,
          commissions: currentMonthCommissions,
        },
        allTime: {
          totalPurchases: allTimeStats[0]?.totalPurchases || 0,
          orderCount: allTimeStats[0]?.orderCount || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get referral statistics
 * @route   GET /api/sellers/referrals/stats
 * @access  Private (Seller)
 */
exports.getReferralStats = async (req, res, next) => {
  try {
    const seller = req.seller;

    // Get current month
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get all referrals
    const totalReferrals = await User.countDocuments({ sellerId: seller.sellerId });

    // Get active referrals (made purchases this month)
    const activeReferrals = await Order.distinct('userId', {
      sellerId: seller.sellerId,
      status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      createdAt: { $gte: currentMonthStart },
    });

    // Calculate per-user monthly purchases
    const userMonthlyPurchases = await Order.aggregate([
      {
        $match: {
          sellerId: seller.sellerId,
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: currentMonthStart },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalPurchases: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          userId: '$user._id',
          userName: '$user.name',
          userPhone: '$user.phone',
          totalPurchases: 1,
          orderCount: 1,
          commissionRate: {
            $cond: [
              { $lte: ['$totalPurchases', IRA_PARTNER_COMMISSION_THRESHOLD] },
              IRA_PARTNER_COMMISSION_RATE_LOW,
              IRA_PARTNER_COMMISSION_RATE_HIGH,
            ],
          },
          estimatedCommission: {
            $multiply: [
              '$totalPurchases',
              {
                $divide: [
                  {
                    $cond: [
                      { $lte: ['$totalPurchases', IRA_PARTNER_COMMISSION_THRESHOLD] },
                      IRA_PARTNER_COMMISSION_RATE_LOW,
                      IRA_PARTNER_COMMISSION_RATE_HIGH,
                    ],
                  },
                  100,
                ],
              },
            ],
          },
        },
      },
      {
        $sort: { totalPurchases: -1 },
      },
    ]);

    // Calculate total commission
    const totalCommission = userMonthlyPurchases.reduce(
      (sum, user) => sum + user.estimatedCommission,
      0
    );

    // Calculate total sales
    const totalSales = userMonthlyPurchases.reduce(
      (sum, user) => sum + user.totalPurchases,
      0
    );

    // Count referrals by commission tier
    const lowTierReferrals = userMonthlyPurchases.filter(
      u => u.totalPurchases <= IRA_PARTNER_COMMISSION_THRESHOLD
    ).length;
    const highTierReferrals = userMonthlyPurchases.filter(
      u => u.totalPurchases > IRA_PARTNER_COMMISSION_THRESHOLD
    ).length;

    res.status(200).json({
      success: true,
      data: {
        period: {
          month: currentMonth,
          year: currentYear,
        },
        referrals: {
          total: totalReferrals,
          active: activeReferrals.length,
          lowTier: lowTierReferrals,
          highTier: highTierReferrals,
        },
        sales: {
          total: totalSales,
          averagePerUser: activeReferrals.length > 0
            ? Math.round((totalSales / activeReferrals.length) * 100) / 100
            : 0,
        },
        commissions: {
          total: Math.round(totalCommission * 100) / 100,
          averagePerUser: activeReferrals.length > 0
            ? Math.round((totalCommission / activeReferrals.length) * 100) / 100
            : 0,
        },
        userPurchases: userMonthlyPurchases,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// TARGET & PERFORMANCE CONTROLLERS
// ============================================================================

/**
 * @desc    Get monthly target and progress
 * @route   GET /api/sellers/target
 * @access  Private (Seller)
 */
exports.getTarget = async (req, res, next) => {
  try {
    const seller = req.seller;

    // Get current month's sales
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const salesData = await Order.aggregate([
      {
        $match: {
          sellerId: seller.sellerId,
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: currentMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          achieved: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const achieved = salesData[0]?.achieved || 0;
    const orderCount = salesData[0]?.orderCount || 0;
    const monthlyTarget = seller.monthlyTarget || 0;

    // Calculate progress
    const progress = monthlyTarget > 0
      ? (achieved / monthlyTarget) * 100
      : 0;

    // Calculate days remaining in month
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.ceil((lastDayOfMonth - now) / (1000 * 60 * 60 * 24));

    // Calculate required daily sales to meet target
    const remainingToTarget = monthlyTarget - achieved;
    const requiredDailySales = daysRemaining > 0 && remainingToTarget > 0
      ? remainingToTarget / daysRemaining
      : 0;

    res.status(200).json({
      success: true,
      data: {
        target: {
          monthlyTarget,
          achieved,
          remaining: remainingToTarget,
          progress: Math.round(progress * 100) / 100,
          orderCount,
        },
        timeline: {
          currentDate: now,
          monthStart: currentMonthStart,
          monthEnd: lastDayOfMonth,
          daysRemaining,
          requiredDailySales: Math.round(requiredDailySales * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get performance analytics
 * @route   GET /api/sellers/performance
 * @access  Private (Seller)
 */
exports.getPerformanceAnalytics = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { period = '30' } = req.query; // days

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Get sales trends
    const salesTrends = await Order.aggregate([
      {
        $match: {
          sellerId: seller.sellerId,
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
          sales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get order status breakdown
    const orderStatusBreakdown = await Order.aggregate([
      {
        $match: {
          sellerId: seller.sellerId,
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

    // Get top performing referrals
    const topReferrals = await Order.aggregate([
      {
        $match: {
          sellerId: seller.sellerId,
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalPurchases: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { totalPurchases: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          userId: '$user._id',
          userName: '$user.name',
          userPhone: '$user.phone',
          totalPurchases: 1,
          orderCount: 1,
        },
      },
    ]);

    // Calculate conversion metrics
    const totalReferrals = await User.countDocuments({ sellerId: seller.sellerId });
    const activeReferrals = await Order.distinct('userId', {
      sellerId: seller.sellerId,
      status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      createdAt: { $gte: daysAgo },
    });

    const conversionRate = totalReferrals > 0
      ? (activeReferrals.length / totalReferrals) * 100
      : 0;

    res.status(200).json({
      success: true,
      data: {
        period: parseInt(period),
        analytics: {
          salesTrends,
          orderStatusBreakdown,
          topReferrals,
          metrics: {
            totalReferrals,
            activeReferrals: activeReferrals.length,
            conversionRate: Math.round(conversionRate * 100) / 100,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// DASHBOARD HELPER ENDPOINTS
// ============================================================================

/**
 * @desc    Get dashboard highlights/metrics
 * @route   GET /api/sellers/dashboard/highlights
 * @access  Private (Seller)
 */
exports.getDashboardHighlights = async (req, res, next) => {
  try {
    const seller = req.seller;
    const totalReferrals = await User.countDocuments({ sellerId: seller.sellerId });
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const currentMonthSales = await Order.aggregate([
      {
        $match: {
          sellerId: seller.sellerId,
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: currentMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const totalSales = currentMonthSales[0]?.totalSales || 0;
    const orderCount = currentMonthSales[0]?.orderCount || 0;
    const targetProgress = seller.monthlyTarget > 0
      ? (totalSales / seller.monthlyTarget) * 100
      : 0;

    res.status(200).json({
      success: true,
      data: {
        highlights: [
          {
            id: 'referrals',
            label: 'Total Referrals',
            value: totalReferrals,
            trend: 'up',
          },
          {
            id: 'sales',
            label: 'Monthly Sales',
            value: `₹${totalSales.toLocaleString('en-IN')}`,
            trend: totalSales > 0 ? 'up' : 'neutral',
          },
          {
            id: 'orders',
            label: 'Orders This Month',
            value: orderCount,
            trend: orderCount > 0 ? 'up' : 'neutral',
          },
          {
            id: 'target',
            label: 'Target Progress',
            value: `${Math.round(targetProgress)}%`,
            trend: targetProgress >= 100 ? 'up' : targetProgress >= 50 ? 'neutral' : 'down',
          },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recent activity feed
 * @route   GET /api/sellers/dashboard/activity
 * @access  Private (Seller)
 */
exports.getRecentActivity = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit);

    const recentCommissions = await Commission.find({ sellerId: seller._id })
      .sort({ createdAt: -1 })
      .limit(limitNum * 2)
      .populate('userId', 'name phone')
      .populate('orderId', 'orderNumber totalAmount')
      .lean();

    const recentOrders = await Order.find({ sellerId: seller.sellerId })
      .sort({ createdAt: -1 })
      .limit(limitNum * 2)
      .populate('userId', 'name phone')
      .select('orderNumber totalAmount status createdAt')
      .lean();

    const activities = [
      ...recentCommissions.map(commission => ({
        id: commission._id,
        type: 'commission',
        title: 'Commission Earned',
        message: `You earned ₹${commission.commissionAmount} for order #${commission.orderId?.orderNumber || 'N/A'}`,
        amount: commission.commissionAmount,
        timestamp: commission.createdAt,
      })),
      ...recentOrders.map(order => ({
        id: order._id,
        type: 'order',
        title: 'Order Placed',
        message: `Order #${order.orderNumber} placed by referral`,
        amount: order.totalAmount,
        status: order.status,
        timestamp: order.createdAt,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limitNum);

    res.status(200).json({
      success: true,
      data: {
        activities,
        total: activities.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// WALLET ENDPOINTS
// ============================================================================

/**
 * @desc    Get withdrawal request details
 * @route   GET /api/sellers/wallet/withdrawals/:requestId
 * @access  Private (Seller)
 */
exports.getWithdrawalDetails = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { requestId } = req.params;

    const withdrawal = await WithdrawalRequest.findOne({
      _id: requestId,
      sellerId: seller._id,
    })
      .populate('reviewedBy', 'name email')
      .lean();

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        withdrawal,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// TARGET & PERFORMANCE ENDPOINTS
// ============================================================================

/**
 * @desc    Get target history
 * @route   GET /api/sellers/targets/history
 * @access  Private (Seller)
 */
exports.getTargetHistory = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { year, limit = 12 } = req.query;
    const limitNum = parseInt(limit);
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();

    const targetsHistory = [];
    for (let i = 0; i < limitNum; i++) {
      const date = new Date(targetYear, now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      const salesData = await Order.aggregate([
        {
          $match: {
            sellerId: seller.sellerId,
            status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
            paymentStatus: PAYMENT_STATUS.FULLY_PAID,
            createdAt: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            achieved: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
          },
        },
      ]);

      const achieved = salesData[0]?.achieved || 0;
      const orderCount = salesData[0]?.orderCount || 0;
      const progress = seller.monthlyTarget > 0
        ? (achieved / seller.monthlyTarget) * 100
        : 0;

      targetsHistory.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        monthName: date.toLocaleString('default', { month: 'long' }),
        target: seller.monthlyTarget,
        achieved,
        orderCount,
        progress: Math.round(progress * 100) / 100,
        status: achieved >= seller.monthlyTarget ? 'achieved' : 'pending',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        targets: targetsHistory,
        total: targetsHistory.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get target achievement incentives
 * @route   GET /api/sellers/targets/incentives
 * @access  Private (Seller)
 */
exports.getTargetIncentives = async (req, res, next) => {
  try {
    const seller = req.seller;
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentMonthSales = await Order.aggregate([
      {
        $match: {
          sellerId: seller.sellerId,
          status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
          paymentStatus: PAYMENT_STATUS.FULLY_PAID,
          createdAt: { $gte: currentMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
        },
      },
    ]);

    const achieved = currentMonthSales[0]?.totalSales || 0;
    const targetAchieved = achieved >= seller.monthlyTarget;

    const incentives = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthSales = await Order.aggregate([
        {
          $match: {
            sellerId: seller.sellerId,
            status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FULLY_PAID] },
            paymentStatus: PAYMENT_STATUS.FULLY_PAID,
            createdAt: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
          },
        },
      ]);

      const monthAchieved = monthSales[0]?.totalSales || 0;
      if (monthAchieved >= seller.monthlyTarget) {
        incentives.push({
          month: monthStart.toLocaleString('default', { month: 'long', year: 'numeric' }),
          achieved: monthAchieved,
          target: seller.monthlyTarget,
          status: 'achieved',
          reward: 'Target achievement bonus',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        incentives,
        currentMonth: {
          achieved,
          target: seller.monthlyTarget,
          status: targetAchieved ? 'achieved' : 'pending',
        },
        totalEarned: incentives.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// ANNOUNCEMENTS & NOTIFICATIONS ENDPOINTS (Placeholders - TODO: Implement models)
// ============================================================================

exports.getAnnouncements = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: { announcements: [], total: 0 },
    });
  } catch (error) {
    next(error);
  }
};

exports.markAnnouncementRead = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Announcement marked as read',
    });
  } catch (error) {
    next(error);
  }
};

exports.markAllAnnouncementsRead = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'All announcements marked as read',
    });
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: { notifications: [], unreadCount: 0 },
    });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

exports.getNotificationPreferences = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        preferences: {
          sms: true,
          email: true,
          push: true,
          announcements: true,
          commission: true,
          target: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: { preferences: req.body, message: 'Preferences updated successfully' },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// SHARING ENDPOINTS
// ============================================================================

exports.getShareLink = async (req, res, next) => {
  try {
    const seller = req.seller;
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?sellerId=${seller.sellerId}`;
    const shareText = `Join IRA SATHI using my Seller ID: ${seller.sellerId}. Register at: ${shareUrl}`;

    res.status(200).json({
      success: true,
      data: {
        sellerId: seller.sellerId,
        shareText,
        shareUrl,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.trackShareAction = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { platform, recipient } = req.body;
    console.log(`Seller ${seller.sellerId} shared via ${platform} to ${recipient}`);
    res.status(200).json({
      success: true,
      message: 'Share tracked successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// SUPPORT ENDPOINTS (Placeholders - TODO: Implement SupportTicket model)
// ============================================================================

exports.reportIssue = async (req, res, next) => {
  try {
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.status(200).json({
      success: true,
      data: { ticketId, message: 'Issue reported successfully' },
    });
  } catch (error) {
    next(error);
  }
};

exports.getSupportTickets = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: { tickets: [], total: 0 },
    });
  } catch (error) {
    next(error);
  }
};

exports.getSupportTicketDetails = async (req, res, next) => {
  try {
    res.status(404).json({
      success: false,
      message: 'Support ticket not found',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// BANK ACCOUNT CONTROLLERS
// ============================================================================

/**
 * @desc    Add bank account
 * @route   POST /api/sellers/bank-accounts
 * @access  Private (Seller)
 */
exports.addBankAccount = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { accountHolderName, accountNumber, ifscCode, bankName, branchName, isPrimary = false } = req.body;

    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'Account holder name, account number, IFSC code, and bank name are required',
      });
    }

    const bankAccount = await BankAccount.create({
      userId: seller._id,
      userType: 'seller',
      accountHolderName,
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      bankName,
      branchName,
      isPrimary,
    });

    res.status(201).json({
      success: true,
      data: {
        bankAccount,
      },
      message: 'Bank account added successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get seller bank accounts
 * @route   GET /api/sellers/bank-accounts
 * @access  Private (Seller)
 */
exports.getBankAccounts = async (req, res, next) => {
  try {
    const seller = req.seller;

    const bankAccounts = await BankAccount.find({
      userId: seller._id,
      userType: 'seller',
    }).sort({ isPrimary: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        bankAccounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update bank account
 * @route   PUT /api/sellers/bank-accounts/:accountId
 * @access  Private (Seller)
 */
exports.updateBankAccount = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { accountId } = req.params;
    const { accountHolderName, accountNumber, ifscCode, bankName, branchName, isPrimary } = req.body;

    const bankAccount = await BankAccount.findOne({
      _id: accountId,
      userId: seller._id,
      userType: 'seller',
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found',
      });
    }

    if (accountHolderName) bankAccount.accountHolderName = accountHolderName;
    if (accountNumber) bankAccount.accountNumber = accountNumber;
    if (ifscCode) bankAccount.ifscCode = ifscCode.toUpperCase();
    if (bankName) bankAccount.bankName = bankName;
    if (branchName !== undefined) bankAccount.branchName = branchName;
    if (isPrimary !== undefined) bankAccount.isPrimary = isPrimary;

    await bankAccount.save();

    res.status(200).json({
      success: true,
      data: {
        bankAccount,
      },
      message: 'Bank account updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete bank account
 * @route   DELETE /api/sellers/bank-accounts/:accountId
 * @access  Private (Seller)
 */
exports.deleteBankAccount = async (req, res, next) => {
  try {
    const seller = req.seller;
    const { accountId } = req.params;

    const bankAccount = await BankAccount.findOne({
      _id: accountId,
      userId: seller._id,
      userType: 'seller',
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found',
      });
    }

    await BankAccount.deleteOne({ _id: accountId });

    res.status(200).json({
      success: true,
      message: 'Bank account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

