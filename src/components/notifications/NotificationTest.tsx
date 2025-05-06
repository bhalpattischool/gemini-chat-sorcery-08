
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from '@/contexts/NotificationContext';
import { ensureNotificationsReady } from '@/utils/notificationService';

const NotificationTest: React.FC = () => {
  const { showNotification, testNotificationSystem } = useNotifications();
  const [title, setTitle] = useState<string>('Test Notification');
  const [message, setMessage] = useState<string>('This is a test notification to verify the system is working.');
  const [duration, setDuration] = useState<number>(5000);
  const [isSending, setIsSending] = useState<boolean>(false);
  
  const handleSendNotification = async () => {
    try {
      setIsSending(true);
      
      // Ensure notification system is ready
      ensureNotificationsReady();
      
      await showNotification({
        title,
        message,
        duration
      });
      
      toast({
        title: "Notification sent",
        description: "The notification has been triggered successfully",
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast({
        title: "Notification failed",
        description: "There was an error sending the notification",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const handleQuickTest = async () => {
    try {
      setIsSending(true);
      
      const result = await testNotificationSystem();
      
      if (result) {
        toast({
          title: "System test passed",
          description: "The notification system is working correctly",
        });
      } else {
        toast({
          title: "System test failed",
          description: "There might be an issue with the notification system",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast({
        title: "System test error",
        description: "An unexpected error occurred while testing",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Notification Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter notification title"
          />
        </div>
        
        <div>
          <label htmlFor="duration" className="block text-sm font-medium mb-1">
            Duration (ms)
          </label>
          <Input
            id="duration"
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 5000)}
            placeholder="Duration in milliseconds"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1">
          Notification Message
        </label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter notification message"
          rows={3}
        />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handleSendNotification} 
          disabled={isSending || !title || !message}
          className="flex-1"
        >
          {isSending ? 'Sending...' : 'Send Custom Notification'}
        </Button>
        
        <Button
          onClick={handleQuickTest}
          variant="outline"
          disabled={isSending}
          className="flex-1"
        >
          Quick Test
        </Button>
      </div>
      
      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-md text-sm">
        <p className="font-medium mb-2">Troubleshooting Tips:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>If notifications don't appear, check browser permissions</li>
          <li>Sound may be blocked if the page wasn't interacted with</li>
          <li>On mobile, notifications depend on system settings</li>
          <li>In APK, ensure notifications are enabled for the app</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationTest;
