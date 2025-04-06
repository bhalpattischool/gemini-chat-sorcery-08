
import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Headphones, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AudioControlsProps {
  isTTSEnabled: boolean;
  useVoiceResponse: boolean;
  toggleTTS: () => void;
  setUseVoiceResponse: (value: boolean) => void;
}

const AudioControls: React.FC<AudioControlsProps> = ({ 
  isTTSEnabled, 
  useVoiceResponse, 
  toggleTTS, 
  setUseVoiceResponse 
}) => {
  const { language } = useLanguage();
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleTTS}
          className={`${isTTSEnabled ? 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700' : ''} transition-all duration-200 flex-1 sm:flex-none`}
        >
          <span className="relative flex items-center">
            {isTTSEnabled ? (
              <>
                <Volume2 size={16} className="mr-1" />
                <span>{language === 'hi' ? 'आवाज़ चालू' : 'Voice On'}</span>
                {/* Sound wave effect */}
                <span className="absolute -right-1 top-1/2 transform -translate-y-1/2 -translate-x-full">
                  <span className="flex space-x-0.5">
                    <span className="w-0.5 h-1.5 bg-purple-500 dark:bg-purple-400 rounded-full animate-pulse"></span>
                    <span className="w-0.5 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-pulse delay-75"></span>
                    <span className="w-0.5 h-1 bg-purple-500 dark:bg-purple-400 rounded-full animate-pulse delay-150"></span>
                  </span>
                </span>
              </>
            ) : (
              <>
                <VolumeX size={16} className="mr-1" /> 
                <span>{language === 'hi' ? 'आवाज़ बंद' : 'Voice Off'}</span>
              </>
            )}
          </span>
        </Button>
      </div>
      
      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setUseVoiceResponse(!useVoiceResponse)}
          className={`${useVoiceResponse ? 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700' : ''} transition-all duration-200 flex-1 sm:flex-none`}
        >
          {useVoiceResponse ? (
            <>
              <Headphones size={16} className="mr-1 animate-pulse" /> 
              <span>{language === 'hi' ? 'आवाज़ जवाब चालू' : 'Voice Response On'}</span>
            </>
          ) : (
            <>
              <BookOpen size={16} className="mr-1" /> 
              <span>{language === 'hi' ? 'आवाज़ जवाब बंद' : 'Voice Response Off'}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AudioControls;
