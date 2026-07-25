import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { prisma } from "@/lib/prisma"
import { storageService } from "@/lib/server/services/storage.service"
import { sendGameRecordingEmail } from "@/lib/nodemailer/sender/sender.email"
import fs from "fs"
import path from "path"
import { watermarkService } from "@/lib/server/services/watermark.service"
import os from "os"

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
    // const inputPath = path.join("/tmp", file.name)
    const inputPath = path.join(process.cwd(), file.name)
    fs.writeFileSync(inputPath, Buffer.from(await file.arrayBuffer()))

    // Apply watermark
    // const outputPath = path.join("/tmp", `wm-${file.name}`)

    const outputPath = path.join(process.cwd(), `wm-${file.name}`)
    const resultFile = await watermarkService.addWatermark(inputPath, outputPath)
    const uploaded = await storageService.upload(resultFile, deviceId)

    // const uploaded = await storageService.upload(file, deviceId) // Upload to RustFS bucket

    const recording = await prisma.recording.create({
      data: {
        deviceId,
        emails,
        status: "uploaded",
        filePath: uploaded.url,
      },
    })

    const videoUrl = ""
    // Send email with video link
    if (emails.length && videoUrl) {
      try {
        const sendEmail = await sendGameRecordingEmail({
          recipients: emails,
          videoUrl,
        })
        console.info({ sendEmail })
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
