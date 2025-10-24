"""Unit tests for campaign service business logic."""
import pytest
from decimal import Decimal
from datetime import datetime, timedelta

from app.services.campaign_service import CampaignService


class TestRuleEvaluation:
    """Test campaign rule evaluation."""
    
    def test_min_amount_rule_passes(self):
        """Test min_amount rule passes when cart total is sufficient."""
        service = CampaignService()
        
        rule = {
            "type": "min_amount",
            "operator": ">=",
            "value": 100
        }
        
        context = {"cart_total": 150}
        
        assert service.evaluate_rule(rule, context) is True
    
    def test_min_amount_rule_fails(self):
        """Test min_amount rule fails when cart total is insufficient."""
        service = CampaignService()
        
        rule = {
            "type": "min_amount",
            "operator": ">=",
            "value": 100
        }
        
        context = {"cart_total": 50}
        
        assert service.evaluate_rule(rule, context) is False
    
    def test_product_in_cart_rule_passes(self):
        """Test product_in_cart rule passes when product is in cart."""
        service = CampaignService()
        
        rule = {
            "type": "product_in_cart",
            "operator": "in",
            "value": ["prod-1", "prod-2"]
        }
        
        context = {
            "cart_items": [
                {"product_id": "prod-1", "qty": 2},
                {"product_id": "prod-3", "qty": 1}
            ]
        }
        
        assert service.evaluate_rule(rule, context) is True
    
    def test_quantity_rule_passes(self):
        """Test quantity rule passes when total quantity meets threshold."""
        service = CampaignService()
        
        rule = {
            "type": "quantity",
            "operator": ">=",
            "value": 5
        }
        
        context = {
            "cart_items": [
                {"qty": 2},
                {"qty": 3},
                {"qty": 1}
            ]
        }
        
        assert service.evaluate_rule(rule, context) is True


class TestActionApplication:
    """Test campaign action application."""
    
    def test_percentage_discount_action(self):
        """Test percentage discount calculation."""
        service = CampaignService()
        
        action = {
            "type": "percentage_discount",
            "value": 20  # 20% discount
        }
        
        context = {"cart_total": 100}
        
        result = service.apply_action(action, context)
        
        assert result["discount_amount"] == Decimal("20.00")
    
    def test_fixed_discount_action(self):
        """Test fixed discount calculation."""
        service = CampaignService()
        
        action = {
            "type": "fixed_discount",
            "value": 15
        }
        
        context = {"cart_total": 100}
        
        result = service.apply_action(action, context)
        
        assert result["discount_amount"] == Decimal("15.00")
    
    def test_fixed_discount_capped_at_cart_total(self):
        """Test fixed discount doesn't exceed cart total."""
        service = CampaignService()
        
        action = {
            "type": "fixed_discount",
            "value": 150
        }
        
        context = {"cart_total": 100}
        
        result = service.apply_action(action, context)
        
        # Should be capped at cart total
        assert result["discount_amount"] == Decimal("100.00")
    
    def test_free_shipping_action(self):
        """Test free shipping action."""
        service = CampaignService()
        
        action = {
            "type": "free_shipping",
            "value": True
        }
        
        context = {"cart_total": 100}
        
        result = service.apply_action(action, context)
        
        assert result["free_shipping"] is True
        assert result["discount_amount"] == Decimal("0")


class TestCampaignEvaluation:
    """Test complete campaign evaluation."""
    
    def test_campaign_evaluation_all_rules_pass(self):
        """Test campaign applies when all rules pass."""
        service = CampaignService()
        
        now = datetime.utcnow()
        
        campaign = {
            "status": "active",
            "start_date": now - timedelta(days=1),
            "end_date": now + timedelta(days=1),
            "usage_limit": None,
            "usage_count": 0,
            "rules": [
                {"type": "min_amount", "operator": ">=", "value": 50},
                {"type": "quantity", "operator": ">=", "value": 2}
            ]
        }
        
        context = {
            "cart_total": 100,
            "cart_items": [{"qty": 2}, {"qty": 1}]
        }
        
        assert service.evaluate_campaign(campaign, context) is True
    
    def test_campaign_evaluation_one_rule_fails(self):
        """Test campaign doesn't apply when one rule fails."""
        service = CampaignService()
        
        now = datetime.utcnow()
        
        campaign = {
            "status": "active",
            "start_date": now - timedelta(days=1),
            "end_date": now + timedelta(days=1),
            "usage_limit": None,
            "usage_count": 0,
            "rules": [
                {"type": "min_amount", "operator": ">=", "value": 50},
                {"type": "quantity", "operator": ">=", "value": 10}  # This will fail
            ]
        }
        
        context = {
            "cart_total": 100,
            "cart_items": [{"qty": 2}, {"qty": 1}]
        }
        
        assert service.evaluate_campaign(campaign, context) is False
    
    def test_campaign_evaluation_expired(self):
        """Test expired campaign doesn't apply."""
        service = CampaignService()
        
        now = datetime.utcnow()
        
        campaign = {
            "status": "active",
            "start_date": now - timedelta(days=10),
            "end_date": now - timedelta(days=1),  # Expired
            "usage_limit": None,
            "usage_count": 0,
            "rules": [
                {"type": "min_amount", "operator": ">=", "value": 50}
            ]
        }
        
        context = {"cart_total": 100}
        
        assert service.evaluate_campaign(campaign, context) is False
    
    def test_campaign_evaluation_usage_limit_reached(self):
        """Test campaign doesn't apply when usage limit reached."""
        service = CampaignService()
        
        now = datetime.utcnow()
        
        campaign = {
            "status": "active",
            "start_date": now - timedelta(days=1),
            "end_date": now + timedelta(days=1),
            "usage_limit": 100,
            "usage_count": 100,  # Limit reached
            "rules": [
                {"type": "min_amount", "operator": ">=", "value": 50}
            ]
        }
        
        context = {"cart_total": 100}
        
        assert service.evaluate_campaign(campaign, context) is False
