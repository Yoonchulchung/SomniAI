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
	// 이전에 추가된 gRPC 관련 패키지들이 여기에 모두 import되어야 합니다.
)

func worker(ctx context.Context, id int, q *queue.Ring) {
	log.Printf("워커 #%d 시작", id)
	for {
		item, err := q.Dequeue()
		if err != nil {
			if errors.Is(err, queue.ErrQueueEmpty) {
				time.Sleep(1 * time.Second)
				continue
			}
			log.Printf("워커 #%d 종료: %v", id, err)
			return
		}

		fmt.Printf("워커 #%d: 'predict' 값 '%s' (요청 ID: %d) 처리 완료\n", id, item.Predict, item.ID)
	}
}

func main() {
	// gRPC 서버 설정
	grpcServer := grpc.NewServer()
	grpcListener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("gRPC 리스너 생성 실패: %v", err)
	}

	const queueCapacity = 5000
	q := queue.New(queueCapacity)

	workerNum, err := strconv.Atoi(os.Getenv("WORKER_NUM"))
	if err != nil || workerNum <= 0 {
		workerNum = 2
	}
	log.Printf("HTTP 워커 %d개 시작", workerNum)
	
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()

	for i := 0; i < workerNum; i++ {
		go worker(workerCtx, i, q)
	}

	httpMux := http.NewServeMux()
	httpMux.Handle("/go/upload", router.UploadHandler(q))
	httpMux.Handle("/go/get_data", router.GetDataHandler(q))

	go func() {
		log.Println("HTTP 서버가 포트 3000에서 시작되었습니다.")
		httpServer := &http.Server{Addr: ":3000", Handler: httpMux}
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("HTTP 서버 시작 실패: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	
	// gRPC 서버 시작
	go func() {
		log.Println("gRPC 서버가 포트 50051에서 시작되었습니다.")
		if err := grpcServer.Serve(grpcListener); err != nil && !errors.Is(err, grpc.ErrServerStopped) {
			log.Fatalf("gRPC 서버 실행 실패: %v", err)
		}
	}()

	<-quit
	log.Println("서버 종료 신호 수신. Graceful Shutdown 시작...")
	
	log.Println("gRPC 서버 종료 중...")
	grpcServer.GracefulStop()

	workerCancel()

	log.Println("모든 서버와 워커가 안전하게 종료되었습니다.")
}
