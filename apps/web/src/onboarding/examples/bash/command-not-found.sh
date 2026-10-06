#!/bin/bash
set -e                      # stop at the first command that fails
echo "Listing files..."
lss /tmp                    # typo: should be ls
echo "Done"
