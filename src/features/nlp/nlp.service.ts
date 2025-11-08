import axios from "axios";
import { NLP } from "../../utils/env";

/* ------------------ Base HTTP Helper ------------------ */
async function postTo(url?: string, body?: any) {
  if (!url) throw new Error("Service URL not configured");
  const { data } = await axios.post(url, body, { timeout: 120000 });
  return data;
}

/* ------------------ Hugging Face Helper ------------------ */
async function hfRequest(model: string, input: string, extraParams?: any) {
  if (!NLP.hfKey) throw new Error("Missing Hugging Face API key");
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const { data } = await axios.post(
    url,
    { inputs: input, parameters: extraParams },
    {
      headers: { Authorization: `Bearer ${NLP.hfKey}` },
      timeout: 120000,
    }
  );
  return data;
}

/* ------------------ Utility: Merge Tokens ------------------ */
function mergeEntities(entities: any[]) {
  const merged: any[] = [];
  let current: any = null;

  for (const token of entities) {
    const cleanWord = token.word.replace(/^##/, "");
    if (!current) {
      current = { entity: token.entity_group || token.entity, word: cleanWord, score: token.score };
    } else if ((token.entity_group || token.entity) === current.entity) {
      current.word += cleanWord.startsWith(" ") ? cleanWord : " " + cleanWord;
      current.score = (current.score + token.score) / 2;
    } else {
      merged.push(current);
      current = { entity: token.entity_group || token.entity, word: cleanWord, score: token.score };
    }
  }

  if (current) merged.push(current);
  return merged.map((e) => ({
    ...e,
    entity:
      e.entity === "PER"
        ? "Person"
        : e.entity === "ORG"
        ? "Organization"
        : e.entity === "LOC"
        ? "Location"
        : e.entity === "MISC"
        ? "Miscellaneous"
        : e.entity,
  }));
}

/* ------------------ NLPService ------------------ */
export const NLPService = {
  /* ---------- Summarization ---------- */
  summarize: async (text: string) => {
    if (NLP.provider === "python" && NLP.python.summarizer)
      return postTo(NLP.python.summarizer, { text });

    if (NLP.provider === "huggingface") {
      try {
        const out = await hfRequest("facebook/bart-large-cnn", text);
        return { summary: out?.[0]?.summary_text || "No summary generated" };
      } catch {
        return { summary: text.split(".").slice(0, 3).join(".") };
      }
    }

    return { summary: text.split(".").slice(0, 3).join(".") };
  },

  /* ---------- Toxicity Detection ---------- */
  detectToxicity: async (text: string) => {
    if (NLP.provider === "python" && NLP.python.toxicity)
      return postTo(NLP.python.toxicity, { text });

    if (NLP.provider === "huggingface") {
      try {
        const out = await hfRequest("unitary/toxic-bert", text);
        return Array.isArray(out) ? out[0] : out;
      } catch {
        return { label: "non-toxic", score: 0 };
      }
    }

    return { label: "NOT_TOXIC", score: 0.0 };
  },

  /* ---------- Sentiment Analysis ---------- */
  sentiment: async (text: string) => {
  if (NLP.provider === "python" && NLP.python.sentiment)
    return postTo(NLP.python.sentiment, { text });

  if (NLP.provider === "huggingface") {
    try {
      const out = await hfRequest("nlptown/bert-base-multilingual-uncased-sentiment", text);
      const predictions = Array.isArray(out) ? out[0] : out;

      if (Array.isArray(predictions)) {
        const best = predictions.reduce((a: any, b: any) => (a.score > b.score ? a : b));
        let sentiment = "NEUTRAL";

        if (best.label.includes("1") || best.label.includes("2")) sentiment = "NEGATIVE";
        else if (best.label.includes("4") || best.label.includes("5")) sentiment = "POSITIVE";

        return { label: sentiment, score: best.score };
      }

      return { label: "NEUTRAL", score: 0.5 };
    } catch {
      return { label: "NEUTRAL", score: 0.5 };
    }
  }

  return { label: "NEUTRAL", score: 0.5 };
},

  /* ---------- Keyword Extraction ---------- */
  keywords: async (text: string) => {
    if (NLP.provider === "python" && NLP.python.keywords)
      return postTo(NLP.python.keywords, { text });

    if (NLP.provider === "huggingface") {
      try {
        const out = await hfRequest("ml6team/keyphrase-extraction-distilbert-inspec", text);
        const keywords = Array.isArray(out)
          ? out.map((r: any) => r.word || r.text).slice(0, 10)
          : [];
        return { keywords };
      } catch {
        return { keywords: [] };
      }
    }

    return { keywords: [] };
  },

  /* ---------- Text Classification ---------- */
  classify: async (text: string) => {
    if (NLP.provider === "python" && NLP.python.classify)
      return postTo(NLP.python.classify, { text });

    if (NLP.provider === "huggingface") {
      const candidateLabels = [
        "technology", "science", "education", "sports", "politics",
        "health", "finance", "entertainment", "environment", "general"
      ];

      try {
        const out = await hfRequest(
          "joeddav/xlm-roberta-large-xnli",
          text,
          { candidate_labels: candidateLabels }
        );

        return {
          labels: out?.labels ?? [],
          scores: out?.scores ?? [],
        };
      } catch (err) {
        console.warn("⚠️ HF classify primary model failed — trying fallback");
        try {
          const out = await hfRequest(
            "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
            text,
            { candidate_labels: candidateLabels }
          );
          return {
            labels: out?.labels ?? [],
            scores: out?.scores ?? [],
          };
        } catch {
          return { labels: ["general"], scores: [1.0] };
        }
      }
    }

    return { labels: ["general"], scores: [1.0] };
  },

  /* ---------- Named Entity Recognition ---------- */
  entities: async (text: string) => {
  if (NLP.provider === "python" && NLP.python.ner)
    return postTo(NLP.python.ner, { text });

  if (NLP.provider === "huggingface") {
    try {
      const out = await hfRequest("dslim/bert-base-NER", text);

      if (!Array.isArray(out)) return { entities: [] };

      // Filter out "O" (non-entity) and merge consecutive tokens of same entity
      const namedEntities: any[] = [];
      let currentEntity = null;

      for (const token of out) {
        const label = token.entity_group || token.entity;
        if (label !== "O") {
          if (currentEntity && currentEntity.entity === label) {
            currentEntity.word += token.word.startsWith("##")
              ? token.word.replace("##", "")
              : ` ${token.word}`;
            currentEntity.score = Math.max(currentEntity.score, token.score);
          } else {
            if (currentEntity) namedEntities.push(currentEntity);
            currentEntity = {
              entity: label,
              word: token.word,
              score: token.score,
            };
          }
        }
      }
      if (currentEntity) namedEntities.push(currentEntity);

      return { entities: namedEntities };
    } catch (err: any) {
      console.error("❌ NER model failed:", err.message);
      return { entities: [] };
    }
  }

  return { entities: [] };
},

/* ---------- Generation ---------- */
   async generate(prompt: string) {
    const models = [
      "meta-llama/Meta-Llama-3-8B-Instruct",
      "tiiuae/falcon-7b-instruct",
      "gpt2",
    ];

    for (const model of models) {
      try {
        console.log(`🔍 Trying model: ${model}`);

        const response = await axios.post(
          "https://router.huggingface.co/v1/chat/completions",
          {
            model: model,
            messages: [
              { role: "user", content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.7,
            top_p: 0.9,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            proxy: false,
            timeout: 20000,
          }
        );

        const output = response.data?.choices?.[0]?.message?.content;
        if (output) {
          console.log(`✅ Success with model: ${model}`);
          return output.trim();
        }
      } catch (error: any) {
        console.warn(
          `⚠️ Error with model ${model}:`,
          error.response?.status,
          error.response?.data || error.message
        );

        if (model === models[models.length - 1]) {
          throw new Error("All Hugging Face text generation models failed.");
        }
      }
    }
  },
};
