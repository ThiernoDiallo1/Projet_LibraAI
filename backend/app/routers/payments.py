from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any, List
from app.models.user import UserResponse
from app.services.auth_service import get_current_active_user
from app.services.fine_service import fine_service
from app.tasks.fine_scheduler import fine_scheduler
from app.config import settings
from app.database import get_database
from pydantic import BaseModel
import paypalrestsdk
from bson import ObjectId
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Configuration PayPal
paypalrestsdk.configure({
    "mode": settings.paypal_mode,  # sandbox ou live
    "client_id": settings.paypal_client_id,
    "client_secret": settings.paypal_client_secret
})

router = APIRouter()

class PaymentCreate(BaseModel):
    amount: float
    description: str = "Paiement d'amende LibraAi"

class PaymentExecute(BaseModel):
    payment_id: str
    payer_id: str

class PaymentResponse(BaseModel):
    success: bool
    payment_id: str
    approval_url: str = ""
    message: str = ""

@router.post("/create", response_model=PaymentResponse)
async def create_payment(
    payment_data: PaymentCreate,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Créer un paiement PayPal pour les amendes"""
    
    if payment_data.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than 0"
        )
    
    # Vérifier que l'utilisateur a des amendes à payer
    if current_user.fine_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fines to pay"
        )
    
    # Vérifier que le montant ne dépasse pas les amendes dues
    if payment_data.amount > current_user.fine_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount exceeds fine amount"
        )
    
    try:
        # Créer le paiement PayPal
        payment = paypalrestsdk.Payment({
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": "http://localhost:3000/payment/success",
                "cancel_url": "http://localhost:3000/payment/cancel"
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": "Amende LibraAi",
                        "sku": f"fine_{current_user.id}",
                        "price": str(payment_data.amount),
                        "currency": "EUR",
                        "quantity": 1
                    }]
                },
                "amount": {
                    "total": str(payment_data.amount),
                    "currency": "EUR"
                },
                "description": payment_data.description
            }]
        })
        
        if payment.create():
            # Trouver l'URL d'approbation
            approval_url = ""
            for link in payment.links:
                if link.rel == "approval_url":
                    approval_url = link.href
                    break
            
            # Sauvegarder le paiement en base pour suivi
            db = get_database()
            payment_record = {
                "payment_id": payment.id,
                "user_id": current_user.id,
                "amount": payment_data.amount,
                "status": "created",
                "description": payment_data.description,
                "created_at": datetime.utcnow()
            }
            await db.payments.insert_one(payment_record)
            
            return PaymentResponse(
                success=True,
                payment_id=payment.id,
                approval_url=approval_url,
                message="Payment created successfully"
            )
        else:
            logger.error(f"PayPal payment creation failed: {payment.error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create PayPal payment"
            )
            
    except Exception as e:
        logger.error(f"Error creating payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment creation failed: {str(e)}"
        )

@router.post("/execute")
async def execute_payment(
    payment_data: PaymentExecute,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Exécuter un paiement PayPal après approbation"""
    
    try:
        # Récupérer le paiement PayPal
        payment = paypalrestsdk.Payment.find(payment_data.payment_id)
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        # Exécuter le paiement
        if payment.execute({"payer_id": payment_data.payer_id}):
            # Paiement réussi - mettre à jour la base de données
            db = get_database()
            
            # Récupérer le montant du paiement
            amount = float(payment.transactions[0].amount.total)
            
            # Mettre à jour le statut du paiement
            await db.payments.update_one(
                {"payment_id": payment_data.payment_id},
                {
                    "$set": {
                        "status": "completed",
                        "payer_id": payment_data.payer_id,
                        "completed_at": datetime.utcnow()
                    }
                }
            )
            
            # Réduire les amendes de l'utilisateur
            await db.users.update_one(
                {"_id": ObjectId(current_user.id)},
                {"$inc": {"fine_amount": -amount}}
            )
            
            return {
                "success": True,
                "message": "Payment completed successfully",
                "amount_paid": amount,
                "payment_id": payment_data.payment_id
            }
        else:
            logger.error(f"PayPal payment execution failed: {payment.error}")
            
            # Mettre à jour le statut comme échoué
            db = get_database()
            await db.payments.update_one(
                {"payment_id": payment_data.payment_id},
                {
                    "$set": {
                        "status": "failed",
                        "error": str(payment.error),
                        "failed_at": datetime.utcnow()
                    }
                }
            )
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment execution failed"
            )
            
    except Exception as e:
        logger.error(f"Error executing payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment execution failed: {str(e)}"
        )

@router.get("/history")
async def get_payment_history(
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Récupérer l'historique des paiements de l'utilisateur"""
    
    try:
        db = get_database()
        
        cursor = db.payments.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1)
        
        payments = await cursor.to_list(length=100)
        
        # Convertir les ObjectId en string
        for payment in payments:
            payment["_id"] = str(payment["_id"])
        
        return {"payments": payments}
        
    except Exception as e:
        logger.error(f"Error retrieving payment history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve payment history: {str(e)}"
        )

@router.get("/balance")
async def get_user_balance(
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Récupérer le solde des amendes de l'utilisateur"""
    
    # Mettre à jour les amendes avant de retourner le solde
    await fine_service.update_overdue_borrowings()
    
    # Récupérer le solde actuel
    current_fine = await fine_service.get_user_total_fines(current_user.id)
    
    return {
        "user_id": current_user.id,
        "fine_amount": current_fine,
        "currency": "EUR"
    }

@router.get("/overdue-borrowings")
async def get_overdue_borrowings(
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Récupérer les emprunts en retard de l'utilisateur"""
    
    overdue_borrowings = await fine_service.get_overdue_borrowings_for_user(current_user.id)
    
    return {
        "user_id": current_user.id,
        "overdue_borrowings": overdue_borrowings,
        "total_count": len(overdue_borrowings)
    }

@router.post("/update-fines")
async def update_all_fines(
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Mettre à jour toutes les amendes (endpoint admin)"""
    
    # Vérifier si l'utilisateur est admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    result = await fine_service.update_overdue_borrowings()
    return result

@router.post("/admin/run-scheduler-update")
async def run_scheduler_update(
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Exécuter manuellement la tâche de mise à jour via le scheduler (admin uniquement)"""
    # Vérifier si l'utilisateur est admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    logger.info(f"Mise à jour des amendes via scheduler déclenchée par l'admin: {current_user.email}")
    
    try:
        # Exécuter la tâche via le scheduler
        await fine_scheduler.run_manual_update()
        return {
            "success": True,
            "message": "Mise à jour des amendes exécutée avec succès via le scheduler",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Erreur lors de l'exécution manuelle du scheduler: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'exécution de la mise à jour: {str(e)}"
        )