import server


if __name__ == "__main__":
    client = server.adapters.RequestHTTP_1_1(server.config.TestConfig)
    tensor = server.tensor.TorchTensorProvider(30, 640, )
    
    dummy_data = tensor.make_payload()
    
    server_url = 'http://127.0.0.1:8000/upload/application'
    headers = {"Content-Type": "application/octet-stream"}
    
    client.post_bytes_multi_user(server_url, dummy_data, headers)
    
    