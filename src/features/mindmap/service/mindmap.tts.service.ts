import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import { pipeline } from "@xenova/transformers";

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
export type TTSSpeed = number;
type Mindmap = {
  topic: string;
  nodes: Array<{
    label: string;
    description?: string;
    children?: Array<{
      label: string;
      description?: string;
    }>;
  }>;
};

export interface TTSOptions {
  voice?: TTSVoice;
  speed?: TTSSpeed;
  useSsml?: boolean;
}

// ── Local Xenova TTS ──────────────────────────────────────────────────────────

let ttsPipeline: any = null;

async function getLocalTtsPipeline() {
  if (!ttsPipeline) {
    console.log("[TTS] Loading local TTS model...");
    ttsPipeline = await pipeline("text-to-speech", "Xenova/mms-tts-eng");
    console.log("[TTS] Local TTS model ready.");
  }
  return ttsPipeline;
}

async function localTtsFallback(
  text: string,
  estimatedDuration: number
): Promise<{ buffer: Buffer; mimeType: string; estimatedDuration: number }> {
  const tts = await getLocalTtsPipeline();
  const result = await tts(text);  // no speaker_embeddings needed
  const pcm = result.audio as Float32Array;
  const wavBuffer = float32ToWav(pcm, 16000);
  return { buffer: wavBuffer, mimeType: "audio/wav", estimatedDuration };
}

function float32ToWav(pcm: Float32Array, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  return buffer;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function textToAudio(
  text: string,
  options: TTSOptions = {}
): Promise<{ buffer: Buffer; mimeType: string; estimatedDuration: number }> {
  const { voice = "nova", speed = 1.0 } = options;
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (cleanText.length < 1) throw new Error("Text is too short for TTS.");

  const estimatedDuration = Math.ceil((cleanText.length / 5 / 150) * 60 / speed);

  // Strategy 1: OpenAI TTS
  if (process.env.OPENAI_API_KEY) {
    try {
      const resp = await axios.post(
        "https://api.openai.com/v1/audio/speech",
        { model: "tts-1", input: cleanText, voice, speed },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
          timeout: 120000,
        }
      );
      return { buffer: Buffer.from(resp.data), mimeType: "audio/mpeg", estimatedDuration };
    } catch (err) {
      console.warn("OpenAI TTS failed, trying fallback:", (err as any).message);
    }
  }

  // Strategy 2: HuggingFace TTS
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
      return { buffer: Buffer.from(data), mimeType: "audio/flac", estimatedDuration };
    } catch (err) {
      console.warn("HF TTS failed:", (err as any).message);
    }
  }

  // Strategy 3: Local Xenova TTS (offline fallback)
  try {
    return await localTtsFallback(cleanText, estimatedDuration);
  } catch (err) {
    console.warn("Local TTS failed:", (err as any).message);
  }

  throw new Error("All TTS providers failed.");
}

// ── Mindmap narration ─────────────────────────────────────────────────────────

export function mindmapToNarration(mindmap: Mindmap): string {
  const lines: string[] = [
    `Today we'll explore: ${mindmap.topic}.`,
    "",
  ];

  for (const node of mindmap.nodes) {
    // Main node
    let nodeText = node.label;

    if (node.description) {
      nodeText += `: ${node.description}`;
    }

    lines.push(`${nodeText}.`);

    // Children
    if (node.children?.length) {
      const childTexts = node.children.map((child) => {
        if (child.description) {
          return `${child.label}: ${child.description}`;
        }

        return child.label;
      });

      lines.push(
        `Under this topic, we have: ${childTexts.join(". ")}.`
      );
    }

    lines.push("");
  }

  return lines.join(" ").replace(/\s+/g, " ").trim();
}