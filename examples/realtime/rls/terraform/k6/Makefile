.PHONY: db_test

MAKEFLAGS += -j2

export

rate ?= 2
conns ?= 8
duration ?= 60
rooms ?= 1
rand = $(shell bash -c 'echo $$RANDOM')
testrun ?= "random-run-$(rand)"

db_test: subs load

subs:
	@DURATION=$(duration) ROOMS=$(rooms) CONNS=$(conns) TEST_RUN=$(testrun) \
		./k6 run subs.js --tag testrun=$(testrun) -o 'prometheus=namespace=k6'

load:
	RATE=$(rate) DURATION=$(duration) ./k6 run loader.js