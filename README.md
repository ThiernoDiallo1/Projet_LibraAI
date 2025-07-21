# 📚 LibraAi – Bibliothèque intelligente avec IA

LibraAi est une application web moderne de gestion de bibliothèque intégrant un chatbot intelligent basé sur LLaMA (via Ollama) et Pinecone pour le question-réponse sur des documents. Le projet propose une interface fluide, une API performante en FastAPI, et une base de données MongoDB Atlas.

---

## 🚀 Fonctionnalités

### Utilisateur

- ✅ Authentification / inscription (JWT)
- ✅ Consulter, réserver et emprunter des livres
- ✅ Historique d'emprunt avec gestion des renouvellements
- ✅ Paiement d'amendes via PayPal
- ✅ Interface responsive avec React + Tailwind CSS
- ✅ Chatbot intelligent pour poser des questions sur des fichiers uploadés

### Administrateur

- ✅ Gestion complète des livres (CRUD)
- ✅ Vue d'ensemble avec statistiques
- ✅ Interface d'administration intuitive

---

## 🧰 Stack Technique

| Composant        | Technologie utilisée                        |
| ---------------- | ------------------------------------------- |
| Frontend         | React.js + Tailwind CSS + TypeScript + Vite |
| Backend          | FastAPI + Python 3.10                       |
| Base de données  | MongoDB Atlas                               |
| Authentification | JWT avec python-jose                        |
| Paiement         | PayPal REST API                             |
| Chatbot IA       | Ollama (LLaMA) + Pinecone + Langchain       |
| Upload Fichier   | pdfplumber, PyMuPDF                         |

---

## 🗂 Structure du projet

```
LibraAi/
├── frontend/                    # React + Tailwind + TypeScript
│   ├── src/
│   │   ├── components/         # Composants réutilisables
│   │   ├── pages/             # Pages de l'application
│   │   ├── contexts/          # Contextes React (Auth)
│   │   ├── services/          # Services API
│   │   └── types/             # Types TypeScript
│   ├── package.json
│   └── vite.config.ts
├── backend/                     # FastAPI
│   ├── app/
│   │   ├── routers/           # Routes API
│   │   │   ├── auth.py        # Authentification
│   │   │   ├── books.py       # Gestion des livres
│   │   │   ├── borrowings.py  # Emprunts et réservations
│   │   │   ├── chatbot.py     # Assistant IA
│   │   │   └── payments.py    # Paiements PayPal
│   │   ├── models/            # Modèles Pydantic
│   │   ├── services/          # Services métier
│   │   ├── database.py        # Configuration MongoDB
│   │   └── config.py          # Configuration
│   ├── main.py                # Point d'entrée FastAPI
│   ├── requirements.txt       # Dépendances Python
│   └── .env.example          # Variables d'environnement
├── design.md                   # Documentation technique
├── requirements.md             # Spécifications détaillées
└── README.md                  # Ce fichier
```

---

## 📦 Installation et démarrage

### Prérequis

- Python 3.10+
- Node.js 18+
- MongoDB Atlas (compte gratuit)
- Compte PayPal Developer (pour les paiements)
- Compte Pinecone (pour l'IA)
- Ollama installé localement

### 1. Configuration du Backend

```bash
cd backend

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Sur Windows:
venv\Scripts\activate
# Sur macOS/Linux:
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API
```

### 2. Configuration des services externes

#### MongoDB Atlas

1. Créer un compte sur [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Créer un cluster gratuit
3. Obtenir la chaîne de connexion
4. Mettre à jour `MONGODB_URL` dans `.env`

#### PayPal Developer

1. Créer un compte sur [PayPal Developer](https://developer.paypal.com/)
2. Créer une application sandbox
3. Obtenir Client ID et Client Secret
4. Mettre à jour les variables PayPal dans `.env`

#### Pinecone

1. Créer un compte sur [Pinecone](https://www.pinecone.io/)
2. Créer un index avec dimension 384
3. Obtenir la clé API
4. Mettre à jour les variables Pinecone dans `.env`

#### Ollama

1. Installer [Ollama](https://ollama.ai/)
2. Télécharger le modèle LLaMA2:

```bash
ollama pull llama2
```

### 3. Démarrage du Backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

L'API sera disponible sur `http://localhost:8000`

### 4. Configuration du Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

---

## 🔧 Configuration

### Variables d'environnement (.env)

```env
# MongoDB
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/libraai
DATABASE_NAME=libraai

# JWT
SECRET_KEY=your-super-secret-jwt-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# PayPal
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=sandbox

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-west1-gcp-free
PINECONE_INDEX_NAME=libraai-docs

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

---

## 🎯 Utilisation

### Pour les utilisateurs

1. **Inscription/Connexion** : Créer un compte ou se connecter
2. **Explorer les livres** : Parcourir le catalogue avec recherche et filtres
3. **Emprunter des livres** : Emprunter des livres disponibles
4. **Gérer les emprunts** : Voir l'historique, renouveler, retourner
5. **Assistant IA** : Uploader des PDF et poser des questions
6. **Payer les amendes** : Régler les amendes via PayPal

### Pour les administrateurs

1. **Tableau de bord** : Vue d'ensemble des statistiques
2. **Gestion des livres** : Ajouter, modifier, supprimer des livres
3. **Gestion des utilisateurs** : (À venir)

---

## 🤖 Assistant IA

L'assistant IA de LibraAi utilise :

- **Ollama** : Pour exécuter LLaMA2 localement
- **Pinecone** : Base de données vectorielle pour la recherche sémantique
- **LangChain** : Framework pour les applications LLM
- **Embeddings** : Modèle sentence-transformers pour la vectorisation

### Fonctionnement

1. L'utilisateur upload un fichier PDF
2. Le texte est extrait et segmenté
3. Les segments sont vectorisés et stockés dans Pinecone
4. L'utilisateur pose une question
5. Les segments pertinents sont récupérés
6. LLaMA2 génère une réponse contextuelle

---

## 🔒 Sécurité

- Authentification JWT sécurisée
- Hachage des mots de passe avec bcrypt
- Validation des données avec Pydantic
- Protection CORS configurée
- Variables d'environnement pour les secrets

---

## 🚀 Déploiement

### Backend (FastAPI)

Recommandations pour la production :

- Utiliser Gunicorn avec Uvicorn workers
- Configurer un reverse proxy (Nginx)
- Utiliser HTTPS
- Configurer les logs
- Monitoring avec des outils comme Sentry

### Frontend (React)

```bash
npm run build
```

Déployer le dossier `dist` sur un serveur web ou service comme Vercel, Netlify.

---

## 📝 API Documentation

Une fois le backend démarré, la documentation interactive est disponible :

- Swagger UI : `http://localhost:8000/docs`
- ReDoc : `http://localhost:8000/redoc`

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

## 🙏 Remerciements

- [FastAPI](https://fastapi.tiangolo.com/) pour l'excellent framework web
- [React](https://reactjs.org/) pour l'interface utilisateur
- [Tailwind CSS](https://tailwindcss.com/) pour le design
- [Ollama](https://ollama.ai/) pour l'exécution locale des LLM
- [Pinecone](https://www.pinecone.io/) pour la base vectorielle
- [MongoDB Atlas](https://www.mongodb.com/atlas) pour la base de données

---

## 📞 Support

Pour toute question ou problème :

- Ouvrir une issue sur GitHub
- Consulter la documentation dans `/docs`
- Vérifier les logs de l'application

**LibraAi** - La bibliothèque intelligente du futur ! 🚀📚🤖
