
export const playTimerCompletionSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), 500);
  } catch (error) {
    console.error('Error playing sound:', error);
  }
};

export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} मिनट`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours} घंटे ${remainingMinutes} मिनट` 
      : `${hours} घंटे`;
  }
};

