#!/bin/bash
# run.sh - Full benchmark runner for TPC-B

set -e

# Default configuration
SCALE_FACTOR=${SCALE_FACTOR:-10}
CONNS=${CONNS:-10}
REQUESTS=${REQUESTS:-10}
RAMPING_DURATION=${RAMPING_DURATION:-10}
CONSECUTIVE_DURATION=${CONSECUTIVE_DURATION:-20}
RAMPS_COUNT=${RAMPS_COUNT:-1}
TEST_RUN=${TEST_RUN:-$(date +%Y%m%d_%H%M%S)}

# Check if CONVEX_URL is set
if [ -z "$CONVEX_URL" ]; then
  echo "Error: CONVEX_URL environment variable is not set"
  echo "Please set it to your Convex deployment URL"
  exit 1
fi

echo "========================================="
echo "TPC-B Benchmark Runner"
echo "========================================="
echo "Configuration:"
echo "  CONVEX_URL: $CONVEX_URL"
echo "  SCALE_FACTOR: $SCALE_FACTOR"
echo "  CONNS: $CONNS"
echo "  REQUESTS: $REQUESTS"
echo "  RAMPING_DURATION: ${RAMPING_DURATION}s"
echo "  CONSECUTIVE_DURATION: ${CONSECUTIVE_DURATION}s"
echo "  RAMPS_COUNT: $RAMPS_COUNT"
echo "  TEST_RUN: $TEST_RUN"
echo "========================================="
echo ""

# Run k6 test
./k6w run \
  --out json=results_${TEST_RUN}.json \
  -e CONVEX_URL="$CONVEX_URL" \
  -e SCALE_FACTOR="$SCALE_FACTOR" \
  -e CONNS="$CONNS" \
  -e REQUESTS="$REQUESTS" \
  -e RAMPING_DURATION="$RAMPING_DURATION" \
  -e CONSECUTIVE_DURATION="$CONSECUTIVE_DURATION" \
  -e RAMPS_COUNT="$RAMPS_COUNT" \
  -e TEST_RUN="$TEST_RUN" \
  k6/tpcb-convex.js

echo ""
echo "========================================="
echo "Benchmark complete!"
echo "Results saved to: results_${TEST_RUN}.json"
echo "Summary saved to: summary.json"
echo "========================================="
