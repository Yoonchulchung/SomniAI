
from PIL import Image
import requests as reqeust
import io
import base64

def main():
    image = Image.open('./image/man.jpg')
    image_bytes_io = io.BytesIO()
    image.save(image_bytes_io, format='JPEG')  # Save the image to a Bytes
    image_bytes_io.seek(0)  # Move the cursor to the beginning of the BytesIO object
    image_bytes = image_bytes_io.getvalue()  # Get the byte data from BytesIO
    
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')

    request = {
        'image': image_base64,
    }
    
    response = reqeust.post('http://localhost:8000/predict', json=request)
    if response.status_code == 200:
        print("Prediction successful:", response.json())
    else:
        print("Error in prediction:", response.status_code, response.text)
        

if __name__ == "__main__":
    main()