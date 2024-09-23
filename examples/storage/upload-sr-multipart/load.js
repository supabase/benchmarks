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

const chunkSizeMB = __ENV.CHUNK_SIZE_MB ? parseInt(__ENV.CHUNK_SIZE_MB) : 8;

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

async function uploadPartsInParallel(
  testFile,
  partSize,
  s3Client,
  testBucketName,
  testFileKey,
  uploadId,
) {
  let offset = 0;
  const partsResults = [];
  const maxConcurrentUploads = 16;
  const uploadQueue = [];

  const enqueueUpload = async () => {
    if (offset >= testFile.byteLength) return null; // Break condition for recursion

    const currentOffset = offset;
    const currentPartSize = Math.min(
      partSize,
      testFile.byteLength - currentOffset,
    );
    const part = testFile.slice(currentOffset, currentOffset + currentPartSize);
    const partNumber = partsResults.length + 1;

    offset += currentPartSize; // Prepare offset for next part

    console.log(`Uploading part ${partNumber} of size ${currentPartSize}`);
    return s3Client
      .uploadPart(testBucketName, testFileKey, uploadId, partNumber, part)
      .then((result) => {
        partsResults.push(result); // Store result of the upload
        return enqueueUpload(); // Try to enqueue next upload if possible
      });
  };

  // Initially fill the uploadQueue
  for (
    let i = 0;
    i < maxConcurrentUploads && i < Math.ceil(testFile.byteLength / partSize);
    i++
  ) {
    uploadQueue.push(enqueueUpload());
  }

  await Promise.all(uploadQueue); // Wait for all uploads in the queue to finish
  return partsResults; // Return results of all parts uploaded
}

export default async () => {
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

  const mp = await s3Client.createMultipartUpload(testBucketName, testFileKey);
  console.log("mp", JSON.stringify(mp, null, 2));

  let offset = 0;
  const partSize = chunkSizeMB * 1024 * 1024;
  console.log("testFile.length", testFile.byteLength, offset);
  
  try {
    const parts = await uploadPartsInParallel(
      testFile,
      partSize,
      s3Client,
      testBucketName,
      testFileKey,
      mp.uploadId,
    );
    console.log("parts uploaded", parts.length);
    await s3Client.completeMultipartUpload(
      testBucketName,
      testFileKey,
      mp.uploadId,
      parts,
    );
    console.log("completed");
    check(true, {
      "upload is status ok": (r) => true,
    });
  } catch (e) {
    console.log(e);
    check(false, {
      "upload is status ok": (r) => false,
    });
    await s3Client.abortMultipartUpload(
      testBucketName,
      testFileKey,
      mp.uploadId,
    );
  }

  const reqDuration = new Date() - reqStarted;
  uploadDuration.add(reqDuration);

  const removeRes = http.del(
    `${baseUri}/storage/v1/object/s3bench`,
    JSON.stringify({
      prefixes: [`${testRun}/${name}`],
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
};
