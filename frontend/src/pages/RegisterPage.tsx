import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Eye, EyeOff } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { RegisterData } from '../types';

const RegisterPage: React.FC = () => {
  const { register: registerUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch
  } = useForm<RegisterData & { confirmPassword: string }>();

  const password = watch('password');

  const onSubmit = async (data: RegisterData & { confirmPassword: string }) => {
    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', {
        message: 'Les mots de passe ne correspondent pas'
      });
      return;
    }

    try {
      const { confirmPassword, ...registerData } = data;
      await registerUser(registerData);
      navigate('/login');
    } catch (error: any) {
      setError('root', {
        message: error.response?.data?.detail || 'Erreur lors de l\'inscription'
      });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <BookOpen className="h-12 w-12 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Créer un compte LibraAi
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ou{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              connectez-vous à votre compte existant
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Nom complet
              </label>
              <input
                {...register('full_name', {
                  required: 'Le nom complet est requis',
                  minLength: {
                    value: 2,
                    message: 'Le nom doit contenir au moins 2 caractères'
                  }
                })}
                type="text"
                className="input mt-1"
                placeholder="Jean Dupont"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Nom d'utilisateur
              </label>
              <input
                {...register('username', {
                  required: 'Le nom d\'utilisateur est requis',
                  minLength: {
                    value: 3,
                    message: 'Le nom d\'utilisateur doit contenir au moins 3 caractères'
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'
                  }
                })}
                type="text"
                className="input mt-1"
                placeholder="jeandupont"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <input
                {...register('email', {
                  required: 'L\'email est requis',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Adresse email invalide'
                  }
                })}
                type="email"
                className="input mt-1"
                placeholder="jean@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="relative mt-1">
                <input
                  {...register('password', {
                    required: 'Le mot de passe est requis',
                    minLength: {
                      value: 6,
                      message: 'Le mot de passe doit contenir au moins 6 caractères'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Votre mot de passe"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <input
                {...register('confirmPassword', {
                  required: 'La confirmation du mot de passe est requise',
                  validate: (value) => 
                    value === password || 'Les mots de passe ne correspondent pas'
                })}
                type="password"
                className="input mt-1"
                placeholder="Confirmez votre mot de passe"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {errors.root && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{errors.root.message}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center items-center"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Création du compte...
                </>
              ) : (
                'Créer mon compte'
              )}
            </button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            En créant un compte, vous acceptez nos{' '}
            <Link to="/terms" className="text-primary-600 hover:text-primary-500">
              conditions d'utilisation
            </Link>{' '}
            et notre{' '}
            <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
              politique de confidentialité
            </Link>
            .
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Déjà membre ?</span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              to="/login"
              className="btn-outline w-full text-center"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;