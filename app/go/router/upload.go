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


var reqID int64 //ID 번호표 만드는 카운터

//베개가 보내는 데이터 predict칸에 넣어서 보내라
type UploadRequest struct {
	Predict string `json:"predict"`
}


// UploadHandler <- 큐를 받아 데이터를 검사하고 큐에 넣어주는 함수
func UploadHandler(q *queue.Ring) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// POST데이터 아니면 안받아 (반환: 405)
		if r.Method != http.MethodPost {
			errorJSON(w, http.StatusMethodNotAllowed, "invalid method")
			return
		}

		//JSON형식이 아니면 안받아 (반환: 415)
		if r.Header.Get("Content-Type") != "application/json" {
			errorJSON(w, http.StatusUnsupportedMediaType, "unsupported content type")
			return
		}

		//UploadRequest 규칙에 맞지 않아 읽을 수 없으면 (반환:400)
		var req UploadRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			if !errors.Is(err, io.EOF) {
				errorJSON(w, http.StatusBadRequest, "invalid json")
				return
			}
		}

		// Predict 값 3가지 중 아니면 (반환: 400)
		const motorPattern = `^MOTOR_0[1-3]$`
		if strings.TrimSpace(req.Predict) == "" || !regexp.MustCompile(motorPattern).MatchString(req.Predict) {
			errorJSON(w, http.StatusBadRequest, "invalid payload: 'predict' must match ^MOTOR_0[1-3]$")
			return
		}

		//번호 1씩 증가시켜줄게
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

	    //다 통과하면 성공 메세지
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "succeed to send data"})
	}
}
