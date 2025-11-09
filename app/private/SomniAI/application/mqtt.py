import asyncio
import paho.mqtt.client as mqtt

    
class SomniAIMQTT:
    
    def __init__(self):
        super().__init__()
        
        self.message_queue = asyncio.Queue()
        self.BATCH_TIMEOUT = ...
        self.BROKER_ADDRESS = "220.149.231.121"
        self.PORT = 1883
        self.TOPIC = "somniai/pillow/esp32"
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "SomniAI_Server")
    
    async def __aenter__(self):
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self.client.connect, self.BROKER_ADDRESS, self.PORT)
        self.client.loop_start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.client.loop_stop()
        
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self.client.disconnect)
        
    async def send_to_message_broker(self, result):
        loop = asyncio.get_running_loop()
        
        def _publish_sync():
            info = self.client.publish(self.TOPIC, result, qos=1)
            info.wait_for_publish()
            return info.is_published()

        is_published = await loop.run_in_executor(None, _publish_sync)
        
        if not is_published:
            print("Failed to publish message.")
            
            
            
if __name__ == "__main__":
    async def main():
        async with SomniAIMQTT() as mqtt_broker:
            await mqtt_broker.send_to_message_broker("Test")
                    
    asyncio.run(main())