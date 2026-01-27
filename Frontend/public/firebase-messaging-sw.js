// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// These will be replaced by actual values if needed, but for now 
// we can use the same config as the frontend app
// Note: In production, these should ideally be hardcoded or injected during build
const firebaseConfig = {
    apiKey: "AIzaSyC1Ro0C440eVz-5BNJSvTLwrRA1hajEm8Y",
    authDomain: "satpura-bio.firebaseapp.com",
    projectId: "satpura-bio",
    storageBucket: "satpura-bio.firebasestorage.app",
    messagingSenderId: "411379643976",
    appId: "1:411379643976:web:e6fb3d017c08c31da30a7d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || '/logo.png',
        data: payload.data,
        tag: payload.data?.type || 'general' // Group notifications by type
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click Received.');
    event.notification.close();

    const data = event.notification.data;
    let urlToOpen = '/';

    // Handle deep linking based on type
    if (data) {
        if (data.type === 'order_assigned' || data.relatedEntityType === 'order') {
            urlToOpen = `/orders/${data.relatedEntityId || ''}`;
        } else if (data.type === 'commission_earned' || data.relatedEntityType === 'commission') {
            urlToOpen = '/wallet';
        } else if (data.relatedEntityType === 'repayment') {
            urlToOpen = '/credit/repayment';
        }
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a tab open
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            // If no tab is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
