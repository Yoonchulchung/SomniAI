package queue

import (
  "context"
  "sync"
)

type Ring struct {
	head     int
	tail     int
	size     int
  data     []string
	capacity int
	mu       sync.Mutex
	notFull  *sync.Cond
	notEmpty *sync.Cond
}

func New(capacity int) *Ring {
	r := &Ring{
		data:     make([]string, capacity),
		capacity: capacity,
	}
	r.notFull = sync.NewCond(&r.mu)
	r.notEmpty = sync.NewCond(&r.mu)
	return r
}
// ENQUEUE 함수
func (r *Ring) Enqueue(ctx context.Context, item string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for r.size == r.capacity {
		wait := make(chan struct{})
		go func() {
			r.notFull.Wait()
			close(wait)
		}()

		select {
		case <-wait:
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	r.data[r.tail] = item
	r.tail = (r.tail + 1) % r.capacity
	r.size++
	r.notEmpty.Signal()
	return nil
}
// DEQUEUE 함수
func (r *Ring) Dequeue(ctx context.Context) (string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for r.size == 0 {
		wait := make(chan struct{})
		go func() {
			r.notEmpty.Wait()
			close(wait)
		}()

		select {
		case <-wait:
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}

	item := r.data[r.head]
	r.head = (r.head + 1) % r.capacity
	r.size--
	r.notFull.Signal()
	return item, nil
}
