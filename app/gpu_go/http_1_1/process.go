package http_1_1

import (
	"encoding/json"
	"runtime"
	"net/http"
	"time"
	"strings"
	"log"
	"context"

)

type Res_HTTP_1_1 struct {
	svc UserService
    log Logger
	ctx    context.Context
	cancel context.CancelFunc
}

type Logger interface {
	Printf(format string, args ...any)
	Println(args ...any)
}

type UserService interface{}

type stdLogger struct{}
func (l stdLogger) Printf(f string, a ...any) { log.Printf(f, a...) }
func (l stdLogger) Println(a ...any)          { log.Println(a...) }

func NewResponder(svc UserService, log Logger) *Res_HTTP_1_1 {
	if log == nil {
		log = stdLogger{}
	}
	ctx, cancel := context.WithCancel(context.Background())

	r := &Res_HTTP_1_1{
		svc:    svc,
		log:    log,
		ctx:    ctx,
		cancel: cancel,
	}
	return r
}

func (r *Res_HTTP_1_1) Close() { 
	if r.cancel != nil {
		r.cancel()
	}
}

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ts := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("[access] %s %s %s", r.Method, r.URL.Path, time.Since(ts))
	})
}

// ==========================================================================================
// STATUS
// ==========================================================================================
type statusResp struct {
	ServerOS     string `json:"server_os"`
	ServerTime   string `json:"server_time"`
	ClientMethod string `json:"client_method"`
}

func clientIP(remoteAddr string) string {
	// "IP:port" → "IP"
	if i := strings.LastIndex(remoteAddr, ":"); i != -1 {
		return remoteAddr[:i]
	}
	return remoteAddr
}

func (req *Res_HTTP_1_1) Res_Status ( w http.ResponseWriter, r *http.Request) {
	remoteIP := clientIP(r.RemoteAddr)
	ua := r.UserAgent()
	req.log.Printf("[status] %s %s | remote=%s ua=%q", r.Method, r.URL.Path, remoteIP, ua)

	w.Header().Set("Content-Type", "application/json")
	resp := statusResp{
		ServerOS:     runtime.GOOS + "/" + runtime.GOARCH,
		ServerTime:   time.Now().Format(time.RFC3339Nano),
		ClientMethod: r.Method,
	}
	_ = json.NewEncoder(w).Encode(resp)
}

// ==========================================================================================
// UPLOAD
// ==========================================================================================
func (req *Res_HTTP_1_1) Res_Upload ( w http.ResponseWriter, r *http.Request) {
	
}