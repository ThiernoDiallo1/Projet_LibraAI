export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  borrowed_books: string[];
  favorite_books: string[];
  fine_amount: number;
}

export interface Book {
  id: string;
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
  available_copies: number;
  total_copies: number;
  created_at: string;
  rating: number;
  reviews_count: number;
}

export interface Borrowing {
  id: string;
  user_id: string;
  book_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at?: string;
  status: 'active' | 'returned' | 'overdue';
  fine_amount: number;
  renewal_count: number;
  max_renewals: number;
}

export interface BookInfo {
  id: string;
  title: string;
  author?: string;
  cover_image?: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  book_id: string;
  reserved_at: string;
  expires_at: string;
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired';
  notified: boolean;
  book_info?: BookInfo;
}

export interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  sources: Array<{
    filename: string;
    chunk_index: number;
  }>;
  timestamp: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}