import { check, sleep, group } from 'k6'
import { vu, scenario } from 'k6/execution'
import { Rate, Trend, Counter } from 'k6/metrics'
import sql from 'k6/x/sql'
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.3.0/index.js'

import { scenario as sc, trends } from './common.js'
export { handleSummary } from './summary.js'

const pgConnectionStringsRaw = __ENV.BASE_URI
  ? __ENV.BASE_URI
  : `['postgres://postgres_user:postgres_pass@$postgres_host:6543/postgres?sslmode=disable']`

const conns = __ENV.CONNS ? parseInt(__ENV.CONNS) : 10
let requests = __ENV.REQUESTS ? parseFloat(__ENV.REQUESTS) : 1
const rampingDuration = __ENV.RAMPING_DURATION
  ? parseInt(__ENV.RAMPING_DURATION)
  : 20
const consecutiveDuration = __ENV.CONSECUTIVE_DURATION
  ? parseInt(__ENV.CONSECUTIVE_DURATION)
  : 40
const ramps = __ENV.RAMPS_COUNT ? parseInt(__ENV.RAMPS_COUNT) : 10
const testRun = __ENV.TEST_RUN ? __ENV.TEST_RUN : 'default'

const myFailRate = new Rate('failed_requests')
const counterQueries = new Counter('queries')
const counterFailed = new Counter('failed')
const queryTrend = new Trend('query_trend', true)

const to = {
  failed_requests: ['rate<0.1'],
  query_trend: ['p(95)<1000'],
}

export const options = {
  vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    supavisor_select: sc(rampingDuration, consecutiveDuration, ramps, conns),
  },
}

// const pgConnectionStrings = JSON.parse(pgConnectionStringsRaw)
const pgConnectionStrings = JSON.parse(
  '["postgresql://postgres._tenant_:_password_@_address_:7654/postgres?sslmode=disable","postgresql://postgres._tenant_:_password_@_address2_:7654/postgres?sslmode=disable"]'
)

let timeslot = 1000
if (requests < 1 && requests >= 0.1) {
  timeslot = 1000 * 10
  requests = 10 * requests
} else if (requests < 0.1 && requests >= 0.01) {
  timeslot = 1000 * 100
  requests = 100 * requests
} else {
  requests = __ENV.REQUESTS ? parseInt(__ENV.REQUESTS) : 1
}

export default () => {
  const pgConnectionString =
    pgConnectionStrings[randomIntBetween(0, pgConnectionStrings.length - 1)]
  try {
    if (scenario.progress >= 0.98) {
      sleep(10)
      return
    }

    const db = sql.open('postgres', pgConnectionString)
    while (scenario.progress < 0.95) {
      const start = new Date()
      for (let i = 1; i <= requests; i++) {
        const exStart = new Date()
        try {
          db.exec(
            "select * from (values (1, 'one'), (2, 'two'), (3, 'three')) as t (num,letter);"
          )
          myFailRate.add(false)
        } catch (e) {
          console.log(e)
          myFailRate.add(true)
          counterFailed.add(1)
        }
        const exFinish = new Date()
        counterQueries.add(1)
        queryTrend.add(exFinish - exStart)

        const finish = new Date()
        if (finish - start > timeslot) {
          break
        }
        sleep(
          (timeslot - (finish - start)) /
            1000 /
            (requests + randomIntBetween(0, requests))
        )
      }
      const finish = new Date()
      if (finish - start < timeslot) {
        sleep((timeslot - (finish - start)) / 1000)
      }
    }
  } finally {
    db.close()
  }
}

export function teardown(data) {
  // db.exec("delete from public.positions where title='Load Tester'")
  // db.close()
}
