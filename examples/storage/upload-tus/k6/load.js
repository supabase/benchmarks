import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Trend } from "k6/metrics";
import { b64encode } from "k6/encoding";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.3.0/index.js";

import { scenario as sc, trends } from "./common.js";
export { handleSummary } from "./summary.js";

const serviceToken = __ENV.SERVICE_TOKEN;
const baseUri = __ENV.BASE_URI
  ? __ENV.BASE_URI
  : "https://proj.storage.supabase.com";

const storageUploadUri = `${baseUri}/object/tus`;
const fileName = "file_to_upload";
const binFile = open(fileName, "b");

const chunkSizeMB = __ENV.CHUNK_SIZE_MB ? parseInt(__ENV.CHUNK_SIZE_MB) : 5;

const storageMultipartUri = `${baseUri}/upload/resumable`;

const conns = __ENV.CONNS ? __ENV.CONNS : 1;
const rampingDuration = __ENV.RAMPING_DURATION ? __ENV.RAMPING_DURATION : 1;
const consecutiveDuration = __ENV.CONSECUTIVE_DURATION
  ? __ENV.CONSECUTIVE_DURATION
  : 60;
const testRun = __ENV.TEST_RUN ? __ENV.TEST_RUN : "default";

const errors_chunked_upload = new Counter("errors_chunked_upload");
const uploadDuration = new Trend("upload_duration", true);

const to = {};

export const options = {
  // vus: 1,
  thresholds: to,
  summaryTrendStats: trends,
  scenarios: {
    storage_multipart: sc(rampingDuration, consecutiveDuration, conns),
  },
};

export default () => {
  const reqStarted = new Date();

  const name = uuidv4();
  const path = `${testRun}/${name}`;
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${serviceToken}`,
    apikey: serviceToken,
    "x-upsert": "true",
    "tus-resumable": "1.0.0",
  };

  const metadata = {
    bucketName: "tus",
    objectName: path,
    contentType: "application/octet-stream",
  };
  const length = binFile.byteLength;
  // create file on server via tus protocol
  const uploadRes = http.post(`${storageMultipartUri}`, null, {
    headers: Object.assign(
      {
        "Upload-Length": length,
        "Content-Length": 0,
        "Upload-Metadata": `bucketName ${b64encode(
          metadata.bucketName,
        )},objectName ${b64encode(metadata.objectName)},contentType ${b64encode(
          metadata.contentType,
        )}`,
      },
      headers,
    ),
  });
  check(uploadRes, {
    "upload is status 201": (r) => r.status === 201,
  });
  console.log(uploadRes.headers["Location"]);
  const location = uploadRes.headers["Location"];

  // upload file to server
  let offset = 0;
  while (offset < length) {
    // check current offset on server
    try {
      const offsetRes = http.head(location, {
        headers,
      });
      check(offsetRes, {
        "offset is status 200": (r) => r.status === 200,
      });
      console.log("status1", offsetRes.status);
      console.log(offsetRes.headers);
      console.log(offsetRes.headers["Upload-Offset"]);
      offset = parseInt(offsetRes.headers["Upload-Offset"]);
      if (!offset) offset = 0;
      let chunkSize = 1024 * 1024 * chunkSizeMB;
      if (offset == length) {
        break;
      }
      if (offset + chunkSize >= length) {
        chunkSize = length - offset;
      }
      console.log(chunkSize, offset, length);
      const chunk = binFile.slice(offset, offset + chunkSize);
      const uploadChunkRes = http.patch(location, chunk, {
        headers: Object.assign(
          {
            "Content-Type": "application/offset+octet-stream",
            "Upload-Offset": offset,
            "Content-Length": chunk.byteLength,
          },
          headers,
        ),
      });
      console.log("status2", uploadChunkRes.status);
      check(uploadChunkRes, {
        "upload chunk is status 204": (r) => r.status === 204,
      });
      offset = parseInt(uploadChunkRes.headers["Upload-Offset"]);
      errors_chunked_upload.add(false);
    } catch (e) {
      console.log(e);
      errors_chunked_upload.add(true);
    }
  }

  const reqDuration = new Date() - reqStarted;
  console.log(reqDuration);
  uploadDuration.add(reqDuration);

  const removeRes = http.del(
    `${baseUri}/object/tus`,
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
