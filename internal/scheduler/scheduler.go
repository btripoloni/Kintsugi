package scheduler

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"btripoloni.mod-manager/internal/spec"
	"btripoloni.mod-manager/internal/store"
)

type Node struct {
	Step     spec.Step
	InDegree int
	Next     []string // IDs of steps that depend on this one
}

type result struct {
	StepID string
	Err    error
}

type Scheduler struct {
	nodes        map[string]*Node
	pendingCount int
	store        *store.Manager

	// Queues
	netQueue  chan spec.Step
	compQueue chan spec.Step
	results   chan result
}

func New(s *spec.Spec, sm *store.Manager, dbPath interface{}) (*Scheduler, error) {
	sched := &Scheduler{
		nodes:     make(map[string]*Node),
		store:     sm,
		netQueue:  make(chan spec.Step, 1),   // Serial Network
		compQueue: make(chan spec.Step, 100), // Buffered Compute
		results:   make(chan result, 100),
	}

	// 1. Initialize nodes
	for _, step := range s.Steps {
		sched.nodes[step.ID] = &Node{
			Step: step,
			Next: []string{},
		}
	}

	// 2. Build Edges and Calculate In-Degree
	for _, step := range s.Steps {
		node := sched.nodes[step.ID]
		sched.pendingCount++ // All steps start as pending

		for _, depID := range step.UseStep {
			depNode, ok := sched.nodes[depID]
			if !ok {
				return nil, fmt.Errorf("step %s depends on unknown step %s", step.ID, depID)
			}
			// Edge: depNode -> node
			depNode.Next = append(depNode.Next, step.ID)
			node.InDegree++
		}
	}

	// 3. Detect Cycles (Kahn's Algorithm check)
	if hasCycle(sched) {
		return nil, fmt.Errorf("cyclic dependency detected")
	}

	return sched, nil
}

// Run executes the build plan.
func (s *Scheduler) Run(ctx context.Context, executor func(spec.Step) error) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	var wg sync.WaitGroup

	// Network Worker (Serial)
	wg.Add(1)
	go func() {
		defer wg.Done()
		for step := range s.netQueue {
			select {
			case <-ctx.Done():
				return
			default:
				// Optional: Add small delay or check ctx again?
				err := executor(step)
				select {
				case s.results <- result{StepID: step.ID, Err: err}:
				case <-ctx.Done():
				}
			}
		}
	}()

	// Compute Workers (Parallel)
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for step := range s.compQueue {
				select {
				case <-ctx.Done():
					return
				default:
					time.Sleep(10 * time.Millisecond) // Simulate minimal work/context switch
					err := executor(step)
					select {
					case s.results <- result{StepID: step.ID, Err: err}:
					case <-ctx.Done():
					}
				}
			}
		}()
	}

	// Initial Dispatch
	s.dispatchReady()

	// Event Loop
	var finalErr error
	for s.pendingCount > 0 {
		select {
		case res := <-s.results:
			if res.Err != nil {
				finalErr = res.Err
				cancel()
				goto Shutdown
			}

			// Task Success: Update Graph
			s.pendingCount--
			node := s.nodes[res.StepID]
			
			// Unlock dependents
			for _, nextID := range node.Next {
				nextNode := s.nodes[nextID]
				nextNode.InDegree--
				if nextNode.InDegree == 0 {
					s.dispatchStep(nextNode.Step)
				}
			}

		case <-ctx.Done():
			finalErr = ctx.Err()
			goto Shutdown
		}
	}

Shutdown:
	close(s.netQueue)
	close(s.compQueue)
	wg.Wait()
	return finalErr
}

func (s *Scheduler) dispatchReady() {
	for _, node := range s.nodes {
		if node.InDegree == 0 {
			s.dispatchStep(node.Step)
		}
	}
}

func (s *Scheduler) dispatchStep(step spec.Step) {
	// Prevent re-dispatching
	s.nodes[step.ID].InDegree = -1

	if strings.HasPrefix(step.Op, "fetch_") {
		s.netQueue <- step
	} else {
		s.compQueue <- step
	}
}

func (s *Scheduler) GetReadySteps() []spec.Step {
	// Only for testing inspection
	var ready []spec.Step
	for _, node := range s.nodes {
		if node.InDegree == 0 {
			ready = append(ready, node.Step)
		}
	}
	return ready
}

// hasCycle performs a topological sort simulation to detect cycles
func hasCycle(s *Scheduler) bool {
	tempInDegree := make(map[string]int)
	var queue []string

	for id, node := range s.nodes {
		tempInDegree[id] = node.InDegree
		if node.InDegree == 0 {
			queue = append(queue, id)
		}
	}

	processedCount := 0
	for len(queue) > 0 {
		currentID := queue[0]
		queue = queue[1:]
		processedCount++

		node := s.nodes[currentID]
		for _, nextID := range node.Next {
			tempInDegree[nextID]--
			if tempInDegree[nextID] == 0 {
				queue = append(queue, nextID)
			}
		}
	}

	return processedCount != len(s.nodes)
}
