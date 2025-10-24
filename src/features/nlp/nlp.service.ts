import axios from "axios";
import { NLP } from "../../utils/env";

async function postTo(url?: string, body?: any) {
  if (!url) throw new Error("Service URL not configured");
  const { data } = await axios.post(url, body, { timeout: 120000 });
  return data;
}

export const NLPService = {
  summarize: async (text: string) => {
    if (process.env.NLP_PROVIDER === "python" && NLP.python.summarizer) {
      return postTo(NLP.python.summarizer, { text });
    }
    // fallback (if python service unavailable)
    return { summary: String(text).split(".").slice(0, 3).join(".") };
  },

  detectToxicity: async (text: string) => {
    if (process.env.NLP_PROVIDER === "python" && NLP.python.toxicity) {
      return postTo(NLP.python.toxicity, { text });
    }
    return { label: "NOT_TOXIC", score: 0.0 };
  },

  sentiment: async (text: string) => {
    if (process.env.NLP_PROVIDER === "python" && NLP.python.sentiment) {
      return postTo(NLP.python.sentiment, { text });
    }
    return { label: "NEUTRAL", score: 0.0 };
  },

  keywords: async (text: string) => {
    if (process.env.NLP_PROVIDER === "python" && NLP.python.keywords) {
      return postTo(NLP.python.keywords, { text });
    }
    return { keywords: [] };
  },

  classify: async (text: string) => {
    if (process.env.NLP_PROVIDER === "python" && NLP.python.classify) {
      return postTo(NLP.python.classify, { text });
    }
    return { labels: [], scores: [] };
  },

  entities: async (text: string) => {
    if (process.env.NLP_PROVIDER === "python" && NLP.python.ner) {
      return postTo(NLP.python.ner, { text });
    }
    return { entities: [] };
  }
};
