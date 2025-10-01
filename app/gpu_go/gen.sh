protoc --go_out=. --go-grpc_out=. *.proto
python -m grpc_tools.protoc -I./proto --python_out=. --grpc_python_out=. proto/bridge.proto