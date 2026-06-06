/**
 * mindmap.neurodivergent.service.ts
 *
 * Features designed for neurodivergent learners (ADHD, dyslexia, autism spectrum, etc.)
 * All transformations work on the standard mindmap structure returned by generateMindmap().
 */

export type MindmapStructure = {
  topic: string;
  nodes: Array<{
    label: string;
    children?: Array<{ label: string }>;
  }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. CHUNKED / FOCUS MODE
//    Returns one node at a time to prevent overwhelm (ADHD / anxiety support).
// ─────────────────────────────────────────────────────────────────────────────
export function getChunkedNode(
  mindmap: MindmapStructure,
  nodeIndex: number
): {
  total: number;
  current: number;
  node: MindmapStructure["nodes"][0] | null;
  progress: number; // 0–100
} {
  const nodes = mindmap.nodes;
  const node = nodes[nodeIndex] ?? null;
  return {
    total: nodes.length,
    current: nodeIndex,
    node,
    progress: Math.round(((nodeIndex + 1) / nodes.length) * 100),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIMPLIFIED VIEW
//    Removes children, returns only top-level labels for low-cognitive-load overview.
//    Useful for first exposure or revision sessions.
// ─────────────────────────────────────────────────────────────────────────────
export function simplifyMindmap(mindmap: MindmapStructure): MindmapStructure {
  return {
    topic: mindmap.topic,
    nodes: mindmap.nodes.map(n => ({ label: n.label })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. EMOJI ANCHORS
//    Attaches a contextual emoji to each top-level node label.
//    Visual anchors help dyslexic learners and those with visual-spatial strengths.
// ─────────────────────────────────────────────────────────────────────────────
const EMOJI_MAP: [RegExp, string][] = [
  [/definition|meaning|what is/i, "📖"],
  [/history|origin|timeline|when/i, "📅"],
  [/type|kind|category|classif/i, "🗂️"],
  [/example|case|instance/i, "💡"],
  [/cause|reason|why|factor/i, "🔍"],
  [/effect|result|impact|consequence/i, "📊"],
  [/process|step|how|method|procedure/i, "⚙️"],
  [/benefit|advantage|pro/i, "✅"],
  [/challenge|problem|issue|disadvantage/i, "⚠️"],
  [/application|use|usage|real.world/i, "🚀"],
  [/formula|equation|math|calculate/i, "🔢"],
  [/summary|overview|recap/i, "📝"],
  [/concept|idea|theory/i, "🧠"],
  [/comparison|vs|versus/i, "⚖️"],
  [/person|people|who/i, "👤"],
  [/place|location|where|country/i, "🌍"],
  [/science|biology|chemistry|physics/i, "🔬"],
  [/technology|software|code|program/i, "💻"],
  [/art|creative|design/i, "🎨"],
  [/music|sound|audio/i, "🎵"],
];

function pickEmoji(label: string): string {
  for (const [re, emoji] of EMOJI_MAP) {
    if (re.test(label)) return emoji;
  }
  return "📌";
}

export function addEmojiAnchors(mindmap: MindmapStructure): MindmapStructure {
  return {
    ...mindmap,
    nodes: mindmap.nodes.map(n => ({
      ...n,
      label: `${pickEmoji(n.label)} ${n.label}`,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. READING LEVEL SIMPLIFICATION
//    Breaks long child labels into shorter, simpler sentences.
//    Helps dyslexic learners and those with working memory difficulties.
// ─────────────────────────────────────────────────────────────────────────────
export function simplifyChildLabels(
  mindmap: MindmapStructure,
  maxWords: number = 12
): MindmapStructure {
  return {
    ...mindmap,
    nodes: mindmap.nodes.map(n => ({
      ...n,
      children: n.children?.map(c => ({
        label: truncateToWords(c.label, maxWords),
      })),
    })),
  };
}

function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. QUIZ / SELF-TEST GENERATOR
//    Converts mindmap nodes into simple fill-in-the-blank or recall questions.
//    Active recall is scientifically proven to aid memory retention.
// ─────────────────────────────────────────────────────────────────────────────
export interface QuizQuestion {
  question: string;
  answer: string;
  hint?: string;
}

export function generateQuiz(mindmap: MindmapStructure): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  // Q1: Overall topic recall
  questions.push({
    question: `What are the main topics in "${mindmap.topic}"?`,
    answer: mindmap.nodes.map(n => n.label.replace(/^[^\w]*/, "")).join(", "),
    hint: `There are ${mindmap.nodes.length} main areas.`,
  });

  for (const node of mindmap.nodes) {
    const cleanLabel = node.label.replace(/^[^\w]*/, "");

    if (node.children && node.children.length > 0) {
      // Pick the most information-dense child as the answer
      const longestChild = node.children.reduce((a, b) =>
        a.label.length >= b.label.length ? a : b
      );
      const answerLabel = longestChild.label.replace(/^[^\w]*/, "");

      questions.push({
        question: `Can you name something related to "${cleanLabel}" in the context of ${mindmap.topic}?`,
        answer: answerLabel,
        hint: `Think about ${node.children.length > 1 ? `${node.children.length} sub-ideas` : "one key detail"} under this topic.`,
      });
    }
  }

  return questions;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. COLOUR CODING PALETTE ASSIGNMENTS
//    Assigns a consistent colour category to each node.
//    Colour coding is widely used in neurodivergent learning strategies.
// ─────────────────────────────────────────────────────────────────────────────
const COLOUR_PALETTE = [
  { name: "Calm Blue",   hex: "#4A90D9", bg: "#E8F2FC" },
  { name: "Warm Amber",  hex: "#E0A020", bg: "#FDF4E0" },
  { name: "Soft Green",  hex: "#4CAF7C", bg: "#EAF7EF" },
  { name: "Gentle Rose", hex: "#D9607A", bg: "#FCE8ED" },
  { name: "Lilac",       hex: "#9B7DD9", bg: "#F2EEF9" },
  { name: "Teal",        hex: "#2DADA8", bg: "#E5F7F7" },
];

export function assignColours(
  mindmap: MindmapStructure
): Array<{ label: string; colour: typeof COLOUR_PALETTE[0] }> {
  return mindmap.nodes.map((n, i) => ({
    label: n.label,
    colour: COLOUR_PALETTE[i % COLOUR_PALETTE.length],
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. POMODORO-AWARE STUDY PLAN
//    Splits the mindmap nodes into timed study blocks.
//    Based on Pomodoro technique (25-min focus + 5-min break).
// ─────────────────────────────────────────────────────────────────────────────
export interface StudyBlock {
  blockNumber: number;
  nodes: string[];
  focusMinutes: number;
  breakMinutes: number;
  tip: string;
}

const STUDY_TIPS = [
  "Before reading, glance at the node title and predict what it might say.",
  "After this block, try to recall the key idea from memory without looking.",
  "Draw a quick doodle or symbol that represents this concept.",
  "Say the main idea out loud in your own words.",
  "Connect this idea to something you already know.",
  "Write one question you still have about this topic.",
];

export function generateStudyPlan(
  mindmap: MindmapStructure,
  nodesPerBlock: number = 2
): StudyBlock[] {
  const blocks: StudyBlock[] = [];
  const allNodes = mindmap.nodes.map(n => n.label.replace(/^[^\w]*/, ""));

  for (let i = 0; i < allNodes.length; i += nodesPerBlock) {
    const chunk = allNodes.slice(i, i + nodesPerBlock);
    const blockNum = Math.floor(i / nodesPerBlock) + 1;
    blocks.push({
      blockNumber: blockNum,
      nodes: chunk,
      focusMinutes: 25,
      breakMinutes: blockNum % 4 === 0 ? 15 : 5, // Long break every 4 pomodoros
      tip: STUDY_TIPS[(blockNum - 1) % STUDY_TIPS.length],
    });
  }

  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ANALOGY PROMPTS
//    Returns prompts to ask the AI to explain each node via analogy.
//    Analogy-based learning is highly effective for abstract thinkers.
// ─────────────────────────────────────────────────────────────────────────────
export function generateAnalogyPrompts(mindmap: MindmapStructure): string[] {
  return mindmap.nodes.map(
    n =>
      `Explain "${n.label.replace(/^[^\w]*/, "")}" from "${mindmap.topic}" using a simple, everyday analogy that a 12-year-old would understand. Keep it to 2–3 sentences.`
  );
}
