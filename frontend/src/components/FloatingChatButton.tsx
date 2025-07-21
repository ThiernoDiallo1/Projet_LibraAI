import React from 'react';
import { MessageCircle } from 'lucide-react';

interface FloatingChatButtonProps {
  onClick: () => void;
  hasUnreadMessages?: boolean;
}

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ 
  onClick, 
  hasUnreadMessages = false 
}) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
      aria-label="Ouvrir le chat"
    >
      <MessageCircle className="w-6 h-6" />
      {hasUnreadMessages && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
    </button>
  );
};

export default FloatingChatButton;
