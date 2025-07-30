import requests as reqeust




def send_data_to_server(data, url):
    request = {
            'image': data,
        }
    
    response = reqeust.post(url, json=request)

    if response.status_code == 200:         
        print("Prediction successful:", response.json())
        return response.json()
    else:
        print("Error in prediction:", response.status_code, response.text)
        return None