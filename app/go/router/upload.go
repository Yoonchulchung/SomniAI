package router

import (
	
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"regexp"
	"strings"
	"sync/atomic"
	

	"github.com/Yoonchulchung/SomniAI/queue"
)


var reqID int64


type UploadRequest struct {
	Predict string `json:"predict"`
}



func UploadHandler(q *queue.Ring) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		
		if r.Method != http.MethodPost {
			errorJSON(w, http.StatusMethodNotAllowed, "invalid method")
			return
		}

		
		if r.Header.Get("Content-Type") != "application/json" {
			errorJSON(w, http.StatusUnsupportedMediaType, "unsupported content type")
			return
		}

		
		var req UploadRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			if !errors.Is(err, io.EOF) {
				errorJSON(w, http.StatusBadRequest, "invalid json")
				return
			}
		}

		
		const motorPattern = `^MOTOR_0[1-3]$`
		if strings.TrimSpace(req.Predict) == "" || !regexp.MustCompile(motorPattern).MatchString(req.Predict) {
			errorJSON(w, http.StatusBadRequest, "invalid payload: 'predict' must match ^MOTOR_0[1-3]$")
			return
		}

		
		currentID := atomic.AddInt64(&reqID, 1)
		item := queue.QueueItem{
			Predict: req.Predict,
			ID:      currentID,
		}

		// 큐가 가득 찼을 때 429 Too Many Requests 반환
		if err := q.Enqueue(item); err != nil {
			errorJSON(w, http.StatusTooManyRequests, "queue is full")
			return
		}

	
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "succeed to send data"})
	}
}
