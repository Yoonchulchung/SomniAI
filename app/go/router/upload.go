
package router

import (
	"encoding/json"
	"net/http"
	"strings"
	
	"github.com/Yoonchulchung/SomniAI/queue"
)

type UploadRequest struct {
	Predict string `json:"predict"`
}


func errorJSON(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}


func UploadHandler(q *queue.Ring) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// HTTP 메소드가 POST인지 확인
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Content-Type이 application/json인지 확인
		if r.Header.Get("Content-Type") != "application/json" {
			errorJSON(w, http.StatusBadRequest, "invalid json")
			return
		}

		// JSON 요청 본문을 파싱
		var req UploadRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			// 파싱 실패 시 400 Bad Request와 에러 메시지를 반환
			errorJSON(w, http.StatusBadRequest, "invalid json")
			return
		}
		
		// 요청의 predict 키가 비어있는지 확인
		if strings.TrimSpace(req.Predict) == "" {
			errorJSON(w, http.StatusBadRequest, "invalid json")
			return
		}

		// 큐에 데이터를 저장
		err = q.Enqueue(r.Context(), req.Predict)
		if err != nil {
			
			http.Error(w, "Service Unavailable", http.StatusServiceUnavailable)
			return
		}

		// 성공 응답을 반환
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "succeed to send data"})
	}
}
