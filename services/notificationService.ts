/**
 * Shows a notification to the user.
 * This is a local notification triggered by the app, not a push from a server.
 * It requires the service worker to be active and notification permission to be granted.
 */
export const showLocalNotification = async (title: string, options: NotificationOptions): Promise<void> => {
  // Check for browser support
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('Notifications are not supported in this browser.');
    return;
  }

  // Check for permission
  if (Notification.permission !== 'granted') {
    // We don't request permission here; that should be handled by the UI in Settings.
    console.log('Notification permission has not been granted.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      ...options,
      icon: 'https://www.gstatic.com/images/branding/product/1x/gtech_moviestudio_128dp.png',
      badge: 'https://www.gstatic.com/images/branding/product/1x/gtech_moviestudio_64dp.png',
    });
  } catch (error) {
    console.error('Error displaying notification:', error);
  }
};
