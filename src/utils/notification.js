import { API_URL } from '../config';

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const subscribeToPush = async (empid) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error("Push messaging is not supported");
        return false;
    }

    if (!VAPID_PUBLIC_KEY) {
        console.error("VAPID Public Key not found");
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        // Send subscription to backend
        const response = await fetch(`${API_URL}/api/notifications/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ subscription, empid }),
        });

        if (response.ok) {
            // console.log("Subscribed successfully");
            return true;
        } else {
            console.error("Failed to store subscription");
            return false;
        }
    } catch (err) {
        console.error("Error subscribing to push", err);
        return false;
    }
};
