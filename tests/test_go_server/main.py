import json as pyjson
import pytest
import requests

BASE_URL = "http://localhost:3000"
URL = f"{BASE_URL}/go/upload"

@pytest.mark.parametrize("payload, expected_status", [
    
    ({"predict": "MOTOR_01"}, 200),
    ({"predict": "MOTOR_02"}, 200),
    ({"predict": "MOTOR_03"}, 200),
    
    ({"predict": "MOTOR_00"}, 400),
    ({"predict": "MOTOR_1"}, 400),
    ({"predict": "MOTOR_04"}, 400),
    ({"predict": "MOTOR_4"}, 400),
    ({"predict": "123"}, 400),
    ({"predict": None}, 400),         
    ({"predict": ""}, 400),           
    ({"foo": "bar"}, 400),     
])

# =============================================
# Test Upload
# =============================================
def test_upload_ok(payload, expected_status):
    resp = requests.post(URL, json=payload)
    assert resp.status_code == expected_status
    
def test_queue(payload, expected_status):
    for _ in range(100):
        resp = requests.post(URL, json=payload)
        assert resp.status_code == expected_status    
    
# =============================================
# Test Content Type
# =============================================
def test_content_type():
    resp = requests.post(URL, data=pyjson.dumps({"predict": "MOTOR_01"}),
                         headers={"Content-Type": "text/plain"})
    assert resp.status_code in (400, 415)
    
    resp = requests.post(
        URL,
        data=pyjson.dumps({"predict": "MOTOR_01"}),
        headers={"Content-Type": "application/javascript"}
    )
    assert resp.status_code in (400, 415)
    
    resp = requests.post(
        URL,
        data=pyjson.dumps({"predict": "MOTOR_01"}),
        headers={"Content-Type": "Application/JSON"}
    )

    assert resp.status_code in (200, 400, 415)