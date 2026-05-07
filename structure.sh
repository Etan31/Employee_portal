#!/bin/bash

echo "--- Project Structure ---"
find . -maxdepth 4 \
    -not -path '*/node_modules*' \
    -not -path '*/.agents*' \
    -not -path '*/.vscode*' \
    -not -path '*/.git*'
echo "--- End of List ---"