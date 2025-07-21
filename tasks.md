# 📘 LibraAi – Bibliothèque Intelligente

## 🎯 Objectif
Développer une application web intelligente pour la gestion d’une bibliothèque moderne avec :
- une interface utilisateur dynamique (React + Tailwind),
- un backend API sécurisé (FastAPI),
- une base de données NoSQL (MongoDB Atlas),
- un chatbot IA (Ollama avec LLaMA et Pinecone),
- une gestion de paiements via PayPal.

## 🧱 Technologies

| Composant        | Stack                            |
|------------------|----------------------------------|
| Frontend         | React.js + Tailwind CSS + Vite + TypeScript |
| Backend API      | FastAPI                          |
| Base de données  | MongoDB Atlas                    |
| Authentification | JWT                              |
| Paiement         | PayPal REST API                  |
| Chatbot IA       | Ollama + Pinecone                |

## ✅ Fonctionnalités clés

- [ ] Authentification sécurisée (JWT)
- [ ] Gestion des utilisateurs (admin & utilisateurs)
- [ ] Consultation, emprunt et réservation d’ouvrages
- [ ] Gestion des commentaires et favoris
- [ ] Paiement des amendes via PayPal
- [ ] Upload de fichiers PDF pour consultation IA
- [ ] Chatbot intelligent avec LLaMA & Pinecone

## 📁 Architecture

```
LibraAi/
├── frontend/
│   └── React + Tailwind + TypeScript + Vite
├── backend/
│   └── FastAPI + MongoDB + Pinecone + Ollama
```

## 🧩 Modules backend
- auth.py (login/register)
- books.py (CRUD livres)
- borrow.py (emprunts / réservations)
- fine.py (paiements)
- chatbot.py (upload + chatbot)

## 🗂️ Collections MongoDB
- users
- books
- borrowings
- reservations
- fines
- messages

## 🚀 Étapes du développement

| Étape | Tâche                                          | Statut |
|-------|------------------------------------------------|--------|
| 1     | Configuration de l’environnement               | 🔲     |
| 2     | Création du backend API avec FastAPI           | 🔲     |
| 3     | Mise en place de la base MongoDB Atlas         | 🔲     |
| 4     | Création frontend avec React + Tailwind + Vite | 🔲     |
| 5     | Authentification JWT                           | 🔲     |
| 6     | Gestion des livres, emprunts, réservations     | 🔲     |
| 7     | Paiement des amendes PayPal                    | 🔲     |
| 8     | Intégration chatbot (Ollama + Pinecone)        | 🔲     |
| 9     | Tests et déploiement                           | 🔲     |