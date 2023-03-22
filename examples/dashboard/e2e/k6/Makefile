.PHONY: db_test

MAKEFLAGS += -j2

export

rate ?= 2
conns ?= 10
duration ?= 60
rooms ?= 2
rand = $(shell bash -c 'echo $$RANDOM')
testrun ?= "random-run-$(rand)"

dashboard:
	@echo "Running k6 test $(testrun)" && \
	DURATION=$(duration) ROOMS=$(rooms) CONNS=$(conns) TEST_RUN=$(testrun) \
		./k6 run loader.js --tag testrun=$(testrun) -o 'prometheus=namespace=k6'