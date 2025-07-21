# 🚀 Démarrage rapide LibraAi

## ⚡ Étapes pour démarrer l'application

### 1. Installer les dépendances Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Installer les dépendances Frontend

```bash
cd frontend
npm install
```

### 3. Démarrer le Backend (Terminal 1)

```bash
cd backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/macOS
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**✅ Le backend doit afficher :**

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 4. Démarrer le Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

**✅ Le frontend doit afficher :**

```
  VITE v4.4.5  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 5. Accéder à l'application

- **Application** : http://localhost:3000
- **API Backend** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs

---

## 🔧 Résolution des problèmes courants

### ❌ Erreur "ERR_CONNECTION_REFUSED"

**Cause** : Le backend n'est pas démarré

**Solution** :

1. Ouvrir un terminal dans le dossier `backend`
2. Activer l'environnement virtuel
3. Démarrer le serveur avec `uvicorn main:app --reload`

### ❌ Erreur "Module not found"

**Cause** : Dépendances non installées

**Solution** :

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### ❌ Erreur MongoDB

**Cause** : Problème de connexion à la base de données

**Solution** :

1. Vérifier que MongoDB Atlas est accessible
2. Vérifier la chaîne de connexion dans `.env`
3. Vérifier que l'IP est autorisée (0.0.0.0/0)

### ❌ Erreur Ollama

**Cause** : Ollama n'est pas installé ou démarré

**Solution** :

1. Installer Ollama : https://ollama.ai/
2. Télécharger le modèle : `ollama pull llama2`
3. Vérifier : `ollama list`

---

## 📝 Ordre de démarrage recommandé

1. **Backend d'abord** (port 8000)
2. **Frontend ensuite** (port 3000)
3. **Vérifier les deux** fonctionnent avant de tester

---

## 🎯 Test rapide

1. Aller sur http://localhost:3000
2. Cliquer sur "Inscription"
3. Créer un compte
4. Se connecter
5. Explorer l'application

---

## 📞 Si ça ne marche toujours pas

1. Vérifier que les deux terminaux sont ouverts
2. Vérifier les messages d'erreur dans les terminaux
3. Vérifier que les ports 3000 et 8000 ne sont pas utilisés
4. Redémarrer les serveurs si nécessaire
