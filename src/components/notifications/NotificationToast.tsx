import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

interface NotificationToastProps {
  maxNotifications?: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ maxNotifications = 5 }) => {
  const { notifications, dismissNotification } = useNotifications();
  const [visibleNotifications, setVisibleNotifications] = useState<Array<{ index: number; autoRemove: boolean }>>([]);
  const autoRemoveTimersRef = useRef<Record<number, NodeJS.Timeout>>({});
  
  // Keep track of processed notification IDs to prevent duplicates
  const processedNotificationsRef = useRef(new Set<string>());

  // Keep track of visible notifications
  useEffect(() => {
    if (notifications.length > 0) {
      // Filter out notifications that have already been processed
      const newNotifications = notifications
        .map((notification, index) => {
          // Generate a unique ID for this notification
          const notificationId = `${notification.title}-${notification.message}-${index}`;
          
          // If we've already processed this notification, skip it
          if (processedNotificationsRef.current.has(notificationId)) {
            return null;
          }
          
          // Mark as processed
          processedNotificationsRef.current.add(notificationId);
          
          return { index, autoRemove: true };
        })
        .filter(Boolean) as Array<{ index: number; autoRemove: boolean }>;
      
      // Add new notifications to visible list
      const updatedVisibleNotifications = [
        ...newNotifications,
        ...visibleNotifications
      ].slice(0, maxNotifications);
      
      setVisibleNotifications(updatedVisibleNotifications);
      
      // Set timeouts for auto-dismissal
      newNotifications.forEach(({ index, autoRemove }) => {
        if (autoRemove && notifications[index]) {
          // Clear any existing timeout for this index
          if (autoRemoveTimersRef.current[index]) {
            clearTimeout(autoRemoveTimersRef.current[index]);
          }
          
          // Set new timeout
          const duration = notifications[index]?.duration || 5000;
          autoRemoveTimersRef.current[index] = setTimeout(() => {
            dismissNotification(index);
            setVisibleNotifications(prev => prev.filter(n => n.index !== index));
          }, duration);
        }
      });
      
      // Clean up processed notifications set after some time
      // to allow showing duplicate notifications that come in much later
      setTimeout(() => {
        newNotifications.forEach(({ index }) => {
          const notification = notifications[index];
          if (notification) {
            const notificationId = `${notification.title}-${notification.message}-${index}`;
            processedNotificationsRef.current.delete(notificationId);
          }
        });
      }, 10000); // Clear after 10 seconds
    }
    
    // Cleanup timeouts when component unmounts
    return () => {
      Object.values(autoRemoveTimersRef.current).forEach(timer => clearTimeout(timer));
    };
  }, [notifications, dismissNotification, maxNotifications, visibleNotifications]);

  // Skip rendering if no notifications
  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {visibleNotifications.map(({ index }) => {
          // Skip if notification doesn't exist
          if (!notifications[index]) return null;
          
          return (
            <motion.div
              key={`notification-${index}-${Date.now()}`}
              initial={{ opacity: 0, y: 50, scale: 0.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-purple-200 dark:border-purple-900 pointer-events-auto"
            >
              <div className="flex items-start p-4">
                <div className="flex-shrink-0 bg-purple-100 dark:bg-purple-900/50 p-2 rounded-full">
                  <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {notifications[index]?.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {notifications[index]?.message}
                  </p>
                </div>
                
                <button
                  onClick={() => dismissNotification(index)}
                  className="ml-4 flex-shrink-0 flex rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToast;
