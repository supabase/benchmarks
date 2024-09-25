.PHONY: db_test

MAKEFLAGS += -j2

export

rate ?= 2
conns ?= 8
shift ?= 0
duration ?= 60
rooms ?= 1
rand = $(shell bash -c 'echo $$RANDOM')
testrun ?= "random-run-$(rand)"

db_test: subs

subs:
	@DURATION=$(duration) RATE=$(rate) CONNS=$(conns) SHIFT=$(shift) ROOMS=$(rooms) TEST_RUN=$(testrun) \
		./k6 run subs.js --tag testrun=$(testrun) -o 'prometheus=namespace=k6'
