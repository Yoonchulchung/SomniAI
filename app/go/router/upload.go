package router

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"somniai-go-server/queue"
)

type UploadRequest struct {
	Predict string `json:"predict"`
}


func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func errorJSON(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func UploadHandler(q *queue.Ring) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		
		if r.Method != http.MethodPost {
			errorJSON(w, http.StatusMethodNotAllowed, "invalid method")
			return
		}

		
		ct := r.Header.Get("Content-Type")
		if !strings.HasPrefix(ct, "application/json") {
			errorJSON(w, http.StatusBadRequest, "invalid content type")
			return
		}

		
		defer r.Body.Close()
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1MB

		//  JSON 파싱
		var req UploadRequest
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields() 
		if err := dec.Decode(&req); err != nil {
			
			if !errors.Is(err, io.EOF) {
				errorJSON(w, http.StatusBadRequest, "invalid json")
				return
			}
		}

		
		if strings.TrimSpace(req.Predict) == "" {
			errorJSON(w, http.StatusBadRequest, "predict key missing")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if err := q.Enqueue(ctx, req.Predict); err != nil {
			
			errorJSON(w, http.StatusServiceUnavailable, "queue is full or timeout")
			return
		}

	
		writeJSON(w, http.StatusOK, map[string]string{"message": "succeed to send data"})
	}
}

