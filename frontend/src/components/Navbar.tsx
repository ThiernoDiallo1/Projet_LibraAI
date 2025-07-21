import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Home, 
  MessageCircle, 
  CreditCard,
  Settings
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">LibraAi</span>
          </Link>

          {/* Navigation desktop */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span>Tableau de bord</span>
                </Link>
                <Link 
                  to="/books" 
                  className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Livres</span>
                </Link>
                <Link 
                  to="/my-borrowings" 
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Mes emprunts
                </Link>
                <Link 
                  to="/chatbot" 
                  className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Assistant IA</span>
                </Link>
                <Link 
                  to="/payment" 
                  className={`flex items-center space-x-1 transition-colors ${
                    user.fine_amount && user.fine_amount > 0 
                      ? 'text-red-600 hover:text-red-700' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>
                    {user.fine_amount && user.fine_amount > 0 
                      ? `Amendes (${user.fine_amount.toFixed(2)}€)` 
                      : 'Paiements'
                    }
                  </span>
                </Link>
                {user.is_admin && (
                  <Link 
                    to="/admin" 
                    className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Admin</span>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/books" className="text-gray-700 hover:text-primary-600 transition-colors">
                  Catalogue
                </Link>
                <Link to="/login" className="text-gray-700 hover:text-primary-600 transition-colors">
                  Connexion
                </Link>
                <Link to="/register" className="btn-primary">
                  Inscription
                </Link>
              </>
            )}
          </div>

          {/* Menu utilisateur desktop */}
          {user && (
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-700">{user.full_name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          )}

          {/* Bouton menu mobile */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Menu mobile */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-2 px-2 py-1 bg-gray-50 rounded">
                    <User className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-700">{user.full_name}</span>
                  </div>
                  <Link 
                    to="/dashboard" 
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Home className="h-4 w-4" />
                    <span>Tableau de bord</span>
                  </Link>
                  <Link 
                    to="/books" 
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Livres</span>
                  </Link>
                  <Link 
                    to="/my-borrowings" 
                    className="text-gray-700 hover:text-primary-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Mes emprunts
                  </Link>
                  <Link 
                    to="/chatbot" 
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Assistant IA</span>
                  </Link>
                  <Link 
                    to="/payment" 
                    className={`flex items-center space-x-2 transition-colors ${
                      user.fine_amount && user.fine_amount > 0 
                        ? 'text-red-600 hover:text-red-700' 
                        : 'text-gray-700 hover:text-primary-600'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {user.fine_amount && user.fine_amount > 0 
                        ? `Amendes (${user.fine_amount.toFixed(2)}€)` 
                        : 'Paiements'
                      }
                    </span>
                  </Link>
                  {user.is_admin && (
                    <Link 
                      to="/admin" 
                      className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Administration</span>
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-gray-700 hover:text-red-600 text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Déconnexion</span>
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/books" 
                    className="text-gray-700 hover:text-primary-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Catalogue
                  </Link>
                  <Link 
                    to="/login" 
                    className="text-gray-700 hover:text-primary-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Connexion
                  </Link>
                  <Link 
                    to="/register" 
                    className="btn-primary w-fit"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Inscription
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;