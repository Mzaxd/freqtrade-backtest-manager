#!/bin/bash

# Start the frontend application
echo "Starting frontend application..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo "Error: pnpm is not installed"
  exit 1
fi

# Install dependencies
pnpm install

# Start the frontend
pnpm run dev &

# Wait for the frontend to be ready
echo "Waiting for frontend to be ready..."

# Wait for the frontend to start on port 3000
while ! curl -s http://localhost:3000 >/dev/null; do
  sleep 1
done
echo "Frontend is ready"

# Start the worker service
echo "Starting worker service..."

# Check if the worker script exists
if [ ! -f src/workers/index.ts ]; then
  echo "Error: worker script not found"
  exit 1
fi

# Start the worker
pnpm run worker &

# Wait for the worker to be ready
echo "Waiting for worker to be ready..."

# Wait for the worker to start
sleep 5
echo "Worker is ready"

echo "All services are up and running!"