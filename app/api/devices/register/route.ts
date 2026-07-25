import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/server/rate-limiter"
import { prisma } from "@/lib/prisma"

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    // Header-based security
    const apiKey = request.headers.get("x-api-key")
    if (!apiKey || apiKey !== process.env.DEVICE_REGISTER_API_KEY)
      return NextResponse.json({ error: "Invalid or missing API key." }, { status: 400 })

    const body = await request.json()
    const { deviceId, deviceName, appVersion, platform } = body

    if (!deviceId) return NextResponse.json({ error: "Device ID is required." }, { status: 400 })

    const record = await prisma.device.upsert({
      where: { deviceId_appVersion: { deviceId, appVersion } },
      update: {
        deviceName,
        appVersion,
        platform,
      },
      create: {
        deviceId,
        deviceName,
        appVersion,
        platform,
      },
    })

    return NextResponse.json({ success: true, keyId: record.id })
  } catch (error) {
    return NextResponse.json({ error: "Failed to register device" }, { status: 500 })
  }
})
