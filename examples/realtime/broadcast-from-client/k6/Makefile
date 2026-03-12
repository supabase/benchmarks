.PHONY: db_test

MAKEFLAGS += -j2

export

conns ?= 8
shift ?= 0
duration ?= 60
messages_per_second ?= 60
message_size_kb ?= 1
rand = $(shell bash -c 'echo $$RANDOM')
testrun ?= "random-run-$(rand)"

db_test: subs

subs:
	@DURATION=$(duration) CONNS=$(conns) SHIFT=$(shift) MESSAGES_PER_SECOND=$(messages_per_second) MESSAGE_SIZE_KB=$(message_size_kb) PRESENCE_ENABLED=$${PRESENCE_ENABLED:-false} TEST_RUN=$(testrun) \
		./k6 run subs.js --tag testrun=$(testrun) -o 'prometheus=namespace=k6'
