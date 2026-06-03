import axios from "axios";
import { NLP } from "../../../utils/env";
import wink from "wink-nlp";
import model from "wink-eng-lite-web-model";

const nlp = wink(model);

function deriveTitleFromText(text: string): string {
  const clean = text.trim();

  if (
    clean.length <= 60 &&
    clean.split(/\s+/).length <= 8
  ) {
    return clean;
  }

  const doc = nlp.readDoc(clean);

  const nouns = doc
    .tokens()
    .filter((t) => {
      const tok: any = t;
      const p =
        typeof tok.pos === "function"
          ? tok.pos()
          : tok.pos;

      return p === "NOUN" || p === "PROPN";
    })
    .out();

  if (nouns.length) {
    return nouns.slice(0, 3).join(" ");
  }

  return clean
    .split(/\s+/)
    .slice(0, 5)
    .join(" ");
}

function isValidMindmap(mindmap: any): boolean {
  if (!mindmap) return false;

  if (
    !mindmap.topic ||
    typeof mindmap.topic !== "string"
  ) {
    return false;
  }

  if (
    !Array.isArray(mindmap.nodes) ||
    mindmap.nodes.length < 4
  ) {
    return false;
  }

  for (const node of mindmap.nodes) {
    if (!node.label) return false;

    if (
      !Array.isArray(node.children) ||
      node.children.length < 2
    ) {
      return false;
    }
  }

  return true;
}

export async function generateMindmap(text: string) {
  const derivedTitle = deriveTitleFromText(text);

  const cleanText = text.trim();

  const isShortTopic =
    cleanText.length <= 60 &&
    cleanText.split(/\s+/).length <= 8 &&
    !cleanText.includes(".") &&
    !cleanText.includes("\n");

  const prompt = `
Generate a comprehensive educational mindmap in valid JSON format.

Topic: ${text}

Instructions:

* Return ONLY valid JSON.
* Do NOT return markdown.
* Do NOT return explanations outside JSON.
* Do NOT wrap JSON inside code blocks.
* Generate a study-ready mindmap suitable for learning, revision, and exam preparation.

Structure Requirements:

* Generate 6–10 meaningful main nodes.

* Each main node must contain:

  * label
  * description
  * children

* Each child must contain:

  * label
  * description

* Generate 8-10 children per node whenever applicable.

* Use concise but informative descriptions.

* Avoid duplicate information.

* Do not use placeholder content.

* Do not use labels such as "Point 1", "Point 2", etc.

* Children should represent actual concepts, facts, components, events, processes, or examples.

* Ensure all important concepts of the topic are covered.

Topic-Specific Coverage:

For Science topics include relevant concepts such as:

* Overview
* Definition
* Components
* Inputs and Outputs
* Process
* Working Principle
* Types
* Applications
* Advantages
* Limitations
* Rules: for boilogy topics include anatomy(each and every single part), functions, examples, and significance; for physics topics include laws, formulas, and phenomena; for chemistry topics include properties, reactions, and uses; for math topics include definitions, formulas, theorems, and applications; for psychology topics include theories, experiments, and applications.

For Technology and Computer Science topics include:

* Overview
* Architecture
* Components
* Workflow
* Features
* Applications
* Advantages
* Challenges
* Future Scope

For History topics include:

* Background
* Causes
* Key Events
* Important Personalities
* Impacts
* Outcomes
* Historical Significance

For Geography topics include:

* Overview
* Location
* Physical Features
* Climate
* Natural Resources
* Importance
* Challenges
* Examples

For Civics and Political Science topics include:

* Definition
* Structure
* Functions
* Rights
* Responsibilities
* Importance
* Challenges
* Examples

For Economics and Business topics include:

* Definition
* Types
* Factors
* Importance
* Advantages
* Disadvantages
* Real-World Applications

For Literature topics include:

* Author
* Themes
* Characters
* Plot
* Literary Elements
* Significance

STRICT REQUIREMENTS:

- Every node MUST contain at least 4 children.
- Never generate fewer than 4 children.
- If more concepts exist, generate up to 8 children.
- Incomplete nodes are invalid.

Quality Rules:

* Prefer educational completeness over generic information.
* Include major concepts commonly taught in academic curricula.
* Include important examples where relevant.
* Include practical applications when applicable.
* Include advantages and limitations whenever meaningful.
* Ensure the mindmap is useful for students preparing for examinations.
* Keep descriptions informative but concise.
* If the topic belongs to a specific domain, adapt the structure accordingly.
* If the topic does not clearly belong to any domain, identify the most suitable educational structure and generate a complete mindmap.
* Node descriptions:
- Maximum 15 words.
* Child descriptions:
- Maximum 20 words.

Before returning JSON:

1. Check whether all major concepts of the topic are included.
2. Check whether every node has at least 4 children.
3. Check whether important concepts are missing.
4. If something is missing, expand the node before returning JSON.

FINAL CHECK:

Before returning JSON:

- Verify all major concepts are covered.
- Verify no important textbook concepts are missing. If missing, expand the mindmap to include them and add each complete node as a separate child under the main topic.
- Verify every node has meaningful children.
- Expand incomplete sections before returning.

Output JSON Format:

{
"topic": "string",
"description": "string",
"nodes": [
{
"label": "string",
"description": "string",
"children": [
{
"label": "string",
"description": "string"
}
]
}
]
}
`;


  // -------------------------
  // Python microservice
  // -------------------------
  if (
    process.env.NLP_PROVIDER === "python" &&
    NLP.python.summarizer
  ) {
    try {
      const url = (NLP.python.summarizer as string).replace(
        /\/summarize\/?$/,
        "/mindmap"
      );

      const { data } = await axios.post(
        url,
        {
          text,
          title: derivedTitle,
          expand: isShortTopic,
        },
        {
          timeout: 120000,
        }
      );

      if (data?.mindmap) {
        if (!isValidMindmap(data.mindmap)) {
          throw new Error(
            "Python service returned invalid mindmap"
          );
        }

        return data.mindmap;
      }

      if (data?.summary) {
        throw new Error(
          "Mindmap endpoint returned summary instead of mindmap"
        );
      }
    } catch (err) {
      console.warn(
        "python mindmap error, falling back:",
        (err as any).message
      );
    }
  }

  // -------------------------
  // OpenAI
  // -------------------------
  if (
    process.env.NLP_PROVIDER === "openai" &&
    process.env.OPENAI_API_KEY
  ) {
    try {
      const resp = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          response_format: {
            type: "json_object",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      const content =
        resp.data?.choices?.[0]?.message?.content;

      try {
        const parsed = JSON.parse(content);

        if (!isValidMindmap(parsed)) {
          throw new Error(
            "Generated mindmap is incomplete"
          );
        }

        return parsed;
      } catch {
        throw new Error(
          "OpenAI returned invalid mindmap"
        );
      }
    } catch (err) {
      throw new Error(
        "OpenAI returned invalid mindmap"
      );
    }
  }

  // -------------------------
  // HuggingFace
  // -------------------------
  if (
    process.env.NLP_PROVIDER === "huggingface" &&
    process.env.HUGGINGFACE_API_KEY
  ) {
    try {
      const resp = await axios.post(
        "https://router.huggingface.co/v1/chat/completions",
        {
          model: process.env.HF_MINDMAP_GENERATION_MODEL ?? "Qwen/Qwen2.5-7B-Instruct",
          messages: [
            {
              role: "system",
              content:
                "You are a mindmap generator. Return ONLY valid JSON. No markdown. No explanation."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 6000
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 45000
        }
      );

      const generated =
        resp.data?.choices?.[0]?.message?.content || "";

      try {
        const jsonMatch = generated.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const parsed = JSON.parse(
            jsonMatch[0]
          );

          if (!isValidMindmap(parsed)) {
            throw new Error(
              "Generated mindmap is incomplete"
            );
          }

          return parsed;
        }
      } catch (parseErr) {
        console.warn("HF JSON parse failed");
      }

      throw new Error(
        "HF returned invalid JSON"
      );
    } catch (err: any) {
      console.log(
        "HF ERROR RESPONSE:",
        JSON.stringify(
          err.response?.data,
          null,
          2
        )
      );

      throw err;
    }
  }

  throw new Error(
    "Mindmap generation failed"
  );
}
