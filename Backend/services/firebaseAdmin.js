const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;

try {
    const serviceAccountPath = path.join(__dirname, '../config/firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
        console.warn('⚠️ Firebase service account file not found. Push notifications will be disabled.');
        console.warn('Expected path:', serviceAccountPath);
    }
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
}

/**
 * Sends a push notification to specific tokens
 * @param {string|string[]} tokens - Single token or array of tokens
 * @param {Object} payload - Notification payload { title, body, data, icon }
 * @returns {Promise<Object>} - Firebase response
 */
const sendPushNotification = async (tokens, payload) => {
    if (!firebaseApp) {
        console.warn('Push notification skipped: Firebase not initialized');
        return { success: false, error: 'Firebase not initialized' };
    }

    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    const validTokens = tokenList.filter(t => t && typeof t === 'string' && t.length > 0);

    if (validTokens.length === 0) {
        return { success: false, error: 'No valid tokens provided' };
    }

    try {
        const message = {
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data || {},
            tokens: validTokens,
        };

        // Add icon if provided
        if (payload.icon) {
            message.notification.imageUrl = payload.icon;
        }

        const response = await admin.messaging().sendEachForMulticast(message);

        console.log(`Push notification sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);

        // Log failures for debugging
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Failure sending to token ${validTokens[idx]}:`, resp.error);
                }
            });
        }

        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    admin,
    sendPushNotification,
    isFirebaseInitialized: () => !!firebaseApp
};
