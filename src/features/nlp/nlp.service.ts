import axios from "axios";
import { NLP } from "../../utils/env";
import prisma from "../../config/database";

async function logNLPActivity(
  action: string,
  details?: string,
  userId: string = "System"   // fallback for NLP
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,       // always valid because "System" user must exist
        action,
        details,
      },
    });
  } catch (err) {
    console.error("⚠ NLP ActivityLog failed:", err);
  }
}


/* ------------------ Base HTTP Helper ------------------ */
async function postTo(url?: string, body?: any) {
  if (!url) throw new Error("Service URL not configured");
  const { data } = await axios.post(url, body, { timeout: 120000 });
  return data;
}

/* ------------------ Hugging Face Helper ------------------ */
async function hfRequest(model: string, input: string, extraParams?: any) {
  if (!NLP.hfKey) throw new Error("Missing Hugging Face API key");
  const baseUrl = process.env.HF_BASE_URL as string;
  const url = `${baseUrl}/${model}`;

  const { data } = await axios.post(
    url,
    { inputs: input, parameters: extraParams },
    {
      headers: {
        Authorization: `Bearer ${NLP.hfKey}`,
        "Content-Type": "application/json",
      },
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
  const cleanText = text.replace(/\s+/g, " ").trim();

  await logNLPActivity("NLP_summarize", `Text length: ${cleanText.length}`);

  if (!cleanText || cleanText.split(" ").length < 10) {
    return { summary: cleanText || "No meaningful text to summarize." };
  }

  if (NLP.provider === "python" && NLP.python.summarizer) {
    return postTo(NLP.python.summarizer, { text: cleanText });
  }

  if (NLP.provider === "huggingface") {
    try {
      const out = await hfRequest(process.env.HF_SUMMARIZER_MODEL as string, cleanText, {
        max_length: 100,
        min_length: 25,
        do_sample: false,
      })

      let summaryText =
        out?.[0]?.summary_text ||
        out?.summary_text ||
        (Array.isArray(out) && typeof out[0] === "string" ? out[0] : null);

      if (summaryText?.toLowerCase().includes(cleanText.toLowerCase())) {
        summaryText = summaryText.replace(cleanText, "").trim();
      }

      return {
        summary: summaryText || "No summary generated.",
      };
    } catch (err: any) {
      console.warn("⚠️ Summarizer fallback due to error:", err.message);
      const sentences = cleanText.split(/[.!?]/).filter(Boolean);
      const fallback = sentences.slice(0, 3).join(". ") + ".";
      return { summary: fallback };
    }
  }

  const sentences = cleanText.split(/[.!?]/).filter(Boolean);
  return { summary: sentences.slice(0, 3).join(". ") + "." };
},


/* ---------- Toxicity Detection ---------- */
detectToxicity: async (text: string) => {
  await logNLPActivity("NLP_toxicity_check", `Text length: ${text.length}`);

  if (NLP.provider === "huggingface") {
    const models = [
      process.env.HF_TOXICITY_DETECTION_MODEL1 as string,
      process.env.HF_TOXICITY_DETECTION_MODEL2 as string,
    ];

    for (const model of models) {
      try {
        const out = await hfRequest(model, text);

        //console.log("RAW OUTPUT:", JSON.stringify(out, null, 2)); //TODO: We must use this response in future.

        let preds: any[] = [];

        if (Array.isArray(out?.[0])) preds = out[0];
        else if (Array.isArray(out)) preds = out;
        else if (out?.labels && out?.scores) {
          preds = out.labels.map((label: string, i: number) => ({
            label,
            score: out.scores[i],
          }));
        }

        if (!preds.length) continue;

        const normalized = preds.map(p => ({
          label: p.label.toLowerCase(),
          score: p.score,
        }));

        const toxicPred =
          normalized.find(p =>
            p.label.includes("toxic") ||
            p.label.includes("insult") ||
            p.label.includes("offensive") ||
            p.label.includes("hate")
          ) || null;

        let score = 0;
        let isToxic = false;

        if (toxicPred) {
          score = toxicPred.score;
          isToxic = score > 0.5;
        } else if (normalized.length === 2) {
          // Assume binary classifier → take higher index as toxic
          const sorted = [...normalized].sort((a, b) => b.score - a.score);
          score = sorted[0].score;
          isToxic = score > 0.7; // stricter threshold
        }

        return {
          label: isToxic ? "toxic" : "non-toxic",
          score,
        };
      } catch (err: any) {
        console.warn(`⚠️ Model ${model} failed:`, err.message);
      }
    }

    return {
      label: "unknown",
      score: 0,
    };
  }

  return { label: "unknown", score: 0 };
},

  /* ---------- Sentiment Analysis ---------- */
  sentiment: async (text: string) => {
  await logNLPActivity("NLP_sentiment_analysis", `Text length: ${text.length}`);
  if (NLP.provider === "python" && NLP.python.sentiment)
    return postTo(NLP.python.sentiment, { text });

  if (NLP.provider === "huggingface") {
    try {
      const out = await hfRequest(process.env.HF_SENTIMENT_ANALYSIS_MODEL as string, text);
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
  await logNLPActivity("NLP_keyword_extraction", `Text length: ${text.length}`);

  const cleanText = text.replace(/\s+/g, " ").trim();

  let nerKeywords: string[] = [];

  // 🔹 1. Try HuggingFace NER
  if (NLP.provider === "huggingface") {
    try {
      const out = await hfRequest(
        process.env.HF_KEY_WORD_EXTRACTION_MODEL as string,
        cleanText
      );

      let preds: any[] = [];
      if (Array.isArray(out?.[0])) preds = out[0];
      else if (Array.isArray(out)) preds = out;

      const tokens = preds
        .filter((p: any) => p.entity !== "O")
        .map((p: any) => p.word)
        .filter(Boolean);

      // merge subwords
      let current = "";
      const merged: string[] = [];

      for (const word of tokens) {
        if (word.startsWith("##")) {
          current += word.replace("##", "");
        } else {
          if (current) merged.push(current);
          current = word;
        }
      }
      if (current) merged.push(current);

      nerKeywords = merged.map(w => w.toLowerCase());
    } catch (err) {
      console.warn("NER failed, fallback only");
    }
  }

  // 🔹 2. Frequency-based keywords (IMPORTANT)
  const stopWords = new Set([
    "is","a","the","of","and","to","in","that","are","with","for","on","this","these","those"
  ]);

  const words = cleanText
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 4 && !stopWords.has(w));

  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  const freqKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  // 🔹 3. Combine both
  const combined = [...nerKeywords, ...freqKeywords];

  // 🔹 4. Remove duplicates
  const unique = Array.from(new Set(combined));

  return {
    keywords: unique.slice(0, 10),
  };
},
  /* ---------- Text Classification ---------- */
classify: async (text: string) => {
  await logNLPActivity("NLP_text_classification", `Text length: ${text.length}`);

  if (NLP.provider === "python" && NLP.python.classify)
    return postTo(NLP.python.classify, { text });

  if (NLP.provider === "huggingface") {
    const candidateLabels = [
      "technology", "science", "education", "sports", "politics",
      "health", "finance", "entertainment", "environment", "general"
    ];

    const models = [
      process.env.HF_TEXT_CLASSIFICATION_MODEL as string
    ];

    for (const model of models) {
      try {
        const out = await hfRequest(model, text, {
          candidate_labels: candidateLabels,
          multi_label: false, // can set true for multiple possible topics
        });

        // ✅ Handle both old and new response formats
        let labels: string[] = [];
        let scores: number[] = [];

        if (out?.labels && out?.scores) {
          labels = out.labels;
          scores = out.scores;
        } else if (Array.isArray(out) && out[0]?.labels) {
          labels = out[0].labels;
          scores = out[0].scores;
        } else if (Array.isArray(out) && out[0]?.label) {
          // In case it's a list of single-label objects
          labels = out.map((r: any) => r.label);
          scores = out.map((r: any) => r.score);
        }

        // ✅ Pick top result if available
        if (labels.length && scores.length) {
          const bestIndex = scores.indexOf(Math.max(...scores));
          return {
            label: labels[bestIndex],
            score: scores[bestIndex],
            all: labels.map((l, i) => ({ label: l, score: scores[i] })),
          };
        }
      } catch (err: any) {
        console.warn(`⚠️ HF classify model ${model} failed:`, err.message);
      }
    }

    return { label: "general", score: 1.0, all: [] };
  }

  return { label: "general", score: 1.0, all: [] };
},
  /* ---------- Named Entity Recognition ---------- */
  entities: async (text: string) => {
  await logNLPActivity("NLP_named_entity_recognition", `Text length: ${text.length}`);
  if (NLP.provider === "python" && NLP.python.ner)
    return postTo(NLP.python.ner, { text });

  if (NLP.provider === "huggingface") {
    try {
      const out = await hfRequest(process.env.HF_NER_MODEL as string, text);

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
    await logNLPActivity("NLP_text_generation", `Prompt length: ${prompt.length}`);
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
