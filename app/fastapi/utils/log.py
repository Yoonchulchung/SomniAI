from datetime import datetime
import logging

logger = logging.getLogger("SomniAI")
logger.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

formatter = logging.Formatter("[SomniAI %(asctime)s] %(message)s")
console_handler.setFormatter(formatter)

if not logger.handlers:
    logger.addHandler(console_handler)
    
    
def SomniAI_log(*message: str):
    msg = " ".join(str(m) for m in message)
    logger.info(msg)