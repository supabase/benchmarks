import { check } from "k6";
import http from "k6/http";
import { WebSocket } from 'k6/experimental/websockets';
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

const conns = __ENV.CONNS ? parseInt(__ENV.CONNS) : 10;
const shift = __ENV.SHIFT ? parseInt(__ENV.SHIFT) : 0;
const messagesPerSecond = __ENV.MESSAGES_PER_SECOND
  ? parseInt(__ENV.MESSAGES_PER_SECOND)
  : 60;
const baseDuration = __ENV.DURATION ? __ENV.DURATION : 60;
const duration = parseInt(baseDuration) + 30;
const presenceEnabled =
  __ENV.PRESENCE_ENABLED === "true" || __ENV.PRESENCE_ENABLED === "1";
const broadcastInterval = 1000;
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
  const headers = {
    Authorization: `Bearer ${authToken}`,
    apikey: token,
  };
  const channelsResponse = http.get(
    `${authURI.replace("auth", "rest")}/channel_names?select=name`,
    { headers }
  );

  const channels = channelsResponse.json().map((c) => c.name);
  const URL = `${socketURI}?apikey=${token}`;
  const ws = new WebSocket(URL);

  ws.onopen = () => {

    // Join channels
    channels.map((room) =>
      ws.send(createJoinMessage(room, authToken, presenceEnabled))
    );
    // Send access tokens
    channels.map((room) =>
      ws.send(createAccessTokenMessage(room, authToken))
    );

    // Send heartbeat
    setInterval(
      () => ws.send(createHeartbeatMessage()),
      25 * 1000
    );

    setInterval(() => {
      const messagesToSend = Math.ceil(messagesPerSecond);

      const sendMessage = (index) => {
        let rand = 0;
        if (messagesToSend > 1) {
          rand = getRandomInt(0, messagesToSend);
        }

        const start = Date.now();
        const randomChannel = channels[getRandomInt(0, channels.length)];
        ws.send(createBroadcastMessage(randomChannel, createMessage()));
        const finish = Date.now();

        const sleepTime =
          ((messagesToSend - rand) / messagesToSend) *
          (broadcastInterval / 1000) -
          (finish - start) / 1000;

        if (index + 1 < messagesToSend) {
          if (sleepTime > 0) {
            setTimeout(() => sendMessage(index + 1), sleepTime * 1000);
          } else {
            sendMessage(index + 1);
          }
        }
      };

      if (messagesToSend > 0) {
        sendMessage(0);
      }
    }, broadcastInterval);
  }

  ws.onmessage = (msg) => {
    const now = Date.now();
    // console.log(`Message received (raw): ${JSON.stringify(msg)}`);
    msg = JSON.parse(msg.data);

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
    // console.log(`Message received: ${JSON.stringify(msg)}`);
    latencyTrend.add(now - updated, { type: type });
    counterReceived.add(1);

    check(msg, {
      "got realtime notification": (msg) => msg.event === "broadcast",
    });
  }

  ws.onerror = (e) => {
    if (e.error() != "websocket: close sent") {
      console.error("An unexpected error occurred: ", e.error());
    }
  }

  setTimeout(function () {
    ws.close();
  }, duration * 1000);
};

function getUserToken(user) {
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
    }
  );

  const authToken = loginRes.json("access_token");
  check(authToken, {
    "logged in successfully": () => loginRes.status === 200 && authToken,
  });
  return authToken.toString();
}

function createJoinMessage(room, authToken, presenceEnabled) {
  const presenceConfig = presenceEnabled ? { key: "" } : { enabled: false };
  return JSON.stringify({
    topic: `realtime:${room}`,
    event: "phx_join",
    payload: {
      config: {
        broadcast: {
          self: true,
        },
        presence: presenceConfig,
        private: true,
      },
      access_token: authToken,
    },
    ref: "1",
    join_ref: "1",
  });
}

function createAccessTokenMessage(room, authToken) {
  return JSON.stringify({
    topic: `realtime:${room}`,
    event: "access_token",
    payload: {
      access_token: authToken,
    },
    ref: "2",
  });
}

function createHeartbeatMessage() {
  return JSON.stringify({
    topic: "phoenix",
    event: "heartbeat",
    payload: {},
    ref: 0,
  });
}

function createBroadcastMessage(channel, messagePayload) {
  return JSON.stringify({
    topic: `realtime:${channel}`,
    event: "broadcast",
    payload: {
      event: "new message",
      payload: messagePayload,
    },
    ref: 0,
  });
}

function createMessage() {
  const chars =
    "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~";
  const messageLength = 10 * 1000;
  let payload = "";

  for (let i = 0; i < messageLength; i++) {
    payload += chars[Math.floor(Math.random() * chars.length)];
  }

  return {
    created_at: Date.now(),
    message: payload,
  };
}
