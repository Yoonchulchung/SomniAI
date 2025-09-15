package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/Yoonchulchung/SomniAI/queue"
	"github.com/Yoonchulchung/SomniAI/router"
	"google.golang.org/grpc"
)

// worker는 큐에서 아이템을 꺼내 처리하는 고루틴입니다.
func worker(ctx context.Context, id int, q *queue.Ring) {
	log.Printf("워커 #%d 시작", id)
	for {
		item, err := q.Dequeue()
		if err != nil {
			if errors.Is(err, queue.ErrQueueEmpty) {
				// 큐가 비어있을 경우 잠시 대기
				time.Sleep(1 * time.Second)
				continue
			}
			log.Printf("워커 #%d 종료: %v", id, err)
			return
		}

		// TODO: 실제 모터 제어/로깅/전송 등 후속 처리 로직 구현
		fmt.Printf("워커 #%d: 'predict' 값 '%s' (요청 ID: %d) 처리 완료\n", id, item.Predict, item.ID)
	}
}

func main() {
	// gRPC 서버 설정 (기존 코드 유지)
	grpcServer := grpc.NewServer()
	grpcListener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("gRPC 리스너 생성 실패: %v", err)
	}

	// 큐 초기화 (용량은 필요에 따라 조절)
	const queueCapacity = 5000
	q := queue.New(queueCapacity)

	// 워커 고루틴 시작
	workerNum, err := strconv.Atoi(os.Getenv("WORKER_NUM"))
	if err != nil || workerNum <= 0 {
		workerNum = 2
	}
	log.Printf("HTTP 워커 %d개 시작", workerNum)
	
	// Graceful Shutdown을 위한 Context 생성
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()

	for i := 0; i < workerNum; i++ {
		go worker(workerCtx, i, q)
	}

	// HTTP 라우터 설정
	httpMux := http.NewServeMux()
	httpMux.Handle("/go/upload", router.UploadHandler(q))
	httpMux.Handle("/go/get_data", router.GetDataHandler(q))

	// HTTP 서버 시작
	go func() {
		log.Println("HTTP 서버가 포트 3000에서 시작되었습니다.")
		httpServer := &http.Server{Addr: ":3000", Handler: httpMux}
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("HTTP 서버 시작 실패: %v", err)
		}
	}()

	// Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("서버 종료 신호 수신. Graceful Shutdown 시작...")
	
	// gRPC 서버 종료
	log.Println("gRPC 서버 종료 중...")
	grpcServer.GracefulStop()

	// HTTP 워커 종료
	workerCancel()

	log.Println("모든 서버와 워커가 안전하게 종료되었습니다.")
}
