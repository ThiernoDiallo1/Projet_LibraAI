from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from typing import List, Dict, Any
from app.models.user import UserResponse
from app.services.auth_service import get_current_active_user
from app.services.chatbot_service import chatbot_service
from pydantic import BaseModel

router = APIRouter()

class ChatQuestion(BaseModel):
    question: str

class ChatResponse(BaseModel):
    success: bool
    answer: str
    sources: List[Dict[str, Any]]
    question: str

class UploadResponse(BaseModel):
    success: bool
    message: str
    chunks_count: int = 0
    characters_count: int = 0

@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Upload et traitement d'un document pour le chatbot"""
    
    # Vérifier le type de fichier
    allowed_types = ["application/pdf", "text/plain"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and text files are allowed"
        )
    
    # Vérifier la taille du fichier (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    file_content = await file.read()
    
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit"
        )
    
    try:
        # Traiter le document
        result = await chatbot_service.process_document(
            file_content=file_content,
            filename=file.filename,
            user_id=current_user.id
        )
        
        if result["success"]:
            return UploadResponse(
                success=True,
                message=result["message"],
                chunks_count=result["chunks_count"],
                characters_count=result["characters_count"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}"
        )

@router.post("/ask", response_model=ChatResponse)
async def ask_question(
    chat_data: ChatQuestion,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Poser une question au chatbot IA"""
    
    if not chat_data.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty"
        )
    
    try:
        # Obtenir la réponse du chatbot
        result = await chatbot_service.ask_question(
            question=chat_data.question,
            user_id=current_user.id
        )
        
        return ChatResponse(
            success=result["success"],
            answer=result["answer"],
            sources=result.get("sources", []),
            question=result.get("question", chat_data.question)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating response: {str(e)}"
        )

@router.get("/documents")
async def get_user_documents(
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Récupérer les documents uploadés par l'utilisateur"""
    
    try:
        documents = await chatbot_service.get_user_documents(current_user.id)
        return {"documents": documents}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving documents: {str(e)}"
        )

@router.get("/health")
async def chatbot_health():
    """Vérifier l'état du service chatbot"""
    try:
        # Test simple pour vérifier si les services sont disponibles
        if chatbot_service.llm and chatbot_service.vectorstore:
            return {
                "status": "healthy",
                "ollama": "connected",
                "pinecone": "connected",
                "embeddings": "loaded"
            }
        else:
            return {
                "status": "unhealthy",
                "message": "Some services are not initialized"
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Error: {str(e)}"
        }