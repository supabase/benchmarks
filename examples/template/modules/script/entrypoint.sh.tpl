#!/bin/bash

# update golang and make sure go is in path
wget https://golang.org/dl/go1.19.linux-amd64.tar.gz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.19.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# build k6 with xk6 plugins, you may add some extra plugins here if needed
export K6_VERSION='v0.37.0'
~/go/bin/xk6 build --output /tmp/k6/k6 \
  --with github.com/jdheyburn/xk6-prometheus@v0.1.6 \
  --with github.com/grafana/xk6-sql@659485a

# run telegraf to collect metrics from k6 and host and push them to prometheus
telegraf --config telegraf.conf &>/dev/null &

# go to k6 dir and run k6
cd /tmp/k6 || exit 1

# leave these as is. Supabench will pass it and it is needed to upload the report.
export RUN_ID="${testrun_id}"
export BENCHMARK_ID="${benchmark_id}"
export TEST_RUN="${testrun_name}"
export TEST_ORIGIN="${test_origin}"
export SUPABENCH_TOKEN="${supabench_token}"
export SUPABENCH_URI="${supabench_uri}"

# this is the place to add your variables, required by benchmark.
export SOME_VAR="${some_var}"
export SUT_TOKEN="${sut_token}"
export SUT_URL="${sut_url}"

# make command from the k6 folder to run k6 benchmark, you can add some extra vars here if needed
# Leave testrun_name as it is passed to k6 command to add global tag to all metrics for grafana!
make run \
  duration="${duration}" \
  testrun="${testrun_name}"