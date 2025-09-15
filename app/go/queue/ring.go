package queue

import (
	
	"errors"
	"sync"
)


var ErrQueueEmpty = errors.New("queue is empty")


type QueueItem struct {
	Predict string
	ID      int64
}


type Ring struct {
	data []QueueItem
	head int
	tail int
	size int
	cap  int
	mu   sync.Mutex
}


func New(capacity int) *Ring {
	if capacity <= 0 {
		capacity = 1
	}
	q := &Ring{
		data: make([]QueueItem, capacity),
		cap:  capacity,
	}
	return q
}


func (r *Ring) Enqueue(item QueueItem) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.size == r.cap {
		
		return errors.New("queue is full")
	}

	r.data[r.tail] = item
	r.tail = (r.tail + 1) % r.cap
	r.size++
	return nil
}


func (r *Ring) Dequeue() (QueueItem, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.size == 0 {
		return QueueItem{}, ErrQueueEmpty
	}

	item := r.data[r.head]
	r.head = (r.head + 1) % r.cap
	r.size--
	return item, nil
}
