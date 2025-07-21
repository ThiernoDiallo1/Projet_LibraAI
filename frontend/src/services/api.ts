import axios from 'axios';
import { User, Book, Borrowing, Reservation, RegisterData, LoginResponse } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

// Configuration axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Timeout de 10 secondes
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs de réseau et autres
api.interceptors.response.use(
  response => response,
  error => {
    console.log('Erreur API détaillée:', error);
    // Détecter les erreurs de réseau
    if (!error.response) {
      console.error('Erreur réseau ou serveur non accessible:', error.message);
    }
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Fonction de test de connectivité au serveur backend
export const testBackendConnection = async (): Promise<{ status: string, message: string }> => {
  console.log('Tentative de connexion directe au backend via fetch...');
  try {
    const response = await fetch('http://127.0.0.1:8000/auth/ping');
    console.log('Réponse fetch brute:', response);
    if (response.ok) {
      const data = await response.json();
      console.log('Données de réponse:', data);
      return data;
    } else {
      console.error(`Erreur ${response.status}: ${response.statusText}`);
      throw new Error(`${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Erreur de test de connectivité:', error);
    throw error;
  }
};

// API d'authentification
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    console.log('Tentative de connexion avec:', email);
    
    const response = await api.post('/auth/login', {
      email,
      password
    });
    
    console.log('Réponse de connexion reçue:', response.data);
    return response.data;
  },

  register: async (userData: RegisterData): Promise<User> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  verifyToken: async (token: string): Promise<{ valid: boolean; user_id: string }> => {
    const response = await api.get('/auth/verify-token', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// API des livres
export const booksApi = {

  getBooks: async (params: Record<string, any> = {}): Promise<Book[]> => {
    const response = await api.get('/books/', { params });
    return response.data;
  },

  getBook: async (bookId: string): Promise<Book> => {
    const response = await api.get(`/books/${bookId}`);
    return response.data;
  },
  
  
  reportProblem: async (bookId: string, description: string): Promise<{ success: boolean; message: string }> => {
    // Envoyer le body au format attendu par l'API backend (problem: ProblemReport)
    const response = await api.post(`/books/report-problem/${bookId}`, { 
      problem: { description } 
    });
    return response.data;
  },

  createBook: async (bookData: Partial<Book>): Promise<Book> => {
    // TEMPORAIRE: Redirection vers l'endpoint de debug pour diagnostiquer l'erreur 422
    console.log('Données envoyées au serveur:', bookData);
    // Essayer d'abord l'endpoint de debug pour voir les données reçues côté serveur
    try {
      const debugResponse = await api.post('/debug/form-debug', bookData);
      console.log('Réponse de debug:', debugResponse.data);
      // Si le debug fonctionne, on tente quand même l'endpoint normal pour voir l'erreur 422
      try {
        const response = await api.post('/books/', bookData);
        return response.data;
      } catch (error: any) {
        console.error('ERREUR 422 DÉTAILS:', error.response?.data);
        // Afficher les détails de l'erreur pour le diagnostic
        if (error.response?.data?.detail) {
          console.error('Message d\'erreur:', error.response.data.detail);
          // Si l'erreur contient des détails de validation
          if (Array.isArray(error.response.data.detail)) {
            error.response.data.detail.forEach((err: any, index: number) => {
              console.error(`Erreur ${index + 1}:`, err);
              console.error('- Chemin:', err.loc);
              console.error('- Type:', err.type);
              console.error('- Message:', err.msg);
            });
          }
        }
        alert(`Erreur lors de l'ajout du livre: ${JSON.stringify(error.response?.data?.detail || 'Erreur inconnue')}`);
        throw error; // Re-throw pour que l'UI affiche l'erreur
      }
    } catch (debugError) {
      console.error('Erreur lors du debug:', debugError);
      // Continuer avec l'endpoint normal
      try {
        const response = await api.post('/books/', bookData);
        return response.data;
      } catch (error: any) {
        console.error('ERREUR API:', error.response?.data);
        alert(`Erreur lors de l'ajout du livre: ${JSON.stringify(error.response?.data?.detail || 'Erreur inconnue')}`);
        throw error;
      }
    }
  },

  updateBook: async (bookId: string, bookData: Partial<Book>): Promise<Book> => {
    const response = await api.put(`/books/${bookId}`, bookData);
    return response.data;
  },

  // Méthode pour créer un livre avec upload d'image via FormData
  createBookWithImage: async (formData: FormData): Promise<Book> => {
    // Logs pour voir ce qui est envoyé dans le FormData
    console.log('FormData envoyé:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value instanceof File ? `Fichier (${value.name}, ${value.size} bytes)` : value}`);
    }
    
    // Vérifier si l'année de publication est bien un nombre
    const pubYear = formData.get('publication_year');
    if (pubYear && typeof pubYear === 'string') {
      formData.set('publication_year', pubYear);
    }
    
    // Vérifier si le nombre de copies est bien un nombre
    const totalCopies = formData.get('total_copies');
    if (totalCopies && typeof totalCopies === 'string') {
      formData.set('total_copies', totalCopies);
    }
    
    // Vérifier si pages est bien un nombre
    const pages = formData.get('pages');
    if (pages && typeof pages === 'string') {
      // Si pages est 'NaN' ou une chaîne vide, on l'enlève du FormData
      if (pages === 'NaN' || pages.trim() === '') {
        formData.delete('pages');
      }
    }
    
    try {
      const response = await api.post('/books/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Détails de l\'erreur 422:', error.response?.data);
      throw error;
    }
  },

  // Méthode pour mettre à jour un livre avec upload d'image via FormData
  updateBookWithImage: async (bookId: string, formData: FormData): Promise<Book> => {
    const response = await api.put(`/books/${bookId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  deleteBook: async (bookId: string): Promise<void> => {
    await api.delete(`/books/${bookId}`);
  },

  getCategories: async (): Promise<{ categories: string[] }> => {
    const response = await api.get('/books/categories/list');
    return response.data;
  },
};

// API des emprunts
export const borrowingsApi = {
  borrowBook: async (bookId: string): Promise<Borrowing> => {
    const response = await api.post('/borrowings/borrow', { book_id: bookId });
    return response.data;
  },

  returnBook: async (borrowingId: string): Promise<{ message: string; fine_amount: number; returned_at: string }> => {
    const response = await api.post(`/borrowings/return/${borrowingId}`);
    return response.data;
  },

  renewBorrowing: async (borrowingId: string): Promise<{ 
    message: string; 
    new_due_date: string; 
    renewals_remaining: number;
    updated_borrowing: any; // L'emprunt complet mis à jour
  }> => {
    const response = await api.post(`/borrowings/renewal/${borrowingId}`);
    return response.data;
  },

  getMyBorrowings: async (status?: string): Promise<Borrowing[]> => {
    const params = status ? { status } : {};
    const response = await api.get('/borrowings/my-borrowings', { params });
    return response.data;
  },

  reserveBook: async (bookId: string): Promise<Reservation> => {
    const response = await api.post('/borrowings/reserve', { book_id: bookId });
    return response.data;
  },

  getMyReservations: async (): Promise<Reservation[]> => {
    const response = await api.get('/borrowings/my-reservations');
    return response.data;
  },
};

// API des paiements
export const paymentsApi = {
  createPayment: async (amount: number, description?: string): Promise<{
    success: boolean;
    payment_id: string;
    approval_url: string;
    message: string;
  }> => {
    const response = await api.post('/payments/create', {
      amount,
      description: description || 'Paiement d\'amende LibraAi',
    });
    return response.data;
  },

  executePayment: async (paymentId: string, payerId: string): Promise<{
    success: boolean;
    message: string;
    amount_paid: number;
    payment_id: string;
  }> => {
    const response = await api.post('/payments/execute', {
      payment_id: paymentId,
      payer_id: payerId,
    });
    return response.data;
  },

  getPaymentHistory(): Promise<{ payments: any[] }> {
    return api.get('/payments/history').then(response => response.data);
  },

  getUserBalance(): Promise<{
    user_id: string;
    fine_amount: number;
    currency: string;
  }> {
    return api.get('/payments/balance').then(response => response.data);
  },

  getOverdueBorrowings(): Promise<{
    user_id: string;
    overdue_borrowings: Array<{
      id: string;
      book_id: string;
      book_title: string;
      book_author: string;
      borrowed_at: string;
      due_date: string;
      days_overdue: number;
      fine_amount: number;
    }>;
    total_count: number;
  }> {
    return api.get('/payments/overdue-borrowings').then(response => response.data);
  },

  updateAllFines(): Promise<{
    success: boolean;
    updated_borrowings: number;
    total_fines_added: number;
    message: string;
  }> {
    return api.post('/payments/update-fines').then(response => response.data);
  },
};

// API du chatbot
export const chatbotApi = {
  uploadDocument: async (file: File): Promise<{
    success: boolean;
    message: string;
    chunks_count: number;
    characters_count: number;
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  askQuestion: async (question: string): Promise<{
    success: boolean;
    answer: string;
    sources: Array<{ filename: string; chunk_index: number }>;
    question: string;
  }> => {
    const response = await api.post('/chat/ask', { question });
    return response.data;
  },

  getUserDocuments: async (): Promise<{ documents: any[] }> => {
    const response = await api.get('/chat/documents');
    return response.data;
  },

  getChatbotHealth: async (): Promise<{
    status: string;
    ollama?: string;
    pinecone?: string;
    embeddings?: string;
    message?: string;
  }> => {
    const response = await api.get('/chat/health');
    return response.data;
  },
};

// API des favoris
export const favoritesApi = {
  addToFavorites: async (bookId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/users/favorites/add/${bookId}`);
    return response.data;
  },
  
  removeFromFavorites: async (bookId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/users/favorites/remove/${bookId}`);
    return response.data;
  },
  
  getFavorites: async (): Promise<Book[]> => {
    const response = await api.get('/users/favorites');
    return response.data;
  },
};

// API de gestion des utilisateurs (admin)
export const usersApi = {
  getUsers: async (params?: { skip?: number; limit?: number; search?: string }): Promise<any[]> => {
    const queryParams = new URLSearchParams();
    
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const response = await api.get(`/users?${queryParams}`);
    return response.data;
  },
  
  getUser: async (userId: string): Promise<any> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
  
  createUser: async (userData: any): Promise<any> => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  
  updateUser: async (userId: string, userData: any): Promise<any> => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  },
  
  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`);
  }
};

// API des statistiques administrateur
export const statsApi = {
  getAdminDashboardStats: async (): Promise<{
    users_count: number;
    active_borrowings_count: number;
    overdue_borrowings_count: number;
    books_count: number;
    most_borrowed_books: Array<{
      id: string;
      title: string;
      count: number;
    }>;
    borrowings_by_month: Array<{
      month: string;
      count: number;
    }>;
    returns_by_month: Array<{
      month: string;
      count: number;
    }>;
    books_by_category: Array<{
      category: string;
      count: number;
    }>;
  }> => {
    try {
      // Essai avec l'endpoint original
      const response = await api.get('/stats/admin-dashboard');
      return response.data;
    } catch (error) {
      // Si échec, utiliser l'endpoint de test
      console.log("Utilisation de l'endpoint de test pour les statistiques...");
      const fallbackResponse = await api.get('/stats/admin-dashboard-test');
      return fallbackResponse.data;
    }
  },
};

export default api;