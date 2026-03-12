#!/bin/bash

wget https://golang.org/dl/go1.22.4.linux-amd64.tar.gz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.22.4.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

go install go.k6.io/xk6@latest

export K6_VERSION='v1.3.0'

~/go/bin/xk6 build --output /tmp/k6/k6 \
  --with github.com/szkiba/xk6-prometheus@0f8e5dd \
  --with github.com/grafana/xk6-sql@659485a

telegraf --config telegraf.conf &>/dev/null &

cd /tmp/k6 || exit 1

export RUN_ID="${testrun_id}"
export BENCHMARK_ID="${benchmark_id}"
export TEST_RUN="${testrun_name}"
export TEST_ORIGIN="${test_origin}"
export SUPABENCH_TOKEN="${supabench_token}"
export SUPABENCH_URI="${supabench_uri}"
export PG_PASS="${pg_pass}"
export PG_HOST="${pg_host}"
export MP_TOKEN="${mp_token}"
export MP_URI="${mp_uri}"
export AUTH_URI="${auth_uri}"
export INSTANCES="${instances}"
export PRESENCE_ENABLED="${presence_enabled ? "true" : "false"}"

make ${make_command} \
  conns="${conns}" duration="${duration}" shift="${shift}" \
  messages_per_second="${messages_per_second}" message_size_kb="${message_size_kb}" \
  testrun="${testrun_name}"
