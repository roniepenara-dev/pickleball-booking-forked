import { randomUUID } from "crypto"
import {
  S3Client,
  PutObjectCommand,
  ListBucketsCommand,
  CreateBucketCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

class StorageService {
  private endpoint: string
  private apiKey: string
  private apiSecret?: string
  private bucket: string
  private mode: "api" | "s3"
  private s3?: S3Client

  constructor(bucket = "vandyke1906", mode: "api" | "s3" = "s3") {
    this.bucket = bucket
    this.mode = mode
    this.endpoint = process.env.STORAGE_ENDPOINT ?? ""
    this.apiKey = process.env.STORAGE_KEY ?? ""
    this.apiSecret = process.env.STORAGE_SECRET ?? ""

    if (!this.endpoint || !this.apiKey)
      throw new Error("StorageService misconfigured: endpoint or key missing")

    // Decide mode based on env
    if (mode === "s3") {
      if (!this.apiSecret) throw new Error("StorageService misconfigured: endpoint or key missing")
      this.s3 = new S3Client({
        endpoint: this.endpoint,
        region: "us-east-1",
        credentials: {
          accessKeyId: this.apiKey,
          secretAccessKey: this.apiSecret,
        },
        forcePathStyle: true,
      })
    }
  }

  async upload(file: File, deviceId: string, bucket?: string) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const filename = `${deviceId}-${randomUUID()}.mp4`
    const targetBucket = bucket ?? this.bucket

    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: targetBucket,
          Key: filename,
          Body: buffer,
          ContentType: "video/mp4",
        }),
      )

      const presignedUrl = await this.getPresignedUrl(filename, 432000)

      return {
        filename,
        bucket: targetBucket,
        url: presignedUrl,
        id: filename,
      }
    } else {
      const formData = new FormData()
      formData.append("file", new Blob([buffer]), filename)
      formData.append("bucket", targetBucket)
      formData.append("filename", filename)

      const response = await fetch(`${this.endpoint}/upload`, {
        method: "POST",
        headers: { "x-api-key": this.apiKey },
        body: formData,
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error("RustFS error:", errText)
        throw new Error(`RustFS upload failed: ${response.status}`)
      }

      const result = await response.json()

      // Request a signed URL from RustFS valid for 5 days
      const signedUrlResponse = await fetch(
        `${this.endpoint}/signed-url?file=${filename}&expiresIn=432000`,
        { headers: { "x-api-key": this.apiKey } },
      )

      if (!signedUrlResponse.ok) {
        throw new Error("Failed to generate RustFS signed URL")
      }

      const signedResult = await signedUrlResponse.json()

      return {
        filename,
        bucket: targetBucket,
        url: signedResult.url,
        id: result.id ?? filename,
      }
    }
  }

  /**  Generate a pre-signed URL for secure download */
  async getPresignedUrl(key: string, expiresInSeconds = 3600) {
    if (this.s3) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
      return await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds })
    } else {
      // RustFS mode: assume it has an endpoint for signed URLs
      const response = await fetch(`${this.endpoint}/signed-url?file=${key}`, {
        headers: { "x-api-key": this.apiKey },
      })
      if (!response.ok) {
        throw new Error("Failed to generate RustFS signed URL")
      }
      const result = await response.json()
      return result.url
    }
  }
}

export const storageService = new StorageService("vandyke1906")
