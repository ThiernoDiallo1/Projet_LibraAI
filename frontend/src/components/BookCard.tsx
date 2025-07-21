import React from 'react';
import { Link } from 'react-router-dom';
import { Book } from '../types';
import { Calendar, User, BookOpen, Star } from 'lucide-react';

interface BookCardProps {
  book: Book;
  showActions?: boolean;
  onBorrow?: (bookId: string) => void;
  onReserve?: (bookId: string) => void;
  isLoading?: boolean;
}

const BookCard: React.FC<BookCardProps> = ({ 
  book, 
  showActions = true, 
  onBorrow, 
  onReserve,
  isLoading = false 
}) => {
  const isAvailable = book.available_copies > 0;

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="card-content">
        <div className="flex flex-col h-full">
          {/* Image de couverture */}
          <div className="mb-4 flex justify-center items-center">
            {book.cover_image ? (
              <div className="h-60 w-44 overflow-hidden rounded-md flex items-center justify-center bg-gray-100">
                <img
                  src={book.cover_image}
                  alt={book.title}
                  className="h-full w-auto object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://via.placeholder.com/180x240?text=Livre';
                  }}
                />
              </div>
            ) : (
              <div className="h-60 w-44 bg-gray-200 rounded-md flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Informations du livre */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {book.title}
            </h3>
            
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <User className="h-4 w-4 mr-1" />
              <span>{book.author}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600 mb-2">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{book.publication_year}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600 mb-3">
              <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs">
                {book.category}
              </span>
            </div>

            {book.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                {book.description}
              </p>
            )}

            {/* Rating */}
            {book.rating > 0 && (
              <div className="flex items-center mb-3">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600 ml-1">
                  {book.rating.toFixed(1)} ({book.reviews_count} avis)
                </span>
              </div>
            )}

            {/* Disponibilité */}
            <div className="mb-4">
              <span className={`text-sm font-medium ${
                isAvailable ? 'text-green-600' : 'text-red-600'
              }`}>
                {isAvailable 
                  ? `${book.available_copies} exemplaire(s) disponible(s)`
                  : 'Non disponible'
                }
              </span>
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex flex-col space-y-2 mt-auto">
              <Link
                to={`/books/${book.id}`}
                className="btn-outline text-center"
              >
                Voir détails
              </Link>
              
              {isAvailable ? (
                <button
                  onClick={() => onBorrow?.(book.id)}
                  disabled={isLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {isLoading ? 'Emprunt...' : 'Emprunter'}
                </button>
              ) : (
                <button
                  onClick={() => onReserve?.(book.id)}
                  disabled={isLoading}
                  className="btn-secondary disabled:opacity-50"
                >
                  {isLoading ? 'Réservation...' : 'Réserver'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;