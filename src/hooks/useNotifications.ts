
import { useState, useEffect, useRef, useCallback } from 'react';
import { onMessage } from '@/lib/firebase';
import { 
  showNotification as showNotificationService,
  ensureNotificationsReady,
  testNotification
} from '@/utils/notificationService';

// Define the notification type
export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  type?: 'group' | 'message' | 'system'; 
  groupId?: string;
  chatId?: string;
  senderName?: string;
  isRead?: boolean;
}

// Sample notifications for demonstration
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'पाठ्यक्रम अपडेट',
    message: 'आपका गणित का पाठ्यक्रम अपडेट किया गया है। नए अध्याय जोड़े गए हैं।',
    read: false,
    timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
    type: 'system'
  },
  {
    id: '2',
    title: 'अध्ययन अनुस्मारक',
    message: 'आपका दैनिक अध्ययन लक्ष्य अभी तक पूरा नहीं हुआ है। आज के लिए 30 मिनट अध्ययन बाकी है।',
    read: false,
    timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    type: 'system'
  },
  {
    id: '3',
    title: 'क्विज़ परिणाम',
    message: 'बधाई हो! आपने विज्ञान क्विज़ में 90% स्कोर किया है। अपने परिणाम देखें।',
    read: true,
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    type: 'system'
  },
  {
    id: '4',
    title: 'शिक्षक संदेश',
    message: 'आपके शिक्षक श्री कुमार ने आपके प्रोजेक्ट पर टिप्पणी छोड़ी है। जवाब दें।',
    read: true,
    timestamp: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
    type: 'message',
    senderName: 'Kumar'
  }
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      // Try to load notifications from localStorage
      const savedNotifications = localStorage.getItem('study_ai_notifications');
      return savedNotifications ? JSON.parse(savedNotifications) : DEMO_NOTIFICATIONS;
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
      return DEMO_NOTIFICATIONS;
    }
  });
  
  const [playSound, setPlaySound] = useState<boolean>(() => {
    try {
      const savedSetting = localStorage.getItem('notification_sound_enabled');
      return savedSetting !== null ? savedSetting === 'true' : true;
    } catch (error) {
      console.error('Error loading sound setting from localStorage:', error);
      return true;
    }
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  
  // Track processed message IDs to prevent duplicate notifications
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  
  // Counter for message reconnection attempts
  const reconnectCountRef = useRef(0);
  
  // Track notifications that came in while app was in background
  const pendingNotificationsRef = useRef<Notification[]>([]);
  
  // Track app visibility state
  const isAppVisibleRef = useRef(true);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('study_ai_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }, [notifications]);
  
  // Save sound setting to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('notification_sound_enabled', playSound.toString());
    } catch (error) {
      console.error('Error saving sound setting to localStorage:', error);
    }
  }, [playSound]);
  
  // Clean up processed IDs periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const oldIds = Array.from(processedMessageIdsRef.current)
        .filter(id => {
          const [, timestamp] = id.split('-time-');
          return parseInt(timestamp) < fiveMinutesAgo;
        });
      
      oldIds.forEach(id => processedMessageIdsRef.current.delete(id));
    }, 60000); // Clean up every minute
    
    return () => clearInterval(cleanup);
  }, []);
  
  // Monitor app visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      
      if (isVisible && !isAppVisibleRef.current) {
        // App has become visible after being hidden
        console.log('App is now visible - ensuring notifications are ready');
        ensureNotificationsReady();
        
        // Process any pending notifications
        if (pendingNotificationsRef.current.length > 0) {
          console.log('Processing pending notifications:', pendingNotificationsRef.current.length);
          
          setNotifications(prev => [
            ...pendingNotificationsRef.current,
            ...prev
          ]);
          
          pendingNotificationsRef.current = [];
        }
      }
      
      isAppVisibleRef.current = isVisible;
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initialize
    ensureNotificationsReady();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Generate a more reliable unique ID for notifications
  const generateMessageId = useCallback((messageInfo: any): string => {
    // Include multiple fields to make the ID more unique
    const baseString = `${messageInfo.chatId}-${messageInfo.sender}-${messageInfo.text}`;
    
    // Add hash of the text for better uniqueness (simple implementation)
    let hash = 0;
    for (let i = 0; i < messageInfo.text.length; i++) {
      hash = ((hash << 5) - hash) + messageInfo.text.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    return `${baseString}-${hash}-time-${Date.now()}`;
  }, []);
  
  // Setup message listener function with retry logic
  const setupMessageListener = useCallback(() => {
    try {
      console.log("Setting up message listener for notifications");
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      const unsubscribe = onMessage((messageInfo) => {
        // Generate a unique ID for this message
        const uniqueId = generateMessageId(messageInfo);
        
        // Check if we've already processed this exact message recently
        if (processedMessageIdsRef.current.has(uniqueId)) {
          console.log("Ignoring duplicate notification:", messageInfo);
          return;
        }
        
        // Add to processed IDs
        processedMessageIdsRef.current.add(uniqueId);
        
        // Create notification from message
        console.log("Received message notification:", messageInfo);
        
        const newNotification: Notification = {
          id: `msg_${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
          title: messageInfo.isGroup 
            ? `${messageInfo.groupName || 'Group'}: ${messageInfo.senderName || 'Someone'}`
            : `${messageInfo.senderName || 'Someone'}`,
          message: messageInfo.text,
          read: false,
          timestamp: Date.now(),
          type: messageInfo.isGroup ? 'group' : 'message',
          groupId: messageInfo.isGroup ? messageInfo.chatId : undefined,
          chatId: messageInfo.isGroup ? undefined : messageInfo.chatId,
          senderName: messageInfo.senderName
        };
        
        // If app is visible, add notification normally
        if (isAppVisibleRef.current) {
          addNotification(newNotification);
        } else {
          // Store notification for when app becomes visible again
          console.log('App is in background, storing notification for later');
          pendingNotificationsRef.current.push(newNotification);
        }
        
        // Reset retry counter on successful message
        reconnectCountRef.current = 0;
      });
      
      unsubscribeRef.current = unsubscribe;
      
      return unsubscribe;
    } catch (err) {
      console.error('Error setting up message listener:', err);
      return null;
    }
  }, [generateMessageId]);

  // Function to add a notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'> & { id?: string, timestamp?: number, read?: boolean }) => {
    const newNotification: Notification = {
      id: notification.id || `manual_${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
      ...notification,
      read: notification.read !== undefined ? notification.read : false,
      timestamp: notification.timestamp || Date.now()
    };
    
    setNotifications(prev => {
      // Check if this is a duplicate notification received within 5 seconds
      const isDuplicate = prev.some(n => 
        n.message === newNotification.message && 
        n.type === newNotification.type && 
        (n.timestamp > newNotification.timestamp - 5000 || 
         n.id === newNotification.id)
      );
      
      if (isDuplicate) {
        console.log("Ignoring duplicate notification in addNotification");
        return prev;
      }
      
      return [newNotification, ...prev];
    });
    
    // Play notification sound if enabled
    if (playSound) {
      try {
        // Use the notificationService to play sound (it has better error handling)
        const data = {
          title: notification.title || 'Notification',
          message: notification.message
        };
        showNotificationService(data)
          .catch(err => {
            console.error('Failed to show notification:', err);
            
            // Fallback to direct audio play if service fails
            const audio = new Audio('/notification-sound.mp3');
            audio.volume = 0.7;
            audio.play().catch(err => {
              console.error('Failed to play notification sound:', err);
            });
          });
      } catch (err) {
        console.error('Failed to play notification sound:', err);
      }
    }
    
    return newNotification.id;
  }, [playSound]);

  // Listen for new messages from Firebase for real-time notifications
  useEffect(() => {
    const setupListener = () => {
      try {
        const unsubscribe = setupMessageListener();
        
        if (!unsubscribe) {
          // Retry setup if it failed with exponential backoff
          if (reconnectCountRef.current < 5) {
            console.log(`Retrying message listener setup (${reconnectCountRef.current + 1}/5)...`);
            
            const delay = Math.min(30000, Math.pow(2, reconnectCountRef.current) * 1000);
            console.log(`Will retry in ${delay}ms`);
            
            reconnectCountRef.current += 1;
            
            retryTimeoutRef.current = setTimeout(() => {
              setupListener();
            }, delay);
          } else {
            console.error("Failed to set up message listener after multiple retries");
            
            // Reset counter but wait longer before trying again
            reconnectCountRef.current = 0;
            
            retryTimeoutRef.current = setTimeout(() => {
              console.log("Making one more attempt to reconnect after extended delay");
              setupListener();
            }, 60000); // Try one more time after a minute
          }
        } else {
          // Reset retry counter on successful setup
          reconnectCountRef.current = 0;
          
          // Periodically check if listener is still working
          const checkInterval = setInterval(() => {
            // Test notification system health every 5 minutes
            testNotification()
              .then(success => {
                if (!success) {
                  console.warn('Notification health check failed, reconnecting...');
                  setupListener();
                }
              })
              .catch(() => {
                // If test throws, force reconnect
                setupListener();
              });
          }, 5 * 60 * 1000); // Check every 5 minutes
          
          // Clean up check interval when unmounting
          return () => clearInterval(checkInterval);
        }
      } catch (error) {
        console.error("Error in setupListener:", error);
      }
    };
    
    // Start the setup process
    setupListener();
    
    // Clean up listener when component unmounts
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [setupMessageListener]);

  // Mark a specific notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(notifications => notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(notifications => notifications.map(notification => ({ ...notification, read: true })));
  }, []);

  // Remove a notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(notifications => notifications.filter(notification => notification.id !== id));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  // Test the notification system manually
  const testNotificationSystem = useCallback(() => {
    const testNotification: Notification = {
      id: `test_${Date.now()}`,
      title: 'Notification Test',
      message: 'This is a test notification to verify the system is working.',
      read: false,
      timestamp: Date.now(),
      type: 'system'
    };
    
    addNotification(testNotification);
    return testNotification.id;
  }, [addNotification]);

  return {
    notifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearNotifications,
    playSound,
    setPlaySound,
    testNotificationSystem
  };
}
