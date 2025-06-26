from fastapi import FAstAPI

app = FastAPI()

@app.get("/")
def main():
    return {"message": "Hello, World!"}

