
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  NotificationData, 
  getActiveNotifications, 
  clearNotification,
  showNotification as showNotificationService,
  ensureNotificationsReady
} from '@/utils/notificationService';

interface NotificationContextType {
  notifications: NotificationData[];
  showNotification: (data: NotificationData) => Promise<void>;
  dismissNotification: (index: number) => void;
  dismissAllNotifications: () => void;
  testNotificationSystem: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize notifications and request permission
  useEffect(() => {
    // Initial setup
    if (!isInitialized) {
      // Ensure notification system is ready
      ensureNotificationsReady();
      
      // Request permission for browser notifications
      if ('Notification' in window && Notification.permission !== "granted") {
        Notification.requestPermission();
      }
      
      setIsInitialized(true);
    }
    
    // Poll for active notifications from service
    const interval = setInterval(() => {
      const activeNotifications = getActiveNotifications();
      if (JSON.stringify(activeNotifications) !== JSON.stringify(notifications)) {
        setNotifications(activeNotifications);
      }
    }, 500);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When app becomes visible, ensure notifications are ready
        ensureNotificationsReady();
        
        // Force refresh of notifications
        setNotifications(getActiveNotifications());
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [notifications, isInitialized]);

  const showNotification = async (data: NotificationData) => {
    await showNotificationService(data);
    // The notification will be added to active notifications in the service
    // Our useEffect will pick it up and update the state
  };

  const dismissNotification = (index: number) => {
    clearNotification(index);
    setNotifications(notifications.filter((_, i) => i !== index));
  };

  const dismissAllNotifications = () => {
    setNotifications([]);
  };
  
  const testNotificationSystem = async () => {
    try {
      // Create a test notification
      const testData: NotificationData = {
        title: 'Test Notification',
        message: 'Testing the notification system',
        duration: 3000
      };
      
      // Show the notification
      await showNotification(testData);
      return true;
    } catch (error) {
      console.error('Test notification failed:', error);
      return false;
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      showNotification,
      dismissNotification,
      dismissAllNotifications,
      testNotificationSystem
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

