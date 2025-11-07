#!/bin/bash

wget https://golang.org/dl/go1.19.linux-amd64.tar.gz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.19.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

export K6_VERSION='v0.37.0'

~/go/bin/xk6 build --output /tmp/k6/k6 \
  --with github.com/jdheyburn/xk6-prometheus@v0.1.6 \
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
  rate="${rate}" conns="${conns}" duration="${duration}" rooms="${rooms}" shift="${shift}" \
  messages_per_second="${messages_per_second}" message_size_kb="${message_size_kb}" \
  testrun="${testrun_name}"
