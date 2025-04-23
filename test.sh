#!/bin/bash

# Test script for Help Desk SaaS application

echo "Starting Help Desk SaaS application tests..."

# Navigate to project directory
cd /home/ubuntu/helpdesk-saas

# Start the server in the background
echo "Starting server..."
cd server
node server.js > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 5
echo "Server started with PID: $SERVER_PID"

# Start the client in the background
echo "Starting client..."
cd ../client
pnpm run dev > client.log 2>&1 &
CLIENT_PID=$!

# Wait for client to start
sleep 10
echo "Client started with PID: $CLIENT_PID"

# Run tests
echo "Running tests..."

# Test 1: Check if server is running
echo "Test 1: Checking if server is running..."
curl -s http://localhost:5000 > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Server is running"
else
  echo "❌ Server is not running"
fi

# Test 2: Check if client is running
echo "Test 2: Checking if client is running..."
curl -s http://localhost:3000 > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Client is running"
else
  echo "❌ Client is not running"
fi

# Test 3: Test user registration API
echo "Test 3: Testing user registration API..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User","organizationName":"Test Org"}')

if [[ $REGISTER_RESPONSE == *"token"* ]]; then
  echo "✅ User registration API working"
  # Extract token for further tests
  TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')
else
  echo "❌ User registration API failed"
  TOKEN=""
fi

# Test 4: Test authentication with the token
if [ ! -z "$TOKEN" ]; then
  echo "Test 4: Testing authentication with token..."
  AUTH_RESPONSE=$(curl -s -X GET http://localhost:5000/api/auth/me \
    -H "x-auth-token: $TOKEN")
  
  if [[ $AUTH_RESPONSE == *"email"* ]]; then
    echo "✅ Authentication working"
  else
    echo "❌ Authentication failed"
  fi
else
  echo "Skipping authentication test due to missing token"
fi

# Test 5: Test ticket creation API
if [ ! -z "$TOKEN" ]; then
  echo "Test 5: Testing ticket creation API..."
  TICKET_RESPONSE=$(curl -s -X POST http://localhost:5000/api/tickets \
    -H "Content-Type: application/json" \
    -H "x-auth-token: $TOKEN" \
    -d '{"title":"Test Ticket","description":"This is a test ticket","category":"Test","priority":"medium"}')
  
  if [[ $TICKET_RESPONSE == *"title"* ]]; then
    echo "✅ Ticket creation API working"
    # Extract ticket ID for further tests
    TICKET_ID=$(echo $TICKET_RESPONSE | grep -o '"_id":"[^"]*' | sed 's/"_id":"//')
  else
    echo "❌ Ticket creation API failed"
    TICKET_ID=""
  fi
else
  echo "Skipping ticket creation test due to missing token"
fi

# Test 6: Test ticket retrieval API
if [ ! -z "$TOKEN" ] && [ ! -z "$TICKET_ID" ]; then
  echo "Test 6: Testing ticket retrieval API..."
  TICKET_GET_RESPONSE=$(curl -s -X GET http://localhost:5000/api/tickets/$TICKET_ID \
    -H "x-auth-token: $TOKEN")
  
  if [[ $TICKET_GET_RESPONSE == *"title"* ]]; then
    echo "✅ Ticket retrieval API working"
  else
    echo "❌ Ticket retrieval API failed"
  fi
else
  echo "Skipping ticket retrieval test due to missing token or ticket ID"
fi

# Test 7: Test ticket response API
if [ ! -z "$TOKEN" ] && [ ! -z "$TICKET_ID" ]; then
  echo "Test 7: Testing ticket response API..."
  RESPONSE_RESPONSE=$(curl -s -X POST http://localhost:5000/api/tickets/$TICKET_ID/responses \
    -H "Content-Type: application/json" \
    -H "x-auth-token: $TOKEN" \
    -d '{"content":"This is a test response"}')
  
  if [[ $RESPONSE_RESPONSE == *"content"* ]]; then
    echo "✅ Ticket response API working"
  else
    echo "❌ Ticket response API failed"
  fi
else
  echo "Skipping ticket response test due to missing token or ticket ID"
fi

# Test 8: Test pricing plans API
if [ ! -z "$TOKEN" ]; then
  echo "Test 8: Testing pricing plans API..."
  PLANS_RESPONSE=$(curl -s -X GET http://localhost:5000/api/subscriptions/plans \
    -H "x-auth-token: $TOKEN")
  
  if [[ $PLANS_RESPONSE == *"["* ]]; then
    echo "✅ Pricing plans API working"
  else
    echo "❌ Pricing plans API failed"
  fi
else
  echo "Skipping pricing plans test due to missing token"
fi

# Clean up
echo "Cleaning up..."
kill $SERVER_PID
kill $CLIENT_PID

echo "Tests completed!"
