import { check, sleep, group } from "k6";
import http from "k6/http";
import { vu } from "k6/execution";
import { randomString } from "https://jslib.k6.io/k6-utils/1.3.0/index.js";

import { scenario as sc, trends } from "./common.js";
export { handleSummary } from "./summary.js";

const testRun = __ENV.TEST_RUN ? __ENV.TEST_RUN : "default";
const serviceToken = __ENV.SERVICE_TOKEN;
const baseUri = __ENV.BASE_URI
  ? __ENV.BASE_URI
  : "https://proj.supabase.com/storage/v1";

const storageUploadUri = `${baseUri}/object/upload-benchmark`;
const fileName = "file_to_upload";
const binFile = open(fileName, "b");

const conns = __ENV.CONNS ? __ENV.CONNS : 1;
const requests = __ENV.REQUESTS ? __ENV.REQUESTS : 10;
const rampingDuration = __ENV.RAMPING_DURATION ? __ENV.RAMPING_DURATION : 1;
const consecutiveDuration = __ENV.CONSECUTIVE_DURATION
  ? __ENV.CONSECUTIVE_DURATION
  : 40;
const ramps = __ENV.RAMPS_COUNT ? __ENV.RAMPS_COUNT : 1;

const to = {};

export const options = {
  vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    upload_benchmark: sc(rampingDuration, consecutiveDuration, ramps, conns),
  },
};

export default () => {
  const name = vu.idInTest + randomString(10, `abcdefghijklmnopqrstuvwxyz`);
  const path = `${testRun}/${name}`;
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${serviceToken}`,
    apikey: serviceToken,
  };

  const data = {
    file: http.file(binFile, path),
  };

  const res = http.post(`${storageUploadUri}/${path}`, data, {
    headers: headers,
    timeout: "300s",
  });
  check(res, {
    "upload is status 200": (r) => r.status === 200,
  });

  const removeRes = http.del(
    storageUploadUri,
    JSON.stringify({
      prefixes: [path],
    }),
    {
      headers: {
        authorization: `Bearer ${serviceToken}`,
        apikey: serviceToken,
        "Content-Type": "application/json",
      },
    },
  );

  check(removeRes, { "delete status is 200": (r) => r && r.status === 200 });
};
