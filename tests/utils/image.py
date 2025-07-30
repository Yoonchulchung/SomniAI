from PIL import Image
import io
import base64


def get_image_base64(path):
    image = Image.open(path)
    image_bytes_io = io.BytesIO()
    image.save(image_bytes_io, format='JPEG')  # Save the image to a Bytes
    image_bytes_io.seek(0)  # Move the cursor to the beginning of the BytesIO object
    image_bytes = image_bytes_io.getvalue()  # Get the byte data from BytesIO
    
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
    
    return image_base64