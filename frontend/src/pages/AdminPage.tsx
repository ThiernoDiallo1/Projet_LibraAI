import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { booksApi, usersApi, statsApi } from '../services/api';
import { useForm } from 'react-hook-form';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen, 
  Users, 
  TrendingUp,
  Settings,
  Search,
  X
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Book } from '../types';

interface BookFormData {
  title: string;
  author: string;
  isbn: string;
  description?: string;
  category: string;
  publication_year: number;
  publisher?: string;
  pages?: number;
  language: string;
  cover_image?: string;
  total_copies: number;
}

interface UserFormData {
  username: string;
  email: string;
  password?: string;
  full_name: string;
  is_active?: boolean;
  is_admin?: boolean;
}

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'books' | 'users'>('overview');
  const [showAddBook, setShowAddBook] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  
  // Couleurs pour les graphiques
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];
  
  // Requête pour récupérer les statistiques du dashboard admin
  const { data: dashboardStats, isLoading: isLoadingStats } = useQuery(
    ['adminDashboardStats'], 
    () => statsApi.getAdminDashboardStats(),
    {
      refetchOnWindowFocus: false,
      onError: (error: any) => {
        toast.error(`Erreur lors de la récupération des statistiques: ${error.message}`);
      }
    }
  );
  
  // États pour la gestion des utilisateurs
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Récupérer les livres pour l'admin
  const { data: books, isLoading: booksLoading } = useQuery(
    ['admin-books', searchTerm],
    () => booksApi.getBooks({ search: searchTerm || undefined, limit: 100 }),
    { enabled: activeTab === 'books' || activeTab === 'overview' }
  );
  
  // Récupérer les utilisateurs pour l'admin
  const { data: users, isLoading: usersLoading } = useQuery(
    ['admin-users', userSearchTerm],
    () => usersApi.getUsers({ search: userSearchTerm || undefined, limit: 100 }),
    { enabled: activeTab === 'users' }
  );

  // Form pour ajouter/modifier un livre
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<BookFormData>();
  
  // Form pour ajouter/modifier un utilisateur
  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    formState: { errors: userErrors },
    reset: resetUserForm,
    setValue: setUserValue
  } = useForm<UserFormData>();

  // Mutation pour créer un livre
  const createBookMutation = useMutation(
    (bookData: BookFormData) => booksApi.createBook(bookData),
    {
      onSuccess: () => {
        toast.success('Livre ajouté avec succès');
        queryClient.invalidateQueries('admin-books');
        setShowAddBook(false);
        reset();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
      }
    }
  );

  // Mutation pour modifier un livre
  const updateBookMutation = useMutation(
    ({ id, data }: { id: string; data: Partial<BookFormData> }) => 
      booksApi.updateBook(id, data),
    {
      onSuccess: () => {
        toast.success('Livre modifié avec succès');
        queryClient.invalidateQueries('admin-books');
        setEditingBook(null);
        reset();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erreur lors de la modification');
      }
    }
  );

  // Mutation pour supprimer un livre
  const deleteBookMutation = useMutation(
    (bookId: string) => booksApi.deleteBook(bookId),
    {
      onSuccess: () => {
        toast.success('Livre supprimé avec succès');
        queryClient.invalidateQueries('admin-books');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  );

  // Mutations pour la gestion des utilisateurs
  const createUserMutation = useMutation(
    (userData: UserFormData) => usersApi.createUser(userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users');
        toast.success('Utilisateur créé avec succès');
        setShowAddUser(false);
        resetUserForm();
      },
      onError: (error: any) => {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        toast.error(error.response?.data?.detail || 'Erreur lors de la création de l\'utilisateur');
      }
    }
  );
  
  const updateUserMutation = useMutation(
    ({ id, data }: { id: string; data: UserFormData }) => usersApi.updateUser(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users');
        toast.success('Utilisateur mis à jour avec succès');
        setEditingUser(null);
        resetUserForm();
        setShowAddUser(false);
      },
      onError: (error: any) => {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
        toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour de l\'utilisateur');
      }
    }
  );
  
  const deleteUserMutation = useMutation(
    (userId: string) => usersApi.deleteUser(userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users');
        toast.success('Utilisateur supprimé avec succès');
      },
      onError: (error: any) => {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        toast.error(error.response?.data?.detail || 'Erreur lors de la suppression de l\'utilisateur');
      }
    }
  );

  const onSubmit = async (data: BookFormData) => {
    // Si un fichier image est sélectionné, on prépare un FormData
    if (coverImageFile) {
      const formData = new FormData();
      
      // Ajouter toutes les données du livre au FormData
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'cover_image') { // On ignore ce champ car on va utiliser le fichier
          formData.append(key, String(value));
        }
      });
      
      // Ajouter le fichier image
      formData.append('cover_image', coverImageFile);
      
      try {
        if (editingBook) {
          // Appel API personnalisé pour l'upload avec FormData
          await booksApi.updateBookWithImage(editingBook.id, formData);
          toast.success('Livre modifié avec succès');
          queryClient.invalidateQueries('admin-books');
          setEditingBook(null);
          reset();
          setShowAddBook(false);
          setCoverImageFile(null);
          setCoverImagePreview('');
        } else {
          // Appel API personnalisé pour l'upload avec FormData
          await booksApi.createBookWithImage(formData);
          toast.success('Livre ajouté avec succès');
          queryClient.invalidateQueries('admin-books');
          reset();
          setShowAddBook(false);
          setCoverImageFile(null);
          setCoverImagePreview('');
        }
      } catch (error: any) {
        console.error('Erreur upload:', error);
        let errorMessage = 'Erreur lors de l\'opération';
        if (error.response?.data?.detail) {
          // Si l'erreur est un objet, on le convertit en string
          errorMessage = typeof error.response.data.detail === 'object' 
            ? JSON.stringify(error.response.data.detail)
            : error.response.data.detail;
        }
        toast.error(errorMessage);
      }
    } else {
      // Comportement standard sans image uploadée
      if (editingBook) {
        updateBookMutation.mutate({ id: editingBook.id, data });
      } else {
        createBookMutation.mutate(data);
      }
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setShowAddBook(true);
    
    // Pré-remplir le formulaire
    setValue('title', book.title);
    setValue('author', book.author);
    setValue('isbn', book.isbn);
    setValue('description', book.description || '');
    setValue('category', book.category);
    setValue('publication_year', book.publication_year);
    setValue('publisher', book.publisher || '');
    setValue('pages', book.pages || 0);
    setValue('language', book.language);
    setValue('cover_image', book.cover_image || '');
    setValue('total_copies', book.total_copies);
  };

  const handleDelete = (book: Book) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${book.title}" ?`)) {
      deleteBookMutation.mutate(book.id);
    }
  };

  const closeModal = () => {
    setShowAddBook(false);
    setEditingBook(null);
    reset();
    setCoverImageFile(null);
    setCoverImagePreview('');
  };

  // Fonction pour éditer un utilisateur
  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setShowAddUser(true);
    
    // Pré-remplir le formulaire utilisateur
    setUserValue('username', user.username);
    setUserValue('email', user.email);
    setUserValue('full_name', user.full_name);
    setUserValue('is_active', user.is_active);
    setUserValue('is_admin', user.is_admin);
  };
  
  // Fonction pour supprimer un utilisateur
  const handleDeleteUser = (userId: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer cet utilisateur ?`)) {
      deleteUserMutation.mutate(userId);
    }
  };
  
  // Le mot de passe est laissé vide pour des raisons de sécurité
  const onUserSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Administration LibraAi
        </h1>
        <p className="text-gray-600">
          Gérez les livres, utilisateurs et paramètres de la bibliothèque
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab('books')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'books'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Gestion des livres
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Utilisateurs
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {isLoadingStats ? (
                <div className="flex justify-center items-center h-40">
                  <LoadingSpinner />
                  <span className="ml-2 text-gray-600">Chargement des statistiques...</span>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-blue-50 rounded-lg p-6">
                      <div className="flex items-center">
                        <BookOpen className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-blue-600">Total Livres</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {dashboardStats?.books_count || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-6">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-green-600">Utilisateurs</p>
                          <p className="text-2xl font-bold text-green-900">
                            {dashboardStats?.users_count || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-6">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-yellow-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-yellow-600">Emprunts actifs</p>
                          <p className="text-2xl font-bold text-yellow-900">
                            {dashboardStats?.active_borrowings_count || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-6">
                      <div className="flex items-center">
                        <Settings className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-purple-600">En retard</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {dashboardStats?.overdue_borrowings_count || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Charts */}
                  <div className="space-y-6">
                    {/* Graphique des emprunts par mois */}
                    <div className="bg-white rounded-lg p-6 shadow">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Activité des emprunts (6 derniers mois)
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            width={500}
                            height={300}
                            data={dashboardStats?.borrowings_by_month || []}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Emprunts" fill="#0088FE" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Livres les plus empruntés */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg p-6 shadow">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          Livres les plus empruntés
                        </h3>
                        {dashboardStats?.most_borrowed_books && dashboardStats.most_borrowed_books.length > 0 ? (
                          <ul className="divide-y divide-gray-200">
                            {dashboardStats.most_borrowed_books.map((book, index) => (
                              <li key={book.id} className="py-3 flex justify-between">
                                <div className="flex items-center">
                                  <span className="text-sm font-medium text-gray-900">
                                    {index + 1}. {book.title}
                                  </span>
                                </div>
                                <span className="text-sm text-gray-500">
                                  {book.count} emprunts
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500">Aucune donnée disponible</p>
                        )}
                      </div>

                      {/* Distribution par catégorie */}
                      <div className="bg-white rounded-lg p-6 shadow">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          Distribution par catégorie
                        </h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart width={400} height={400}>
                              <Pie
                                data={dashboardStats?.books_by_category || []}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                                nameKey="category"
                              >
                                {dashboardStats?.books_by_category?.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value, _, props) => [value, props.payload.category]} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Books Management Tab */}
          {activeTab === 'books' && (
            <div className="space-y-6">
              {/* Header with Add Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-0">
                  Gestion des livres
                </h2>
                <button
                  onClick={() => setShowAddBook(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Ajouter un livre</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un livre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>

              {/* Books Table */}
              {booksLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Livre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Auteur
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Catégorie
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Disponibilité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {books?.map((book) => (
                        <tr key={book.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {book.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                ISBN: {book.isbn}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {book.author}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                              {book.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {book.available_copies} / {book.total_copies}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(book)}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(book)}
                                className="text-red-600 hover:text-red-900"
                                disabled={deleteBookMutation.isLoading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}


        </div>
      </div>

      {/* Add/Edit Book Modal */}
      {showAddBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingBook ? 'Modifier le livre' : 'Ajouter un livre'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titre *
                    </label>
                    <input
                      {...register('title', { required: 'Le titre est requis' })}
                      className="input w-full"
                    />
                    {errors.title && (
                      <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auteur *
                    </label>
                    <input
                      {...register('author', { required: 'L\'auteur est requis' })}
                      className="input w-full"
                    />
                    {errors.author && (
                      <p className="text-red-600 text-sm mt-1">{errors.author.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ISBN * (minimum 10 caractères)
                    </label>
                    <input
                      {...register('isbn', { 
                        required: 'L\'ISBN est requis',
                        minLength: {
                          value: 10,
                          message: 'L\'ISBN doit contenir au moins 10 caractères'
                        },
                        maxLength: {
                          value: 17,
                          message: 'L\'ISBN ne doit pas dépasser 17 caractères'
                        } 
                      })}
                      className="input w-full"
                    />
                    {errors.isbn && (
                      <p className="text-red-600 text-sm mt-1">{errors.isbn.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catégorie *
                    </label>
                    <input
                      {...register('category', { required: 'La catégorie est requise' })}
                      className="input w-full"
                    />
                    {errors.category && (
                      <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Année de publication *
                    </label>
                    <input
                      type="number"
                      {...register('publication_year', { 
                        required: 'L\'année est requise',
                        valueAsNumber: true 
                      })}
                      className="input w-full"
                    />
                    {errors.publication_year && (
                      <p className="text-red-600 text-sm mt-1">{errors.publication_year.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre d'exemplaires *
                    </label>
                    <input
                      type="number"
                      min="1"
                      {...register('total_copies', { 
                        required: 'Le nombre d\'exemplaires est requis',
                        valueAsNumber: true 
                      })}
                      className="input w-full"
                    />
                    {errors.total_copies && (
                      <p className="text-red-600 text-sm mt-1">{errors.total_copies.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Éditeur
                    </label>
                    <input
                      {...register('publisher')}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de pages
                    </label>
                    <input
                      type="number"
                      {...register('pages', { valueAsNumber: true })}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Langue
                    </label>
                    <input
                      {...register('language')}
                      defaultValue="Français"
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image de couverture
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      onChange={(e) => {
                        // Le champ d'origine attend une URL, nous gérerons le fichier séparément
                        if (e.target.files && e.target.files[0]) {
                          // Stocker le fichier sélectionné dans une variable d'état
                          setCoverImageFile(e.target.files[0]);
                          // Créer une URL temporaire pour prévisualiser l'image
                          const previewUrl = URL.createObjectURL(e.target.files[0]);
                          setCoverImagePreview(previewUrl);
                        }
                      }}
                    />
                    {coverImagePreview && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 mb-1">Prévisualisation :</p>
                        <img 
                          src={coverImagePreview} 
                          alt="Prévisualisation" 
                          className="h-32 object-contain border rounded-md"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="input w-full"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-outline"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={createBookMutation.isLoading || updateBookMutation.isLoading}
                    className="btn-primary"
                  >
                    {createBookMutation.isLoading || updateBookMutation.isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {editingBook ? 'Modification...' : 'Ajout...'}
                      </>
                    ) : (
                      editingBook ? 'Modifier' : 'Ajouter'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Users Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Header with Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-0">
              Gestion des utilisateurs
            </h2>
            <button
              onClick={() => {
                setEditingUser(null);
                resetUserForm();
                setShowAddUser(true);
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter un utilisateur</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto bg-white shadow-md rounded-lg">
              {users && users.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom d'utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom complet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user: any) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.full_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.is_admin ? 'Administrateur' : 'Utilisateur'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            className="text-primary-600 hover:text-primary-900 mr-3"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => {
                              if(window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.username}?`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  {userSearchTerm ? 'Aucun utilisateur ne correspond à votre recherche.' : 'Aucun utilisateur trouvé.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* User Add/Edit Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center pb-4 mb-4 border-b">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingUser ? 'Modifier un utilisateur' : 'Ajouter un utilisateur'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddUser(false);
                      setEditingUser(null);
                      resetUserForm();
                    }}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmitUser(editingUser
                  ? (data) => {
                      // Si le mot de passe est vide, le supprimer pour ne pas le mettre à jour
                      if (!data.password) {
                        const { password, ...rest } = data;
                        updateUserMutation.mutate({ id: editingUser.id, data: rest });
                      } else {
                        updateUserMutation.mutate({ id: editingUser.id, data });
                      }
                    }
                  : (data) => createUserMutation.mutate(data)
                )}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom d'utilisateur
                      </label>
                      <input
                        type="text"
                        {...registerUser('username', { required: 'Nom d\'utilisateur requis' })}
                        disabled={!!editingUser}
                        className="input w-full"
                      />
                      {userErrors.username && (
                        <p className="mt-1 text-sm text-red-600">{userErrors.username.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        {...registerUser('email', { required: 'Email requis' })}
                        disabled={!!editingUser}
                        className="input w-full"
                      />
                      {userErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{userErrors.email.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      {...registerUser('full_name', { required: 'Nom complet requis' })}
                      className="input w-full"
                    />
                    {userErrors.full_name && (
                      <p className="mt-1 text-sm text-red-600">{userErrors.full_name.message}</p>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editingUser ? 'Nouveau mot de passe (laisser vide pour ne pas modifier)' : 'Mot de passe'}
                    </label>
                    <input
                      type="password"
                      {...registerUser('password', { 
                        required: editingUser ? false : 'Mot de passe requis',
                        minLength: {
                          value: 6,
                          message: 'Le mot de passe doit contenir au moins 6 caractères'
                        }
                      })}
                      className="input w-full"
                    />
                    {userErrors.password && (
                      <p className="mt-1 text-sm text-red-600">{userErrors.password.message}</p>
                    )}
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_active"
                          {...registerUser('is_active')}
                          defaultChecked={editingUser ? editingUser.is_active : true}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                          Compte actif
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_admin"
                          {...registerUser('is_admin')}
                          defaultChecked={editingUser ? editingUser.is_admin : false}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_admin" className="ml-2 block text-sm text-gray-900">
                          Administrateur
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUser(false);
                        setEditingUser(null);
                        resetUserForm();
                      }}
                      className="btn-outline"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={createUserMutation.isLoading || updateUserMutation.isLoading}
                      className="btn-primary"
                    >
                      {createUserMutation.isLoading || updateUserMutation.isLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          {editingUser ? 'Modification...' : 'Ajout...'}
                        </>
                      ) : (
                        editingUser ? 'Modifier' : 'Ajouter'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;