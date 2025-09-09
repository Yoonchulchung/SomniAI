package queue

import (
	"context"
	"sync"
)

type Ring struct {
	head     int
	tail     int
	capacity int
	items    []string
	mu       sync.Mutex
	notFull  *sync.Cond
	notEmpty *sync.Cond
}

func NewRing(capacity int) *Ring {
	r := &Ring{
		items:    make([]string, capacity),
		capacity: capacity,
	}
	r.notFull = sync.NewCond(&r.mu)
	r.notEmpty = sync.NewCond(&r.mu)
	return r
}

func (r *Ring) Enqueue(ctx context.Context, item string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for (r.tail+1)%r.capacity == r.head {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			r.notFull.Wait()
		}
	}

	r.items[r.tail] = item
	r.tail = (r.tail + 1) % r.capacity
	r.notEmpty.Signal()
	return nil
}

func (r *Ring) Dequeue(ctx context.Context) (string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for r.head == r.tail {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		default:
			r.notEmpty.Wait()
		}
	}

	item := r.items[r.head]
	r.head = (r.head + 1) % r.capacity
	r.notFull.Signal()
	return item, nil
}
