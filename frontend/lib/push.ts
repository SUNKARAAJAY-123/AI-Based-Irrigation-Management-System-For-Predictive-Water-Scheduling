import { api } from "@/services/api";

/**
 * Subscribes the user to browser-native web push notifications.
 * Requests browser permission and maps keys dynamically.
 */
export async function subscribeToPushNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Web Push is not supported in this browser");
    return false;
  }

  try {
    // 1. Retrieve the VAPID Public Key from the FastAPI backend
    const keyRes = await api.get<{ public_key: string }>("/notifications/push/public-key");
    const publicKey = keyRes.public_key;
    if (!publicKey) {
      console.log("VAPID Public Key not available on backend");
      return false;
    }

    // 2. Request user notifications permission
    const permission = await window.Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission was denied by user");
      return false;
    }

    // Convert standard url-safe base64 VAPID key to Uint8Array
    const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
    const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    // 3. Register standard PushSubscription
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: outputArray,
    });

    // 4. Send subscription params to FastAPI endpoint
    const subJSON = subscription.toJSON();
    await api.post("/notifications/push/subscribe", {
      endpoint: subJSON.endpoint,
      p256dh: subJSON.keys?.p256dh,
      auth: subJSON.keys?.auth,
    });

    console.log("Push Notification subscription completed successfully");
    return true;
  } catch (err) {
    console.error("Failed to complete Push Notification subscription:", err);
    return false;
  }
}
