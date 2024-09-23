.PHONY: db_test

MAKEFLAGS += -j2

export

conns ?= 1
rampingduration ?= 5
consecutiveduration ?= 60
requests ?= 1
chunksize ?= 5
rand = $(shell bash -c 'echo $$RANDOM')
testrun ?= "random-run-$(rand)"

load:
	@RAMPING_DURATION=$(rampingduration) CONSECUTIVE_DURATION=$(consecutiveduration) \
		REQUESTS=$(requests) CONNS=$(conns) CHUNK_SIZE_MB=$(chunksize) TEST_RUN=$(testrun) ./k6 run load.js \
		--tag testrun=$(testrun) --tag system='storage_api' -o 'prometheus=namespace=k6'
