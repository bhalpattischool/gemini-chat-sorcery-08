
import { useContext } from 'react';
import { NotificationContext } from '@/contexts/NotificationContext';

// Re-export the hook from the context for convenience
export const useNotifications = () => {
  return useContext(NotificationContext);
};
