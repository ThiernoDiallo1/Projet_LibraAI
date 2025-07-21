import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from 'react-query';
import { chatbotApi } from '../services/api';
import { 
  MessageCircle, 
  Upload, 
  Send, 
  FileText, 
  Bot, 
  User,
  Paperclip,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { ChatMessage } from '../types';

const ChatbotPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vérifier l'état du chatbot
  const { data: chatbotHealth } = useQuery(
    'chatbot-health',
    () => chatbotApi.getChatbotHealth(),
    {
      refetchInterval: 30000 // Vérifier toutes les 30 secondes
    }
  );

  // Mutation pour upload de fichier
  const uploadMutation = useMutation(
    (file: File) => chatbotApi.uploadDocument(file),
    {
      onSuccess: (data) => {
        toast.success(`Document traité: ${data.chunks_count} segments créés`);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload');
        setSelectedFile(null);
      }
    }
  );

  // Mutation pour poser une question
  const askMutation = useMutation(
    (question: string) => chatbotApi.askQuestion(question),
    {
      onSuccess: (data) => {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          question: data.question,
          answer: data.answer,
          sources: data.sources,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, newMessage]);
        setInputMessage('');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erreur lors de la question');
      }
    }
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (file.type === 'application/pdf' || file.type === 'text/plain') {
        setSelectedFile(file);
      } else {
        toast.error('Seuls les fichiers PDF et texte sont acceptés');
        event.target.value = '';
      }
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      askMutation.mutate(inputMessage.trim());
    }
  };

  const isHealthy = chatbotHealth?.status === 'healthy';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Assistant IA LibraAi
            </h1>
            <p className="text-gray-600">
              Uploadez vos documents et posez des questions à notre IA
            </p>
          </div>
          
          {/* Health Status */}
          <div className="flex items-center space-x-2">
            {isHealthy ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-600 font-medium">IA en ligne</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-600 font-medium">IA hors ligne</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Uploader un document
        </h2>
        
        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-gray-50 transition-colors"
            >
              <div className="text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Cliquez pour sélectionner un fichier PDF ou texte
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Taille maximale: 10MB
                </p>
              </div>
            </label>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-700">{selectedFile.name}</span>
                <span className="text-xs text-gray-500">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isLoading || !isHealthy}
                className="btn-primary text-sm"
              >
                {uploadMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-1" />
                    Traitement...
                  </>
                ) : (
                  'Uploader'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Section */}
      <div className="bg-white rounded-lg shadow-sm flex flex-col h-[600px]">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Conversation avec l'IA
            </h2>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Aucune conversation pour le moment
              </p>
              <p className="text-sm text-gray-500">
                Uploadez un document et posez votre première question
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="space-y-4">
                {/* User Question */}
                <div className="flex justify-end">
                  <div className="max-w-3xl">
                    <div className="flex items-center justify-end space-x-2 mb-1">
                      <span className="text-sm text-gray-500">Vous</span>
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="bg-primary-600 text-white rounded-lg px-4 py-2">
                      <p>{message.question}</p>
                    </div>
                  </div>
                </div>

                {/* AI Answer */}
                <div className="flex justify-start">
                  <div className="max-w-3xl">
                    <div className="flex items-center space-x-2 mb-1">
                      <Bot className="h-4 w-4 text-primary-600" />
                      <span className="text-sm text-gray-500">Assistant IA</span>
                    </div>
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <p className="whitespace-pre-wrap">{message.answer}</p>
                      
                      {/* Sources */}
                      {message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-2">Sources:</p>
                          <div className="space-y-1">
                            {message.sources.map((source, index) => (
                              <div key={index} className="flex items-center space-x-2 text-xs text-gray-500">
                                <Paperclip className="h-3 w-3" />
                                <span>{source.filename} (segment {source.chunk_index + 1})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString('fr-FR')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {askMutation.isLoading && (
            <div className="flex justify-start">
              <div className="max-w-3xl">
                <div className="flex items-center space-x-2 mb-1">
                  <Bot className="h-4 w-4 text-primary-600" />
                  <span className="text-sm text-gray-500">Assistant IA</span>
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-gray-600">Je réfléchis...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={isHealthy ? "Posez votre question..." : "IA hors ligne"}
              disabled={askMutation.isLoading || !isHealthy}
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || askMutation.isLoading || !isHealthy}
              className="btn-primary flex items-center space-x-1"
            >
              <Send className="h-4 w-4" />
              <span>Envoyer</span>
            </button>
          </form>
          
          {!isHealthy && (
            <p className="text-sm text-red-600 mt-2">
              L'assistant IA n'est pas disponible pour le moment. Veuillez réessayer plus tard.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;