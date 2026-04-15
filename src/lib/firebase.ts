import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

let messaging: Messaging | null = null

export function getFirebaseMessaging() {
  if (typeof window === 'undefined') return null
  if (!messaging) {
    messaging = getMessaging(app)
  }
  return messaging
}

export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const m = getFirebaseMessaging()
    if (!m) return null

    const token = await getToken(m, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    })
    return token
  } catch (error) {
    console.error('Error getting FCM token:', error)
    return null
  }
}

export function onForegroundMessage(callback: (payload: unknown) => void) {
  const m = getFirebaseMessaging()
  if (!m) return () => {}
  return onMessage(m, callback)
}
