.PHONY: load

MAKEFLAGS += -j2

export

conns ?= 10
rampingduration ?= 10
consecutiveduration ?= 20
rampscount ?= 1
requests ?= 1
rand = $(shell bash -c 'echo $$RANDOM')
testrun ?= "random-run-$(rand)"

load:
	@RAMPING_DURATION=$(rampingduration) CONSECUTIVE_DURATION=$(consecutiveduration) RAMPS_COUNT=$(rampscount) \
		REQUESTS=$(requests) CONNS=$(conns) SHIFT=$(shift) TEST_RUN=$(testrun) ./k6 run load.js \
		--tag testrun=$(testrun) --tag system='postgrest' -o 'prometheus=namespace=k6'