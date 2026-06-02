import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
export type TTSSpeed = number; // 0.25 to 4.0, default 1.0

export interface TTSOptions {
  voice?: TTSVoice;
  speed?: TTSSpeed;
  /** SSML-formatted text for more nuanced reading (pauses, emphasis, etc.) */
  useSsml?: boolean;
}

/**
 * Converts text to an audio buffer.
 * Returns { buffer: Buffer, mimeType: string, durationEstimateSeconds: number }
 */
export async function textToAudio(
  text: string,
  options: TTSOptions = {}
): Promise<{ buffer: Buffer; mimeType: string; estimatedDuration: number }> {
  const { voice = "nova", speed = 1.0 } = options;
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (cleanText.length < 1) throw new Error("Text is too short for TTS.");

  // Rough estimate: avg English ~150 words/min, ~5 chars/word
  const estimatedDuration = Math.ceil((cleanText.length / 5 / 150) * 60 / speed);

  // Strategy 1: OpenAI TTS (best quality)
  if (process.env.OPENAI_API_KEY) {
    try {
      const resp = await axios.post(
        "https://api.openai.com/v1/audio/speech",
        { model: "tts-1", input: cleanText, voice, speed },
        {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
          responseType: "arraybuffer",
          timeout: 120000,
        }
      );
      return {
        buffer: Buffer.from(resp.data),
        mimeType: "audio/mpeg",
        estimatedDuration,
      };
    } catch (err) {
      console.warn("OpenAI TTS failed, trying fallback:", (err as any).message);
    }
  }

  // Strategy 2: HuggingFace TTS (facebook/mms-tts-eng or espnet)
  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      const model = process.env.HF_TTS_MODEL || "facebook/mms-tts-eng";
      const { data } = await axios.post(
        `https://api-inference.huggingface.co/models/${model}`,
        { inputs: cleanText },
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
          timeout: 120000,
        }
      );
      return {
        buffer: Buffer.from(data),
        mimeType: "audio/flac",
        estimatedDuration,
      };
    } catch (err) {
      console.warn("HF TTS failed:", (err as any).message);
    }
  }

  // Strategy 3: eSpeak (server-side fallback, requires espeak-ng installed)
  try {
    return await espeakFallback(cleanText, estimatedDuration);
  } catch (err) {
    console.warn("eSpeak TTS failed:", (err as any).message);
  }

  throw new Error("No TTS provider is configured. Set OPENAI_API_KEY or HUGGINGFACE_API_KEY, or install espeak-ng.");
}

/**
 * eSpeak-NG fallback — generates WAV audio locally.
 * Requires: `espeak-ng` on the server PATH.
 */
async function espeakFallback(text: string, estimatedDuration: number): Promise<{
  buffer: Buffer;
  mimeType: string;
  estimatedDuration: number;
}> {
  const { spawnSync } = await import("child_process");
  const tmpOut = path.join(os.tmpdir(), `espeak_${Date.now()}.wav`);

  const result = spawnSync("espeak-ng", ["-w", tmpOut, "-s", "150", text], { timeout: 30000 });
  if (result.status !== 0) throw new Error("espeak-ng exited with non-zero status");

  const buffer = fs.readFileSync(tmpOut);
  fs.unlinkSync(tmpOut);
  return { buffer, mimeType: "audio/wav", estimatedDuration };
}

/**
 * Converts a mindmap structure into a readable narration script.
 * Useful for neurodivergent students who prefer audio over visual nodes.
 */
export function mindmapToNarration(mindmap: { topic: string; nodes: Array<{ label: string; children?: Array<{ label: string }> }> }): string {
  const lines: string[] = [`Today we'll explore: ${mindmap.topic}.`, ""];

  for (const node of mindmap.nodes) {
    lines.push(`${node.label}.`);
    if (node.children?.length) {
      lines.push(`Under this topic, we have: ${node.children.map(c => c.label).join(". ")}.`);
    }
    lines.push("");
  }

  return lines.join(" ").replace(/\s+/g, " ").trim();
}
