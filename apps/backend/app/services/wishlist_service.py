"""Wishlist service for managing user wishlists."""
from typing import List, Dict, Any, Optional
from bson import ObjectId

from app.services.db import get_db
from app.repositories.wishlist_repository import wishlist_repository
from app.repositories.product_repository import product_repository
from app.core.exceptions import NotFoundError


class WishlistService:
    """Service for wishlist operations."""
    
    def __init__(self):
        """Initialize wishlist service."""
        self.repo = wishlist_repository
        self.product_repo = product_repository
    
    async def get_wishlist(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get user's wishlist with product details.
        
        Args:
            user_id: User ID
            
        Returns:
            List of wishlist items with product info
        """
        items = await self.repo.get_user_wishlist(user_id)
        
        # Convert ObjectId to string
        for item in items:
            item["_id"] = str(item["_id"])
        
        return items
    
    async def add_to_wishlist(self, user_id: str, product_id: str) -> Dict[str, Any]:
        """
        Add product to wishlist.
        
        Args:
            user_id: User ID
            product_id: Product ID
            
        Returns:
            Wishlist item
            
        Raises:
            NotFoundError: If product not found
        """
        # Get product details
        product = await self.product_repo.get_by_id(product_id)
        
        if not product:
            raise NotFoundError(f"Product {product_id} not found")
        
        # Prepare product data
        product_data = {
            "name": product.get("name"),
            "price": product.get("price"),
            "image_url": product.get("images", [{}])[0].get("url") if product.get("images") else None
        }
        
        # Add to wishlist
        item = await self.repo.add_to_wishlist(user_id, product_id, product_data)
        
        # Convert ObjectId to string
        if item and "_id" in item:
            item["_id"] = str(item["_id"])
        
        return item
    
    async def remove_from_wishlist(self, user_id: str, product_id: str) -> bool:
        """
        Remove product from wishlist.
        
        Args:
            user_id: User ID
            product_id: Product ID
            
        Returns:
            True if removed
        """
        return await self.repo.remove_from_wishlist(user_id, product_id)
    
    async def check_price_drops(self, threshold_percentage: float = 10.0) -> List[Dict[str, Any]]:
        """
        Check for price drops in wishlist items.
        
        Args:
            threshold_percentage: Minimum price drop percentage
            
        Returns:
            List of items with price drops
        """
        return await self.repo.get_price_drop_candidates(threshold_percentage)


class ComparisonService:
    """Service for product comparison."""
    
    MAX_COMPARISON_PRODUCTS = 4
    
    def __init__(self):
        """Initialize comparison service."""
        self.product_repo = product_repository
    
    async def compare_products(self, product_ids: List[str]) -> Dict[str, Any]:
        """
        Compare products side-by-side with attribute comparison.
        
        Args:
            product_ids: List of product IDs (max 4)
            
        Returns:
            Comparison data with products and common attributes
        """
        # Limit to max products
        if len(product_ids) > self.MAX_COMPARISON_PRODUCTS:
            product_ids = product_ids[:self.MAX_COMPARISON_PRODUCTS]
        
        # Get products
        products = []
        for pid in product_ids:
            try:
                product = await self.product_repo.get_by_id(pid)
                if product:
                    product["_id"] = str(product["_id"])
                    products.append(product)
            except Exception:
                continue
        
        if not products:
            return {
                "products": [],
                "count": 0,
                "attributes": []
            }
        
        # Extract common attributes for comparison
        all_attributes = set()
        for product in products:
            if "attributes" in product:
                all_attributes.update(product["attributes"].keys())
        
        # Build comparison matrix
        comparison_attributes = []
        for attr in sorted(all_attributes):
            attr_comparison = {
                "name": attr,
                "values": []
            }
            
            for product in products:
                value = product.get("attributes", {}).get(attr, "N/A")
                attr_comparison["values"].append({
                    "product_id": product["_id"],
                    "value": value
                })
            
            comparison_attributes.append(attr_comparison)
        
        # Add price comparison
        price_comparison = {
            "name": "Price",
            "values": []
        }
        for product in products:
            price_comparison["values"].append({
                "product_id": product["_id"],
                "value": product.get("price", 0)
            })
        comparison_attributes.insert(0, price_comparison)
        
        return {
            "products": products,
            "count": len(products),
            "attributes": comparison_attributes
        }


# Singleton instances
wishlist_service = WishlistService()
comparison_service = ComparisonService()
