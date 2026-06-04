import { readFileSync } from 'node:fs'
import { S3Client, CreateBucketCommand, PutObjectCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3'

const BUCKET = 'mfe-endereco'
const ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:4566'

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
})

async function ensureBucket() {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
  } catch (err) {
    if ((err as { name?: string }).name !== 'BucketAlreadyOwnedByYou') {
      // LocalStack costuma ser idempotente; ignora "já existe"
    }
  }
  await s3.send(new PutBucketPolicyCommand({
    Bucket: BUCKET,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${BUCKET}/*` }],
    }),
  }))
}

async function main() {
  await ensureBucket()
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: 'endereco.js',
    Body: readFileSync('dist/endereco.js'),
    ContentType: 'application/javascript',
  }))
  console.log(`✅ deploy: ${ENDPOINT}/${BUCKET}/endereco.js`)
}

main().catch((e) => { console.error(e); process.exit(1) })
