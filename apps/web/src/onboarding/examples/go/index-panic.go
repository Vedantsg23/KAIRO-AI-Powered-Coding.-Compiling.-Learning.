package main

import "fmt"

func main() {
	marks := []int{70, 85, 90}
	for i := 0; i <= len(marks); i++ { // should be i < len(marks)
		fmt.Println(marks[i])
	}
}
