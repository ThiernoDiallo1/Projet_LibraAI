import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';
import FloatingChatbot from './components/FloatingChatbot';
import FloatingChatButton from './components/FloatingChatButton';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import BooksPage from './pages/BooksPage';
import BookDetailPage from './pages/BookDetailPage';
import MyBorrowingsPage from './pages/MyBorrowingsPage';
import ChatbotPage from './pages/ChatbotPage';
import PaymentPage from './pages/PaymentPage';
import AdminPage from './pages/AdminPage';

function App() {
  const { user, isLoading } = useAuth();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" /> : <LoginPage />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} 
          />
          <Route 
            path="/forgot-password" 
            element={user ? <Navigate to="/dashboard" /> : <ForgotPasswordPage />} 
          />

          {/* Routes protégées */}
          <Route 
            path="/dashboard" 
            element={user ? <DashboardPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/books" 
            element={user ? <BooksPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/books/:id" 
            element={user ? <BookDetailPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/my-borrowings" 
            element={user ? <MyBorrowingsPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/chatbot" 
            element={user ? <ChatbotPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/payment" 
            element={user ? <PaymentPage /> : <Navigate to="/login" />} 
          />

          {/* Routes admin */}
          <Route 
            path="/admin" 
            element={
              user && user.is_admin ? <AdminPage /> : <Navigate to="/dashboard" />
            } 
          />

          {/* Route par défaut */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      
      {/* Chatbot flottant - disponible uniquement si l'utilisateur est connecté */}
      {user && (
        <>
          <FloatingChatbot 
            isOpen={isChatbotOpen} 
            onToggle={() => setIsChatbotOpen(!isChatbotOpen)} 
          />
          {!isChatbotOpen && (
            <FloatingChatButton 
              onClick={() => setIsChatbotOpen(true)} 
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;