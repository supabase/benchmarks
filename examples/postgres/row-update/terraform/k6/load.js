import { check, sleep, group } from 'k6'
import { vu, scenario } from 'k6/execution'
import { Rate, Trend, Counter } from 'k6/metrics'
import sql from 'k6/x/sql'
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.3.0/index.js'

import { scenario as sc, trends } from './common.js'
export { handleSummary } from './summary.js'

const pgConnectionString = __ENV.BASE_URI
  ? __ENV.BASE_URI
  : `postgres://postgres_user:postgres_pass@$postgres_host:6543/postgres?sslmode=disable`

const conns = __ENV.CONNS ? parseInt(__ENV.CONNS) : 10
const shift = __ENV.SHIFT ? parseInt(__ENV.SHIFT) : 0
const requests = __ENV.REQUESTS ? parseInt(__ENV.REQUESTS) : 1
const rampingDuration = __ENV.RAMPING_DURATION
  ? parseInt(__ENV.RAMPING_DURATION)
  : 20
const consecutiveDuration = __ENV.CONSECUTIVE_DURATION
  ? parseInt(__ENV.CONSECUTIVE_DURATION)
  : 40
const ramps = __ENV.RAMPS_COUNT ? parseInt(__ENV.RAMPS_COUNT) : 10
const testRun = __ENV.TEST_RUN ? __ENV.TEST_RUN : 'default'

const myFailRate = new Rate('failed_requests')
const counterInserts = new Counter('inserts')
const counterFailed = new Counter('failed')
const insertTrend = new Trend('insert_trend', true)

const to = {
  failed_requests: ['rate<0.1'],
  insert_trend: ['p(95)<1000'],
}

export const options = {
  vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    pg_single_insert: sc(rampingDuration, consecutiveDuration, ramps, conns),
  },
}

const db = sql.open('postgres', pgConnectionString)

export default () => {
  while (scenario.progress < 1) {
    const start = new Date()
    for (let i = 1; i <= requests; i++) {
      const exStart = new Date()
      try {
        db.exec('select from increment_cart_item(1);')
        myFailRate.add(false)
      } catch (e) {
        console.log(e)
        myFailRate.add(true)
        counterFailed.add(1)
      }
      const exFinish = new Date()
      counterInserts.add(1)
      insertTrend.add(exFinish - exStart)

      const finish = new Date()
      if (finish - start > 1000) {
        break
      }
    }
    const finish = new Date()
    if (finish - start < 1000) {
      sleep((1000 - (finish - start)) / 1000)
    }
  }
}

export function teardown(data) {
  db.close()
}
