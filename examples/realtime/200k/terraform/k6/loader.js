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
  : 'db.proj.supabase.com'
const pdConnectionString = `postgres://${pgUser}:${pgPass}@${pgHost}:${pgPort}/${pgDB}?sslmode=disable`
const db = sql.open('postgres', pdConnectionString)

const rate = __ENV.RATE ? __ENV.RATE : 2

const rooms = []
rooms.push(`room0`)
rooms.push(`room1`)
rooms.push(`room2`)

const counterInserts = new Counter('inserts')
const baseDuration = __ENV.DURATION ? __ENV.DURATION : 300
const duration = parseInt(baseDuration) + 120

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
  duration: `${duration}s`,
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
    sleep((rand / rate) * 60)
  }
  // send inserts to the database
  const start = new Date()
  const room = rooms[getRandomInt(0, rooms.length)]
  db.exec(
    `insert into load_messages (room_id, data) values ('${room}', '{"id": "1","type": "message","attributes": {"text": "Hello world","player1_name": "John Doe","player2_name": "Jane Doe","player1_score": 0,"player2_score": 0,"bracket": "A","round": 1,"match": 1,"winner": 0,"loser": 0,"player1_id": 1,"player2_id": 2,"player1_rank": 1,"player2_rank": 2,"player1_hero": "Donkey Kong","player2_hero": "Donkey Kong"}}');`
  )
  const finish = new Date()
  counterInserts.add(1)
  sleep(((virtualUsers - rand) / rate) * 60 - (finish - start) / 1000)
}
