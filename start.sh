#!/usr/bin/env bash
set -e

# backend
cd server
npm install &>/dev/null
echo "[BACKEND] WebSocket server installed"
node server.js &>/dev/null &
BACK_PID=$!
cd ..

# frontend
echo "[FRONTEND] Starting static server on port 8080…"
npx http-server . -c-1 -p 8080 &>/dev/null &
FRONT_PID=$!

# ensure both are killed on exit
trap "kill $BACK_PID $FRONT_PID" EXIT

wait
