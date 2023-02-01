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

/**
 * Generate default k6 ramping-vus scenario.
 * @param {number} baseDuration - Total duration of the scenario.
 * @param {number} conns - max number of vus during the scenario execution.
 *
 * It starts with 0 VUs, ramps up to half the number of connections in 1/12 of total duration then
 * it remains on this number for 1/4 of total duration time.
 * Then ramps down to a quarter of the number of connections in 1/12 of total duration.
 * Then ramps up to the full number of connections in 1/6 of total duration and
 * it remains on this number for 1/3 of total duration time.
 * Then ramps down to a quarter of the number of connections in 1/12 of total duration,
 * then ramps down to 0 VUs in 10s.
 */
export function scenario(
  rampingDuration,
  consecutiveDuration,
  batchDuration,
  conns
) {
  return {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      {
        duration: `${parseInt(rampingDuration)}s`,
        target: parseInt(conns),
      },
      {
        duration: '30s',
        target: parseInt(conns),
      },
      {
        duration: `${parseInt(consecutiveDuration)}s`,
        target: parseInt(conns),
      },
      {
        duration: `${parseInt(batchDuration)}s`,
        target: parseInt(conns),
      },
      {
        duration: '30s',
        target: parseInt(conns),
      },
    ],
    gracefulRampDown: '10s',
  }
}

/* Exporting an array of default summaryTrendStats to be used in summary result. */
export const trends = ['avg', 'med', 'p(99)', 'p(95)', 'p(0.1)', 'count']

export const resizeOptions = [
  {
    width: 1080,
    height: 1080,
  },
  {
    width: 612,
    height: 612,
  },
  {
    width: 510,
    height: 510,
  },
  {
    width: 409,
    height: 409,
  },
  {
    width: 204,
    height: 204,
  },
  {
    width: 161,
    height: 161,
  },
  {
    width: 150,
    height: 150,
  },
  {
    width: 300,
    height: 300,
  },
  {
    width: 1024,
    height: 1024,
  },
  {
    width: 400,
    height: 220,
  },
  {
    width: 130,
    height: 80,
  },
  {
    width: 170,
    height: 170,
  },
  {
    width: 128,
    height: 128,
  },
  {
    width: 36,
    height: 36,
  },
  {
    width: 32,
    height: 32,
  },
  {
    width: 1083,
    height: 1083,
  },
  {
    width: 613,
    height: 613,
  },
  {
    width: 513,
    height: 513,
  },
  {
    width: 403,
    height: 403,
  },
  {
    width: 203,
    height: 203,
  },
  {
    width: 163,
    height: 163,
  },
  {
    width: 153,
    height: 153,
  },
  {
    width: 303,
    height: 303,
  },
  {
    width: 1023,
    height: 1023,
  },
  {
    width: 403,
    height: 223,
  },
  {
    width: 133,
    height: 83,
  },
  {
    width: 173,
    height: 173,
  },
  {
    width: 123,
    height: 123,
  },
  {
    width: 31,
    height: 31,
  },
  {
    width: 33,
    height: 33,
  },
  {
    width: 1087,
    height: 1087,
  },
  {
    width: 617,
    height: 617,
  },
  {
    width: 517,
    height: 517,
  },
  {
    width: 407,
    height: 407,
  },
  {
    width: 207,
    height: 207,
  },
  {
    width: 167,
    height: 167,
  },
  {
    width: 157,
    height: 157,
  },
  {
    width: 307,
    height: 307,
  },
  {
    width: 1027,
    height: 1027,
  },
  {
    width: 407,
    height: 227,
  },
  {
    width: 137,
    height: 87,
  },
  {
    width: 177,
    height: 177,
  },
  {
    width: 127,
    height: 127,
  },
  {
    width: 38,
    height: 38,
  },
  {
    width: 37,
    height: 37,
  },
]
