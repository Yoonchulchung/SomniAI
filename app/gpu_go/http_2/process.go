package http_2

import(
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
    "google.golang.org/grpc/keepalive"

	pb "github.com/somniai/app/go/http_2/proto"
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