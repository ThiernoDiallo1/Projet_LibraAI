import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from 'react-query';
import { booksApi, borrowingsApi, paymentsApi } from '../services/api';
import { Book } from '../types';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Calendar, 
  CreditCard, 
  MessageCircle, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [borrowedBooks, setBorrowedBooks] = useState<Record<string, Book>>({});

  // Récupérer les données du dashboard
  const { data: recentBooks, isLoading: booksLoading } = useQuery(
    'recent-books',
    () => booksApi.getBooks({ limit: 6 })
  );

  const { data: myBorrowings, isLoading: borrowingsLoading } = useQuery(
    'my-borrowings',
    () => borrowingsApi.getMyBorrowings()
  );

  const { data: balance } = useQuery(
    'user-balance',
    () => paymentsApi.getUserBalance()
  );
  
  // Charger les détails des livres empruntés
  useEffect(() => {
    const loadBookDetails = async () => {
      if (myBorrowings && myBorrowings.length > 0) {
        const bookDetailsMap: Record<string, Book> = {};
        
        // Ne charger que les livres des emprunts actifs
        const activeBooks = myBorrowings.filter(b => b.status === 'active' || b.status === 'overdue');
        
        // Charger les détails pour chaque livre
        for (const borrowing of activeBooks.slice(0, 5)) { // Limite à 5 pour éviter trop de requêtes
          try {
            const bookDetails = await booksApi.getBook(borrowing.book_id);
            bookDetailsMap[borrowing.book_id] = bookDetails;
          } catch (error) {
            console.error(`Erreur lors du chargement des détails du livre ${borrowing.book_id}:`, error);
          }
        }
        
        setBorrowedBooks(bookDetailsMap);
      }
    };
    
    loadBookDetails();
  }, [myBorrowings]);

  const activeBorrowings = myBorrowings?.filter(b => b.status === 'active') || [];
  const overdueBorrowings = myBorrowings?.filter(b => b.status === 'overdue') || [];

  if (booksLoading || borrowingsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bonjour, {user?.full_name} !
        </h1>
        <p className="text-gray-600">
          Bienvenue sur votre tableau de bord LibraAi. Voici un aperçu de votre activité.
        </p>
      </div>

      {/* Notification d'amendes */}
      {balance && balance.fine_amount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Vous avez des amendes impayées
                </h3>
                <p className="text-sm text-red-700">
                  Montant total : {balance.fine_amount.toFixed(2)}€
                </p>
              </div>
            </div>
            <Link 
              to="/payment" 
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Payer maintenant
            </Link>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Emprunts actifs</p>
              <p className="text-2xl font-bold text-gray-900">{activeBorrowings.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En retard</p>
              <p className="text-2xl font-bold text-gray-900">{overdueBorrowings.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-full">
              <CreditCard className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Amendes</p>
              <p className="text-2xl font-bold text-gray-900">
                {balance?.fine_amount?.toFixed(2) || '0.00'}€
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Livres lus</p>
              <p className="text-2xl font-bold text-gray-900">
                {myBorrowings?.filter(b => b.status === 'returned').length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(overdueBorrowings.length > 0 || (balance?.fine_amount || 0) > 0) && (
        <div className="space-y-4">
          {overdueBorrowings.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <h3 className="text-sm font-medium text-red-800">
                  Vous avez {overdueBorrowings.length} livre(s) en retard
                </h3>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Veuillez retourner vos livres pour éviter des amendes supplémentaires.
              </p>
              <Link 
                to="/my-borrowings" 
                className="text-sm text-red-600 hover:text-red-500 font-medium mt-2 inline-block"
              >
                Voir mes emprunts →
              </Link>
            </div>
          )}

          {(balance?.fine_amount || 0) > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-yellow-600 mr-2" />
                <h3 className="text-sm font-medium text-yellow-800">
                  Vous avez {balance?.fine_amount?.toFixed(2)}€ d'amendes à payer
                </h3>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Réglez vos amendes pour continuer à emprunter des livres.
              </p>
              <Link 
                to="/payment" 
                className="text-sm text-yellow-600 hover:text-yellow-500 font-medium mt-2 inline-block"
              >
                Payer maintenant →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link 
          to="/books" 
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-center"
        >
          <BookOpen className="h-8 w-8 text-primary-600 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-1">Explorer les livres</h3>
          <p className="text-sm text-gray-600">Découvrir de nouveaux ouvrages</p>
        </Link>

        <Link 
          to="/my-borrowings" 
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-center"
        >
          <Calendar className="h-8 w-8 text-green-600 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-1">Mes emprunts</h3>
          <p className="text-sm text-gray-600">Gérer mes livres empruntés</p>
        </Link>

        <Link 
          to="/chatbot" 
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-center"
        >
          <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-1">Assistant IA</h3>
          <p className="text-sm text-gray-600">Poser des questions</p>
        </Link>

        {(balance?.fine_amount || 0) > 0 && (
          <Link 
            to="/payment" 
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-center"
          >
            <CreditCard className="h-8 w-8 text-red-600 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">Payer amendes</h3>
            <p className="text-sm text-gray-600">Régler mes amendes</p>
          </Link>
        )}
      </div>

      {/* Recent Books */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Livres récents</h2>
          <Link 
            to="/books" 
            className="text-primary-600 hover:text-primary-500 font-medium text-sm"
          >
            Voir tout →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentBooks?.slice(0, 6).map((book) => (
            <div key={book.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex space-x-3">
                <div className="flex-shrink-0">
                  {book.cover_image ? (
                    <img
                      src={book.cover_image}
                      alt={book.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {book.title}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">{book.author}</p>
                  <p className="text-xs text-gray-500 mt-1">{book.category}</p>
                  <Link
                    to={`/books/${book.id}`}
                    className="text-xs text-primary-600 hover:text-primary-500 mt-2 inline-block"
                  >
                    Voir détails →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {activeBorrowings.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Emprunts en cours</h2>
            <Link 
              to="/my-borrowings" 
              className="text-primary-600 hover:text-primary-500 font-medium text-sm"
            >
              Voir tout →
            </Link>
          </div>
          
          <div className="space-y-4">
            {activeBorrowings.slice(0, 3).map((borrowing) => (
              <div key={borrowing.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {borrowedBooks[borrowing.book_id] 
                      ? borrowedBooks[borrowing.book_id].title 
                      : <span>Chargement... <span className="text-xs text-gray-500">({borrowing.book_id})</span></span>}
                  </p>
                  {borrowedBooks[borrowing.book_id] && (
                    <p className="text-sm text-gray-600">
                      par {borrowedBooks[borrowing.book_id].author}
                    </p>
                  )}
                  <p className="text-xs text-gray-600">
                    Emprunté le {new Date(borrowing.borrowed_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    À rendre le {new Date(borrowing.due_date).toLocaleDateString('fr-FR')}
                  </p>
                  <p className={`text-xs ${
                    new Date(borrowing.due_date) < new Date() 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {new Date(borrowing.due_date) < new Date() ? 'En retard' : 'À temps'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;