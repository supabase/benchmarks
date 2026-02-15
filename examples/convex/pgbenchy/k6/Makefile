.PHONY: tpcb tpcb-info

MAKEFLAGS += -j2

# Existing configuration
rate ?= 2
duration ?= 60
rand = $(shell bash -c 'echo $$RANDOM')
testrun ?= "random-run-$(rand)"

# TPC-B configuration
SCALE_FACTOR ?= 10
CONNS ?= 10
REQUESTS ?= 10
RAMPING_DURATION ?= 10
CONSECUTIVE_DURATION ?= 20
RAMPS_COUNT ?= 1

tpcb-info:
	@echo "========================================="
	@echo "TPC-B Benchmark Runner"
	@echo "========================================="
	@echo "Configuration:"
	@echo "  CONVEX_URL: $(CONVEX_URL)"
	@echo "  SCALE_FACTOR: $(SCALE_FACTOR)"
	@echo "  CONNS: $(CONNS)"
	@echo "  REQUESTS: $(REQUESTS)"
	@echo "  RAMPING_DURATION: $(RAMPING_DURATION)s"
	@echo "  CONSECUTIVE_DURATION: $(CONSECUTIVE_DURATION)s"
	@echo "  RAMPS_COUNT: $(RAMPS_COUNT)"
	@echo "  TEST_RUN: $(testrun)"
	@echo "========================================="
	@echo ""

tpcb: tpcb-info
	@if [ -z "$(CONVEX_URL)" ]; then \
		echo "Error: CONVEX_URL environment variable is not set"; \
		echo "Please set it to your Convex deployment URL"; \
		exit 1; \
	fi
	@./k6 run \
		--out json=results_$(testrun).json \
		-e CONVEX_URL="$(CONVEX_URL)" \
		-e SCALE_FACTOR="$(SCALE_FACTOR)" \
		-e CONNS="$(CONNS)" \
		-e REQUESTS="$(REQUESTS)" \
		-e RAMPING_DURATION="$(RAMPING_DURATION)" \
		-e CONSECUTIVE_DURATION="$(CONSECUTIVE_DURATION)" \
		-e RAMPS_COUNT="$(RAMPS_COUNT)" \
		-e TEST_RUN="$(testrun)" \
		-o 'prometheus=namespace=k6' \
		tpcb-convex.js
	@echo ""
	@echo "========================================="
	@echo "Benchmark complete!"
	@echo "Results saved to: results_$(testrun).json"
	@echo "Summary saved to: summary.json"
	@echo "========================================="
