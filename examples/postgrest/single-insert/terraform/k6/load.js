import { check, sleep, group } from 'k6'
import http from 'k6/http'
import { vu, scenario } from 'k6/execution'
import { Rate } from 'k6/metrics'
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.3.0/index.js'

import { scenario as sc, trends } from './common.js'
export { handleSummary } from './summary.js'

const serviceToken = __ENV.SERVICE_TOKEN
const baseUri = __ENV.BASE_URI
  ? __ENV.BASE_URI
  : 'https://aglcyoggfgooijsjowjr.supabase.red'
const restURI = __ENV.REST_URI ? __ENV.REST_URI : `${baseUri}/rest/v1`

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

const to = {
  failed_requests: ['rate<0.1'],
  http_req_duration: ['p(95)<1000'],
}

export const options = {
  vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    pgrest_single_insert: sc(
      rampingDuration,
      consecutiveDuration,
      ramps,
      conns
    ),
  },
}

const headers = {
  accept: 'application/json',
  authorization: `Bearer ${serviceToken}`,
  apikey: serviceToken,
  'Content-Type': 'application/json',
}

export default () => {
  const name = vu.idInTest + shift

  while (scenario.progress < 1) {
    const start = new Date()
    for (let i = 1; i <= requests; i++) {
      const x = randomIntBetween(600, 999)
      const y = randomIntBetween(200, 700)
      let body = JSON.stringify({
        stud_id: name,
        first_name: 'Virtual ' + name,
        last_name: 'User ' + name,
        title: 'Load Tester',
        reports_to: 1,
        timestamp: Date.now(),
        location: `POINT(-73.946${x} 40.807${y})`,
        email: 'vu' + name + '@chinookcorp.com',
      })

      const res = http.post(
        restURI +
          '/positions?columns=stud_id,first_name,last_name,title,reports_to,timestamp,location,email',
        body,
        {
          headers: headers,
        }
      )

      myFailRate.add(res.status !== 201)
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
  http.del(
    restURI + '/positions?title=eq.Load%20Tester',
    {},
    { headers: Object.assign(headers, { Prefer: 'count=exact' }) }
  )
}
