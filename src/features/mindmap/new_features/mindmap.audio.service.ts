import axios from "axios";
import FormData from "form-data";
import { generateMindmap } from "../service/mindmap.ai.service";



/**
 * Transcribes audio buffer using OpenAI Whisper or HuggingFace ASR,
 * then generates a mindmap from the transcript.
 */
export async function audioToMindmap(
  audioBuffer: Buffer,
  mimeType: string,
  title: string
): Promise<any> {
  const transcript = await transcribeAudio(audioBuffer, mimeType);
  if (!transcript || transcript.trim().length < 10) {
    throw new Error("Audio transcription produced insufficient text.");
  }
  return generateMindmap(transcript);
}

async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  // 1. OpenAI Whisper (preferred)
  if (process.env.OPENAI_API_KEY) {
    try {
      const form = new FormData();
      const ext = mimeType.split("/")[1]?.split(";")[0] || "webm";
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
    } catch (err) {
      console.warn("Whisper transcription failed, trying HF fallback:", (err as any).message);
    }
  }

  // 2. HuggingFace ASR fallback
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
      if (typeof data === "string") return data;
    } catch (err) {
      console.warn("HF ASR failed:", (err as any).message);
    }
  }

  throw new Error("No ASR provider configured. Set OPENAI_API_KEY or HUGGINGFACE_API_KEY.");
}
