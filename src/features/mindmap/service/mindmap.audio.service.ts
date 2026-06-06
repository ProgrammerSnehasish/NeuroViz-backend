import "dotenv/config";
import axios from "axios";
import FormData from "form-data";
import path from "path";
import os from "os";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import wav from "node-wav";
import { pipeline } from "@xenova/transformers";
import { generateMindmap } from "./mindmap.ai.service";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ── Audio decoding (any format → 16kHz mono Float32Array) ────────────────────

async function bufferToFloat32(buffer: Buffer, mimeType: string): Promise<Float32Array> {
  const ext = mimeType.split("/")[1]?.split(";")[0] || "webm";
  const tmpIn = path.join(os.tmpdir(), `asr_in_${Date.now()}.${ext}`);
  const tmpOut = path.join(os.tmpdir(), `asr_out_${Date.now()}.wav`);

  fs.writeFileSync(tmpIn, buffer);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(tmpIn)
      .audioFrequency(16000)
      .audioChannels(1)
      .audioCodec("pcm_s16le")
      .format("wav")
      .on("end", resolve as () => void)
      .on("error", reject)
      .save(tmpOut);
  });

  const wavBuffer = fs.readFileSync(tmpOut);

  try { fs.unlinkSync(tmpIn); } catch { }
  try { fs.unlinkSync(tmpOut); } catch { }

  const decoded = wav.decode(wavBuffer);
  const pcm = decoded.channelData[0];
  return pcm instanceof Float32Array ? pcm : Float32Array.from(pcm);
}

// ── Local Xenova Whisper ──────────────────────────────────────────────────────

let asrPipeline: any = null;

async function getAsrPipeline() {
  if (!asrPipeline) {
    console.log("[ASR] Loading Whisper model (first run downloads ~150MB)...");
    asrPipeline = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-base.en"
    );
    console.log("[ASR] Model ready.");
  }
  return asrPipeline;
}

async function transcribeLocal(buffer: Buffer, mimeType: string): Promise<string> {
  const audioData = await bufferToFloat32(buffer, mimeType);
  const asr = await getAsrPipeline();
  const result = await asr(audioData, { sampling_rate: 16000 });
  return result?.text ?? "";
}

// ── Provider chain ────────────────────────────────────────────────────────────

async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const errors: string[] = [];
  const ext = mimeType.split("/")[1]?.split(";")[0] || "webm";

  // 1. OpenAI Whisper
  if (process.env.OPENAI_API_KEY) {
    try {
      const form = new FormData();
      form.append("file", buffer, { filename: `audio.${ext}`, contentType: mimeType });
      form.append("model", "whisper-1");

      const { data } = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          timeout: 120000,
        }
      );
      if (data?.text) return data.text;
    } catch (err: any) {
      const detail = err.response?.data?.error?.message || err.message;
      errors.push(`OpenAI [${err.response?.status}]: ${detail}`);
      console.warn("Whisper failed:", err.response?.status, err.response?.data);
    }
  }

  // 2. HuggingFace API
  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      const { data } = await axios.post(
        `https://api-inference.huggingface.co/models/${process.env.HF_ASR_MODEL}`,
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
      if (typeof data === "string") return data;
    } catch (err: any) {
      errors.push(`HuggingFace: ${err.message}`);
      console.warn("HF ASR failed:", err.message);
    }
  }

  // 3. Local Xenova Whisper (offline fallback)
  try {
    console.log("[ASR] Falling back to local Xenova Whisper...");
    const text = await transcribeLocal(buffer, mimeType);
    if (text?.trim().length > 0) return text;
    errors.push("Local Xenova: returned empty text");
  } catch (err: any) {
    errors.push(`Local Xenova: ${err.message}`);
    console.warn("Local ASR failed:", err.message);
  }

  throw new Error(`All ASR providers failed:\n${errors.join("\n")}`);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Transcribes audio buffer using OpenAI Whisper → HuggingFace → local Xenova,
 * then generates a mindmap from the transcript.
 */
export async function audioToMindmap(
  audioBuffer: Buffer,
  mimeType: string
): Promise<any> {
  const transcript = await transcribeAudio(audioBuffer, mimeType);
  if (!transcript || transcript.trim().length < 10) {
    throw new Error("Audio transcription produced insufficient text.");
  }
  return generateMindmap(transcript);
}