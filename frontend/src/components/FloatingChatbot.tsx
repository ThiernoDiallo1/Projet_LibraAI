import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from 'react-query';
import { chatbotApi } from '../services/api';
import { 
  Send, 
  X,
  Bot, 
  User,
  Minimize2,
  Maximize2
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

// Interface pour les messages du chat flottant
interface FloatingChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

interface FloatingChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
}

const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ isOpen, onToggle }) => {
  const [messages, setMessages] = useState<FloatingChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Vérifier l'état du chatbot
  const { data: chatbotHealth } = useQuery(
    'chatbot-health',
    () => chatbotApi.getChatbotHealth(),
    {
      refetchInterval: 30000 // Vérifier toutes les 30 secondes
    }
  );

  // Mutation pour envoyer un message
  const sendMessageMutation = useMutation(
    (message: string) => chatbotApi.askQuestion(message),
    {
      onSuccess: (data) => {
        if (data.success) {
          const botMessage: FloatingChatMessage = {
            id: Date.now().toString() + '_bot',
            text: data.answer,
            sender: 'bot',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, botMessage]);
        }
      },
      onError: () => {
        const errorMessage: FloatingChatMessage = {
          id: Date.now().toString() + '_error',
          text: 'Désolé, je ne peux pas répondre pour le moment. Veuillez réessayer.',
          sender: 'bot',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    }
  );

  // Faire défiler vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ajouter un message de bienvenue initial
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: FloatingChatMessage = {
        id: 'welcome',
        text: "Salut ! Je suis LibraAI, votre assistant virtuel. Comment puis-je vous aider ?",
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: FloatingChatMessage = {
      id: Date.now().toString() + '_user',
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    sendMessageMutation.mutate(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Fenêtre de chat */}
      <div className={`bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[32rem]'
      }`}>
        {/* Header */}
        <div className="bg-blue-600 text-white p-3 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <span className="font-medium">LibraAI</span>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                chatbotHealth?.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="text-xs">
                {chatbotHealth?.status === 'healthy' ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="hover:bg-blue-700 p-1 rounded"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onToggle}
              className="hover:bg-blue-700 p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corps du chat (seulement si pas minimisé) */}
        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex items-start space-x-2 max-w-xs ${
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.sender === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {message.sender === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div
                      className={`px-3 py-2 rounded-lg text-sm ${
                        message.sender === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                </div>
              ))}
              {sendMessageMutation.isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="bg-gray-100 px-3 py-2 rounded-lg">
                      <LoadingSpinner size="sm" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie */}
            <div className="p-3 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tapez votre message..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={1}
                  disabled={sendMessageMutation.isLoading || chatbotHealth?.status !== 'healthy'}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || sendMessageMutation.isLoading || chatbotHealth?.status !== 'healthy'}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FloatingChatbot;
