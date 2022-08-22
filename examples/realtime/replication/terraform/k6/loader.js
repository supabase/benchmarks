import sql from 'k6/x/sql'
import { sleep } from 'k6'
import { Counter } from 'k6/metrics'

import { getRandomInt } from './common.js'

const pgUser = __ENV.PG_USER ? __ENV.PG_USER : 'postgres'
const pgPass = __ENV.PG_PASS
const pgDB = __ENV.PG_DB ? __ENV.PG_DB : 'postgres'
const pgPort = __ENV.PG_PORT ? __ENV.PG_PORT : '5432'
const pgHost = __ENV.PG_HOST
  ? __ENV.PG_HOST
  : 'db.woopuegececriuknbjus.supabase.net'
const pdConnectionString = `postgres://${pgUser}:${pgPass}@${pgHost}:${pgPort}/${pgDB}?sslmode=disable`
const db = sql.open('postgres', pdConnectionString)

const rate = __ENV.RATE ? __ENV.RATE : 2

const counterInserts = new Counter('inserts')
const baseDuration = __ENV.DURATION ? __ENV.DURATION : 60
let virtualUsers = 1
if (rate >= 5) {
  virtualUsers = 5
}
if (rate >= 20) {
  virtualUsers = 10
}
if (rate > 50) {
  virtualUsers = 15
}

export const options = {
  duration: `${baseDuration}s`,
  vus: virtualUsers,
}

/**
 * Create a table called "mp_latency" for testing if it doesn't exist,
 * and if it does exist, do nothing
 */
export function setup() {
  db.exec(`create table if not exists "load_messages" (
    id bigserial primary key,
    created_at timestamptz default now() NOT NULL,
    data text,
    room_id varchar(255) default 'room0'
  );`)
}

/**
 * Close the database connection
 */
export function teardown() {
  db.close()
}

export default () => {
  let rand = 0
  if (virtualUsers > 1) {
    rand = getRandomInt(0, virtualUsers)
    sleep(rand / rate)
  }
  // send inserts to the database
  const start = new Date()
  db.exec('insert into load_messages default values;')
  const finish = new Date()
  counterInserts.add(1)
  sleep((virtualUsers - rand) / rate - (finish - start) / 1000)
}
