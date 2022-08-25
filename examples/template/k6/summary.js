import http from 'k6/http'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js'

/* Setting up the environment variables for the test run. */
const testrun = __ENV.TEST_RUN
const origin = __ENV.TEST_ORIGIN
const benchmark = __ENV.BENCHMARK_ID
const run = __ENV.RUN_ID
const token = __ENV.SUPABENCH_TOKEN
const supabench_uri = __ENV.SUPABENCH_URI
  ? __ENV.SUPABENCH_URI
  : 'http://localhost:8090'

/**
 * Handle summary implementation that additionally sends the data to the reports server.
 */
export function handleSummary(data) {
  console.log('Preparing the end-of-test summary...')
  const started = Date.now()

  // Send the results to remote server
  if (!run) {
    const report = {
      output: textSummary(data, { indent: ' ', enableColors: false }),
      raw: data,
      benchmark_id: benchmark,
      name: testrun ? testrun : null,
      status: 'success',
      origin: origin,
      started_at: `${started - 60 * 1000}`,
      ended_at: `${
        started + parseInt(data.state.testRunDurationMs) + 60 * 1000
      }`,
    }

    const resp = http.post(
      `${supabench_uri}/api/collections/runs/records`,
      JSON.stringify(report),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Admin ${token}`,
        },
      }
    )
    if (resp.status != 200) {
      console.error('Could not send summary, got status ' + resp.status)
    }
  } else {
    const report = {
      output: textSummary(data, { indent: ' ', enableColors: false }),
      raw: data,
      status: 'success',
      started_at: `${started - 120 * 1000}`,
      ended_at: `${
        started + parseInt(data.state.testRunDurationMs) + 15 * 1000
      }`,
    }

    const resp = http.patch(
      `${supabench_uri}/api/collections/runs/records/${run}`,
      JSON.stringify(report),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Admin ${token}`,
        },
      }
    )
    if (resp.status != 200) {
      console.error('Could not send summary, got status ' + resp.status)
    }
  }

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }), // Show the text summary to stdout...
    'summary.json': JSON.stringify(data), // and a JSON with all the details...
  }
}
