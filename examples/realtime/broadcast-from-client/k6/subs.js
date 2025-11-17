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

const conns = __ENV.CONNS ? parseInt(__ENV.CONNS) : 10;
const shift = __ENV.SHIFT ? parseInt(__ENV.SHIFT) : 0;
const messagesPerSecond = __ENV.MESSAGES_PER_SECOND
  ? parseInt(__ENV.MESSAGES_PER_SECOND)
  : 60;
const messageSizeKB = __ENV.MESSAGE_SIZE_KB
  ? parseInt(__ENV.MESSAGE_SIZE_KB)
  : 1;
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
  const joinedChannels = new Set();
  let broadcastIntervalId = null;

  const res = ws.connect(URL, {}, (socket) => {
    socket.on("open", () => {
      channels.map((room) =>
        socket.send(createJoinMessage(room, authToken, presenceEnabled))
      );
      channels.map((room) =>
        socket.send(createAccessTokenMessage(room, authToken))
      );

      socket.setInterval(
        () => socket.send(createHeartbeatMessage()),
        25 * 1000
      );
    });

    socket.on("message", (msg) => {
      const now = Date.now();
      msg = JSON.parse(msg);

      if (
        msg.event === "phx_reply" &&
        msg.payload &&
        msg.payload.status === "ok"
      ) {
        const channelName = msg.topic.replace("realtime:", "");
        joinedChannels.add(channelName);
        console.log(
          `Successfully joined channel: ${channelName} (${joinedChannels.size}/${channels.length})`
        );

        check(msg, {
          "subscribed to realtime": (msg) => msg.payload.status === "ok",
        });

        if (joinedChannels.size === channels.length && !broadcastIntervalId) {
          console.log("All channels joined, starting broadcast");
          broadcastIntervalId = socket.setInterval(() => {
            const messagesToSend = Math.ceil(messagesPerSecond);

            const sendMessage = (index) => {
              let rand = 0;
              if (messagesToSend > 1) {
                rand = getRandomInt(0, messagesToSend);
              }

              const start = Date.now();
              const randomChannel = channels[getRandomInt(0, channels.length)];
              socket.send(
                createBroadcastMessage(randomChannel, createMessage())
              );
              const finish = Date.now();

              const sleepTime =
                ((messagesToSend - rand) / messagesToSend) *
                  (broadcastInterval / 1000) -
                (finish - start) / 1000;

              if (index + 1 < messagesToSend) {
                if (sleepTime > 0) {
                  socket.setTimeout(
                    () => sendMessage(index + 1),
                    sleepTime * 1000
                  );
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
      }

      if (msg.event !== "broadcast") {
        return;
      }

      const type = msg.payload.event;
      let updated = 0;
      if (msg.payload.payload) {
        updated = msg.payload.payload.created_at;
      }
      console.log(`Message received: ${JSON.stringify(msg)}`);
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
          self: false,
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
  const bytes = crypto.getRandomValues(new Uint8Array(messageSizeKB * 1000));
  payload = Array.from(bytes)
    .map((b) => String.fromCharCode(32 + (b % 95)))
    .join("");

  return {
    created_at: Date.now(),
    message: payload,
  };
}
