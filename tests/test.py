
from utils import request
from utils import image

def main():

    image_base64 = image.get_image_base64('../data/samples/image_000043.png')
    response = request.send_data_to_server(image_base64, 'http://localhost:8000/')
    
    if response:
        ...
        

if __name__ == "__main__":
    main()