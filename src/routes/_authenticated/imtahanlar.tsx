import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { StudentExamsView } from "@/components/exams/StudentExamsView";
import { TeacherExamGradingView } from "@/components/exams/TeacherExamGradingView";
import { TutorExamSchedulerView } from "@/components/exams/TutorExamSchedulerView";
import { usePrimaryRole } from "@/hooks/use-user-role";

export const Route = createFileRoute("/_authenticated/imtahanlar")({
  head: () => ({ meta: [{ title: "ATU Portal" }, { name: "description", content: "ATU Portal" }] }),
  component: ImtahanlarSehifesi,
});

function ImtahanlarSehifesi() {
  const { primaryRole, userId, isLoading } = usePrimaryRole();

  if (isLoading || !userId || !primaryRole) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-border/70 bg-card shadow-sm">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (primaryRole === "tyutor") return <TutorExamSchedulerView userId={userId} />;
  if (primaryRole === "muellim") return <TeacherExamGradingView userId={userId} readOnly />;
  if (primaryRole === "admin" || primaryRole === "dekan") return <TeacherExamGradingView userId={userId} />;
  return <StudentExamsView userId={userId} />;
}
