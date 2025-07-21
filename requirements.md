# 📦 LibraAi – Fichier `requirements.md`

Ce document décrit les dépendances Python nécessaires pour le backend de l’application **LibraAi**, une bibliothèque intelligente avec IA, paiement en ligne et microservices.

---

## ⚙️ Framework principal

| Package         | Version     | Description                        |
|----------------|-------------|------------------------------------|
| fastapi        | 0.111.0     | Framework web moderne (ASGI)      |
| uvicorn        | 0.29.0      | Serveur ASGI pour FastAPI         |

---

## 🧩 ORM / Base de données

| Package   | Version | Description                    |
|----------|---------|--------------------------------|
| motor    | 3.4.0   | Pilote MongoDB pour asyncio    |

---

## 🔐 Authentification & Sécurité

| Package                  | Version  | Description                          |
|--------------------------|----------|--------------------------------------|
| python-jose[cryptography]| 3.3.0    | JWT & signatures sécurisées          |
| passlib[bcrypt]          | 1.7.4    | Hashage sécurisé des mots de passe  |
| python-multipart         | 0.0.9    | Support fichiers multipart/form-data|
| pydantic                 | 2.7.1    | Validation de schémas de données    |

---

## 🌍 Variables d’environnement

| Package        | Version | Description                |
|----------------|---------|----------------------------|
| python-dotenv  | 1.0.1   | Chargement de `.env`       |

---

## 📄 Upload et Parsing de documents

| Package      | Version   | Description                              |
|--------------|-----------|------------------------------------------|
| pdfplumber   | 0.10.3    | Extraction de texte à partir de PDF      |
| PyMuPDF      | 1.23.16   | Manipulation avancée de fichiers PDF     |
| unstructured | 0.12.3    | Parsing intelligent (optionnel, puissant)|

---

## 🤖 Chatbot IA avec LLaMA + Pinecone

| Package              | Version | Description                            |
|----------------------|---------|----------------------------------------|
| langchain            | 0.1.17  | Framework RAG / LLM                    |
| langchain-community  | 0.0.35  | Connecteurs communautaires Langchain  |
| tiktoken             | 0.6.0   | Tokenisation (OpenAI, LLaMA)          |
| pinecone-client      | 3.2.2   | Base vectorielle pour la recherche IA |

---

## 💰 Paiement en ligne

| Package         | Version | Description                        |
|----------------|---------|------------------------------------|
| paypalrestsdk  | 1.14.0  | Intégration de l’API PayPal REST   |

---

## 🌐 CORS / WebSockets (inclus via `[all]`)

`fastapi[all]==0.111.0` active également :
- Starlette
- Websockets
- CORS Middleware

---

## 📁 Fichier `requirements.txt` (à la racine du backend)

```txt
fastapi[all]==0.111.0
uvicorn[standard]==0.29.0
motor==3.4.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
pydantic==2.7.1
python-dotenv==1.0.1
pdfplumber==0.10.3
PyMuPDF==1.23.16
unstructured==0.12.3
langchain==0.1.17
langchain-community==0.0.35
tiktoken==0.6.0
pinecone-client==3.2.2
paypalrestsdk==1.14.0
```
