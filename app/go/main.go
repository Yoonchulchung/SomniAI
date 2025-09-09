package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/Yoonchulchung/SomniAI/queue"
	"github.com/Yoonchulchung/SomniAI/router"
)

const (
	defaultWorkerNum = 2
	queueSize        = 100
)

func worker(q *queue.Ring, workerID int) {
	for {
		item, err := q.Dequeue(context.Background())
		if err != nil {
			log.Printf("Worker %d: Dequeue error: %v", workerID, err)
			return
		}
		log.Printf("Worker %d: Processing item: %s", workerID, item)
	}
}

func main() {
	ringQueue := queue.NewRing(queueSize)

	workerNumStr := os.Getenv("WORKER_NUM")
	workerNum, err := strconv.Atoi(workerNumStr)
	if err != nil || workerNum <= 0 {
		workerNum = defaultWorkerNum
	}
	for i := 0; i < workerNum; i++ {
		go worker(ringQueue, i)
	}

	http.HandleFunc("/go/upload", router.UploadHandler(ringQueue))

	server := &http.Server{Addr: ":3000"}
	go func() {
		log.Println("Server is running on port 3000")
		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server shutdown failed: %v", err)
	}
	log.Println("Server gracefully stopped.")
}
