import { check } from 'k6'
import ws from 'k6/ws'
import { Trend, Counter } from 'k6/metrics'

import { getRandomInt, scenario, trends } from './common.js'
export { handleSummary } from './summary.js'

const token = __ENV.MP_TOKEN
const socketURI = __ENV.MP_URI
  ? __ENV.MP_URI
  : 'wss://woopuegececriuknbjus.realtime-qa.abc3.dev/socket/websocket'
const URL = `${socketURI}?apikey=${token}`

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
    replication: scenario(baseDuration, conns),
  },
}

export default () => {
  const res = ws.connect(URL, {}, (socket) => {
    socket.on('open', () => {
      // Join channel
      socket.send(
        JSON.stringify({
          topic: 'realtime:*',
          event: 'phx_join',
          payload: {
            config: {
              broadcast: { self: false, ack: false },
              presence: { key: '' },
            },
          },
          ref: '1',
        })
      )
      socket.send(
        JSON.stringify({
          topic: `realtime:${randomRoom}`,
          event: 'phx_join',
          payload: {},
          ref: '2',
        })
      )
      rooms.map((room) =>
        socket.send(
          JSON.stringify({
            topic: 'realtime:any',
            event: 'phx_join',
            payload: {
              config: {
                postgres_changes: [{
                  event: 'INSERT',
                  schema: 'public',
                  table: 'load_messages',
                  filter: `room_id=eq.${room}`,
                }],
              },
            },
            ref: '3',
          })
        )
      )
      socket.send(
        JSON.stringify({
          topic: `realtime:${randomRoom}`,
          event: 'access_token',
          payload: {
            access_token: token,
          },
          ref: '4',
        })
      )
      socket.send(
        JSON.stringify({
          topic: 'realtime:*',
          event: 'access_token',
          payload: { access_token: token },
          ref: '5',
        })
      )
      rooms.map((room) =>
        socket.send(
          JSON.stringify({
            topic: `realtime:${room}`,
            event: 'access_token',
            payload: {
              access_token: token,
            },
            ref: '6',
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
      if (
        msg.event === 'phx_reply' ||
        msg.event === 'phx_error' ||
        msg.event === 'presence_state'
      ) {
        return
      }

      const type = msg.payload.type
      let updated = 0
      if (msg.payload.record) {
        updated = Date.parse(msg.payload.record.created_at.substr(0, 23))
      } else {
        updated = new Date(msg.payload.commit_timestamp)
      }

      latencyTrend.add(now - updated, { type: type })
      counterReceived.add(1)

      check(msg, {
        'got realtime notification': (msg) => msg.topic === 'realtime:*',
      })
    })

    socket.on('error', (e) => {
      if (e.error() != 'websocket: close sent') {
        console.error('An unexpected error occured: ', e.error())
      }
    })

    socket.setTimeout(function () {
      socket.close()
    }, duration * 1000)
  })

  check(res, { 'status is 101': (r) => r && r.status === 101 })
}
