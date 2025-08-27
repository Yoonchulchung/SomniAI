package main 

import (
  "fmt"
  "net"
)

func main() {
  ln, err := net.Listen("tcp", ":1999")
    if err != nil {
        fmt.Println("error", err)
        return
}

    fmt.Println("server start, Waiting..")

    for {
        connect, err := ln.Accept()
        if err != nil {
            fmt.Println("error", err)
            continue
        }

        fmt.Fprintln(connect, "hello")
        connect.Close()
    }
}
