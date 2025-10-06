
import requests

class Send_To_GO:
    
    def __init__(self, logger):
    
        self.url = "http://localhost:3000/go/upload"
        self.logger = logger
        
        
    def _build_json(self, motor_id : int) -> dict:
        message = {
            "predict" : motor_id
        }
        
        return message
    
    def _send_json_to_server(self, json : dict) -> None:
        try:
            r = requests.post(self.url, json=json)
            
            if r.status_code == 200:
                self.logger(f"Succeed to send data to {self.url}")
            else:
                self.logger(f"Failed to send data to {self.url}")
        
        except Exception as e:
            self.logger(f"Something wrong while sending data to {self.url}! {e}")
            
    def send_to_go(self, motor_id : int) -> None:
        json = self._build_json(motor_id)
        self._send_json_to_server(json)
        
        
    