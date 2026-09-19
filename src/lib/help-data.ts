export type HelpSection = {
  id: string;
  questionIds: string[];
};

export const faqBolmeleri: HelpSection[] = [
  {
    id: "account",
    questionIds: [
      "forgotPassword",
      "updateAccount",
      "twoFactor",
      "cannotLogin",
    ],
  },
  {
    id: "library",
    questionIds: ["readBooks", "fileLimit"],
  },
  {
    id: "payments",
    questionIds: ["payTuition"],
  },
  {
    id: "technical",
    questionIds: ["technicalSupport"],
  },
];
