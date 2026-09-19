// src/lib/exam-answer-utils.ts
function getStoragePublicUrlPrefix(): string | null {
  const supabaseUrl = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.replace(/\/+$/, "");
  return supabaseUrl ? `${supabaseUrl}/storage/v1/object/` : null;
}

export function isSafeExamImageSrc(src: unknown): src is string {
  if (typeof src !== "string" || !src) return false;
  const prefix = getStoragePublicUrlPrefix();
  if (prefix && src.startsWith(prefix)) return true;
  return /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(src) && src.length <= 8_000_000;
}

export interface NormalizedQuestionRef { text: string; imageUrl: string | null; }
export interface NormalizedTestAnswer { question: NormalizedQuestionRef; options: string[]; selectedIndex: number | null; correctIndex: number; isCorrect: boolean; isAnswered: boolean; }
export interface NormalizedTicketAnswer { question: NormalizedQuestionRef; answerText: string; images: string[]; score: number | null; feedback: string; isAnswered: boolean; isAccepted: boolean | null; }
export type NormalizedAnswer = { kind: "test"; data: NormalizedTestAnswer } | { kind: "ticket"; data: NormalizedTicketAnswer };

function toNormalizedQuestion(raw: unknown): NormalizedQuestionRef {
  if (raw && typeof raw === "object") {
    const q = raw as Record<string, unknown>;
    const imageUrl = typeof q["imageUrl"] === "string" && isSafeExamImageSrc(q["imageUrl"]) ? q["imageUrl"] : null;
    return { text: typeof q["text"] === "string" ? q["text"] : "", imageUrl };
  }
  return typeof raw === "string" ? { text: raw, imageUrl: null } : { text: "", imageUrl: null };
}

/** UI dairəvi A-E badge-ni ayrıca göstərir, buna görə köhnə A./A) prefixləri mətndən silinir. */
function cleanTestOption(option: string): string {
  return option.trim().replace(/^[A-Ea-e][.)]\s*/, "");
}

/**
 * Köhnə imtahan portalından bəzi suallar `question.text` daxilində HTML kimi
 * gəlir: `...<br/>A) ...<br/>B) ...`. KaTeX span-larını toxunmadan saxlayıb
 * A-E variantlarını ayrıca çıxarırıq ki, yeni UI dairəvi badge-lərlə düzgün
 * göstərə bilsin.
 */
function extractEmbeddedOptions(text: string): { questionText: string; options: string[] } | null {
  const marker = /<br\s*\/?>\s*([A-Ea-e])[.)]\s*/gi;
  const matches = [...text.matchAll(marker)];
  if (matches.length < 4) return null;

  const first = matches[0];
  if (!first || first.index === undefined) return null;

  const questionText = text.slice(0, first.index).trim();
  const options = matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1]?.index ?? text.length) : text.length;
    return text.slice(start, end).trim();
  });

  return options.length >= 4 ? { questionText, options } : null;
}

function normalizeTestAnswer(raw: Record<string, unknown>): NormalizedTestAnswer {
  const question = toNormalizedQuestion(raw["question"]);
  const rawOptions = raw["question"] && typeof raw["question"] === "object" && Array.isArray((raw["question"] as Record<string, unknown>)["options"])
    ? (raw["question"] as Record<string, unknown>)["options"] as unknown[]
    : [];

  const explicitOptions = rawOptions.filter((o): o is string => typeof o === "string").map(cleanTestOption);
  const embedded = explicitOptions.length === 0 ? extractEmbeddedOptions(question.text) : null;
  const options = explicitOptions.length > 0 ? explicitOptions : (embedded?.options ?? []).map(cleanTestOption);
  const normalizedQuestion = embedded ? { ...question, text: embedded.questionText } : question;
  const correctIndex = typeof raw["correctIndex"] === "number" ? raw["correctIndex"] : -1;
  const selectedIndex = typeof raw["selectedIndex"] === "number" ? raw["selectedIndex"] : null;

  return {
    question: normalizedQuestion,
    options,
    selectedIndex,
    correctIndex,
    isCorrect: selectedIndex !== null && selectedIndex === correctIndex,
    isAnswered: selectedIndex !== null,
  };
}

function normalizeTicketAnswer(raw: Record<string, unknown>): NormalizedTicketAnswer {
  const answerText = typeof raw["answer"] === "string" ? raw["answer"] : "";
  const images = (Array.isArray(raw["images"]) ? raw["images"] : []).filter(isSafeExamImageSrc);
  const score = typeof raw["score"] === "number" ? raw["score"] : null;
  return {
    question: toNormalizedQuestion(raw["question"]),
    answerText,
    images,
    score,
    feedback: typeof raw["feedback"] === "string" ? raw["feedback"] : "",
    isAnswered: !!answerText.trim() || images.length > 0,
    isAccepted: score === null ? null : score > 0,
  };
}

export function normalizeAnswersData(answersData: unknown, examType: string): NormalizedAnswer[] {
  if (!Array.isArray(answersData)) return [];
  const kind: "test" | "ticket" = examType === "ticket" ? "ticket" : "test";
  return answersData
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map(item => kind === "test"
      ? { kind: "test", data: normalizeTestAnswer(item) } as const
      : { kind: "ticket", data: normalizeTicketAnswer(item) } as const);
}
