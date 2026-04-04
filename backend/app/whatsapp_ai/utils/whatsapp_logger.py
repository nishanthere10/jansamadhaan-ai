import logging

def get_whatsapp_logger(name: str) -> logging.Logger:
    """
    Returns a configured logger specifically for the WhatsApp pipeline.
    This makes it easier to trace sandbox payloads and failures.
    """
    logger = logging.getLogger(f"whatsapp_ai.{name}")
    
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        ch = logging.StreamHandler()
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
        # Prevent propagation to avoid duplicate logs if root logger is already handling
        logger.propagate = False
        
    return logger
