import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { booksApi, borrowingsApi } from '../services/api';
import BookCard from '../components/BookCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';

const BooksPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [author, setAuthor] = useState('');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  const limit = 20;

  // Récupérer les livres
  const { data: books, isLoading, error } = useQuery(
    ['books', { search, category, author, skip: page * limit, limit }],
    () => booksApi.getBooks({ 
      search: search || undefined, 
      category: category || undefined, 
      author: author || undefined,
      skip: page * limit, 
      limit 
    }),
    {
      keepPreviousData: true
    }
  );

  // Récupérer les catégories
  const { data: categoriesData } = useQuery(
    'categories',
    () => booksApi.getCategories()
  );

  // Mutation pour emprunter un livre
  const borrowMutation = useMutation(
    (bookId: string) => borrowingsApi.borrowBook(bookId),
    {
      onSuccess: () => {
        toast.success('Livre emprunté avec succès !');
        queryClient.invalidateQueries('books');
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

  const handleBorrow = (bookId: string) => {
    borrowMutation.mutate(bookId);
  };

  const handleReserve = (bookId: string) => {
    reserveMutation.mutate(bookId);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setAuthor('');
    setPage(0);
  };

  const hasFilters = search || category || author;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Erreur lors du chargement des livres</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 container mx-auto px-2 max-w-screen-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">
          Catalogue des livres
        </h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-outline flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>Filtres</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par titre, auteur ou description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="input pl-10 w-full"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(0);
                }}
                className="input w-full"
              >
                <option value="">Toutes les catégories</option>
                {categoriesData?.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auteur
              </label>
              <input
                type="text"
                placeholder="Nom de l'auteur"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  setPage(0);
                }}
                className="input w-full"
              />
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {hasFilters && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
            <span className="text-sm text-gray-600">
              Filtres actifs
            </span>
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-500"
            >
              <X className="h-4 w-4" />
              <span>Effacer les filtres</span>
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Books Grid */}
      {!isLoading && books && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onBorrow={handleBorrow}
                onReserve={handleReserve}
                isLoading={borrowMutation.isLoading || reserveMutation.isLoading}
              />
            ))}
          </div>

          {/* No Results */}
          {books.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                Aucun livre trouvé avec ces critères de recherche.
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-primary"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {books.length === limit && (
            <div className="flex justify-center space-x-4">
              {page > 0 && (
                <button
                  onClick={() => setPage(page - 1)}
                  className="btn-outline"
                >
                  Précédent
                </button>
              )}
              {books.length === limit && (
                <button
                  onClick={() => setPage(page + 1)}
                  className="btn-outline"
                >
                  Suivant
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BooksPage;