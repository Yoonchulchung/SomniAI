package main

import (
	"log"
	"time"
	"net/http"
	"os"
	"os/signal"
	"errors"
	"context"
	
	"github.com/yoonchulchung/somniai/app/go/http_1_1"
	"github.com/yoonchulchung/somniai/app/go/http_2"
)

type stdLogger struct{}
func (l stdLogger) Printf(f string, a ...any) { log.Printf(f, a...) }
func (l stdLogger) Println(a ...any)          { log.Println(a...) }

func main() {

	// =========================================================
	// HTTP 1.1
	// =========================================================
	http_1_1_responder := http_1_1.NewResponder(nil, stdLogger{})

	defer http_1_1_responder.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("/status", http_1_1_responder.Res_Status)

	srv := &http.Server{
		Addr:              ":8080",
		Handler:           http_1_1.Logging(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Println("[http] listening on :8080")
		if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()

	// =========================================================
	// HTTP 2
	// =========================================================
	log.Println("Starting Go Server ...")
	log.Println("Connecting to unix:///tmp/py_infer.sock ...")
	pyConn, err := grpc.Dial(
		"unix:///tmp/py_infer.sock",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
		grpc.WithKeepaliveParams(keepalive.ClientParameters{
			Time: 10 * time.Second, Timeout : 3 * time.Second, PermitWithoutStream : true,
		}),
	)
	log.Println("Go connection succeed : unix:///tmp/py_infer.sock!")

	if err != nil { log.Fatal(err) }
	defer pyConn.Close()
	
	pyClients := pb.NewPushPyClient(pyConn)

	lis, err := net.Listen("tcp", ":5000")
	if err != nil { log.Fatal(err) }

	s := grpc.NewServer(
		grpc.MaxRecvMsgSize(32 << 20), // 32MB
		grpc.MaxSendMsgSize(32 << 20), // 32MB
	)
	pb.RegisterPushGoServer(s, &BridgeServ{py : pyClients})
    log.Println("Go gRPC ingest listening on :50051; relaying to UDS /tmp/py_infer.sock")
	if err := s.Serve(lis); err != nil { log.Fatal(err) }

	// =========================================================
	// Quit
	// =========================================================
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	log.Println("[http] shutting down...")
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
}


