import { check, sleep, group } from 'k6'
import { vu, scenario } from 'k6/execution'
import { Rate, Trend, Counter } from 'k6/metrics'
import sql from 'k6/x/sql'

import { scenario as sc, trends } from './common.js'
export { handleSummary } from './summary.js'

const pgConnectionString = __ENV.BASE_URI
  ? __ENV.BASE_URI
  : `postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable`

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

const myFailRate = new Rate('failed_requests')
const counterTX = new Counter('tx')
const counterFailed = new Counter('failed')
const txTrend = new Trend('tx_trend', true)

const to = {
  failed_requests: ['rate<0.1'],
  tx_trend: ['p(95)<1000'],
}

export const options = {
  setupTimeout: 600000,
  vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    supavisor_single_insert: sc(
      rampingDuration,
      consecutiveDuration,
      ramps,
      conns
    ),
  },
}

const db = sql.open('postgres', pgConnectionString)

export function setup() {
  db.exec(
    `
set statement_timeout = 600000;
drop table if exists history;
drop table if exists accounts;
drop table if exists tellers;
drop table if exists branches;

create table branches (
    bid serial primary key,
    bbalance int,
    filler char(88)
);

create table tellers (
    tid serial primary key,
    bid int references branches(bid),
    tbalance int,
    filler char(84)
);

create table accounts (
    aid serial primary key,
    bid int references branches(bid),
    abalance int,
    filler char(84)
);

create table history (
    hid serial primary key,
    tid int,
    bid int,
    aid int,
    delta int,
    mtime timestamp,
    filler char(22)
);

-- Create indexes
create index idx_accounts_bid on accounts(bid);
create index idx_tellers_bid on tellers(bid);
create index idx_history_tid on history(tid);
create index idx_history_bid on history(bid);
create index idx_history_aid on history(aid);
    `
  )

  db.exec(
    `
-- Insert branches
insert into branches (bbalance, filler)
select 0, ''
from generate_series(1, 100);

-- Insert tellers
insert into tellers (bid, tbalance, filler)
select bid, 0, ''
from branches, generate_series(1, 10);

-- Insert accounts
insert into accounts (bid, abalance, filler)
select bid, 0, ''
from branches, generate_series(1, 100000);

-- Prepopulate historical data
insert into history (tid, bid, aid, delta, mtime, filler)
select (random() * 100 + 1)::INT, bid, aid, (random() * 1000 - 500)::INT, NOW(), ''
from accounts
limit 10000000;
    `
  )
}

export default () => {
  const name = vu.idInTest

  while (scenario.progress < 1) {
    const start = new Date()
    for (let i = 1; i <= requests; i++) {
      const tid = Math.floor(Math.random() * 100) + 1;  // Random teller id
      const bid = Math.floor(Math.random() * 10) + 1;   // Random branch id
      const aid = Math.floor(Math.random() * 100000) + 1;  // Random account id
      const delta = Math.floor(Math.random() * 1000) - 500;  // Random transaction amount

      const exStart = new Date()
      // Begin transaction

      try {
        // Update account balance
        db.exec(`update accounts set abalance = abalance + ${delta} where aid = ${aid}`);

        // Select account balance
        db.exec(`select abalance from accounts where aid = ${aid}`);

        // Update teller balance
        db.exec(`update tellers set tbalance = tbalance + ${delta} where tid = ${tid}`);

        // Update branch balance
        db.exec(`update branches set bbalance = bbalance + ${delta} where bid = ${bid}`);

        // Insert history
        db.exec(`insert into history (tid, bid, aid, delta, mtime, filler) values (${tid}, ${bid}, ${aid}, ${delta}, now(), '')`);
        
        myFailRate.add(false)
      } catch (e) {
        myFailRate.add(true)
        counterFailed.add(1)
        console.log(`Transaction failed: ${e.message}`);
        try {
          db.exec('rollback');
        } catch (e) {
          console.log(`Rollback failed: ${e.message}`);
        }
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
    if (finish - start < 1000) {
      sleep((1000 - (finish - start)) / 1000)
    }
  }
}

export function teardown(data) {
  db.exec(
    `
drop table history;
drop table accounts;
drop table tellers;
drop table branches;
    `
  )
  db.close()
}
