export const summarizeText = (text: string, maxSentences = 3): string => {
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]?/g) || [];
  return sentences.slice(0, maxSentences).join(" ").trim();
};
