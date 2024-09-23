import { check } from "k6";
import http from "k6/http";
import { Trend } from "k6/metrics";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.3.0/index.js";
import { AWSConfig, S3Client } from "./s3.js";

import { scenario as sc, trends } from "./common.js";
export { handleSummary } from "./summary.js";

const serviceToken = __ENV.SERVICE_TOKEN;
const baseUri = __ENV.BASE_URI
  ? __ENV.BASE_URI
  : "https://proj.supabase.com";

const storageUploadUri = `${baseUri}/object/tus`;
const fileName = "file_to_upload";
const binFile = open(fileName, "b");

const conns = __ENV.CONNS ? __ENV.CONNS : 1;
const rampingDuration = __ENV.RAMPING_DURATION ? __ENV.RAMPING_DURATION : 1;
const consecutiveDuration = __ENV.CONSECUTIVE_DURATION
  ? __ENV.CONSECUTIVE_DURATION
  : 60;
const testRun = __ENV.TEST_RUN ? __ENV.TEST_RUN : "default";

const uploadDuration = new Trend("upload_duration", true);

const to = {};

export const options = {
  // vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    storage_s3: sc(rampingDuration, consecutiveDuration, conns),
  },
};

export default () => {
  const name = uuidv4();
  const path = `v1/s3/s3bench/${testRun}/${name}`;

  console.log(baseUri);
  const awsConfig = new AWSConfig({
    region: "ap-southeast-1",
    endpoint: baseUri,
    accessKeyId: "zizkwzwjuznrzulbpncp",
    secretAccessKey: serviceToken,
  });
  const s3Client = new S3Client(awsConfig);
  // s3Client.host = baseUri;
  // s3Client.scheme = `https`;

  const testBucketName = "storage";
  const testFileKey = path;
  const testFile = binFile;

  const reqStarted = new Date();

  console.log(JSON.stringify(s3Client));

  s3Client
    .putObject(testBucketName, testFileKey, testFile, {
      contentType: "application/octet-stream",
      contentLength: testFile.length,
    })
    .then(() => {
      check(testFileKey, {
        "upload is status ok": (r) => true,
      });
    })
    .catch((e) => {
      console.log(e);
      check(e, {
        "upload is status ok": (r) => false,
      });
    })
    .finally(() => {
      const reqDuration = new Date() - reqStarted;
      console.log(reqDuration);
      uploadDuration.add(reqDuration);
      const removeRes = http.del(
        `${baseUri}/storage/v1/object/s3bench`,
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
      check(removeRes, {
        "delete status is 200": (r) => r && r.status === 200,
      });
    });
};
