import axios from "axios";
import { NLP } from "../../utils/env";
import wink from "wink-nlp";
import model from "wink-eng-lite-web-model";

const nlp = wink(model);

function localFallback(title: string, text: string) {
  const doc = nlp.readDoc(text);

  const STOPWORDS = ["branch", "field", "area", "science", "system", "machine", "computer", "task"];

  let tokens = doc.tokens().filter(t => {
    const tok: any = t;
    const p = typeof tok.pos === "function" ? tok.pos() : (tok.pos ?? "");
    return (p === "NOUN" || p === "PROPN" || p === "ADJ") && !STOPWORDS.includes(t.out().toLowerCase());
  }).out();

  if (!tokens.length) {
    tokens = doc
      .tokens()
      .filter(t => t.out().length > 3 && !t.out().match(/[\d,\.]/))
      .out();
  }

  const freq: Record<string, number> = {};
  tokens.forEach((t: string) => {
    const k = t.toLowerCase();
    freq[k] = (freq[k] || 0) + 1;
  });

  const topics = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(x => x[0]);

  const sentences = doc.sentences().out();
  const nodes = topics.map(topic => ({
    label: topic[0].toUpperCase() + topic.slice(1),
    children: sentences
      .filter(s => s.toLowerCase().includes(topic))
      .slice(0, 3)
      .map(s => ({ label: s }))
  }));

  if (!nodes.length) {
    nodes.push({
      label: "General Overview",
      children: [{ label: text.slice(0, 120) + "..." }],
    });
  }

  return { topic: title, nodes };
}

export async function generateMindmap(title: string, text: string) {
  // use python microservice if configured
  if (process.env.NLP_PROVIDER === "python" && NLP.python.summarizer) {
    try {
      // call python endpoint you will provide (design: python returns JSON mindmap)
      const url = (NLP.python.summarizer as string).replace(/\/summarize\/?$/, "/mindmap");
      const { data } = await axios.post(url, { text, title }, { timeout: 120000 });
      if (data?.mindmap) return data.mindmap;
      if (data?.summary) return localFallback(title, data.summary);
    } catch (err) {
      console.warn("python mindmap error, falling back:", (err as any).message);
    }
  }

  // fallback to local or HF/OpenAI if configured
  if (process.env.NLP_PROVIDER === "openai" && process.env.OPENAI_API_KEY) {
    // OpenAI path (simple) -- returns a text we attempt to parse as JSON, otherwise fallback
    try {
      const prompt = `Create JSON mindmap structure for the title "${title}" from the text. Return only JSON object with keys "topic" and "nodes". Text: ${text}`;
      const resp = await axios.post("https://api.openai.com/v1/chat/completions", {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }});
      const content = resp.data?.choices?.[0]?.message?.content;
      try { return JSON.parse(content); } catch { return localFallback(title, content || text); }
    } catch (_) {}
  }

  if (process.env.NLP_PROVIDER === "huggingface" && process.env.HUGGINGFACE_API_KEY) {
    try {
      const modelId = "facebook/bart-large-cnn";
      const prompt = `Return a JSON mindmap (keys: topic, nodes) for title "${title}" from the text: ${text}`;
      const resp = await axios.post(`https://api-inference.huggingface.co/models/${modelId}`, { inputs: prompt }, { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` }, timeout: 120000 });
      const out = resp.data?.[0]?.generated_text ?? resp.data;
      try { return JSON.parse(out); } catch { return localFallback(title, String(out)); }
    } catch (_) {}
  }

  // default: local fallback
  return localFallback(title, text);
}
