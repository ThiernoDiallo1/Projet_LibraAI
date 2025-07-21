# 🎨 design.md – LibraAi: Bibliothèque intelligente

## 📘 Objectif du design
Décrire la structure technique, la communication entre les services (frontend/backend/IA), les routes API, ainsi que les composants d’interface pour l’application LibraAi.

---

## 🧱 Architecture générale (microservices sans Docker)

```
[ React + Tailwind (Frontend) ]
           │
           ▼
[ FastAPI (Backend) ] ←→ [ MongoDB Atlas (Cloud DB) ]
           │
           ▼
[ Ollama (LLaMA) + LangChain + Pinecone ] ←→ [ PDF/TXT Upload ]
           │
           ▼
[ Paiement avec PayPal REST API ]
```

---

## 📂 Structure backend recommandée

```
backend/
├── main.py
├── app/
│   ├── routers/
│   │   ├── auth.py
│   │   ├── books.py
│   │   ├── borrowings.py
│   │   ├── chatbot.py
│   │   └── payments.py
│   ├── models/
│   │   └── book.py
│   ├── schemas/
│   │   └── book_schema.py
│   ├── services/
│   │   ├── auth_service.py
│   │   └── chatbot_service.py
│   ├── database.py
│   └── config.py
```

---

## 🧩 Principales routes API

| Méthode | Endpoint                  | Description                           | Auth |
|---------|---------------------------|---------------------------------------|------|
| POST    | /auth/register            | Inscription utilisateur                | ❌   |
| POST    | /auth/login               | Connexion avec JWT                     | ❌   |
| GET     | /books/                   | Liste des ouvrages                     | ✅   |
| POST    | /books/                   | Ajouter un ouvrage                     | ✅ (admin) |
| POST    | /upload/                  | Uploader un document pour le chatbot   | ✅   |
| POST    | /chat/ask                 | Envoyer une question au chatbot        | ✅   |
| POST    | /payments/pay             | Paiement via PayPal                    | ✅   |

---

## 🧠 Flux du chatbot

1. L’utilisateur upload un fichier (pdf, txt)
2. LangChain lit et segmente le contenu
3. Pinecone stocke les embeddings vectoriels
4. LLaMA via Ollama génère une réponse
5. La réponse est retournée via FastAPI

---

## 🧑‍💻 Composants React (pages / composants)

| Composant      | Rôle                              |
|----------------|-----------------------------------|
| Navbar         | Navigation globale                |
| Login/Register | Authentification                  |
| Dashboard      | Interface principale utilisateur  |
| BookCard       | Affichage d’un livre              |
| UploadForm     | Upload de fichiers pour chatbot   |
| ChatBotWindow  | Chat UI pour LibraAi              |
| AdminPanel     | Espace gestion (livres, utilisateurs, amendes) |

---

## 📚 Pages principales

- `/` : Accueil
- `/login` : Connexion
- `/dashboard` : Liste des livres + chatbot
- `/admin` : Espace admin
- `/upload` : Page d’upload pour chatbot

---

## ✅ Sécurité & Auth

- Authentification avec JWT
- Middleware pour sécuriser les routes sensibles
- Rôles utilisateur (admin, membre)

---

## 🌐 Paiement PayPal

- Paiement pour les amendes
- Intégration côté backend avec `paypalrestsdk`
- Redirection et vérification du paiement