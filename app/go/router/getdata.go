package router

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/Yoonchulchung/SomniAI/queue"
)


func GetDataHandler(q *queue.Ring) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		//HTTP 메서드 검증: GET 요청만 허용
		if r.Method != http.MethodGet {
			errorJSON(w, http.StatusMethodNotAllowed, "invalid method")
			return
		}

		// 큐에서 데이터 하나 꺼내기
		item, err := q.Dequeue()
		if err != nil {
			if errors.Is(err, queue.ErrQueueEmpty) {
				// 큐가 비어있으면 204 No Content 반환
				w.WriteHeader(http.StatusNoContent)
				return
			}
			// 큐에서 알 수 없는 에러가 발생한 경우 500 반환
			errorJSON(w, http.StatusInternalServerError, "internal server error")
			return
		}

		
		// MOTOR_01, 02, 03을 정수 1, 2, 3으로 변환
		motorValue, err := strconv.Atoi(item.Predict[7:])
		if err != nil {
			// 변환 실패 시 500 에러 반환
			errorJSON(w, http.StatusInternalServerError, "internal server error: failed to parse motor ID")
			return
		}


		response := map[string]interface{}{
			"predict":    motorValue,
			"request_id": item.ID,
		}
		
		writeJSON(w, http.StatusOK, response)
	}


	// router/getdata.go 파일에 아래 함수를 추가하세요.

// writeJSON은 JSON 응답을 편리하게 반환하는 헬퍼 함수입니다.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// errorJSON도 함께 추가하여 일관성을 유지하는 것이 좋습니다.
func errorJSON(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
}
