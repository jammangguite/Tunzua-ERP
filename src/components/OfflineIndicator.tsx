import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-5 z-50 no-print flex items-center gap-2 rounded-lg bg-[#FFFDF9] border border-[#D97706]/50 px-3.5 py-2 text-xs font-medium text-[#92400E] shadow-md"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
      <span>Offline Mode — Working from local ledger cache.</span>
    </div>
  );
};
