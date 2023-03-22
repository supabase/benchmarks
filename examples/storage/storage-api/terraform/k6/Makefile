.PHONY: db_test

MAKEFLAGS += -j2

export

conns ?= 20
rampingduration ?= 20
consecutiveduration ?= 40
rampscount ?= 5
requests ?= 10
rand = $(shell bash -c 'echo $$RANDOM')
testrun ?= "random-run-$(rand)"

load:
	@RAMPING_DURATION=$(rampingduration) CONSECUTIVE_DURATION=$(consecutiveduration) RAMPS_COUNT=$(rampscount) \
		REQUESTS=$(requests) CONNS=$(conns) TEST_RUN=$(testrun) ./k6 run load.js \
		--tag testrun=$(testrun) --tag system='storage_api' -o 'prometheus=namespace=k6'