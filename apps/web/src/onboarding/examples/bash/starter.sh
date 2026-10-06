#!/bin/bash
# Welcome to Bash! Press Run (Ctrl+Enter) to check and run this script.

scores=(72 88 95 64 81)
total=0
for score in "${scores[@]}"; do
  total=$((total + score))
done

echo "Total: $total"
echo "Average: $((total / ${#scores[@]}))"
