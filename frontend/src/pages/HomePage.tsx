import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, MessageCircle, CreditCard, Users, Zap, Shield } from 'lucide-react';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Bienvenue sur <span className="text-primary-600">LibraAi</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            La bibliothèque intelligente du futur. Gérez vos emprunts, découvrez de nouveaux livres 
            et posez vos questions à notre assistant IA alimenté par vos documents.
          </p>
          
          {user ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard" className="btn-primary text-lg px-8 py-3">
                Accéder au tableau de bord
              </Link>
              <Link to="/books" className="btn-outline text-lg px-8 py-3">
                Explorer les livres
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg px-8 py-3">
                Commencer gratuitement
              </Link>
              <Link to="/login" className="btn-outline text-lg px-8 py-3">
                Se connecter
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white rounded-lg shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Fonctionnalités principales
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Gestion des emprunts
              </h3>
              <p className="text-gray-600">
                Empruntez, réservez et gérez vos livres en toute simplicité. 
                Suivez vos échéances et renouvelez vos emprunts.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Assistant IA
              </h3>
              <p className="text-gray-600">
                Uploadez vos documents PDF et posez des questions. 
                Notre IA alimentée par Ollama et Pinecone vous répond instantanément.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Paiement sécurisé
              </h3>
              <p className="text-gray-600">
                Payez vos amendes facilement et en toute sécurité 
                grâce à l'intégration PayPal.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Interface moderne
              </h3>
              <p className="text-gray-600">
                Interface responsive et intuitive construite avec React et Tailwind CSS 
                pour une expérience utilisateur optimale.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Performance
              </h3>
              <p className="text-gray-600">
                API rapide construite avec FastAPI et base de données MongoDB Atlas 
                pour des performances optimales.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Sécurité
              </h3>
              <p className="text-gray-600">
                Authentification sécurisée avec JWT et protection des données 
                selon les meilleures pratiques de sécurité.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            LibraAi en chiffres
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">1000+</div>
              <div className="text-gray-600">Livres disponibles</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">500+</div>
              <div className="text-gray-600">Utilisateurs actifs</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">24/7</div>
              <div className="text-gray-600">Assistant IA disponible</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">99.9%</div>
              <div className="text-gray-600">Temps de disponibilité</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-16 bg-primary-600 rounded-lg text-white text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">
              Prêt à commencer votre aventure littéraire ?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Rejoignez LibraAi dès aujourd'hui et découvrez une nouvelle façon 
              de gérer votre bibliothèque avec l'intelligence artificielle.
            </p>
            <Link to="/register" className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-md transition-colors">
              Créer un compte gratuit
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;