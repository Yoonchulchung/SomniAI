package main

import (
	"log"
	"net"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
    "google.golang.org/grpc/keepalive"

	pb "somniai.com/grpc/proto"
)

type BridgeServ struct {
	pb.UnimplementedPushGoServer
	py pb.PushPyClient
}

func (s *BridgeServ) StreamToGo(stream pb.PushGo_StreamToGoServer) error {
	ctx := stream.Context()

	pyStream, err := s.py.StreamToPy(ctx)
	if err != nil {return err}
	defer func() {
		_, _ = pyStream.CloseAndRecv()
	}()

	for {
		frame, err := stream.Recv()
		if err != nil {
			return err
		}
		if err := pyStream.Send(frame) ; err != nil {
			return err
		}
	}
}

func main() {

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
}