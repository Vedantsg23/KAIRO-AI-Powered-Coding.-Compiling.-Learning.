package main

import "fmt"

func main() {
	var name string
	fmt.Println("What is your name?")
	if _, err := fmt.Scanln(&name); err != nil {
		fmt.Println("No name given (type one in the Input tab).")
		return
	}
	fmt.Printf("Hello, %s!\n", name)
}
