<div align='center'>
    <h1> SomniAI AI Server </h1>
</div>

We built an AI server using **Go** (gRPC server) and **Python** (FastAPI) to enable high-performance streaming.  
Due to the Python GIL, we believe it is challenging to build a highly parallel computing server purely in Python.  
Our goal was to handle a streaming workload of **60 FPS** coming from our MoJI Android application.  

To achieve this, we decided to separate the streaming server (Go) from the AI server (FastAPI in Python).  
Since both the Go and FastAPI servers run in the same physical location, we use **UDS (Unix Domain Socket)** for inter-process communication, eliminating the TCP overhead.

### Server Architecture
Go (gRPC Server) → Python (FastAPI)
