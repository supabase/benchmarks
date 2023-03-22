import { check, sleep, group } from 'k6'
import http from 'k6/http'
import { SharedArray } from 'k6/data'
import { Counter } from 'k6/metrics'
import { scenario } from 'k6/execution'
// import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js'
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.3.0/index.js'

import { scenario as sc, trends, resizeOptions } from './common.js'
export { handleSummary } from './summary.js'

const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'))
})
// const img = open('./3mb.jpg', 'b')

const token = __ENV.ANON_TOKEN
const serviceToken = __ENV.SERVICE_TOKEN
const baseUri = __ENV.BASE_URI
  ? __ENV.BASE_URI
  : 'https://jjqwaskwktqjmyyuqrix.supabase.red'
const authURI = __ENV.AUTH_URI ? __ENV.AUTH_URI : baseUri + '/auth/v1'
const imageResizerURI = __ENV.IMAGE_RESIZER_URI
  ? __ENV.IMAGE_RESIZER_URI
  : `${baseUri}/storage/v1/render/image/public/images`
const storageUploadUri = `${baseUri}/storage/v1/object`

const conns = __ENV.CONNS
const startFrom = __ENV.START_FROM ? __ENV.START_FROM : 0
const requests = __ENV.REQUESTS ? __ENV.REQUESTS : 5
const batchSize = __ENV.BATCH_SIZE ? __ENV.BATCH_SIZE : 20
const rampingDuration = __ENV.RAMPING_DURATION ? __ENV.RAMPING_DURATION : 60
const consecutiveDuration = __ENV.CONSECUTIVE_DURATION
  ? __ENV.CONSECUTIVE_DURATION
  : 80
const batchDuration = __ENV.BATCH_DURATION ? __ENV.BATCH_DURATION : 40
const pauses = 60
const duration =
  pauses +
  parseInt(rampingDuration) +
  parseInt(consecutiveDuration) +
  parseInt(batchDuration)
const testRun = __ENV.TEST_RUN ? __ENV.TEST_RUN : 'default'

const resizedStatuses = new Counter('resized_statuses')
const resizedBatchStatuses = new Counter('resized_batch_statuses')

const to = {}

export const options = {
  vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    image_proxy: sc(rampingDuration, consecutiveDuration, batchDuration, conns),
  },
}

export default () => {
  const user =
    users[(parseInt(startFrom) + scenario.iterationInTest) % users.length]
  const authToken = getUserToken(user)
  const name = user.email.substring(0, user.email.indexOf('@')).replace('.', '')
  const path = `${testRun}/${name}.jpg`
  const headers = {
    accept: 'application/json',
    authorization: `Bearer ${authToken}`,
    apikey: token,
  }

  // cp image to use for resize
  const res = http.post(
    `${storageUploadUri}/copy`,
    JSON.stringify({
      sourceKey: '3mb.jpg',
      destinationKey: path,
      bucketId: 'images',
    }),
    {
      headers: Object.assign(headers, { 'Content-Type': 'application/json' }),
    }
  )
  check(res, {
    'upload is status 200': (r) => r.status === 200,
  })

  // wait for all users to connect and upload
  while (scenario.progress < (parseInt(rampingDuration) + 30) / duration) {
    sleep(1)
  }

  sleep(randomIntBetween(0, (consecutiveDuration * 10) / requests) / 10)
  group('resize requests', function () {
    for (let i = 1; i <= requests; i++) {
      const opts = resizeOptions[i - 1]
      const reqStarted = new Date()
      const resize = http.get(
        `${imageResizerURI}/${path}?width=${opts.width}&height=${opts.height}`,
        {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${serviceToken}`,
            apikey: serviceToken,
          },
          tags: { name: 'Resize' },
        }
      )
      check(resize, {
        'resize is status 200': (r) => r.status === 200,
      })
      resizedStatuses.add(1, { name: resize.status.toString() })
      if (resize.status !== 200) {
        console.log(resize.status_text)
      }
      if (scenario.progress > (duration - 30 - batchDuration) / duration) {
        break
      }
      const reqDuration = new Date() - reqStarted
      console.log(reqDuration)
      i < requests &&
        reqDuration < consecutiveDuration / requests &&
        sleep(
          randomIntBetween(
            1,
            (consecutiveDuration * 10) / requests - reqDuration
          ) / 10
        )
    }

    console.log('waiting for batch')
    while (scenario.progress < (duration - 30 - batchDuration) / duration) {
      sleep(1)
    }

    console.log('batch started')
    sleep(randomIntBetween(1, batchDuration))
    const requestsBatch = []
    for (let ctr = 1; ctr <= batchSize / 2; ctr++) {
      requestsBatch.push([
        'GET',
        `${imageResizerURI}/${path}?width=${100 + ctr}&${100 + ctr}`,
        null,
        {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${serviceToken}`,
            apikey: serviceToken,
          },
        },
      ])
      // if (ctr % 2 === 0) {
      requestsBatch.push([
        'GET',
        `${imageResizerURI}/${path}?width=${1000 + ctr}&${1000 + ctr}`,
        null,
        {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${serviceToken}`,
            apikey: serviceToken,
          },
        },
      ])
      // }
    }
    const responses = http.batch(requestsBatch)
    responses.map((r) => {
      check(r, {
        'batch resize': (res) => res.status === 200,
      })
      console.log(r.status.toString())
      console.log('adding to counter ', r.status.toString())
      resizedBatchStatuses.add(1, { name: r.status.toString() })
      if (r.status !== 200) {
        console.log(r.status_text)
      }
    })
  })
  console.log('waiting for end')

  while (scenario.progress < 1) {
    sleep(1)
  }

  const removeRes = http.del(
    `${storageUploadUri}/images`,
    JSON.stringify({
      prefixes: [path],
    }),
    {
      headers: {
        authorization: `Bearer ${serviceToken}`,
        apikey: serviceToken,
        'Content-Type': 'application/json',
      },
    }
  )
  check(removeRes, { 'delete status is 200': (r) => r && r.status === 200 })
}

function getUserToken(user) {
  // register a new user and authenticate via a Bearer token
  const loginRes = http.post(
    `${authURI}/token?grant_type=password`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: {
        apikey: token,
        'Content-Type': 'application/json',
      },
    }
  )

  const authToken = loginRes.json('access_token')
  check(authToken, {
    'logged in successfully': () => loginRes.status === 200 && authToken,
  })

  return authToken.toString()
}
