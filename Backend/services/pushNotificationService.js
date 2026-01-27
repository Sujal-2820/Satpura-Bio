const { sendPushNotification } = require('./firebaseAdmin');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Seller = require('../models/Seller');

/**
 * Sends a notification to a specific user by ID and Role
 * @param {string} userId - Database ID of the user/vendor/seller
 * @param {string} role - 'user', 'vendor', or 'seller'
 * @param {Object} payload - { title, body, data }
 * @returns {Promise<Object>}
 */
const sendToUser = async (userId, role, payload) => {
    try {
        let person;
        if (role === 'user') {
            person = await User.findById(userId);
        } else if (role === 'vendor') {
            person = await Vendor.findById(userId);
        } else if (role === 'seller') {
            person = await Seller.findById(userId);
        }

        if (!person) {
            console.warn(`User not found: ${userId} (${role})`);
            return { success: false, error: 'User not found' };
        }

        const tokens = [];
        if (person.fcmTokenWeb) tokens.push(person.fcmTokenWeb);
        if (person.fcmTokenApp) tokens.push(person.fcmTokenApp);

        if (tokens.length === 0) {
            return { success: false, error: 'No FCM tokens found for user' };
        }

        // Default data structure for consistency
        const notificationData = {
            ...payload.data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            role: role
        };

        return await sendPushNotification(tokens, {
            title: payload.title,
            body: payload.body,
            data: notificationData,
            icon: payload.icon
        });
    } catch (error) {
        console.error(`Error in sendToUser (${role}):`, error);
        return { success: false, error: error.message };
    }
};

/**
 * Broadcast notification to all users of a certain role
 * @param {string} role - 'user', 'vendor', or 'seller'
 * @param {Object} payload - { title, body, data }
 */
const broadcastToRole = async (role, payload) => {
    try {
        let Model;
        if (role === 'user') Model = User;
        else if (role === 'vendor') Model = Vendor;
        else if (role === 'seller') Model = Seller;
        else return { success: false, error: 'Invalid role' };

        const users = await Model.find({
            $or: [
                { fcmTokenWeb: { $exists: true, $ne: null, $ne: '' } },
                { fcmTokenApp: { $exists: true, $ne: null, $ne: '' } }
            ]
        });

        const allTokens = [];
        users.forEach(u => {
            if (u.fcmTokenWeb) allTokens.push(u.fcmTokenWeb);
            if (u.fcmTokenApp) allTokens.push(u.fcmTokenApp);
        });

        if (allTokens.length === 0) return { success: true, message: 'No tokens found to broadcast' };

        // Firebase multicast has a limit of 500 tokens per batch
        const batches = [];
        for (let i = 0; i < allTokens.length; i += 500) {
            batches.push(allTokens.slice(i, i + 500));
        }

        const results = await Promise.all(batches.map(batch =>
            sendPushNotification(batch, payload)
        ));

        return results;
    } catch (error) {
        console.error(`Error broadcasting to ${role}:`, error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendToUser,
    broadcastToRole
};
