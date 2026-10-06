#!/bin/bash
echo "What is your name?"
if read -r name && [ -n "$name" ]; then
  echo "Hello, $name!"
else
  echo "No name given (type one in the Input tab)."
fi
