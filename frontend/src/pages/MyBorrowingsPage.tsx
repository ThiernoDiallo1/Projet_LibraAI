import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { borrowingsApi, booksApi, favoritesApi } from '../services/api';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const MyBorrowingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'returned' | 'reservations' | 'favorites'>('active');
  const queryClient = useQueryClient();

  // Récupérer les emprunts
  const { data: borrowings, isLoading: borrowingsLoading } = useQuery(
    'my-borrowings',
    () => borrowingsApi.getMyBorrowings()
  );

  // Récupérer les réservations
  const { data: reservations, isLoading: reservationsLoading } = useQuery(
    'my-reservations',
    () => borrowingsApi.getMyReservations()
  );

  // Récupérer les favoris
  const { data: favorites, isLoading: favoritesLoading } = useQuery(
    'my-favorites',
    () => favoritesApi.getFavorites(),
    {
      onError: (error) => {
        console.error('Erreur lors de la récupération des favoris:', error);
        toast.error('Impossible de récupérer vos livres favoris');
      }
    }
  );
  
  // Mutation pour retirer un livre des favoris
  const removeFavoriteMutation = useMutation(
    (bookId: string) => favoritesApi.removeFromFavorites(bookId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('my-favorites');
        toast.success('Livre retiré des favoris');
      },
      onError: () => {
        toast.error('Erreur lors du retrait des favoris');
      }
    }
  );
  
  // Handler pour retirer un livre des favoris
  const handleRemoveFavorite = (bookId: string) => {
    removeFavoriteMutation.mutate(bookId);
  };

  // Mutation pour retourner un livre
  const returnMutation = useMutation(
    (borrowingId: string) => borrowingsApi.returnBook(borrowingId),
    {
      onSuccess: (data) => {
        toast.success(`Livre retourné avec succès! ${data.fine_amount > 0 ? `Amende: ${data.fine_amount}€` : ''}`);
        queryClient.invalidateQueries('my-borrowings');
        queryClient.invalidateQueries('user-balance');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erreur lors du retour');
      }
    }
  );

  // Mutation pour renouveler un emprunt
  const renewMutation = useMutation(
    (borrowingId: string) => borrowingsApi.renewBorrowing(borrowingId),
    {
      onSuccess: (data, variables) => {
        // variables contient le borrowingId passé à la mutation
        const borrowingId = variables;
        toast.success(`Emprunt renouvelé jusqu'au ${new Date(data.new_due_date).toLocaleDateString('fr-FR')}`);
        
        // Mettre à jour immédiatement l'interface utilisateur avec les données mises à jour
        if (data.updated_borrowing) {
          // Mettre à jour optimiste des données locales
          queryClient.setQueryData('my-borrowings', (oldData: any) => {
            if (!oldData) return oldData;
            
            // Remplacer l'emprunt renouvelé dans le tableau local
            const updatedBorrowings = oldData.map((borrowing: any) => {
              // Vérifie si cet emprunt est celui qu'on vient de renouveler
              if (borrowing.id === borrowingId) {
                return {
                  ...borrowing,
                  due_date: data.new_due_date,
                  renewal_count: borrowing.renewal_count + 1
                };
              }
              return borrowing;
            });
            
            return updatedBorrowings;
          });
        }
        
        // Invalider la requête pour forcer un rafraîchissement complet
        queryClient.invalidateQueries('my-borrowings');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erreur lors du renouvellement');
      }
    }
  );

  // Récupérer les détails des livres pour les emprunts
  const { data: booksDetails } = useQuery(
    ['books-details', borrowings?.map(b => b.book_id)],
    async () => {
      if (!borrowings) return {};
      const bookPromises = borrowings.map(b => booksApi.getBook(b.book_id).catch(() => null));
      const books = await Promise.all(bookPromises);
      return books.reduce((acc, book, index) => {
        if (book) {
          acc[borrowings[index].book_id] = book;
        }
        return acc;
      }, {} as Record<string, any>);
    },
    {
      enabled: !!borrowings && borrowings.length > 0
    }
  );

  const activeBorrowings = borrowings?.filter(b => b.status === 'active') || [];
  const returnedBorrowings = borrowings?.filter(b => b.status === 'returned') || [];
  const overdueBorrowings = borrowings?.filter(b => b.status === 'overdue') || [];

  const handleReturn = (borrowingId: string) => {
    returnMutation.mutate(borrowingId);
  };

  const handleRenew = (borrowingId: string) => {
    renewMutation.mutate(borrowingId);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (borrowingsLoading || reservationsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Mes emprunts et réservations
        </h1>
        <p className="text-gray-600">
          Gérez vos livres empruntés et vos réservations
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Emprunts actifs ({activeBorrowings.length + overdueBorrowings.length})
            </button>
            <button
              onClick={() => setActiveTab('returned')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'returned'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Historique ({returnedBorrowings.length})
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reservations'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Réservations ({reservations?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'favorites'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Favoris ({favorites?.length || 0})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Favorites */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              {favoritesLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : favorites && favorites.length > 0 ? (
                favorites.map((book) => (
                  <div
                    key={book.id}
                    className="border rounded-lg p-4 flex items-start justify-between"
                  >
                    <div className="flex">
                      {book.cover_image && (
                        <img 
                          src={book.cover_image} 
                          alt={book.title} 
                          className="h-24 w-auto rounded mr-4 object-contain"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{book.title}</h3>
                        {book.author && (
                          <p className="text-gray-600 mb-2">{book.author}</p>
                        )}
                        {book.category && (
                          <p className="text-gray-500 text-sm">{book.category}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFavorite(book.id)}
                      className="ml-4 text-red-600 hover:text-red-800 flex items-center"
                    >
                      <span className="sr-only">Retirer des favoris</span>
                      ❌
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">Aucun livre favori</p>
                </div>
              )}
            </div>
          )}
          
          {/* Active Borrowings */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              {[...activeBorrowings, ...overdueBorrowings].length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun emprunt actif</p>
                </div>
              ) : (
                [...activeBorrowings, ...overdueBorrowings].map((borrowing) => {
                  const book = booksDetails?.[borrowing.book_id];
                  const daysUntilDue = getDaysUntilDue(borrowing.due_date);
                  const isLate = isOverdue(borrowing.due_date);
                  
                  return (
                    <div
                      key={borrowing.id}
                      className={`border rounded-lg p-4 ${
                        isLate ? 'border-red-200 bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {book?.title || `Livre ID: ${borrowing.book_id}`}
                          </h3>
                          {book?.author && (
                            <p className="text-gray-600 mb-2">{book.author}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Emprunté le {new Date(borrowing.borrowed_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                À rendre le {new Date(borrowing.due_date).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="mt-2">
                            {isLate ? (
                              <div className="flex items-center space-x-1 text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  En retard de {Math.abs(daysUntilDue)} jour(s)
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {daysUntilDue === 0 
                                    ? 'À rendre aujourd\'hui' 
                                    : `${daysUntilDue} jour(s) restant(s)`
                                  }
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Fine */}
                          {borrowing.fine_amount > 0 && (
                            <div className="mt-2 text-red-600 text-sm">
                              Amende: {borrowing.fine_amount.toFixed(2)}€
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={() => handleReturn(borrowing.id)}
                            disabled={returnMutation.isLoading}
                            className="btn-primary text-sm"
                          >
                            {returnMutation.isLoading ? 'Retour...' : 'Retourner'}
                          </button>
                          
                          {borrowing.renewal_count < borrowing.max_renewals && !isLate && (
                            <button
                              onClick={() => handleRenew(borrowing.id)}
                              disabled={renewMutation.isLoading}
                              className="btn-outline text-sm flex items-center space-x-1"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>
                                {renewMutation.isLoading ? 'Renouvellement...' : 'Renouveler'}
                              </span>
                            </button>
                          )}
                          
                          <div className="text-xs text-gray-500 text-center">
                            {borrowing.max_renewals - borrowing.renewal_count} renouvellement(s) restant(s)
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Returned Books */}
          {activeTab === 'returned' && (
            <div className="space-y-4">
              {returnedBorrowings.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowLeft className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun livre retourné</p>
                </div>
              ) : (
                returnedBorrowings.map((borrowing) => {
                  const book = booksDetails?.[borrowing.book_id];
                  
                  return (
                    <div key={borrowing.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {book?.title || `Livre ID: ${borrowing.book_id}`}
                          </h3>
                          {book?.author && (
                            <p className="text-gray-600 mb-2">{book.author}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>
                              Emprunté le {new Date(borrowing.borrowed_at).toLocaleDateString('fr-FR')}
                            </span>
                            <span>
                              Retourné le {borrowing.returned_at ? new Date(borrowing.returned_at).toLocaleDateString('fr-FR') : 'N/A'}
                            </span>
                          </div>

                          {borrowing.fine_amount > 0 && (
                            <div className="mt-2 text-red-600 text-sm">
                              Amende payée: {borrowing.fine_amount.toFixed(2)}€
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Retourné</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Reservations */}
          {activeTab === 'reservations' && (
            <div className="space-y-4">
              {!reservations || reservations.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucune réservation</p>
                </div>
              ) : (
                reservations.map((reservation) => (
                  <div key={reservation.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {reservation.book_info?.title || `Livre ID: ${reservation.book_id}`}
                        </h3>
                        {reservation.book_info?.author && (
                          <p className="text-gray-600 mb-2">{reservation.book_info.author}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>
                            Réservé le {new Date(reservation.reserved_at).toLocaleDateString('fr-FR')}
                          </span>
                          <span>
                            Expire le {new Date(reservation.expires_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                          reservation.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : reservation.status === 'fulfilled'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {reservation.status === 'pending' && 'En attente'}
                          {reservation.status === 'fulfilled' && 'Disponible'}
                          {reservation.status === 'cancelled' && 'Annulée'}
                          {reservation.status === 'expired' && 'Expirée'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyBorrowingsPage;