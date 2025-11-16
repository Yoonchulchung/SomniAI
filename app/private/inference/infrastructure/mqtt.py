import asyncio

import paho.mqtt.client as mqtt


class SomniAIMQTT:
    
    def __init__(self, cfg):
        super().__init__()
        
        self.message_queue = asyncio.Queue()
        self.BATCH_TIMEOUT = cfg.HTTP.BATCH_TIMEOUT
        self.BROKER_ADDRESS = cfg.MQTT.ADDRESS
        self.PORT = cfg.MQTT.PORT
        self.TOPIC = cfg.MQTT.TOPIC
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
        
    async def send_to_message_broker(self, result, max_retries : int = 3):
        loop = asyncio.get_running_loop()
        
        def _publish_sync():
            info = self.client.publish(self.TOPIC, result, qos=1)
            info.wait_for_publish()
            return info.is_published()
 
        is_published = await loop.run_in_executor(None, _publish_sync)
        
        if not is_published:
            print("Failed to publish message.")
        last_error = None
        for attempt in range(max_retries):
            try:
                is_published = await loop.run_in_executor(None, _publish_sync)

                if is_published:
                    return True

                last_error = f"Failed to publish message (attempt {attempt + 1}/{max_retries})"
                print(last_error)

                # Wait before retrying (exponential backoff)
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)

            except Exception as e:
                last_error = f"Error publishing message (attempt {attempt + 1}/{max_retries}): {str(e)}"
                print(last_error)

                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)

        # If we've exhausted all retries, raise an exception
        raise RuntimeError(f"Failed to publish message after {max_retries} attempts. Last error: {last_error}")
            
            
if __name__ == "__main__":
    async def main():
        async with SomniAIMQTT() as mqtt_broker:
            await mqtt_broker.send_to_message_broker("Test")
                    
    asyncio.run(main())