import { check, sleep, group } from 'k6'
import http from 'k6/http'
import { vu } from 'k6/execution'
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.3.0/index.js'

import { scenario as sc, trends } from './common.js'
export { handleSummary } from './summary.js'

const serviceToken = __ENV.SERVICE_TOKEN
const baseUri = __ENV.BASE_URI
  ? __ENV.BASE_URI
  : 'https://proj.supabase.com'
const imageURI = __ENV.IMAGE_URI
  ? __ENV.IMAGE_URI
  : `${baseUri}/storage/v1/object/public/images/` // 3mb.jpg?time=
const storageUploadUri = `${baseUri}/storage/v1/object`

const conns = __ENV.CONNS
const requests = __ENV.REQUESTS ? __ENV.REQUESTS : 10
const rampingDuration = __ENV.RAMPING_DURATION ? __ENV.RAMPING_DURATION : 20
const consecutiveDuration = __ENV.CONSECUTIVE_DURATION
  ? __ENV.CONSECUTIVE_DURATION
  : 40
const ramps = __ENV.RAMPS_COUNT ? __ENV.RAMPS_COUNT : 10
const testRun = __ENV.TEST_RUN ? __ENV.TEST_RUN : 'default'

const to = {}

export const options = {
  vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    image_proxy: sc(rampingDuration, consecutiveDuration, ramps, conns),
  },
}

export default () => {
  const name = vu.idInTest
  // const path = `${testRun}/${name}.jpg`
  const path = '3mb.jpg'
  const headers = {
    accept: 'application/json',
    authorization: `Bearer ${serviceToken}`,
    apikey: serviceToken,
  }

  sleep(randomIntBetween(100, 5000) / 1000)

  for (let i = 1; i <= requests; i++) {
    const getImage = http.get(`${imageURI}/${path}?time=${Date.now()}`, {
      headers: headers,
      tags: { name: 'GetImage' },
    })

    check(getImage, {
      'getImage is status 200': (r) => r.status === 200,
    })

    sleep(randomIntBetween(100, 5000) / 1000)
  }
}
