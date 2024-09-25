import { check } from "k6";
import http from "k6/http";
import ws from "k6/ws";
import { SharedArray } from "k6/data";
import { Trend, Counter } from "k6/metrics";
import { scenario } from "k6/execution";

import { getRandomInt, scenario as sc, trends } from "./common.js";
export { handleSummary } from "./summary.js";

const users = new SharedArray("users", function () {
  return JSON.parse(open("./users.json"));
});

const token = __ENV.MP_TOKEN;
const authURI = __ENV.AUTH_URI
  ? __ENV.AUTH_URI
  : "https://proj.supabase.com/auth/v1";
const socketURI = __ENV.MP_URI
  ? __ENV.MP_URI
  : "wss://proj.supabase.com/realtime/v1/websocket";

const conns = __ENV.CONNS;
const shift = __ENV.SHIFT ? parseInt(__ENV.SHIFT) : 0;
const instances = __ENV.INSTANCES ? parseInt(__ENV.INSTANCES) : 15;
const rate = __ENV.RATE ? parseInt(__ENV.RATE) : 1;
const roomNumber = __ENV.ROOMS ? parseInt(__ENV.ROOMS) : 1;
const baseDuration = __ENV.DURATION ? __ENV.DURATION : 60;
const duration = parseInt(baseDuration) + 30;

const rooms = [];
for (let i = 0; i < roomNumber; i++) {
  rooms.push(`channel_${i}`);
}

const latencyTrend = new Trend("latency_trend");
const counterReceived = new Counter("received_updates");

const to = {};

export const options = {
  vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    broadcast_authenticated: sc(baseDuration, conns),
  },
};

export default () => {
  const user = users[(scenario.iterationInTest + shift) % users.length];
  const authToken = getUserToken(user);
  // const domain = user.email.substring(user.email.indexOf("@") + 1);

  const channelsResponse = http.get(
    `${authURI.replace("auth", "rest")}/channel_names?select=name`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        apikey: token,
      },
    },
  );
  const channels = channelsResponse.json().map((c) => c.name);
  // console.log(JSON.stringify(channels));
  const URL = `${socketURI}?apikey=${token}`;
  const res = ws.connect(URL, {}, (socket) => {
    socket.on("open", () => {
      // Join channel
      channels.map((room) => {
        socket.send(
          JSON.stringify({
            topic: `realtime:${room}`,
            event: "phx_join",
            payload: {
              config: {
                broadcast: {
                  self: true,
                },
                presence: {
                  key: "",
                },
                private: true,
              },
              access_token: authToken,
            },
            ref: "1",
            join_ref: "1",
          }),
        );
      });
      channels.map((room) => {
        socket.send(
          JSON.stringify({
            topic: `realtime:${room}`,
            event: "access_token",
            payload: {
              access_token: authToken,
            },
            ref: "2",
          }),
        );
      });

      socket.setInterval(() => {
        // Send heartbeat to server (timeout is probably around 1m)
        socket.send(
          JSON.stringify({
            topic: "phoenix",
            event: "heartbeat",
            payload: {},
            ref: 0,
          }),
        );
      }, 30 * 1000);

      socket.setInterval(
        () => {
          // Send events to broadcast
          channels.map((room) => {
            if (getRandomInt(0, conns * instances / 10) < rate) {
              // console.log("Sending message to room: ", room);
              socket.send(
                JSON.stringify({
                  topic: "realtime:" + room,
                  event: "broadcast",
                  payload: {
                    event: "new message",
                    payload: {
                      message: "Hello, world!",
                      created_at: Date.now(),
                    },
                  },
                  ref: 0,
                }),
              );
            }
          });
        },
        (10 * 1000),
      );
    });

    socket.on("message", (msg) => {
      const now = Date.now();
      // console.log("----------------");
      // console.log(msg);
      // console.log("----------------");
      msg = JSON.parse(msg);

      if (msg.event === "system") {
        check(msg, {
          "subscribed to realtime": (msg) =>
            (msg.topic === msg.payload.status) === "ok",
        });
      }

      if (msg.event !== "broadcast") {
        return;
      }

      const type = msg.payload.event;
      let updated = 0;
      if (msg.payload.payload) {
        updated = msg.payload.payload.created_at;
      }

      latencyTrend.add(now - updated, { type: type });
      counterReceived.add(1);

      check(msg, {
        "got realtime notification": (msg) => msg.event === "broadcast",
      });
    });

    socket.on("error", (e) => {
      if (e.error() != "websocket: close sent") {
        console.error("An unexpected error occurred: ", e.error());
      }
    });

    socket.setTimeout(function () {
      socket.close();
    }, duration * 1000);
  });

  check(res, { "status is 101": (r) => r && r.status === 101 });
};

function getUserToken(user) {
  // sign in a new user and authenticate via a Bearer token
  const loginRes = http.post(
    `${authURI}/token?grant_type=password`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: {
        apikey: token,
        "Content-Type": "application/json",
      },
    },
  );

  const authToken = loginRes.json("access_token");
  check(authToken, {
    "logged in successfully": () => loginRes.status === 200 && authToken,
  });
  // console.log(authToken);
  return authToken.toString();
}
