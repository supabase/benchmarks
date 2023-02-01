import { check } from 'k6'
import http from 'k6/http'
import ws from 'k6/ws'
import { SharedArray } from 'k6/data'
import { Trend, Counter } from 'k6/metrics'
import { scenario } from 'k6/execution'

import { getRandomInt, scenario as sc, trends } from './common.js'
export { handleSummary } from './summary.js'

const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'))
})

const token = __ENV.MP_TOKEN
const authURI = __ENV.AUTH_URI
  ? __ENV.AUTH_URI
  : 'https://woopuegececriuknbjus.supabase.red/auth/v1'
const socketURI = __ENV.MP_URI
  ? __ENV.MP_URI
  : 'wss://woopuegececriuknbjus.realtime-qa.abc3.dev/socket/websocket'
const URL = `${socketURI}?log_level=info&apikey=${token}`

const conns = __ENV.CONNS
const baseDuration = __ENV.DURATION ? __ENV.DURATION : 60
const duration = parseInt(baseDuration) + 15

const rooms = []
rooms.push(`room${getRandomInt(0, __ENV.ROOMS)}`)

const randomRoom = `fGwer43Fge${Math.random().toString(36).slice(2)}`

const latencyTrend = new Trend('latency_trend')
const counterReceived = new Counter('received_updates')

const to = {}

export const options = {
  vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    replication: sc(baseDuration, conns),
  },
}

export default () => {
  const user = users[scenario.iterationInTest % users.length]
  const authToken = getUserToken(user)
  const domain = user.email.substring(user.email.indexOf('@') + 1)

  const res = ws.connect(URL, {}, (socket) => {
    socket.on('open', () => {
      // Join channel
      socket.send(
        JSON.stringify({
          topic: `realtime:${randomRoom}`,
          event: 'phx_join',
          payload: {
            config: {
              broadcast: {
                self: true,
              },
              presence: {
                key: '',
              },
              postgres_changes: [],
              access_token: authToken,
            },
          },
          ref: '1',
          join_ref: '1',
        })
      )
      rooms.map((room) =>
        socket.send(
          JSON.stringify({
            topic: 'realtime:any',
            event: 'phx_join',
            payload: {
              config: {
                postgres_changes: [
                  {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'rls_messages',
                    filter: `domain=eq.${domain}`,
                  },
                ],
                access_token: authToken,
              },
            },
            ref: '2',
            join_ref: '2',
          })
        )
      )
      socket.send(
        JSON.stringify({
          topic: `realtime:${randomRoom}`,
          event: 'access_token',
          payload: {
            access_token: authToken,
          },
          ref: '3',
        })
      )
      rooms.map((room) =>
        socket.send(
          JSON.stringify({
            topic: `realtime:any`,
            event: 'access_token',
            payload: {
              access_token: authToken,
            },
            ref: '4',
          })
        )
      )

      socket.setInterval(() => {
        // Send heartbeat to server (timeout is probably around 1m)
        socket.send(
          JSON.stringify({
            topic: 'phoenix',
            event: 'heartbeat',
            payload: {},
            ref: 0,
          })
        )
      }, 30 * 1000)
    })

    socket.on('message', (msg) => {
      const now = Date.now()
      // console.log('----------------')
      // console.log(msg)
      // console.log('----------------')
      msg = JSON.parse(msg)

      if (msg.event === 'system') {
        check(msg, {
          'subscribed to realtime': (msg) =>
            msg.topic === 'realtime:any' && msg.payload.status === 'ok',
        })
      }

      if (msg.event !== 'postgres_changes') {
        return
      }

      const type = msg.payload.type
      let updated = 0
      if (msg.payload.data.record) {
        updated = Date.parse(msg.payload.data.record.created_at)
      } else {
        updated = new Date(msg.payload.data.commit_timestamp)
      }

      latencyTrend.add(now - updated, { type: type })
      counterReceived.add(1)

      check(msg, {
        'got realtime notification': (msg) => msg.topic === 'realtime:any',
      })
    })

    socket.on('error', (e) => {
      if (e.error() != 'websocket: close sent') {
        console.error('An unexpected error occurred: ', e.error())
      }
    })

    socket.setTimeout(function () {
      socket.close()
    }, duration * 1000)
  })

  check(res, { 'status is 101': (r) => r && r.status === 101 })
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
