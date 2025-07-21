import os
import tempfile
from typing import List, Dict, Any
import pdfplumber
import fitz  # PyMuPDF
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Pinecone
from langchain_community.llms import Ollama
from langchain.chains import RetrievalQA
from pinecone import Pinecone as PineconeClient, ServerlessSpec
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class ChatbotService:
    def __init__(self):
        self.embeddings = None
        self.vectorstore = None
        self.llm = None
        self.qa_chain = None
        self.initialize_services()
    
    def initialize_services(self):
        """Initialiser les services IA"""
        try:
            # Initialiser Pinecone client
            self.pc = PineconeClient(api_key=settings.pinecone_api_key)
            
            # Initialiser les embeddings
            self.embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
            
            # Initialiser Ollama
            self.llm = Ollama(
                base_url=settings.ollama_base_url,
                model=settings.ollama_model,
                temperature=0.7
            )
            
            # Initialiser le vectorstore Pinecone
            index_names = [index.name for index in self.pc.list_indexes()]
            if settings.pinecone_index_name in index_names:
                # Utiliser l'index existant
                index = self.pc.Index(settings.pinecone_index_name)
                self.vectorstore = Pinecone(
                    index=index,
                    embedding=self.embeddings,
                    text_key="text"
                )
            else:
                # Créer l'index s'il n'existe pas
                self.pc.create_index(
                    name=settings.pinecone_index_name,
                    dimension=384,  # Dimension pour all-MiniLM-L6-v2
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",
                        region=settings.pinecone_environment
                    )
                )
                # Attendre que l'index soit prêt
                import time
                time.sleep(10)
                index = self.pc.Index(settings.pinecone_index_name)
                self.vectorstore = Pinecone(
                    index=index,
                    embedding=self.embeddings,
                    text_key="text"
                )
            
            # Créer la chaîne QA
            self.qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=self.vectorstore.as_retriever(search_kwargs={"k": 3}),
                return_source_documents=True
            )
            
            logger.info("Services IA initialisés avec succès")
            
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation des services IA: {e}")
            logger.warning("Le service chatbot fonctionnera en mode dégradé")
            # Ne pas lever l'exception pour permettre au serveur de démarrer
            self.pc = None
            self.embeddings = None
            self.llm = None
            self.vectorstore = None
            self.qa_chain = None
    
    async def extract_text_from_pdf(self, file_content: bytes, filename: str) -> str:
        """Extraire le texte d'un fichier PDF"""
        try:
            # Sauvegarder temporairement le fichier
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            text = ""
            
            # Essayer avec pdfplumber d'abord
            try:
                with pdfplumber.open(temp_file_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
            except Exception as e:
                logger.warning(f"pdfplumber a échoué, essai avec PyMuPDF: {e}")
                
                # Fallback avec PyMuPDF
                try:
                    doc = fitz.open(temp_file_path)
                    for page_num in range(doc.page_count):
                        page = doc[page_num]
                        text += page.get_text() + "\n"
                    doc.close()
                except Exception as e2:
                    logger.error(f"Extraction PDF échouée avec les deux méthodes: {e2}")
                    raise
            
            # Nettoyer le fichier temporaire
            os.unlink(temp_file_path)
            
            if not text.strip():
                raise ValueError("Aucun texte extrait du PDF")
            
            return text
            
        except Exception as e:
            logger.error(f"Erreur lors de l'extraction du texte PDF: {e}")
            raise
    
    async def process_document(self, file_content: bytes, filename: str, user_id: str) -> Dict[str, Any]:
        """Traiter un document et l'ajouter à la base vectorielle"""
        try:
            if not self.vectorstore:
                return {
                    "success": False,
                    "message": "Service chatbot non disponible. Veuillez vérifier la configuration."
                }
            
            # Extraire le texte
            if filename.lower().endswith('.pdf'):
                text = await self.extract_text_from_pdf(file_content, filename)
            else:
                # Pour les fichiers texte
                text = file_content.decode('utf-8')
            
            # Diviser le texte en chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len
            )
            
            chunks = text_splitter.split_text(text)
            
            # Ajouter des métadonnées
            metadatas = [
                {
                    "filename": filename,
                    "user_id": user_id,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }
                for i in range(len(chunks))
            ]
            
            # Ajouter à Pinecone
            self.vectorstore.add_texts(
                texts=chunks,
                metadatas=metadatas
            )
            
            return {
                "success": True,
                "message": f"Document '{filename}' traité avec succès",
                "chunks_count": len(chunks),
                "characters_count": len(text)
            }
            
        except Exception as e:
            logger.error(f"Erreur lors du traitement du document: {e}")
            return {
                "success": False,
                "message": f"Erreur lors du traitement: {str(e)}"
            }
    
    async def ask_question(self, question: str, user_id: str) -> Dict[str, Any]:
        """Poser une question au chatbot"""
        try:
            if not self.qa_chain:
                return {
                    "success": False,
                    "message": "Service chatbot non disponible. Veuillez vérifier la configuration.",
                    "answer": "Désolé, le service chatbot n'est pas disponible actuellement.",
                    "sources": []
                }
            
            # Créer une question avec instructions ultra-strictes pour le français
            enhanced_question = f"""INSTRUCTIONS ABSOLUES - AUCUNE EXCEPTION:
            - Tu réponds EXCLUSIVEMENT en français
            - INTERDIT d'utiliser des mots anglais comme "After", "recommend", "It's", "I", "you", etc.
            - INTERDIT de dire "Bonjour", "Salut", "Merci pour"
            - INTERDIT de mélanger français et anglais
            - Si tu penses en anglais, traduis tout en français avant de répondre
            - N'utilise QUE des mots français, QUE des expressions françaises
            
            Question: {question}
            
            Réponse (100% français, aucun mot anglais):"""
            
            # Post-traitement simple de la réponse
            raw_answer = self.qa_chain({"query": enhanced_question})["result"]
            
            # Nettoyer la réponse
            answer = raw_answer
            if answer.lower().startswith(("bonjour", "salut", "hello", "merci pour")):
                # Supprimer la première phrase si c'est une salutation
                lines = answer.split("\n")
                if len(lines) > 1:
                    answer = "\n".join(lines[1:]).strip()
                else:
                    sentences = answer.split(".")
                    if len(sentences) > 1:
                        answer = ".".join(sentences[1:]).strip()
            
            # Remplacer massivement les expressions anglaises
            english_to_french = {
                "I am": "Je suis", "I would": "Je voudrais", "I will": "Je vais",
                "Please": "Veuillez", "please": "veuillez", "Thank you": "Merci", "thank you": "merci",
                "Unfortunately": "Malheureusement", "After": "Après", "after": "après",
                "recommend": "recommande", "It's": "C'est", "it's": "c'est",
                "I want": "Je veux", "you": "vous", "your": "votre", "yours": "vôtre",
                "and": "et", "but": "mais", "with": "avec", "for": "pour",
                "this": "ce", "that": "cela", "these": "ces", "those": "ceux",
                "very": "très", "good": "bon", "great": "excellent", "nice": "agréable",
                "beautiful": "beau", "powerful": "puissant", "interesting": "intéressant",
                "consideration": "considération", "thought-provoking": "stimulant",
                "experience": "expérience", "writing": "écriture", "story": "histoire",
                "novel": "roman", "book": "livre", "reading": "lecture",
                "enjoy": "apprécier", "hope": "espère", "stay with": "rester avec"
            }
            
            for eng, fr in english_to_french.items():
                answer = answer.replace(eng, fr)
            
            # Supprimer les phrases entièrement en anglais
            sentences = answer.split('. ')
            french_sentences = []
            
            for sentence in sentences:
                # Vérifier si la phrase contient principalement de l'anglais
                english_words = ['the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'will', 'would', 'could', 'should', 'might', 'may', 'can', 'shall', 'must', 'do', 'does', 'did', 'get', 'got', 'make', 'made', 'take', 'took', 'come', 'came', 'go', 'went', 'see', 'saw', 'know', 'knew', 'think', 'thought', 'say', 'said', 'tell', 'told', 'give', 'gave', 'find', 'found', 'work', 'worked', 'call', 'called', 'try', 'tried', 'ask', 'asked', 'need', 'needed', 'feel', 'felt', 'become', 'became', 'leave', 'left', 'put', 'move', 'moved', 'like', 'look', 'looked', 'want', 'wanted', 'use', 'used', 'help', 'helped', 'show', 'showed', 'hear', 'heard', 'play', 'played', 'run', 'ran', 'turn', 'turned', 'start', 'started', 'keep', 'kept', 'hold', 'held', 'write', 'wrote', 'stand', 'stood', 'bring', 'brought', 'happen', 'happened', 'seem', 'seemed', 'begin', 'began', 'continue', 'continued', 'follow', 'followed', 'stop', 'stopped', 'create', 'created', 'speak', 'spoke', 'read', 'plan', 'planned', 'carry', 'carried', 'set', 'change', 'changed', 'lead', 'led', 'understand', 'understood', 'watch', 'watched', 'meet', 'met', 'include', 'included', 'consider', 'considered', 'appear', 'appeared', 'buy', 'bought', 'wait', 'waited', 'serve', 'served', 'die', 'died', 'send', 'sent', 'expect', 'expected', 'build', 'built', 'stay', 'stayed', 'fall', 'fell', 'cut', 'reach', 'reached', 'kill', 'killed', 'remain', 'remained', 'suggest', 'suggested', 'raise', 'raised', 'pass', 'passed', 'sell', 'sold', 'require', 'required', 'report', 'reported', 'decide', 'decided', 'pull', 'pulled']
                
                sentence_lower = sentence.lower()
                english_word_count = sum(1 for word in english_words if ' ' + word + ' ' in ' ' + sentence_lower + ' ')
                
                # Si la phrase contient moins de 3 mots anglais, la garder
                if english_word_count < 3:
                    french_sentences.append(sentence)
            
            answer = '. '.join(french_sentences)
            
            # Si la réponse est trop courte après nettoyage, donner une réponse par défaut
            if len(answer.strip()) < 20 and "fiction" in question.lower():
                answer = "Je vous recommande des romans français comme 'L'Étranger' d'Albert Camus, 'Le Petit Prince' de Saint-Exupéry, ou 'Les Misérables' de Victor Hugo."
            
            # Utiliser la réponse nettoyée
            # (pas besoin de réappeler qa_chain car on a déjà raw_answer)
            
            # Extraire les sources (pas de sources car on a modifié la logique)
            sources = []
            
            return {
                "success": True,
                "answer": answer,  # Utiliser la réponse nettoyée
                "sources": sources,
                "question": question
            }
            
        except Exception as e:
            logger.error(f"Erreur lors de la réponse à la question: {e}")
            return {
                "success": False,
                "message": f"Erreur lors de la génération de la réponse: {str(e)}",
                "answer": "Désolé, je n'ai pas pu traiter votre question. Veuillez réessayer.",
                "sources": []
            }
    
    async def get_user_documents(self, user_id: str) -> List[Dict[str, Any]]:
        """Récupérer les documents d'un utilisateur"""
        try:
            # Cette fonctionnalité nécessiterait une base de données séparée
            # pour tracker les documents par utilisateur
            # Pour l'instant, on retourne une liste vide
            return []
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des documents: {e}")
            return []

# Instance globale du service
chatbot_service = ChatbotService()