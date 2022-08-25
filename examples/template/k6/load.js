// some k6 related imports
import http from 'k6/http'
import { check } from 'k6'
import { Trend, Counter } from 'k6/metrics'

// you can use some common things for k6
// 'scenario' provides you the load scenario with ramping-vus executor and 2 periods of const load
// 'trends' is just a set of useful trends to be used in summary result like p95, med, p0.01
import { scenario, trends } from './common.js'

// export handleSummary from sumary.js to upload the report to Supabench
export { handleSummary } from './summary.js'

// you may access the environment variables specified in entrypoint.sh.tpl with __ENV.VAR_NAME
const token = __ENV.SUT_TOKEN
const uri = __ENV.SUT_URL ? __ENV.SUT_URL : 'https://example.com'

// I recommend you to not remove this variable. So you will be able to tweak test duration.
const baseDuration = __ENV.DURATION ? __ENV.DURATION : 60
const duration = parseInt(baseDuration) + 15

// you may access the environment variables specified in make as well
const conns = __ENV.VUS_COUNT

// k6 provides a lot of default metrics (https://k6.io/docs/using-k6/metrics/)
// But you may specify custom metrics like so if needed:
//
// const latencyTrend = new Trend('latency_trend')
// const counterReceived = new Counter('received_updates')

// specifying thresholds for the benchmark
const to = {}

// create options with 'scenario', 'trends' and 'to'
export const options = {
  vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    replication: scenario(duration, conns),
  },
}

// add virtual user scenario for the benchmark
export default () => {
  http.get(uri, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}
