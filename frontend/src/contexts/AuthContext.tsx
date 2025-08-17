import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, RegisterData, LoginResponse } from '../types';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Vérifier la validité du token
      verifyToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await authApi.verifyToken(token);
      if (response.valid) {
        setIsLoading(false);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('Tentative de connexion avec:', email);
      
      // Utiliser une promesse avec timeout explicite
      const loginPromise = authApi.login(email, password);
      console.log('Requête de connexion envoyée, en attente de réponse...');
      
      const response: LoginResponse = await loginPromise;
      console.log('Réponse reçue:', response);
      
      setToken(response.access_token);
      setUser(response.user);
      
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      console.log('Authentification réussie, redirection imminente');
      toast.success(`Bienvenue, ${response.user.full_name}!`);
    } catch (error: any) {
      console.error('Erreur de connexion détaillée:', error);
      console.error('Status:', error.response?.status);
      console.error('Message:', error.response?.data);
      console.error('Type d\'erreur:', error.name);
      toast.error(error.response?.data?.detail || 'Erreur de connexion');
      throw error;
    } finally {
      console.log('Fin du processus de connexion');
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      console.log('Tentative d\'inscription avec:', userData);
      
<<<<<<< HEAD
      toast.success('Inscription réussie! Vous pouvez maintenant vous connecter.');
    } catch (error: any) {
=======
      // Appel à l'API backend pour créer le compte
      const response = await authApi.register(userData);
      console.log('Utilisateur créé avec succès:', response);
      
      toast.success('Inscription réussie! Vous pouvez maintenant vous connecter.');
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error);
>>>>>>> 48a0ca7 (WIP: corrections locales avant synchronisation avec origin/master)
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'inscription');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Déconnexion réussie');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};