import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { booksApi, borrowingsApi, favoritesApi } from '../services/api';
import { 
  BookOpen, 
  User, 
  Calendar, 
  Building, 
  FileText, 
  Globe, 
  Star,
  ArrowLeft,
  Copy,
  Heart,
  Share2,
  Flag,
  AlertCircle,
  X
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const BookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // États pour gérer les modales et les favoris
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Récupérer les détails du livre
  const { data: book, isLoading, error } = useQuery(
    ['book', id],
    () => booksApi.getBook(id!),
    {
      enabled: !!id
    }
  );

  // Mutation pour emprunter un livre
  const borrowMutation = useMutation(
    (bookId: string) => borrowingsApi.borrowBook(bookId),
    {
      onSuccess: () => {
        toast.success('Livre emprunté avec succès !');
        queryClient.invalidateQueries(['book', id]);
        queryClient.invalidateQueries('my-borrowings');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erreur lors de l\'emprunt');
      }
    }
  );

  // Mutation pour réserver un livre
  const reserveMutation = useMutation(
    (bookId: string) => borrowingsApi.reserveBook(bookId),
    {
      onSuccess: () => {
        toast.success('Livre réservé avec succès !');
        queryClient.invalidateQueries('my-reservations');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erreur lors de la réservation');
      }
    }
  );

  // Mutation pour ajouter aux favoris
  const addToFavoritesMutation = useMutation(
    (bookId: string) => favoritesApi.addToFavorites(bookId),
    {
      onSuccess: () => {
        toast.success('Livre ajouté aux favoris');
        setIsFavorite(true);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout aux favoris');
      }
    }
  );
  
  // Mutation pour retirer des favoris
  const removeFromFavoritesMutation = useMutation(
    (bookId: string) => favoritesApi.removeFromFavorites(bookId),
    {
      onSuccess: () => {
        toast.success('Livre retiré des favoris');
        setIsFavorite(false);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erreur lors du retrait des favoris');
      }
    }
  );
  
  // Mutation pour signaler un problème
  const reportProblemMutation = useMutation(
    ({bookId, description}: {bookId: string, description: string}) => 
      booksApi.reportProblem(bookId, description),
    {
      onSuccess: () => {
        console.log('Problème signalé avec succès');
        // Toast déjà affiché immédiatement à la soumission
      },
      onError: (error: any) => {
        // Log l'erreur pour le debugging mais ne montre pas de toast d'erreur à l'utilisateur
        console.error('Erreur lors du signalement:', error);
      }
    }
  );

  const handleBorrow = () => {
    if (book) {
      borrowMutation.mutate(book.id);
    }
  };

  const handleReserve = () => {
    if (book) {
      reserveMutation.mutate(book.id);
    }
  };

  const copyISBN = () => {
    if (book?.isbn) {
      navigator.clipboard.writeText(book.isbn);
      toast.success('ISBN copié dans le presse-papiers');
    }
  };

  // Gestion des favoris
  const toggleFavorite = () => {
    if (!book) return;
    
    if (isFavorite) {
      removeFromFavoritesMutation.mutate(book.id);
    } else {
      addToFavoritesMutation.mutate(book.id);
    }
  };

  // Gestion du partage
  const handleShare = () => {
    if (!book) return;
    
    // Générer l'URL de partage (URL actuelle)
    const shareLink = window.location.href;
    
    // Utiliser l'API Web Share si disponible
    if (navigator.share) {
      navigator.share({
        title: book.title,
        text: `Découvrez "${book.title}" par ${book.author} sur LibraAI`,
        url: shareLink
      }).catch(() => {
        // Fallback en cas d'échec
        navigator.clipboard.writeText(shareLink);
        toast.success('Lien copié dans le presse-papiers');
      });
    } else {
      // Fallback pour les navigateurs qui ne supportent pas l'API Share
      navigator.clipboard.writeText(shareLink);
      toast.success('Lien copié dans le presse-papiers');
    }
  };

  // Gestion du signalement de problème
  const handleReportClick = () => {
    setIsReportModalOpen(true);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!book || !reportDescription.trim()) {
      toast.error('Veuillez entrer une description du problème');
      return;
    }
    
    // Fermer la modale et afficher le message de remerciement immédiatement
    setIsReportModalOpen(false);
    setReportDescription('');
    toast.success('Merci d\'avoir signalé ce problème!');
    
    // Envoyer la requête en arrière-plan
    reportProblemMutation.mutate({
      bookId: book.id,
      description: reportDescription
    });
  };

  const handleReportCancel = () => {
    setIsReportModalOpen(false);
    setReportDescription('');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Livre non trouvé</p>
        <button onClick={() => navigate('/books')} className="btn-primary">
          Retour au catalogue
        </button>
      </div>
    );
  }

  const isAvailable = book.available_copies > 0;

  return (
    <div className="space-y-6">
      {/* Modale de signalement de problème */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Signaler un problème</h3>
              <button
                onClick={handleReportCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleReportSubmit}>
              <div className="mb-4">
                <label htmlFor="reportDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description du problème
                </label>
                <textarea
                  id="reportDescription"
                  rows={4}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  placeholder="Décrivez le problème que vous avez rencontré avec ce livre..."
                  required
                />
              </div>
              
              <div className="flex items-center space-x-3 justify-end">
                <button
                  type="button"
                  onClick={handleReportCancel}
                  className="btn-secondary py-1 px-3 text-sm"
                  disabled={reportProblemMutation.isLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary py-1 px-3 text-sm flex items-center space-x-2"
                  disabled={reportProblemMutation.isLoading || !reportDescription.trim()}
                >
                  {reportProblemMutation.isLoading ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-r-2 border-white"></span>
                      <span>Envoi...</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      <span>Soumettre</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Retour</span>
      </button>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
          {/* Book Cover */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {book.cover_image ? (
                <img
                  src={book.cover_image}
                  alt={book.title}
                  className="w-full max-w-sm mx-auto rounded-lg shadow-md"
                />
              ) : (
                <div className="w-full max-w-sm mx-auto aspect-[3/4] bg-gray-200 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-24 w-24 text-gray-400" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                {/* Disponibilité */}
                <div className="text-center mb-2">
                  <span className={`text-sm font-medium ${
                    isAvailable ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isAvailable 
                      ? `${book.available_copies} exemplaire(s) disponible(s)`
                      : 'Non disponible'
                    }
                  </span>
                </div>
                
                {/* Bouton Emprunter - toujours visible mais désactivé si non disponible */}
                <button
                  onClick={handleBorrow}
                  disabled={borrowMutation.isLoading || !isAvailable}
                  className={`w-full ${isAvailable ? 'btn-primary' : 'btn-disabled'}`}
                  title={!isAvailable ? 'Aucun exemplaire disponible' : undefined}
                >
                  {borrowMutation.isLoading ? 'Emprunt...' : 'Emprunter ce livre'}
                </button>
                
                {/* Bouton Réserver - toujours visible */}
                <button
                  onClick={handleReserve}
                  disabled={reserveMutation.isLoading}
                  className="btn-secondary w-full"
                >
                  {reserveMutation.isLoading ? 'Réservation...' : 'Réserver ce livre'}
                </button>
                
                {/* Séparateur */}
                <div className="border-t border-gray-200 my-4"></div>
                
                {/* Boutons d'interaction supplémentaires */}
                <div className="flex flex-wrap gap-2">
                  {/* Bouton Favoris */}
                  <button
                    onClick={toggleFavorite}
                    className="flex items-center justify-center space-x-1 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 flex-1 text-sm transition-colors"
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                    <span>{isFavorite ? 'Favori' : 'Favoris'}</span>
                  </button>
                  
                  {/* Bouton Partager */}
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center space-x-1 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 flex-1 text-sm transition-colors"
                  >
                    <Share2 className="h-4 w-4 text-gray-600" />
                    <span>Partager</span>
                  </button>
                  
                  {/* Bouton Signaler un problème */}
                  <button
                    onClick={handleReportClick}
                    className="flex items-center justify-center space-x-1 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 flex-1 text-sm transition-colors"
                  >
                    <Flag className="h-4 w-4 text-gray-600" />
                    <span>Signaler</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Book Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Author */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {book.title}
              </h1>
              <div className="flex items-center text-lg text-gray-600 mb-4">
                <User className="h-5 w-5 mr-2" />
                <span>{book.author}</span>
              </div>

              {/* Rating */}
              {book.rating > 0 && (
                <div className="flex items-center mb-4">
                  <Star className="h-5 w-5 text-yellow-400 fill-current mr-1" />
                  <span className="text-lg font-medium text-gray-900 mr-2">
                    {book.rating.toFixed(1)}
                  </span>
                  <span className="text-gray-600">
                    ({book.reviews_count} avis)
                  </span>
                </div>
              )}

              {/* Category */}
              <div className="mb-4">
                <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                  {book.category}
                </span>
              </div>
            </div>

            {/* Description */}
            {book.description && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  Description
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {book.description}
                </p>
              </div>
            )}

            {/* Book Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Informations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Année de publication</p>
                    <p className="font-medium text-gray-900">{book.publication_year}</p>
                  </div>
                </div>

                {book.publisher && (
                  <div className="flex items-center space-x-3">
                    <Building className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Éditeur</p>
                      <p className="font-medium text-gray-900">{book.publisher}</p>
                    </div>
                  </div>
                )}

                {book.pages && (
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Nombre de pages</p>
                      <p className="font-medium text-gray-900">{book.pages}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Langue</p>
                    <p className="font-medium text-gray-900">{book.language}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Copy className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">ISBN</p>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">{book.isbn}</p>
                      <button
                        onClick={copyISBN}
                        className="text-primary-600 hover:text-primary-500 text-sm"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <BookOpen className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Exemplaires</p>
                    <p className="font-medium text-gray-900">
                      {book.available_copies} / {book.total_copies} disponibles
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Les boutons d'actions sont maintenant dans la sidebar */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailPage;