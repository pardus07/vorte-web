"""Campaign service for business logic."""
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional

from app.repositories.campaign_repository import campaign_repository
from app.core.exceptions import NotFoundError, ValidationError


class CampaignService:
    """Service for campaign business logic."""
    
    def __init__(self):
        """Initialize campaign service."""
        self.repo = campaign_repository
    
    def evaluate_rule(
        self,
        rule: Dict[str, Any],
        context: Dict[str, Any]
    ) -> bool:
        """
        Evaluate a single campaign rule.
        
        Args:
            rule: Rule definition with type, operator, value
            context: Context data (cart_total, items, user, etc.)
            
        Returns:
            True if rule passes, False otherwise
        """
        rule_type = rule["type"]
        operator = rule["operator"]
        rule_value = rule["value"]
        
        if rule_type == "min_amount":
            cart_total = context.get("cart_total", 0)
            return self._compare(cart_total, operator, rule_value)
        
        elif rule_type == "product_in_cart":
            cart_items = context.get("cart_items", [])
            product_ids = [item.get("product_id") for item in cart_items]
            
            if operator == "in":
                # Check if any of the rule products are in cart
                return any(pid in product_ids for pid in rule_value)
            elif operator == "not_in":
                # Check if none of the rule products are in cart
                return all(pid not in product_ids for pid in rule_value)
        
        elif rule_type == "category":
            cart_items = context.get("cart_items", [])
            category_ids = set()
            
            for item in cart_items:
                product = item.get("product", {})
                item_categories = product.get("category_ids", [])
                category_ids.update(item_categories)
            
            if operator == "in":
                return any(cid in category_ids for cid in rule_value)
            elif operator == "not_in":
                return all(cid not in category_ids for cid in rule_value)
        
        elif rule_type == "quantity":
            cart_items = context.get("cart_items", [])
            total_qty = sum(item.get("qty", 0) for item in cart_items)
            return self._compare(total_qty, operator, rule_value)
        
        elif rule_type == "user_role":
            user_role = context.get("user_role")
            if operator == "==":
                return user_role == rule_value
            elif operator == "in":
                return user_role in rule_value
        
        return False
    
    def _compare(self, left: Any, operator: str, right: Any) -> bool:
        """
        Compare two values using the given operator.
        
        Args:
            left: Left operand
            operator: Comparison operator
            right: Right operand
            
        Returns:
            Comparison result
        """
        if operator == ">=":
            return left >= right
        elif operator == ">":
            return left > right
        elif operator == "<=":
            return left <= right
        elif operator == "<":
            return left < right
        elif operator == "==":
            return left == right
        elif operator == "!=":
            return left != right
        
        return False

    
    def evaluate_campaign(
        self,
        campaign: Dict[str, Any],
        context: Dict[str, Any]
    ) -> bool:
        """
        Evaluate if a campaign applies to the given context.
        
        All rules must pass for the campaign to apply.
        
        Args:
            campaign: Campaign document
            context: Context data
            
        Returns:
            True if campaign applies, False otherwise
        """
        # Check if campaign is active
        if campaign.get("status") != "active":
            return False
        
        # Check date range
        now = datetime.utcnow()
        if now < campaign.get("start_date") or now > campaign.get("end_date"):
            return False
        
        # Check usage limit
        usage_limit = campaign.get("usage_limit")
        if usage_limit and campaign.get("usage_count", 0) >= usage_limit:
            return False
        
        # Evaluate all rules (AND logic)
        rules = campaign.get("rules", [])
        for rule in rules:
            if not self.evaluate_rule(rule, context):
                return False
        
        return True
    
    def apply_action(
        self,
        action: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Apply a campaign action and calculate discount.
        
        Args:
            action: Action definition
            context: Context data with cart_total, items, etc.
            
        Returns:
            Dict with discount_amount and other action results
        """
        action_type = action["type"]
        action_value = action["value"]
        cart_total = Decimal(str(context.get("cart_total", 0)))
        
        result = {
            "discount_amount": Decimal("0"),
            "free_shipping": False,
            "gift_products": []
        }

        
        if action_type == "percentage_discount":
            percentage = Decimal(str(action_value)) / Decimal("100")
            result["discount_amount"] = (cart_total * percentage).quantize(Decimal("0.01"))
        
        elif action_type == "fixed_discount":
            discount = Decimal(str(action_value))
            # Don't discount more than cart total
            result["discount_amount"] = min(discount, cart_total)
        
        elif action_type == "free_shipping":
            result["free_shipping"] = True
        
        elif action_type == "gift_product":
            result["gift_products"] = [action_value] if isinstance(action_value, str) else action_value
        
        elif action_type == "buy_x_get_y":
            # action_value format: {"buy_product_id": "...", "buy_qty": 2, "get_product_id": "...", "get_qty": 1}
            # This would require more complex logic to track which items qualify
            pass
        
        return result
    
    async def validate_coupon(
        self,
        coupon_code: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate a coupon code and calculate discount.
        
        Args:
            coupon_code: Coupon code to validate
            context: Context data (cart_total, items, user, etc.)
            
        Returns:
            Dict with valid, discount_amount, message
        """
        # Get campaign by coupon code
        campaign = await self.repo.get_by_coupon_code(coupon_code)
        
        if not campaign:
            return {
                "valid": False,
                "discount_amount": Decimal("0"),
                "message": "Invalid coupon code"
            }
        
        # Evaluate campaign rules
        if not self.evaluate_campaign(campaign, context):
            return {
                "valid": False,
                "discount_amount": Decimal("0"),
                "message": "Coupon does not apply to your cart"
            }

        
        # Apply actions and calculate total discount
        total_discount = Decimal("0")
        actions = campaign.get("actions", [])
        
        for action in actions:
            action_result = self.apply_action(action, context)
            total_discount += action_result["discount_amount"]
        
        return {
            "valid": True,
            "discount_amount": total_discount,
            "campaign_id": str(campaign["_id"]),
            "message": f"Coupon '{coupon_code}' applied successfully"
        }
    
    async def get_applicable_campaigns(
        self,
        context: Dict[str, Any],
        campaign_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all campaigns that apply to the given context.
        
        Args:
            context: Context data
            campaign_type: Optional filter by campaign type
            
        Returns:
            List of applicable campaigns ordered by priority
        """
        # Get active campaigns
        campaigns = await self.repo.get_active_campaigns(campaign_type)
        
        # Filter campaigns that apply
        applicable = []
        for campaign in campaigns:
            if self.evaluate_campaign(campaign, context):
                applicable.append(campaign)
        
        return applicable
    
    async def calculate_cart_discounts(
        self,
        context: Dict[str, Any],
        applied_coupon_codes: List[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate all applicable discounts for a cart.
        
        Applies automatic cart rules and any applied coupons.
        
        Args:
            context: Context data with cart info
            applied_coupon_codes: List of coupon codes to apply
            
        Returns:
            Dict with total_discount, breakdown, free_shipping, etc.
        """
        total_discount = Decimal("0")
        breakdown = []
        free_shipping = False
        gift_products = []

        
        # Apply automatic cart rules
        cart_rules = await self.get_applicable_campaigns(context, "cart_rule")
        
        for campaign in cart_rules:
            actions = campaign.get("actions", [])
            for action in actions:
                result = self.apply_action(action, context)
                
                if result["discount_amount"] > 0:
                    total_discount += result["discount_amount"]
                    breakdown.append({
                        "campaign_id": str(campaign["_id"]),
                        "campaign_name": campaign.get("name"),
                        "discount_amount": float(result["discount_amount"])
                    })
                
                if result["free_shipping"]:
                    free_shipping = True
                
                if result["gift_products"]:
                    gift_products.extend(result["gift_products"])
        
        # Apply coupons
        if applied_coupon_codes:
            for coupon_code in applied_coupon_codes:
                validation = await self.validate_coupon(coupon_code, context)
                
                if validation["valid"]:
                    total_discount += validation["discount_amount"]
                    breakdown.append({
                        "coupon_code": coupon_code,
                        "campaign_id": validation.get("campaign_id"),
                        "discount_amount": float(validation["discount_amount"])
                    })
        
        return {
            "total_discount": float(total_discount),
            "breakdown": breakdown,
            "free_shipping": free_shipping,
            "gift_products": gift_products
        }


# Singleton instance
campaign_service = CampaignService()
