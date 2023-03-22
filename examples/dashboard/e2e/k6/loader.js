import { check, sleep, group } from 'k6'
import http from 'k6/http'
import { SharedArray } from 'k6/data'
import { Trend } from 'k6/metrics'
import { scenario, vu } from 'k6/execution'
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.3.0/index.js'

import pw from 'k6/x/playwright'

import { trends } from './common.js'
export { handleSummary } from './summary.js'

const baseUri = __ENV.BASE_URI
  ? __ENV.BASE_URI
  : 'https://jjqwaskwktqjmyyuqrix.supabase.red'

const conns = __ENV.CONNS
const duration = __ENV.DURATION ? __ENV.DURATION : 300
const iterations = __ENV.ITERATIONS ? __ENV.ITERATIONS : 10
const testRun = __ENV.TEST_RUN ? __ENV.TEST_RUN : 'default'

const firstPaint = new Trend('first_paint', true)
const firstContentfulPaint = new Trend('first_contentful_paint', true)
const ttmi = new Trend('time_to_minimally_interactive', true)
const fid = new Trend('first_input_delay', true)

const to = {}

export const options = {
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    dashboard_e2e: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: iterations,
      maxDuration: duration + 's',
    },
  },
}

export default function () {
  pw.launchPersistent(`./browserContext${vu.idInTest % 3}`, { headless: false })
  pw.newPage()

  // projects
  try {
    pw.goto('https://app.supabase.com/')
    pw.waitForSelector('button:has-text("New project")', { state: 'visible' })
    pw.click('button:has-text("New project")')
    sleep(5)

    firstPaint.add(pw.firstPaint(), { page: 'projects' })
    firstContentfulPaint.add(pw.firstContentfulPaint(), { page: 'projects' })
    ttmi.add(pw.timeToMinimallyInteractive(), { page: 'projects' })
    fid.add(pw.firstInputDelay(), { page: 'projects' })
  } catch (e) {
    console.log('error')
  }

  // project
  try {
    pw.goto('https://app.supabase.com/project/gryakvuryfsrgjohzhbq')
    pw.waitForSelector('button:has-text("24 hours")', { state: 'visible' })
    pw.click('button:has-text("24 hours")')
    sleep(5)

    firstPaint.add(pw.firstPaint(), { page: 'project_ref' })
    firstContentfulPaint.add(pw.firstContentfulPaint(), { page: 'project_ref' })
    ttmi.add(pw.timeToMinimallyInteractive(), { page: 'project_ref' })
    fid.add(pw.firstInputDelay(), { page: 'project_ref' })
  } catch (e) {
    console.log('error')
  }

  // editor
  try {
    pw.goto('https://app.supabase.com/project/gryakvuryfsrgjohzhbq/editor')
    pw.waitForSelector('button:has-text("Create a new table")', {
      state: 'visible',
    })
    pw.click('button:has-text("Create a new table")')
    sleep(5)

    firstPaint.add(pw.firstPaint(), { page: 'editor' })
    firstContentfulPaint.add(pw.firstContentfulPaint(), { page: 'editor' })
    ttmi.add(pw.timeToMinimallyInteractive(), { page: 'editor' })
    fid.add(pw.firstInputDelay(), { page: 'editor' })
  } catch (e) {
    console.log('error')
  }

  // api
  try {
    pw.goto('https://app.supabase.com/project/gryakvuryfsrgjohzhbq/api')
    pw.waitForSelector('button:has-text("Bash")', {
      state: 'visible',
    })
    pw.click('button:has-text("Bash")')
    sleep(5)

    firstPaint.add(pw.firstPaint(), { page: 'api' })
    firstContentfulPaint.add(pw.firstContentfulPaint(), { page: 'api' })
    ttmi.add(pw.timeToMinimallyInteractive(), { page: 'api' })
    fid.add(pw.firstInputDelay(), { page: 'api' })
  } catch (e) {
    console.log(e)
  }

  pw.kill()
}
