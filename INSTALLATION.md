# 🚀 Guide d'installation LibraAi

Ce guide vous accompagne dans l'installation et la configuration complète de LibraAi.

## 📋 Prérequis

### Logiciels requis

- **Python 3.10+** - [Télécharger](https://www.python.org/downloads/)
- **Node.js 18+** - [Télécharger](https://nodejs.org/)
- **Git** - [Télécharger](https://git-scm.com/)

### Comptes de services externes

- **MongoDB Atlas** (gratuit) - [S'inscrire](https://www.mongodb.com/atlas)
- **PayPal Developer** (gratuit) - [S'inscrire](https://developer.paypal.com/)
- **Pinecone** (gratuit) - [S'inscrire](https://www.pinecone.io/)

### Logiciel IA local

- **Ollama** - [Télécharger](https://ollama.ai/)

---

## 🔧 Installation étape par étape

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd LibraAi
```

### 2. Configuration du Backend

#### 2.1 Créer l'environnement virtuel Python

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

#### 2.2 Installer les dépendances

```bash
pip install -r requirements.txt
```

#### 2.3 Configuration des variables d'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer le fichier .env avec vos clés
notepad .env  # Windows
nano .env     # Linux/macOS
```

### 3. Configuration des services externes

#### 3.1 MongoDB Atlas

1. Créer un compte sur [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Créer un nouveau cluster (gratuit M0)
3. Créer un utilisateur de base de données
4. Obtenir la chaîne de connexion
5. Remplacer dans `.env` :
   ```env
   MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/libraai?retryWrites=true&w=majority
   ```

#### 3.2 PayPal Developer

1. Créer un compte sur [PayPal Developer](https://developer.paypal.com/)
2. Créer une nouvelle application
3. Obtenir Client ID et Client Secret (Sandbox)
4. Remplacer dans `.env` :
   ```env
   PAYPAL_CLIENT_ID=your-paypal-client-id
   PAYPAL_CLIENT_SECRET=your-paypal-client-secret
   PAYPAL_MODE=sandbox
   ```

#### 3.3 Pinecone

1. Créer un compte sur [Pinecone](https://www.pinecone.io/)
2. Créer un nouvel index :
   - Nom : `libraai-docs`
   - Dimensions : `384`
   - Métrique : `cosine`
3. Obtenir la clé API
4. Remplacer dans `.env` :
   ```env
   PINECONE_API_KEY=your-pinecone-api-key
   PINECONE_ENVIRONMENT=us-west1-gcp-free
   PINECONE_INDEX_NAME=libraai-docs
   ```

#### 3.4 Ollama (IA locale)

1. Télécharger et installer [Ollama](https://ollama.ai/)
2. Télécharger le modèle LLaMA2 :
   ```bash
   ollama pull llama2
   ```
3. Vérifier que le service fonctionne :
   ```bash
   ollama list
   ```

### 4. Configuration du Frontend

```bash
cd ../frontend
npm install
```

### 5. Génération d'une clé JWT sécurisée

```python
# Exécuter ce script Python pour générer une clé sécurisée
import secrets
print("SECRET_KEY=" + secrets.token_urlsafe(32))
```

Remplacer la valeur dans `.env` :

```env
SECRET_KEY=your-generated-secret-key
```

---

## 🚀 Démarrage de l'application

### Option 1 : Script automatique (Windows)

```bash
# Double-cliquer sur start.bat ou exécuter :
start.bat
```

### Option 2 : Script automatique (Linux/macOS)

```bash
chmod +x start.sh
./start.sh
```

### Option 3 : Démarrage manuel

#### Terminal 1 - Backend

```bash
cd backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/macOS
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

---

## 🌐 Accès à l'application

Une fois démarrée, l'application sera accessible sur :

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs
- **API Alternative** : http://localhost:8000/redoc

---

## 👤 Premier utilisateur admin

1. Créer un compte via l'interface web
2. Se connecter à MongoDB Atlas
3. Dans la collection `users`, modifier votre utilisateur :
   ```javascript
   db.users.updateOne(
     { email: "votre@email.com" },
     { $set: { is_admin: true } }
   );
   ```

---

## 🧪 Test de l'installation

### 1. Test du Backend

```bash
curl http://localhost:8000/health
```

### 2. Test du Frontend

Ouvrir http://localhost:3000 dans le navigateur

### 3. Test de l'IA

1. Se connecter à l'application
2. Aller sur la page "Assistant IA"
3. Vérifier que le statut indique "IA en ligne"

### 4. Test PayPal

1. Créer un emprunt en retard (modifier la date d'échéance en base)
2. Aller sur la page "Paiement"
3. Tester un paiement avec les comptes sandbox PayPal

---

## 🔧 Dépannage

### Problème : MongoDB ne se connecte pas

- Vérifier la chaîne de connexion
- Vérifier que l'IP est autorisée (0.0.0.0/0 pour tous)
- Vérifier les identifiants utilisateur

### Problème : Ollama ne répond pas

```bash
# Redémarrer Ollama
ollama serve

# Vérifier les modèles
ollama list

# Re-télécharger si nécessaire
ollama pull llama2
```

### Problème : PayPal ne fonctionne pas

- Vérifier que le mode est sur "sandbox"
- Vérifier les clés API
- Créer un compte sandbox sur PayPal Developer

### Problème : Pinecone ne fonctionne pas

- Vérifier la clé API
- Vérifier que l'index existe avec les bonnes dimensions (384)
- Vérifier l'environnement (région)

---

## 📚 Ressources utiles

- [Documentation FastAPI](https://fastapi.tiangolo.com/)
- [Documentation React](https://reactjs.org/docs/)
- [Documentation MongoDB](https://docs.mongodb.com/)
- [Documentation PayPal API](https://developer.paypal.com/docs/)
- [Documentation Pinecone](https://docs.pinecone.io/)
- [Documentation Ollama](https://ollama.ai/docs)

---

## 🆘 Support

En cas de problème :

1. Vérifier les logs dans les terminaux
2. Consulter la documentation des services externes
3. Ouvrir une issue sur GitHub avec les détails de l'erreur

Bonne installation ! 🚀
