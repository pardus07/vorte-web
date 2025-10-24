"""Payment provider configuration."""
from typing import List


class PaymentConfig:
    """Payment provider configuration."""
    
    # Timeout for payment requests (seconds)
    TIMEOUT = 30
    
    # Maximum retry attempts
    MAX_RETRIES = 3
    
    # Retry backoff delays (seconds)
    RETRY_BACKOFF: List[int] = [1, 2, 4]
    
    # Idempotency window (seconds) - 24 hours
    IDEMPOTENCY_WINDOW = 86400
    
    # 3DS authentication timeout (seconds)
    THREE_DS_TIMEOUT = 300  # 5 minutes
    
    # Supported currencies
    SUPPORTED_CURRENCIES = ["TRY", "USD", "EUR"]
    
    # Minimum payment amount per currency
    MIN_AMOUNT = {
        "TRY": 1.0,
        "USD": 0.5,
        "EUR": 0.5
    }
    
    # Maximum payment amount per currency
    MAX_AMOUNT = {
        "TRY": 100000.0,
        "USD": 10000.0,
        "EUR": 10000.0
    }


payment_config = PaymentConfig()
