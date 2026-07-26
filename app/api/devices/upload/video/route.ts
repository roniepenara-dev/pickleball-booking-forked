import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { prisma } from "@/lib/prisma"
import { storageService } from "@/lib/server/services/storage.service"
import { sendGameRecordingEmail } from "@/lib/nodemailer/sender/sender.email"
import fs from "fs"
import path from "path"
import { storagePath, watermarkService } from "@/lib/server/services/watermark.service"

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    // Header-based security
    const apiKey = request.headers.get("x-api-key")
    if (!apiKey || apiKey !== process.env.DEVICE_UPLOAD_API_KEY) {
      return NextResponse.json({ error: "Invalid or missing API key." }, { status: 400 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const deviceId = formData.get("deviceId")?.toString() ?? ""
    const emails = formData.get("emails")?.toString() ?? ""
    const status = formData.get("status")?.toString() ?? ""
    const file = formData.get("file") as File | null

    if (!deviceId || !file)
      return NextResponse.json({ error: "Device ID and file are required." }, { status: 400 })

    // Save uploaded file to /tmp
    const inputPath = path.join(storagePath, file.name)
    fs.writeFileSync(inputPath, Buffer.from(await file.arrayBuffer()))

    // Apply watermark
    const outputPath = path.join(storagePath, `wm-${file.name}`)
    const resultFile = await watermarkService.addWatermark(inputPath, outputPath)
    const uploaded = await storageService.upload(resultFile, deviceId)

    const recording = await prisma.recording.create({
      data: {
        deviceId,
        emails,
        status: "uploaded",
        filePath: uploaded.url,
      },
    })

    // Send email with video link
    if (emails.length && uploaded) {
      try {
        await sendGameRecordingEmail({
          recipients: emails,
          videoUrl: uploaded.url,
        })
      } catch (error) {
        console.error("Sending game error", error)
      }
    }

    return NextResponse.json({ success: true, recordingId: recording.id })
  } catch (error) {
    console.error("Upload failed:", error)
    return NextResponse.json({ error: "Failed to upload video" }, { status: 500 })
  }
})
