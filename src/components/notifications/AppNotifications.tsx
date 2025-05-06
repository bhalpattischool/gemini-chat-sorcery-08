
import React from 'react';
import { NotificationProvider } from '@/contexts/NotificationContext';
import NotificationCenter from './NotificationCenter';

/**
 * AppNotifications is a wrapper component that provides the notification context
 * and renders all notification UI components
 */
const AppNotifications: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <NotificationProvider>
      {children}
      <NotificationCenter />
    </NotificationProvider>
  );
};

export default AppNotifications;
