
/**
 * A unified notification service that works across web browsers and WebView
 * Enhanced with better fallbacks and reliability for APK environments
 */

// Define notification types
export interface NotificationData {
  title: string;
  message: string;
  icon?: string;
  duration?: number;
}

// Keep track of active notifications
let activeNotifications: NotificationData[] = [];
// Track notification sound loading status
let notificationSoundLoaded = false;
let notificationSound: HTMLAudioElement | null = null;

// Track failed notification attempts for retry
const failedNotifications = new Set<string>();
const MAX_RETRIES = 3;

// Preload all notification assets
function preloadNotificationAssets() {
  console.log('Preloading notification assets');
  
  // Preload notification sound with retries
  const loadSound = (retryCount = 0) => {
    try {
      // Create new Audio element
      notificationSound = new Audio('/notification-sound.mp3');
      
      // Set up success handler
      notificationSound.addEventListener('canplaythrough', () => {
        console.log('Notification sound loaded successfully');
        notificationSoundLoaded = true;
      });
      
      // Set up error handler with retry logic
      notificationSound.addEventListener('error', (e) => {
        console.error('Failed to load notification sound:', e);
        
        // Retry with exponential backoff
        if (retryCount < MAX_RETRIES) {
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying sound load (${retryCount + 1}/${MAX_RETRIES}) in ${delay}ms`);
          
          setTimeout(() => {
            loadSound(retryCount + 1);
          }, delay);
        } else {
          console.error('Max retries reached, notification sound not available');
          notificationSoundLoaded = false;
          notificationSound = null;
        }
      });
      
      // Start preloading
      notificationSound.load();
    } catch (err) {
      console.error('Error initializing notification sound:', err);
      notificationSoundLoaded = false;
      notificationSound = null;
      
      // Retry on general error
      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => loadSound(retryCount + 1), delay);
      }
    }
  };
  
  // Start loading sound
  loadSound();
  
  // Preload notification icon
  const preloadIcon = () => {
    try {
      const img = new Image();
      img.src = '/notification-icon.png';
    } catch (err) {
      console.error('Failed to preload notification icon:', err);
    }
  };
  
  preloadIcon();
}

// Run preload when service is first imported
preloadNotificationAssets();

// Function to check if we're in a WebView
export const isInWebView = (): boolean => {
  // Check for common WebView user agent patterns
  const ua = navigator.userAgent;
  return /wv/.test(ua) || /Android.*Version\/[0-9]/.test(ua) || window.Android !== undefined;
};

// Check if browser notifications are supported and permitted
export const areBrowserNotificationsSupported = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  
  if (Notification.permission === "granted") return true;
  
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  
  return false;
};

// Create a robust notification sound player with retries
const playNotificationSound = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const attemptPlay = (retryCount = 0) => {
      try {
        // If preloaded sound is available, use it
        if (notificationSoundLoaded && notificationSound) {
          // Clone the audio to allow multiple overlapping sounds
          const soundClone = notificationSound.cloneNode() as HTMLAudioElement;
          soundClone.volume = 0.7; // Slightly lower volume
          
          soundClone.play()
            .then(() => {
              resolve(true);
            })
            .catch(err => {
              console.error('Could not play notification sound:', err);
              
              // Retry logic
              if (retryCount < MAX_RETRIES) {
                console.log(`Retrying sound playback (${retryCount + 1}/${MAX_RETRIES})...`);
                setTimeout(() => attemptPlay(retryCount + 1), 500);
              } else {
                console.log('Failed to play sound after maximum retries');
                resolve(false);
              }
            });
        } else {
          // Fallback - create a new Audio instance
          console.log('Using fallback notification sound');
          const audio = new Audio('/notification-sound.mp3');
          audio.volume = 0.7;
          
          audio.play()
            .then(() => {
              resolve(true);
            })
            .catch(err => {
              console.error('Could not play fallback notification sound:', err);
              
              // Try with alternative audio format if MP3 fails
              if (retryCount === 0) {
                console.log('Trying alternative audio format (WAV)');
                const wavAudio = new Audio('/notification-sound.wav');
                wavAudio.volume = 0.7;
                wavAudio.play()
                  .then(() => resolve(true))
                  .catch(() => {
                    if (retryCount < MAX_RETRIES) {
                      setTimeout(() => attemptPlay(retryCount + 1), 500);
                    } else {
                      resolve(false);
                    }
                  });
              } else if (retryCount < MAX_RETRIES) {
                setTimeout(() => attemptPlay(retryCount + 1), 500);
              } else {
                resolve(false);
              }
            });
        }
      } catch (err) {
        console.error('Error with notification sound:', err);
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => attemptPlay(retryCount + 1), 500);
        } else {
          resolve(false);
        }
      }
    };
    
    // Start first attempt
    attemptPlay();
  });
};

// Generate unique ID for notification tracking
const generateNotificationId = (data: NotificationData): string => {
  return `${data.title}-${data.message}-${Date.now()}`;
};

// Show a notification using the best available method
export const showNotification = async (data: NotificationData): Promise<void> => {
  // Generate a unique ID for this notification
  const notificationId = generateNotificationId(data);
  
  // Check if this notification was previously attempted and failed
  const wasFailedPreviously = failedNotifications.has(notificationId);
  
  // Add to active notifications
  activeNotifications.push(data);
  
  // Always attempt to play sound first
  const soundPlayed = await playNotificationSound();
  if (!soundPlayed) {
    console.warn('Failed to play notification sound, continuing with visual notification');
  }
  
  try {
    // First try native WebView bridge if available
    if (window.Android?.showNotification) {
      console.log('Using Android WebView bridge for notification');
      
      try {
        window.Android.showNotification(data.title, data.message);
        // If we get here, the native call succeeded
        failedNotifications.delete(notificationId);
        return;
      } catch (error) {
        console.error('Error using Android bridge, falling back:', error);
        // Continue to next method
      }
    }
    
    // Then try browser notifications
    const canUseSystemNotifications = await areBrowserNotificationsSupported();
    if (canUseSystemNotifications) {
      try {
        console.log('Using browser notification API');
        const notification = new Notification(data.title, {
          body: data.message,
          icon: data.icon || '/notification-icon.png'
        });
        
        // Auto-close the notification after duration or default (5 seconds)
        setTimeout(() => notification.close(), data.duration || 5000);
        
        // Mark as succeeded
        failedNotifications.delete(notificationId);
        return;
      } catch (error) {
        console.error('Failed to show browser notification:', error);
        // Fall through to UI notification
      }
    }
    
    // Finally, fall back to the notification context for UI notifications
    console.log('Falling back to UI notification');
    // This will be handled by NotificationContext
    
    // If we reached here without throwing, mark as succeeded
    failedNotifications.delete(notificationId);
    
  } catch (error) {
    console.error('All notification methods failed:', error);
    
    // Track failed notification for potential retry
    if (!wasFailedPreviously) {
      failedNotifications.add(notificationId);
      
      // Auto-retry once after 1 second
      setTimeout(() => {
        // Only retry if still in failed set
        if (failedNotifications.has(notificationId)) {
          console.log('Auto-retrying failed notification');
          showNotification(data).catch(console.error);
        }
      }, 1000);
    }
  }
};

// Get current active notifications
export const getActiveNotifications = (): NotificationData[] => {
  return [...activeNotifications];
};

// Clear a specific notification
export const clearNotification = (index: number): void => {
  if (index >= 0 && index < activeNotifications.length) {
    activeNotifications.splice(index, 1);
  }
};

// Clear all notifications
export const clearAllNotifications = (): void => {
  activeNotifications = [];
};

// Retry sending all failed notifications
export const retryFailedNotifications = async (): Promise<void> => {
  const failed = Array.from(failedNotifications);
  
  // Clear the set before retrying to prevent infinite loops
  failedNotifications.clear();
  
  // Retry each one
  for (const notificationId of failed) {
    // Extract the data from the ID (simple approach)
    const [title, ...messageParts] = notificationId.split('-');
    // Remove the timestamp from the end
    messageParts.pop(); 
    const message = messageParts.join('-');
    
    if (title && message) {
      console.log('Retrying previously failed notification:', { title, message });
      try {
        await showNotification({ title, message });
      } catch (error) {
        console.error('Retry failed:', error);
      }
    }
  }
};

// For APK support - call to preload assets when app starts 
// or resumes from background
export const ensureNotificationsReady = (): void => {
  if (!notificationSoundLoaded) {
    preloadNotificationAssets();
  }
  
  // Retry any failed notifications
  retryFailedNotifications();
};

// Check if notifications are working properly
export const testNotification = async (): Promise<boolean> => {
  try {
    const testData = {
      title: 'Test Notification',
      message: 'Notification system is working',
      duration: 3000
    };
    
    await showNotification(testData);
    return true;
  } catch (error) {
    console.error('Notification test failed:', error);
    return false;
  }
};

// Declare WebView interface for TypeScript
declare global {
  interface Window {
    Android?: {
      showNotification: (title: string, message: string) => void;
    };
  }
}
