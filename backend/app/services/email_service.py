import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
import logging
from itsdangerous import URLSafeTimedSerializer
from app.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.serializer = URLSafeTimedSerializer(settings.secret_key)
        
    def generate_reset_token(self, email: str) -> str:
        """Générer un token de réinitialisation sécurisé"""
        return self.serializer.dumps(email, salt='password-reset-salt')
    
    def verify_reset_token(self, token: str, max_age: int = 1800) -> Optional[str]:
        """Vérifier et décoder un token de réinitialisation (30 min par défaut)"""
        try:
            email = self.serializer.loads(
                token, 
                salt='password-reset-salt', 
                max_age=max_age
            )
            return email
        except Exception as e:
            logger.error(f"Erreur lors de la vérification du token: {e}")
            return None
    
    def send_password_reset_email(self, email: str, reset_token: str) -> bool:
        """Envoyer un email de réinitialisation de mot de passe"""
        try:
            # Générer l'URL de réinitialisation
            reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
            
            # Créer le message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = "Réinitialisation de votre mot de passe LibraAI"
            msg['From'] = settings.mail_from
            msg['To'] = email
            
            # Contenu HTML de l'email
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Réinitialisation de mot de passe</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #2563eb; color: white; padding: 20px; text-align: center; }}
                    .content {{ background-color: #f8fafc; padding: 30px; }}
                    .button {{ 
                        display: inline-block; 
                        padding: 12px 24px; 
                        background-color: #2563eb; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: bold;
                    }}
                    .footer {{ color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔒 Réinitialisation de mot de passe</h1>
                    </div>
                    <div class="content">
                        <h2>Bonjour,</h2>
                        <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte LibraAI.</p>
                        
                        <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{reset_url}" class="button">Réinitialiser mon mot de passe</a>
                        </div>
                        
                        <p><strong>Important :</strong></p>
                        <ul>
                            <li>Ce lien est valide pendant 30 minutes</li>
                            <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                            <li>Votre mot de passe actuel reste inchangé jusqu'à ce que vous en créiez un nouveau</li>
                        </ul>
                        
                        <p>Si le bouton ne fonctionne pas, copiez et collez cette URL dans votre navigateur :</p>
                        <p style="background-color: #e5e7eb; padding: 10px; border-radius: 4px; font-size: 12px; word-break: break-all;">
                            {reset_url}
                        </p>
                    </div>
                    <div class="footer">
                        <p>Cet email a été envoyé par LibraAI - Votre bibliothèque intelligente</p>
                        <p>Si vous avez des questions, contactez notre support.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Contenu texte alternatif
            text_body = f"""
            Réinitialisation de mot de passe LibraAI
            
            Bonjour,
            
            Vous avez demandé la réinitialisation de votre mot de passe pour votre compte LibraAI.
            
            Cliquez sur le lien suivant pour créer un nouveau mot de passe :
            {reset_url}
            
            Important :
            - Ce lien est valide pendant 30 minutes
            - Si vous n'avez pas demandé cette réinitialisation, ignorez cet email
            - Votre mot de passe actuel reste inchangé jusqu'à ce que vous en créiez un nouveau
            
            LibraAI - Votre bibliothèque intelligente
            """
            
            # Attacher les contenus
            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))
            
            # Envoyer l'email
            return self._send_email(msg)
            
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'email de réinitialisation: {e}")
            return False
    
    def _send_email(self, msg: MIMEMultipart) -> bool:
        """Envoyer l'email via SMTP"""
        try:
            # Créer la connexion SMTP
            server = smtplib.SMTP(settings.mail_server, settings.mail_port)
            
            if settings.mail_starttls:
                server.starttls()
            
            if settings.mail_username and settings.mail_password:
                server.login(settings.mail_username, settings.mail_password)
            
            # Envoyer l'email
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email envoyé avec succès à {msg['To']}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur SMTP lors de l'envoi de l'email: {e}")
            return False
    
    def send_test_email(self, email: str) -> bool:
        """Envoyer un email de test pour vérifier la configuration"""
        try:
            msg = MIMEMultipart()
            msg['Subject'] = "Test de configuration email LibraAI"
            msg['From'] = settings.mail_from
            msg['To'] = email
            
            body = """
            Ceci est un email de test pour vérifier la configuration du service email de LibraAI.
            
            Si vous recevez cet email, la configuration est correcte !
            
            LibraAI - Votre bibliothèque intelligente
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            return self._send_email(msg)
            
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'email de test: {e}")
            return False

# Instance globale du service email
email_service = EmailService()
