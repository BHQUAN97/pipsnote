import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let clientInstance: S3Client | null = null;

function getClient(): S3Client {
  if (!clientInstance) {
    clientInstance = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  return clientInstance;
}

export async function uploadMediaToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const bucket = process.env.R2_MEDIA_BUCKET;
  const publicUrl = process.env.R2_MEDIA_PUBLIC_URL;

  if (!bucket || !publicUrl) {
    throw new Error('R2 media bucket not configured (R2_MEDIA_BUCKET / R2_MEDIA_PUBLIC_URL)');
  }

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${publicUrl.replace(/\/$/, '')}/${key}`;
}
