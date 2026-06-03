import axios from "axios";
import FormData from "form-data";
import { generateMindmap } from "../service/mindmap.ai.service";

// ─────────────────────────────────────────────
// VIDEO FILE → MINDMAP
// Extracts audio from a video buffer, transcribes it, then generates a mindmap.
// Requires ffmpeg available on the server PATH for audio extraction.
// ─────────────────────────────────────────────
export async function videoFileToMindmap(
  videoBuffer: Buffer,
  mimeType: string,
  title: string
): Promise<any> {
  const audioBuffer = await extractAudioFromVideo(videoBuffer, mimeType);
  const transcript = await transcribeAudio(audioBuffer, "audio/mp3");
  if (!transcript || transcript.trim().length < 10) {
    throw new Error("Video audio transcription produced insufficient text.");
  }
  return generateMindmap(transcript);
}

async function extractAudioFromVideo(videoBuffer: Buffer, mimeType: string): Promise<Buffer> {
  const { execSync, spawnSync } = await import("child_process");
  const os = await import("os");
  const path = await import("path");
  const fs = await import("fs");

  const tmpDir = os.tmpdir();
  const ext = mimeType.split("/")[1]?.split(";")[0] || "mp4";
  const inputPath = path.join(tmpDir, `input_${Date.now()}.${ext}`);
  const outputPath = path.join(tmpDir, `output_${Date.now()}.mp3`);

  try {
    fs.writeFileSync(inputPath, videoBuffer);
    // Extract audio at lower bitrate to reduce file size for Whisper
    spawnSync("ffmpeg", ["-i", inputPath, "-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k", outputPath, "-y"], {
      timeout: 120000,
    });
    const audioBuffer = fs.readFileSync(outputPath);
    return audioBuffer;
  } finally {
    try { fs.unlinkSync(inputPath); } catch { }
    try { fs.unlinkSync(outputPath); } catch { }
  }
}

// ─────────────────────────────────────────────
// YOUTUBE URL → MINDMAP
// Fetches transcript via YouTube transcript API or yt-dlp subtitle extraction.
// ─────────────────────────────────────────────
export async function youtubeToMindmap(youtubeUrl: string): Promise<any> {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) throw new Error("Could not extract YouTube video ID from URL.");

  let transcript = "";

  // Strategy 1: YouTube transcript API (no auth needed for auto-generated captions)
  try {
    transcript = await fetchYouTubeTranscript(videoId);
  } catch (err) {
    console.warn("YouTube transcript fetch failed, trying yt-dlp:", (err as any).message);
  }

  // Strategy 2: yt-dlp subtitle extraction (requires yt-dlp on server PATH)
  if (!transcript) {
    try {
      transcript = await fetchViaYtDlp(youtubeUrl);
    } catch (err) {
      console.warn("yt-dlp failed:", (err as any).message);
    }
  }

  // Strategy 3: If youtube_transcript_api python microservice is configured
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
      "The video may have no captions, or yt-dlp/transcript service is not configured."
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

/**
 * Fetches auto-generated captions from YouTube's timedtext endpoint.
 * This is the same endpoint used by YouTube's transcript panel (no auth required for public videos).
 */
async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  // Step 1: Get available transcript tracks from the YouTube page
  const pageResp = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { "Accept-Language": "en-US,en;q=0.9" },
    timeout: 20000,
  });

  // Extract caption track URL from page data
  const captionMatch = pageResp.data.match(/"captionTracks":(\[.*?\])/);
  if (!captionMatch) throw new Error("No caption tracks found");

  const tracks = JSON.parse(captionMatch[1]);
  const englishTrack = tracks.find((t: any) => t.languageCode === "en" || t.vssId?.startsWith("a.en")) || tracks[0];
  if (!englishTrack?.baseUrl) throw new Error("No usable caption track URL");

  // Step 2: Fetch the transcript XML
  const transcriptResp = await axios.get(englishTrack.baseUrl, { timeout: 15000 });
  const xml: string = transcriptResp.data;

  // Step 3: Extract text from XML, strip HTML entities
  const texts = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map(m => m[1]
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/<[^>]+>/g, "")
    );

  return texts.join(" ");
}

async function fetchViaYtDlp(url: string): Promise<string> {
  const os = await import("os");
  const path = await import("path");
  const fs = await import("fs");
  const { spawnSync } = await import("child_process");

  const tmpDir = os.tmpdir();
  const outBase = path.join(tmpDir, `yt_${Date.now()}`);

  // Download auto-generated English subtitles as VTT
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

  // Strip VTT formatting — keep only text lines
  return vttContent
    .split("\n")
    .filter(line => line && !line.startsWith("WEBVTT") && !line.match(/^\d{2}:\d{2}/) && !line.match(/^NOTE/))
    .join(" ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  if (process.env.OPENAI_API_KEY) {
    try {
      const form = new FormData();
      form.append("file", buffer, { filename: "audio.mp3", contentType: mimeType });
      form.append("model", "whisper-1");
      const { data } = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        form,
        {
          headers: { ...form.getHeaders(), Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          timeout: 120000,
        }
      );
      if (data?.text) return data.text;
    } catch (err) {
      console.warn("Whisper transcription failed:", (err as any).message);
    }
  }

  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      const model = process.env.HF_ASR_MODEL || "openai/whisper-large-v3";
      const { data } = await axios.post(
        `https://api-inference.huggingface.co/models/${model}`,
        buffer,
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": mimeType,
          },
          timeout: 180000,
        }
      );
      if (data?.text) return data.text;
    } catch (err) {
      console.warn("HF ASR failed:", (err as any).message);
    }
  }

  throw new Error("No ASR provider available for video transcription.");
}
