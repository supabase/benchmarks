.PHONY: db_test

MAKEFLAGS += -j2

export


duration ?= 600
# add other variables here for example vus count, etc.:
# vus ?= 100

rand = $(shell bash -c 'echo $$RANDOM')
testrun ?= "random-run-$(rand)"

run: load

# you can add few envs that will be available in the benchmark script
# like so also:
# 
# @DURATION=$(duration) TEST_RUN=$(testrun) \
#   VUS_COUNT=$(vus) \
#   ./k6 run load.js --tag testrun=$(testrun) -o 'prometheus=namespace=k6'
# 
# `--tag testrun=$(testrun) -o 'prometheus=namespace=k6'` these are required 
# to send metrics to prometheus correctly
load:
	@DURATION=$(duration) TEST_RUN=$(testrun) \
		./k6 run load.js --tag testrun=$(testrun) -o 'prometheus=namespace=k6'