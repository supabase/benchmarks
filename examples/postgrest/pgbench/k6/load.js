import { check, sleep, group } from 'k6'
import http from 'k6/http'
import { vu, scenario } from 'k6/execution'
import { Rate, Counter, Trend } from 'k6/metrics'

import sql from 'k6/x/sql'

import { scenario as sc, trends } from './common.js'
export { handleSummary } from './summary.js'

const serviceToken = __ENV.SERVICE_TOKEN
const baseUri = __ENV.BASE_URI
  ? __ENV.BASE_URI
  : 'https://proj.supabase.com'
const restURI = __ENV.REST_URI ? __ENV.REST_URI : `${baseUri}/rest/v1`

const pgConnectionString = __ENV.CONN_STRING
  ? __ENV.CONN_STRING
  : `postgres://postgres_user:postgres_pass@$postgres_host:6543/postgres?sslmode=disable`

const conns = __ENV.CONNS ? parseInt(__ENV.CONNS) : 10
const requests = __ENV.REQUESTS ? parseInt(__ENV.REQUESTS) : 1
const rampingDuration = __ENV.RAMPING_DURATION
  ? parseInt(__ENV.RAMPING_DURATION)
  : 20
const consecutiveDuration = __ENV.CONSECUTIVE_DURATION
  ? parseInt(__ENV.CONSECUTIVE_DURATION)
  : 40
const ramps = __ENV.RAMPS_COUNT ? parseInt(__ENV.RAMPS_COUNT) : 10
const testRun = __ENV.TEST_RUN ? __ENV.TEST_RUN : 'default'

const myFailRate = new Rate('failed_requests')
const counterTX = new Counter('tx')
const counterFailed = new Counter('failed')
const txTrend = new Trend('tx_trend', true)

const to = {
  failed_requests: ['rate<0.1'],
  http_req_duration: ['p(95)<1000'],
}

export const options = {
  setupTimeout: 600000,
  vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    pgrest_rpc_update: sc(rampingDuration, consecutiveDuration, ramps, conns),
  },
}

const headers = {
  accept: 'application/json',
  Authorization: `Bearer ${serviceToken}`,
  apikey: serviceToken,
  'Content-Type': 'application/json',
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
from generate_series(1, 10);

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

db.exec(
  `
create or replace function update_account_balance(acc int, delta int) returns void as $$
begin
    update accounts set abalance = abalance + delta where aid = acc;
end;
$$ language plpgsql;

create or replace function update_teller_balance(tel int, delta int) returns void as $$
begin
    update tellers set tbalance = tbalance + delta where tid = tel;
end;
$$ language plpgsql;

create or replace function update_branch_balance(br int, delta int) returns void as $$
begin
    update branches set bbalance = bbalance + delta where bid = br;
end;
$$ language plpgsql;
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

      let body = JSON.stringify({
        acc: aid,
        delta: delta
      })
      let res = http.post(
        `${restURI}/rpc/update_account_balance`,
        body,
        { headers: headers }
      )
      myFailRate.add(res.status !== 204)
      if (res.status !== 204) {
        console.log(`Update account balance failed with status ${res.status}, ${res.status_text}`)
        counterTX.add(1)
        counterFailed.add(1)
        continue
      }

      res = http.get(
        `${restURI}/accounts?aid=eq.${aid}&select=abalance`,
        { headers: headers }
      )
      myFailRate.add(res.status !== 200)
      if (res.status !== 200) {
        console.log(`Select account balance failed with status ${res.status}, ${res.status_text}`)
        counterTX.add(1)
        counterFailed.add(1)
        continue
      }

      // Update teller balance
      body = JSON.stringify({
        tel: tid,
        delta: delta
      })
      res = http.post(
        `${restURI}/rpc/update_teller_balance`,
        body,
        { headers: headers }
      )
      myFailRate.add(res.status !== 204)
      if (res.status !== 204) {
        console.log(`Update teller balance failed with status ${res.status}, ${res.status_text}`)
        counterTX.add(1)
        counterFailed.add(1)
        continue
      }

      // Update branch balance
      body = JSON.stringify({
        br: bid,
        delta: delta
      })
      res = http.post(
        `${restURI}/rpc/update_branch_balance`,
        body,
        { headers: headers }
      )
      myFailRate.add(res.status !== 204)
      if (res.status !== 204) {
        console.log(`Update branch balance failed with status ${res.status}, ${res.status_text}`)
        counterTX.add(1)
        counterFailed.add(1)
        continue
      }

      // Insert history
      body = JSON.stringify({
        tid: tid,
        bid: bid,
        aid: aid,
        delta: delta,
        mtime: new Date().toISOString(),
        filler: ''
      })
      res = http.post(
        `${restURI}/history?columns=tid,bid,aid,delta,mtime,filler`,
        body,
        { headers: headers }
      )
      myFailRate.add(res.status !== 201)
      if (res.status !== 201) {
        console.log(`Insert history failed with status ${res.status}, ${res.status_text}`)
        counterTX.add(1)
        counterFailed.add(1)
        continue
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
drop function if exists update_account_balance(int, int);
drop function if exists update_teller_balance(int, int);
drop function if exists update_branch_balance(int, int);
drop table if exists history;
drop table if exists accounts;
drop table if exists tellers;
drop table if exists branches;
    `
  )
  db.close()
}