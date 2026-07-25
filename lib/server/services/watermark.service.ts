import ffmpeg from "fluent-ffmpeg"
import ffmpegPath from "ffmpeg-static"
import fs from "fs"
import path from "path"

class WatermarkService {
  private logoPath: string

  constructor() {
    this.logoPath = path.join(process.cwd(), "public/logo.png")
  }

  async ensureLogoLocal(url: string): Promise<string> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch logo: ${res.statusText}`)

    const buffer = await res.arrayBuffer()
    const logoPath = path.join(process.cwd(), "tmp-logo.png")
    fs.writeFileSync(logoPath, Buffer.from(buffer))
    return logoPath
  }

  async addWatermark(inputPath: string, outputPath: string): Promise<File> {
    this.logoPath = await this.ensureLogoLocal(
      "https://ffuq0pf52dpcvo3q.public.blob.vercel-storage.com/pickleballbook-resources/pickl.digos.png",
    )
    console.log(fs.statSync(inputPath).size)
    console.log(fs.existsSync(this.logoPath))
    const sourceFFMPEGPath = (
      process.env.NODE_ENV === "production"
        ? ffmpegPath
        : "D:\\Development\\pickleball-booking\\node_modules\\ffmpeg-static\\ffmpeg.exe"
    ) as string
    return new Promise((resolve, reject) => {
      ffmpeg(path.resolve(inputPath))
        .setFfmpegPath(sourceFFMPEGPath)
        .input(this.logoPath)
        .complexFilter([{ filter: "overlay", options: { x: "W-w-20", y: "H-h-20" } }])
        .outputOptions(["-c:v libx264", "-c:a aac"])
        .save(path.resolve(outputPath))
        .on("end", () => {
          const buffer = fs.readFileSync(outputPath)
          const file = new File([buffer], path.basename(outputPath), {
            type: "video/mp4",
            lastModified: Date.now(),
          })
          resolve(file)
        })
        .on("error", reject)
    })
  }
}

export const watermarkService = new WatermarkService()
