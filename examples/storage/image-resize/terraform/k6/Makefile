.PHONY: db_test

MAKEFLAGS += -j2

export

conns ?= 2
rampingduration ?= 60
consecutiveduration ?= 60
batchduration ?= 60
requests ?= 1
batchsize ?= 20
startfrom ?= 0
rand = $(shell bash -c 'echo $$RANDOM')
testrun ?= "random-run-$(rand)"

load:
	@RAMPING_DURATION=$(rampingduration) CONSECUTIVE_DURATION=$(consecutiveduration) BATCH_DURATION=$(batchduration) \
		REQUESTS=$(requests) START_FROM=$(startfrom) BATCH_SIZE=$(batchsize) CONNS=$(conns) TEST_RUN=$(testrun) ./k6 run load.js \
		--tag testrun=$(testrun) --tag system='image_proxy' -o 'prometheus=namespace=k6'