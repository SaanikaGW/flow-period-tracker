#!/bin/bash
echo "Starting Flow — Period Tracker & Tutor"

# Backend
cd backend
export $(cat .env | xargs)
python3.11 -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Backend running at http://localhost:8000"
echo "Frontend running at http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
