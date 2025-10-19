#!/bin/bash

BASE_URL="http://localhost:8080/api"
ENCODED_CREDS="TODO"
COOKIE_FILE="/tmp/tafel-admin-cookie-$$.txt"
RESULT_FILE="/tmp/tafel-admin-results-$$.txt"
NUM_REQUESTS=${1:-100}

echo "=== Testing Concurrent Distribution Creation with Advisory Locks ==="
echo "    Sending ${NUM_REQUESTS} parallel requests"
echo ""

# Cleanup files on exit
trap "rm -f ${COOKIE_FILE} ${RESULT_FILE}" EXIT

# Login and get JWT cookie
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -c "${COOKIE_FILE}" -w "\nHTTP_CODE:%{http_code}" -X POST "${BASE_URL}/login" \
  -H "Authorization: Basic ${ENCODED_CREDS}" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

# Verify cookie exists
if [ ! -f "${COOKIE_FILE}" ] || ! grep -q "tafel-admin-jwt" "${COOKIE_FILE}"; then
  echo "ERROR: Cookie file not created or JWT cookie not found!"
  exit 1
fi

echo "   ✓ Login successful, JWT cookie saved"
echo ""

# Function to create distribution
create_distribution() {
  local request_id=$1
  local start_time=$(date +%s%3N)
  echo "   Request #${request_id} started at $(date +%H:%M:%S.%3N)"
  
  RESPONSE=$(curl -s -b "${COOKIE_FILE}" -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" -X POST "${BASE_URL}/distributions/new" \
    -H "Content-Type: application/json")
  
  local end_time=$(date +%s%3N)
  local elapsed=$((end_time - start_time))
  
  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  TIME_TOTAL=$(echo "$RESPONSE" | grep "TIME_TOTAL:" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d' | sed '/TIME_TOTAL:/d')
  
  echo "   Request #${request_id} finished at $(date +%H:%M:%S.%3N) - HTTP ${HTTP_CODE} - ${TIME_TOTAL}s (${elapsed}ms)"
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "   ✓ Request #${request_id}: SUCCESS"
    echo "SUCCESS" >> "${RESULT_FILE}"
  else
    # Extract error and message fields from JSON response
    ERROR=$(echo "$BODY" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    MESSAGE=$(echo "$BODY" | grep -o '"message":"[^"]*' | cut -d'"' -f4)
    
    if [ -n "$ERROR" ] || [ -n "$MESSAGE" ]; then
      echo "   ✗ Request #${request_id}: FAILED"
      [ -n "$ERROR" ] && echo "      error: ${ERROR}"
      [ -n "$MESSAGE" ] && echo "      message: ${MESSAGE}"
      # Store error message for summary
      [ -n "$MESSAGE" ] && echo "ERROR_MSG:${MESSAGE}" >> "${RESULT_FILE}"
    else
      echo "   ✗ Request #${request_id}: FAILED - ${BODY}"
      echo "ERROR_MSG:Unknown error" >> "${RESULT_FILE}"
    fi
    echo "FAILED" >> "${RESULT_FILE}"
  fi
  echo ""
}

# Send parallel requests
echo "2. Sending ${NUM_REQUESTS} parallel distribution creation requests..."
echo ""

for ((i=1; i<=NUM_REQUESTS; i++)); do
  create_distribution $i &
done

# Wait for all background jobs to complete
wait

# Count actual results
SUCCESS_COUNT=$(grep -c "SUCCESS" "${RESULT_FILE}" 2>/dev/null || echo 0)
FAILED_COUNT=$(grep -c "FAILED" "${RESULT_FILE}" 2>/dev/null || echo 0)
EXPECTED_FAILURES=$((NUM_REQUESTS - 1))

# Get distinct error messages with counts
DISTINCT_ERRORS=$(grep "ERROR_MSG:" "${RESULT_FILE}" 2>/dev/null | cut -d':' -f2- | sort | uniq -c | sort -rn)

echo "=== All requests completed ==="
echo ""
echo "Summary:"
echo "  ✓ Succeeded: ${SUCCESS_COUNT}"
echo "  ✗ Failed:    ${FAILED_COUNT}"

if [ -n "$DISTINCT_ERRORS" ]; then
  echo ""
  echo "Error messages:"
  while IFS= read -r line; do
    COUNT=$(echo "$line" | awk '{print $1}')
    MSG=$(echo "$line" | cut -d' ' -f2-)
    echo "  - [${COUNT}x] ${MSG}"
  done <<< "$DISTINCT_ERRORS"
fi

echo ""
echo "Expected behavior with advisory locks:"
echo "  - 1 request should succeed (HTTP 200)"
echo "  - ${EXPECTED_FAILURES} requests should fail (HTTP 400) with validation error about lock being held or distribution already started"
echo ""
