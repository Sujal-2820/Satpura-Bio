const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Seller = require('../models/Seller');
const Admin = require('../models/Admin');
const { broadcastToRole } = require('../services/pushNotificationService');

/**
 * @route   POST /api/fcm/register
 * @desc    Register FCM token for the current user/vendor/seller
 * @access  Private
 */
router.post('/register', protect, async (req, res) => {
    try {
        const { token, platform } = req.body;
        const { role } = req.user;
        const userId = req.user.userId || req.user.id || req.user.vendorId || req.user.sellerId;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'FCM token is required'
            });
        }

        if (!['web', 'app'].includes(platform)) {
            return res.status(400).json({
                success: false,
                message: 'Platform must be either "web" or "app"'
            });
        }

        let Model;
        if (role === 'user') Model = User;
        else if (role === 'vendor') Model = Vendor;
        else if (role === 'seller') Model = Seller;
        else if (role === 'admin' || role === 'super_admin') Model = Admin;
        else {
            return res.status(403).json({
                success: false,
                message: 'Invalid role for FCM registration'
            });
        }

        const fieldToUpdate = platform === 'web' ? 'fcmTokenWeb' : 'fcmTokenApp';

        // Resolve ObjectId properly to avoid CastErrors
        let dbUser;
        if (userId.match(/^[0-9a-fA-F]{24}$/)) {
            // It's a valid ObjectId string
            dbUser = await Model.findByIdAndUpdate(
                userId,
                { [fieldToUpdate]: token },
                { new: true }
            );
        } else {
            // It's a custom ID string (e.g., USR-101), find by custom ID field if exists
            // We need to know which field to query. Assuming the field names from schemas:
            const query = {};
            if (role === 'user') query.userId = userId;
            else if (role === 'vendor') query.vendorId = userId;
            else if (role === 'seller') query.sellerId = userId;
            else if (role === 'admin' || role === 'super_admin') query._id = userId; // Admin usually uses _id

            // Use findOneAndUpdate to handle custom ID fields
            dbUser = await Model.findOneAndUpdate(
                query,
                { [fieldToUpdate]: token },
                { new: true }
            );
        }

        if (!dbUser) {
            console.log(`FCM Registration: User not found with ID: ${userId} for role: ${role}`);
            return res.status(404).json({
                success: false,
                message: 'Account not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `FCM token registered for ${role} on ${platform}`,
        });

    } catch (error) {
        console.error('FCM Registration Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during FCM registration',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/fcm/remove
 * @desc    Remove FCM token (on logout)
 * @access  Private
 */
router.post('/remove', protect, async (req, res) => {
    try {
        const { platform } = req.body;
        const { role } = req.user;
        const userId = req.user.userId || req.user.id || req.user.vendorId || req.user.sellerId;

        if (!['web', 'app'].includes(platform)) {
            return res.status(400).json({
                success: false,
                message: 'Platform must be either "web" or "app"'
            });
        }

        let Model;
        if (role === 'user') Model = User;
        else if (role === 'vendor') Model = Vendor;
        else if (role === 'seller') Model = Seller;
        else if (role === 'admin' || role === 'super_admin') Model = Admin;
        else return res.status(403).json({ success: false, message: 'Invalid role' });

        const fieldToUpdate = platform === 'web' ? 'fcmTokenWeb' : 'fcmTokenApp';

        await Model.findByIdAndUpdate(userId, { [fieldToUpdate]: null });

        res.status(200).json({
            success: true,
            message: `FCM token removed for ${role} on ${platform}`
        });
    } catch (error) {
        console.error('FCM Removal Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during FCM removal'
        });
    }
});

/**
 * @route   POST /api/fcm/broadcast
 * @desc    Broadcast push notification to all users of a role
 * @access  Private (Admin)
 */
router.post('/broadcast', authorizeAdmin, async (req, res) => {
    try {
        const { title, message, targetAudience, priority, imageUrl, data } = req.body;

        if (!title || !message || !targetAudience) {
            return res.status(400).json({
                success: false,
                message: 'Title, message, and targetAudience are required'
            });
        }

        const payload = {
            title,
            body: message,
            icon: imageUrl,
            data: {
                ...data,
                type: 'broadcast',
                priority: priority || 'normal'
            }
        };

        let result;
        if (targetAudience === 'all') {
            // Send to all roles
            const results = await Promise.all([
                broadcastToRole('user', payload),
                broadcastToRole('vendor', payload),
                broadcastToRole('seller', payload)
            ]);
            result = results;
        } else {
            // Send to specific role
            const roleMapped = targetAudience === 'users' ? 'user' : (targetAudience === 'vendors' ? 'vendor' : 'seller');
            result = await broadcastToRole(roleMapped, payload);
        }

        res.status(200).json({
            success: true,
            message: 'Broadcast initiated',
            result
        });

    } catch (error) {
        console.error('FCM Broadcast Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during FCM broadcast',
            error: error.message
        });
    }
});

module.exports = router;
