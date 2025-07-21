#!/bin/bash

echo "========================================"
echo "   LibraAi - Bibliothèque Intelligente"
echo "========================================"
echo

echo "Démarrage du backend FastAPI..."
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo
echo "Attente de 3 secondes..."
sleep 3

echo "Démarrage du frontend React..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo
echo "========================================"
echo "LibraAi est en cours de démarrage..."
echo
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo "========================================"
echo
echo "Appuyez sur Ctrl+C pour arrêter les serveurs..."

# Fonction pour nettoyer les processus à l'arrêt
cleanup() {
    echo
    echo "Arrêt des serveurs..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Capturer Ctrl+C
trap cleanup INT

# Attendre indéfiniment
wait