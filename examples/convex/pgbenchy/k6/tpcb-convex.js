import { check, sleep, group } from 'k6'
import { vu, scenario } from 'k6/execution'
import { Rate, Trend, Counter } from 'k6/metrics'
import http from 'k6/http'

import { scenario as sc, trends } from './common.js'
export { handleSummary } from './summary.js'

// =============================================================================
// CONFIGURATION
// =============================================================================

const convexUrl = __ENV.CONVEX_URL
  ? __ENV.CONVEX_URL
  : 'https://your-deployment.convex.cloud'

const conns = __ENV.CONNS ? parseInt(__ENV.CONNS) : 10
const requests = __ENV.REQUESTS ? parseInt(__ENV.REQUESTS) : 10
const rampingDuration = __ENV.RAMPING_DURATION
  ? parseInt(__ENV.RAMPING_DURATION)
  : 1
const consecutiveDuration = __ENV.CONSECUTIVE_DURATION
  ? parseInt(__ENV.CONSECUTIVE_DURATION)
  : 600
const ramps = __ENV.RAMPS_COUNT ? parseInt(__ENV.RAMPS_COUNT) : 1
const testRun = __ENV.TEST_RUN ? __ENV.TEST_RUN : 'default'
const scale = __ENV.SCALE_FACTOR ? parseInt(__ENV.SCALE_FACTOR) : 10

// =============================================================================
// METRICS
// =============================================================================

const myFailRate = new Rate('failed_requests')
const counterTX = new Counter('tx')
const counterFailed = new Counter('failed')
const counterRetries = new Counter('retries')
const txTrend = new Trend('tx_trend', true)

const to = {
  failed_requests: ['rate<0.1'],
  tx_trend: ['p(95)<1000'],
}

// =============================================================================
// K6 OPTIONS
// =============================================================================

export const options = {
  setupTimeout: 40000000,
  teardownTimeout: 40000000,
  vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    convex_tpcb: sc(
      rampingDuration,
      consecutiveDuration,
      ramps,
      conns
    ),
  },
}

// =============================================================================
// CONVEX API HELPERS
// =============================================================================

function convexMutation(path, args) {
  const payload = JSON.stringify({
    path,
    args,
    format: 'json',
  })

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  }

  return http.post(`${convexUrl}/api/mutation`, payload, params)
}

function convexQuery(path, args) {
  const payload = JSON.stringify({
    path,
    args,
    format: 'json',
  })

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  }

  return http.post(`${convexUrl}/api/query`, payload, params)
}

function checkConvexResponse(res, operation) {
  if (res.status !== 200) {
    console.log(`${operation} HTTP error: ${res.status}`)
    return false
  }

  try {
    const body = res.json()
    if (body.status === 'error') {
      console.log(`${operation} Convex error: ${body.errorMessage}`)
      return false
    }
    return true
  } catch (e) {
    console.log(`${operation} JSON parse error: ${e.message}`)
    return false
  }
}

// =============================================================================
// SETUP - Seed database
// =============================================================================

export function setup() {
  console.log(`Setting up TPC-B benchmark with scale factor ${scale}`)
  console.log(`Convex URL: ${convexUrl}`)

  // 1. Seed branches
  console.log(`Seeding ${scale} branches...`)
  let res = convexMutation('benchmark:seedBranches', { scale })
  if (!checkConvexResponse(res, 'seedBranches')) {
    throw new Error('Failed to seed branches')
  }
  console.log(`Branches: ${res.json().value.seeded} seeded`)

  // 2. Seed tellers (10 per branch)
  console.log(`Seeding ${scale * 10} tellers...`)
  res = convexMutation('benchmark:seedTellers', { scale })
  if (!checkConvexResponse(res, 'seedTellers')) {
    throw new Error('Failed to seed tellers')
  }
  console.log(`Tellers: ${res.json().value.seeded} seeded`)

  // 3. Seed accounts in batches (100,000 per scale factor)
  const totalAccounts = 100000 * scale
  const batchSize = 5000 // Adjust based on Convex timeout limits
  console.log(`Seeding ${totalAccounts} accounts in batches of ${batchSize}...`)

  for (let startAid = 1; startAid <= totalAccounts; startAid += batchSize) {
    const count = Math.min(batchSize, totalAccounts - startAid + 1)
    res = convexMutation('benchmark:seedAccountBatch', {
      startAid,
      count,
      scale,
    })

    if (!checkConvexResponse(res, `seedAccountBatch(${startAid})`)) {
      throw new Error(`Failed to seed accounts batch starting at ${startAid}`)
    }

    const progress = Math.min(100, Math.round((startAid / totalAccounts) * 100))
    if (startAid % (batchSize * 10) === 1 || startAid + batchSize > totalAccounts) {
      console.log(`Accounts progress: ${progress}% (${startAid + count - 1}/${totalAccounts})`)
    }
  }

  // 4. Seed some initial history (optional, for more realistic workload)
  const initialHistoryCount = 10000
  console.log(`Seeding ${initialHistoryCount} history records...`)
  res = convexMutation('benchmark:seedHistory', { count: initialHistoryCount })
  if (!checkConvexResponse(res, 'seedHistory')) {
    console.log('Warning: Failed to seed history (non-fatal)')
  } else {
    console.log(`History: ${res.json().value.seeded} seeded`)
  }

  return { scale, convexUrl }
}

// =============================================================================
// MAIN TEST - TPC-B Transaction Loop
// =============================================================================

export default () => {
  const name = vu.idInTest

  while (scenario.progress < 1) {
    const start = new Date()

    for (let i = 1; i <= requests; i++) {
      // Generate random transaction parameters (matching pgbench)
      const tid = Math.floor(Math.random() * (10 * scale)) + 1 // Teller ID: 1 to 10*scale
      const bid = Math.floor(Math.random() * scale) + 1 // Branch ID: 1 to scale
      const aid = Math.floor(Math.random() * (100000 * scale)) + 1 // Account ID: 1 to 100000*scale
      const delta = Math.floor(Math.random() * 1001) - 500 // Delta: -500 to 500

      const exStart = new Date()

      // Retry logic for OCC failures
      const maxRetries = 5
      let attempt = 0
      let success = false

      while (attempt < maxRetries && !success) {
        attempt++

        try {
          // Execute TPC-B transaction (atomic in Convex - no BEGIN/COMMIT needed)
          const res = convexMutation('benchmark:tpcbTransaction', {
            aid,
            tid,
            bid,
            delta,
          })

          if (res.status === 200) {
            const body = res.json()
            if (body.status === 'success') {
              myFailRate.add(false)
              success = true
            } else {
              // Check if it's an OCC failure that should be retried
              if (body.errorData?.code === 'OptimisticConcurrencyControlFailure' && attempt < maxRetries) {
                // Track retry but don't fail yet
                counterRetries.add(1)
                // Retry with exponential backoff
                sleep(Math.min(0.01 * Math.pow(2, attempt - 1), 0.1))
                continue
              } else {
                myFailRate.add(true)
                counterFailed.add(1)
                console.log(`Transaction failed: ${body.errorMessage}`)
                success = true // Don't retry non-OCC errors
              }
            }
          } else if (res.status === 503) {
            // 503 might be OCC failure, check response body
            const body = res.json()
            if (body.code === 'OptimisticConcurrencyControlFailure' && attempt < maxRetries) {
              // Track retry but don't fail yet
              counterRetries.add(1)
              // Retry with exponential backoff
              sleep(Math.min(0.01 * Math.pow(2, attempt - 1), 0.1))
              continue
            } else {
              myFailRate.add(true)
              counterFailed.add(1)
              console.log(`Transaction HTTP error: ${res.status}, ${JSON.stringify(body)}`)
              success = true
            }
          } else {
            myFailRate.add(true)
            counterFailed.add(1)
            const body = res.json()
            console.log(`Transaction HTTP error: ${res.status}, ${JSON.stringify(body)}`)
            success = true
          }
        } catch (e) {
          myFailRate.add(true)
          counterFailed.add(1)
          console.log(`Transaction exception: ${e.message}`)
          success = true
        }
      }

      // If we exhausted retries, mark as failed
      if (!success) {
        myFailRate.add(true)
        counterFailed.add(1)
        console.log(`Transaction failed after ${maxRetries} retries (OCC)`)
      }

      const exFinish = new Date()
      counterTX.add(1)
      txTrend.add(exFinish - exStart)

      const finish = new Date()
      if (finish - start > 1000) {
        break
      }
    }

    const finish = new Date()
  }
}

// =============================================================================
// TEARDOWN - Clean up database
// =============================================================================

export function teardown(data) {
  console.log('Tearing down TPC-B benchmark data...')

  const batchSize = 4000 // Stay under Convex document limits

  // Clear history first (has references to other tables)
  console.log('Clearing history...')
  let cleared = 0
  let res
  do {
    res = convexMutation('benchmark:clearTableBatch', {
      table: 'history',
      limit: batchSize,
    })
    if (checkConvexResponse(res, 'clearHistory')) {
      cleared += res.json().value.deleted
    }
  } while (res.json()?.value?.deleted === batchSize)
  console.log(`  History cleared: ${cleared} records`)

  // Clear accounts
  console.log('Clearing accounts...')
  cleared = 0
  do {
    res = convexMutation('benchmark:clearTableBatch', {
      table: 'accounts',
      limit: batchSize,
    })
    if (checkConvexResponse(res, 'clearAccounts')) {
      cleared += res.json().value.deleted
    }
  } while (res.json()?.value?.deleted === batchSize)
  console.log(`  Accounts cleared: ${cleared} records`)

  // Clear tellers
  console.log('Clearing tellers...')
  res = convexMutation('benchmark:clearTableBatch', {
    table: 'tellers',
    limit: batchSize,
  })
  if (checkConvexResponse(res, 'clearTellers')) {
    console.log(`  Tellers cleared: ${res.json().value.deleted} records`)
  }

  // Clear branches
  console.log('Clearing branches...')
  res = convexMutation('benchmark:clearTableBatch', {
    table: 'branches',
    limit: batchSize,
  })
  if (checkConvexResponse(res, 'clearBranches')) {
    console.log(`  Branches cleared: ${res.json().value.deleted} records`)
  }

  // Clear counters
  console.log('Clearing counters...')
  res = convexMutation('benchmark:clearTableBatch', {
    table: 'counters',
    limit: batchSize,
  })
  if (checkConvexResponse(res, 'clearCounters')) {
    console.log(`  Counters cleared: ${res.json().value.deleted} records`)
  }

  console.log('Teardown complete')
}