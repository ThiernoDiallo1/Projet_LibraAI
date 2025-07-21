@echo off
echo ========================================
echo    LibraAi - Bibliothèque Intelligente
echo ========================================
echo.

REM Vérification et création de l'environnement virtuel backend
echo [1/4] Configuration du backend...
cd backend

if not exist "venv" (
    echo Création de l'environnement virtuel...
    python -m venv venv
    if errorlevel 1 (
        echo ERREUR: Impossible de créer l'environnement virtuel
        echo Assurez-vous que Python est installé et accessible
        pause
        exit /b 1
    )
)

if not exist ".env" (
    echo Copie du fichier de configuration...
    copy ".env.example" ".env" > nul
    echo ATTENTION: Configurez le fichier .env avec vos clés API
)

echo Installation des dépendances Python...
call venv\Scripts\activate
pip install -r requirements.txt > nul 2>&1

REM Configuration du frontend
echo [2/4] Configuration du frontend...
cd ..\frontend

if not exist "node_modules" (
    echo Installation des dépendances Node.js...
    npm install > nul 2>&1
    if errorlevel 1 (
        echo ERREUR: Impossible d'installer les dépendances npm
        echo Assurez-vous que Node.js et npm sont installés
        pause
        exit /b 1
    )
)

REM Démarrage des services
echo [3/4] Démarrage du backend FastAPI...
cd ..\backend
start "LibraAi Backend" cmd /k "venv\Scripts\activate && echo Backend démarré sur http://localhost:8000 && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo [4/4] Démarrage du frontend React...
timeout /t 3 /nobreak > nul
cd ..\frontend
start "LibraAi Frontend" cmd /k "echo Frontend démarré sur http://localhost:3000 && npm run dev"

echo.
echo ========================================
echo ✅ LibraAi est en cours de démarrage...
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo ========================================
echo.
echo Les services démarrent dans des fenêtres séparées.
echo Fermez ces fenêtres pour arrêter les services.
echo.
echo Appuyez sur une touche pour fermer cette fenêtre...
pause > nul