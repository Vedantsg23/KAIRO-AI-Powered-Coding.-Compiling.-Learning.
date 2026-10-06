// Welcome to Go! Press Run (Ctrl+Enter) to compile and run this program.
package main

import "fmt"

func main() {
	scores := []int{72, 88, 95, 64, 81}
	total := 0
	for _, score := range scores {
		total += score
	}

	fmt.Println("Total:", total)
	fmt.Printf("Average: %.1f\n", float64(total)/float64(len(scores)))
}
