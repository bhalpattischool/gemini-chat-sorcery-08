
import React, { useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, dismissNotification } = useNotifications();
  
  // Mark notifications as read (to be implemented)
  const markAllAsRead = () => {
    // Currently, we simply dismiss all notifications
    notifications.forEach((_, index) => dismissNotification(index));
  };
  
  // Get count of unread notifications
  const unreadCount = notifications.length;
  
  // Close popover when clicking outside
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("h-8 w-8 relative", className)}
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="h-[1.2rem] w-[1.2rem] text-gray-600 dark:text-gray-400" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 bg-red-500 text-[10px] font-semibold"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0 mr-2 max-h-[70vh]"
        align="end"
        alignOffset={-5}
        sideOffset={8}
      >
        <div className="flex justify-between items-center border-b p-3">
          <h3 className="font-semibold">Notifications</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-auto"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
        </div>
        
        <ScrollArea className="max-h-[50vh]">
          {notifications.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
              <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">
                Your notifications will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((notification, index) => (
                <div 
                  key={`bell-notification-${index}`}
                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors bg-purple-50 dark:bg-purple-900/10"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-2 bg-purple-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Just now
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 w-full"
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
