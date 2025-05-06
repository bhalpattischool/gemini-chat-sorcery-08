
import React from 'react';
import NotificationToast from './NotificationToast';
import NotificationBell from './NotificationBell';
import { Toaster } from "@/components/ui/toaster";

/**
 * NotificationCenter component that combines all notification UI elements
 * This includes the notification toasts and the notification bell
 */
const NotificationCenter: React.FC = () => {
  return (
    <>
      {/* Toast notifications from shadcn/ui */}
      <Toaster />
      
      {/* Banner notifications from our custom system */}
      <NotificationToast />
    </>
  );
};

export default NotificationCenter;
