@router.put("/{book_id}/upload", response_model=BookResponse)
async def update_book_with_image(
    book_id: str,
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    publication_year: Optional[int] = Form(None),
    publisher: Optional[str] = Form(None),
    pages: Optional[int] = Form(None),
    language: Optional[str] = Form(None),
    total_copies: Optional[int] = Form(None),
    cover_image: UploadFile = File(None),
    current_user: UserResponse = Depends(get_current_admin_user)
):
    """Mettre à jour un livre avec upload d'image (admin seulement)"""
    logger.info(f"Mise à jour d'un livre avec ID: {book_id}")
    
    db = get_database()
    
    if not ObjectId.is_valid(book_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid book ID"
        )
    
    # Vérifier que le livre existe
    existing_book = await db.books.find_one({"_id": ObjectId(book_id)})
    if not existing_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Préparer les données de mise à jour
    update_data = {}
    
    # Ajouter seulement les champs non nuls au dict de mise à jour
    if title is not None:
        update_data["title"] = title
    if author is not None:
        update_data["author"] = author
    if description is not None:
        update_data["description"] = description
    if category is not None:
        update_data["category"] = category
    if publication_year is not None:
        update_data["publication_year"] = publication_year
    if publisher is not None:
        update_data["publisher"] = publisher
    if pages is not None:
        update_data["pages"] = pages
    if language is not None:
        update_data["language"] = language
    if total_copies is not None:
        update_data["total_copies"] = total_copies
        # Recalculer les copies disponibles en fonction du nouvel inventaire
        borrowed = existing_book["total_copies"] - existing_book["available_copies"]
        new_available = max(0, total_copies - borrowed)
        update_data["available_copies"] = new_available
    
    # Traiter l'image si présente
    if cover_image and cover_image.filename:
        # Générer un nom de fichier unique
        file_extension = os.path.splitext(cover_image.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Chemin complet pour sauvegarder l'image
        file_path = IMAGE_DIR / unique_filename
        
        # S'assurer que le répertoire existe
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Sauvegarder le fichier
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(cover_image.file, buffer)
        
        # URL relative pour accéder à l'image
        update_data["cover_image"] = f"/static/images/{unique_filename}"
        logger.info(f"Nouvelle image sauvegardée à {file_path}, URL: {update_data['cover_image']}")
        
        # Supprimer l'ancienne image si elle existe
        old_image_url = existing_book.get("cover_image")
        if old_image_url and old_image_url.startswith("/static/images/"):
            old_image_name = os.path.basename(old_image_url)
            old_image_path = IMAGE_DIR / old_image_name
            if os.path.exists(old_image_path):
                try:
                    os.remove(old_image_path)
                    logger.info(f"Ancienne image supprimée: {old_image_path}")
                except Exception as e:
                    logger.error(f"Erreur lors de la suppression de l'ancienne image: {e}")
    
    # Mettre à jour le livre seulement si des changements sont à faire
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        # Mettre à jour dans la base de données
        await db.books.update_one(
            {"_id": ObjectId(book_id)},
            {"$set": update_data}
        )
    
    # Retourner le livre mis à jour
    updated_book = await db.books.find_one({"_id": ObjectId(book_id)})
    return BookResponse(
        id=str(updated_book["_id"]),
        title=updated_book["title"],
        author=updated_book["author"],
        isbn=updated_book["isbn"],
        description=updated_book.get("description"),
        category=updated_book["category"],
        publication_year=updated_book["publication_year"],
        publisher=updated_book.get("publisher"),
        pages=updated_book.get("pages"),
        language=updated_book["language"],
        cover_image=updated_book.get("cover_image"),
        available_copies=updated_book["available_copies"],
        total_copies=updated_book["total_copies"],
        created_at=updated_book["created_at"],
        rating=updated_book.get("rating", 0.0),
        reviews_count=updated_book.get("reviews_count", 0)
    )
