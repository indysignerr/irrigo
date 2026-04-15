importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCp6WzVNVoPJExwhyTm-XHeuW7NR2AKqE0',
  authDomain: 'irrigo-90bc6.firebaseapp.com',
  projectId: 'irrigo-90bc6',
  storageBucket: 'irrigo-90bc6.firebasestorage.app',
  messagingSenderId: '628859220918',
  appId: '1:628859220918:web:ed4cf7c991278d4a668717',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  if (title) {
    self.registration.showNotification(title, {
      body: body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    });
  }
});
