import axios from "axios";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { YoutubeTranscript } from "youtube-transcript";
import { generateMindmap } from "./mindmap.ai.service";
import { audioToMindmap } from "./mindmap.audio.service";

// ─────────────────────────────────────────────
// VIDEO FILE → MINDMAP
// ─────────────────────────────────────────────
export async function videoFileToMindmap(
  videoBuffer: Buffer,
  mimeType: string
): Promise<any> {
  const audioBuffer = await extractAudioFromVideo(videoBuffer, mimeType);
  return audioToMindmap(audioBuffer, "audio/mpeg");
}

async function extractAudioFromVideo(videoBuffer: Buffer, mimeType: string): Promise<Buffer> {
  const os = await import("os");
  const path = await import("path");
  const fs = await import("fs");
  const { spawnSync } = await import("child_process");

  const tmpDir = os.tmpdir();
  const ext = mimeType.split("/")[1]?.split(";")[0] || "mp4";
  const inputPath = path.join(tmpDir, `input_${Date.now()}.${ext}`);
  const outputPath = path.join(tmpDir, `output_${Date.now()}.mp3`);

  fs.writeFileSync(inputPath, videoBuffer);

  const result = spawnSync(
    ffmpegInstaller.path,
    ["-i", inputPath, "-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k", outputPath, "-y"],
    { timeout: 120000 }
  );

  if (result.status !== 0) {
    try { fs.unlinkSync(inputPath); } catch { }
    const stderr = result.stderr?.toString() ?? "unknown error";
    throw new Error(`ffmpeg audio extraction failed: ${stderr}`);
  }

  if (!fs.existsSync(outputPath)) {
    try { fs.unlinkSync(inputPath); } catch { }
    throw new Error("ffmpeg did not produce output file.");
  }

  const audioBuffer = fs.readFileSync(outputPath);
  try { fs.unlinkSync(inputPath); } catch { }
  try { fs.unlinkSync(outputPath); } catch { }

  return audioBuffer;
}

// ─────────────────────────────────────────────
// YOUTUBE URL → MINDMAP
// ─────────────────────────────────────────────
export async function youtubeToMindmap(youtubeUrl: string): Promise<any> {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) throw new Error("Could not extract YouTube video ID from URL.");

  let transcript = "";

  // Strategy 1: youtube-transcript npm package
  try {
    transcript = await fetchYouTubeTranscript(videoId);
  } catch (err) {
    console.warn("youtube-transcript failed:", (err as any).message);
  }

  // Strategy 2: Python microservice fallback
  if (!transcript && process.env.YOUTUBE_TRANSCRIPT_API_URL) {
    try {
      const { data } = await axios.post(
        process.env.YOUTUBE_TRANSCRIPT_API_URL,
        { video_id: videoId },
        { timeout: 30000 }
      );
      transcript = data?.transcript || data?.text || "";
    } catch (err) {
      console.warn("YouTube transcript microservice failed:", (err as any).message);
    }
  }

  if (!transcript || transcript.trim().length < 20) {
    throw new Error(
      "Could not retrieve transcript for this video. " +
      "Ensure the video has captions enabled."
    );
  }

  return generateMindmap(transcript.replace(/\s+/g, " ").trim());
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  const entries = await YoutubeTranscript.fetchTranscript(videoId);
  if (!entries || entries.length === 0) throw new Error("No transcript entries returned.");
  return entries.map((e) => e.text).join(" ");
}

async function fetchViaYtDlp(url: string): Promise<string> {
  const os = await import("os");
  const path = await import("path");
  const fs = await import("fs");
  const { spawnSync } = await import("child_process");

  const tmpDir = os.tmpdir();
  const outBase = path.join(tmpDir, `yt_${Date.now()}`);

  const result = spawnSync(
    "yt-dlp",
    ["--write-auto-subs", "--sub-lang", "en", "--skip-download", "--sub-format", "vtt", "-o", outBase, url],
    { timeout: 60000 }
  );

  if (result.status !== 0) throw new Error("yt-dlp exited with non-zero status");

  const vttFile = `${outBase}.en.vtt`;
  if (!fs.existsSync(vttFile)) throw new Error("VTT subtitle file not found after yt-dlp");

  const vttContent = fs.readFileSync(vttFile, "utf-8");
  fs.unlinkSync(vttFile);

  return vttContent
    .split("\n")
    .filter(
      (line) =>
        line &&
        !line.startsWith("WEBVTT") &&
        !line.match(/^\d{2}:\d{2}/) &&
        !line.match(/^NOTE/)
    )
    .join(" ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}