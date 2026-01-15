// common.js - Shared configuration for k6 TPC-B benchmarks

/**
 * Creates a ramping-vus scenario configuration
 * 
 * @param {number} rampingDuration - Duration of each ramp stage in seconds
 * @param {number} consecutiveDuration - Duration of the steady state in seconds
 * @param {number} ramps - Number of ramp stages
 * @param {number} conns - Target number of VUs (connections)
 * @returns {object} k6 scenario configuration
 */
export function scenario(rampingDuration, consecutiveDuration, ramps, conns) {
  const stages = []

  // Build ramping stages
  for (let i = 1; i <= ramps; i++) {
    const targetVUs = Math.ceil((conns / ramps) * i)

    // Ramp up stage
    stages.push({
      duration: `${rampingDuration}s`,
      target: targetVUs,
    })

    // Steady state stage
    stages.push({
      duration: `${consecutiveDuration}s`,
      target: targetVUs,
    })
  }

  return {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: stages,
    gracefulRampDown: '30s',
  }
}

/**
 * Alternative: constant arrival rate scenario
 * Use this for strict TPS control
 */
export function constantRateScenario(targetTPS, duration, maxVUs) {
  return {
    executor: 'constant-arrival-rate',
    rate: targetTPS,
    timeUnit: '1s',
    duration: `${duration}s`,
    preAllocatedVUs: Math.ceil(maxVUs / 2),
    maxVUs: maxVUs,
  }
}

/**
 * Trend stats to include in summary
 */
export const trends = [
  'avg',
  'min',
  'med',
  'max',
  'p(90)',
  'p(95)',
  'p(99)',
  'count',
]

/**
 * Default thresholds for TPC-B style workloads
 */
export const defaultThresholds = {
  failed_requests: ['rate<0.1'],      // Less than 10% failure rate
  tx_trend: ['p(95)<1000'],           // 95th percentile under 1 second
  http_req_duration: ['p(95)<1000'],  // HTTP latency under 1 second
}

/**
 * Strict thresholds for production-grade testing
 */
export const strictThresholds = {
  failed_requests: ['rate<0.01'],     // Less than 1% failure rate
  tx_trend: ['p(95)<200'],            // 95th percentile under 200ms
  http_req_duration: ['p(95)<200'],
}

/**
 * Return a random integer between the minimum (inclusive)
 * and maximum (exclusive) values
 * @param {number} min - The minimum value to return.
 * @param {number} max - The maximum value you want to return.
 * @return {number} The random number between the min and max.
 */
export function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min) + min)
}