import server


if __name__ == "__main__":
    params = dict(
        content_type = 'application/octet-stream',
        img_path = '../data/samples/image_000043.png',
        img_size = 640,
        batch = 30,
        server_url = 'http://127.0.0.1:8000/upload/http_1_1',
        post_mode = 'rand',
    )

    cfg = server.config.TestConfig(**params)
    client = server.adapters.RequestHTTP_1_1(cfg=cfg)
    tensor = server.tensor.TorchTensorProvider(cfg)

    dummy_data = tensor.make_payload()
    client.post(dummy_data)