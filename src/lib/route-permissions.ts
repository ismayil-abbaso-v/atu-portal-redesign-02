import { redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export type TeacherCoursePermission =
  | "muhazire"
  | "seminar"
  | "laboratoriya"
  | "tecrube"
  | "serbest_is"
  | "kollokvium";

export type RoutePermissionContext = {
  userId: string;
  roles: AppRole[];
};

async function cariIstifadeciIcazeleri(): Promise<RoutePermissionContext> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw redirect({ to: "/ev" });

  const { data: roleRows, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw error;

  return {
    userId,
    roles: (roleRows ?? []).map((row) => row.role),
  };
}

function rollardanBiriVar(roles: AppRole[], allowed: AppRole[]) {
  return allowed.some((role) => roles.includes(role));
}

function icazeYoxdur(to: "/ev" | "/qruplar" = "/ev"): never {
  throw redirect({ to, replace: true });
}

async function requireTeacher() {
  const access = await cariIstifadeciIcazeleri();
  if (!access.roles.includes("muellim")) icazeYoxdur();
  return access;
}

/** Admin və ya dekan səlahiyyəti tələb edən route-lar üçün ortaq guard. */
export async function icazəAdminVəYaDekan() {
  const access = await cariIstifadeciIcazeleri();
  if (!rollardanBiriVar(access.roles, ["admin", "dekan"])) icazeYoxdur();
  return access;
}

/** Normal /qruplar route-u: admin, dekan və tyutor üçün açıqdır. */
export async function canAccessGroups() {
  const access = await cariIstifadeciIcazeleri();
  if (!rollardanBiriVar(access.roles, ["admin", "dekan", "tyutor"])) icazeYoxdur();
  return access;
}

/** Sırf primary tyutor iş sahəsi. Daha yüksək staff rolu olan multi-role hesab burada manager view-a düşmür. */
export async function canAccessTutorPanel() {
  const access = await cariIstifadeciIcazeleri();
  const hasTutor = access.roles.includes("tyutor");
  const hasHigherStaffRole = rollardanBiriVar(access.roles, ["admin", "dekan", "muellim"]);
  if (!hasTutor || hasHigherStaffRole) icazeYoxdur();
  return access;
}

/** Qrup detalında tyutor yalnız groups.tyutor_id = auth.uid() olan qrupa keçə bilər. */
export async function canAccessGroup(groupId: string) {
  const access = await canAccessGroups();
  if (access.roles.includes("admin")) return access;

  let query = supabase.from("groups").select("id").eq("id", groupId);
  if (!access.roles.includes("dekan") && access.roles.includes("tyutor")) {
    query = query.eq("tyutor_id", access.userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) icazeYoxdur("/qruplar");
  return access;
}

/**
 * Normal /fennler/$courseId route-u üçün idarəetmə guard-ı.
 * Tutor ownership frontend-də də məhz assigned group əlaqəsindən yoxlanır;
 * RLS isə eyni sərhədi server tərəfində məcburi edir.
 */
export async function canAccessCourse(courseId: string) {
  const access = await cariIstifadeciIcazeleri();
  if (!rollardanBiriVar(access.roles, ["admin", "dekan", "tyutor"])) icazeYoxdur();
  if (access.roles.includes("admin")) return access;

  if (access.roles.includes("dekan")) {
    const { data, error } = await supabase.from("courses").select("id").eq("id", courseId).maybeSingle();
    if (error) throw error;
    if (data) return access;
  }

  if (access.roles.includes("tyutor")) {
    const [{ data: legacyCourse, error: legacyError }, { data: links, error: linkError }] = await Promise.all([
      supabase.from("courses").select("group_id").eq("id", courseId).maybeSingle(),
      supabase.from("course_groups").select("group_id").eq("course_id", courseId),
    ]);
    if (legacyError) throw legacyError;
    if (linkError) throw linkError;

    const groupIds = new Set<string>((links ?? []).map((row) => row.group_id));
    if (legacyCourse?.group_id) groupIds.add(legacyCourse.group_id);

    if (groupIds.size > 0) {
      const { data: assignedGroup, error: groupError } = await supabase
        .from("groups")
        .select("id")
        .in("id", [...groupIds])
        .eq("tyutor_id", access.userId)
        .limit(1)
        .maybeSingle();
      if (groupError) throw groupError;
      if (assignedGroup) return access;
    }
  }

  icazeYoxdur("/qruplar");
}

export const canManageCourse = canAccessCourse;

/**
 * Müəllim course access-i yalnız course_teachers üzərindən alınır.
 * groupId verildikdə eyni course-group əlaqəsi course_groups ilə ayrıca yoxlanır.
 */
export async function canAccessTeacherCourse(courseId: string, groupId?: string) {
  const access = await requireTeacher();

  const { data: teacherLink, error: teacherError } = await supabase
    .from("course_teachers")
    .select("course_id")
    .eq("course_id", courseId)
    .eq("muellim_id", access.userId)
    .maybeSingle();
  if (teacherError) throw teacherError;
  if (!teacherLink) icazeYoxdur();

  if (groupId) {
    const { data: groupLink, error: groupError } = await supabase
      .from("course_groups")
      .select("course_id, group_id")
      .eq("course_id", courseId)
      .eq("group_id", groupId)
      .limit(1)
      .maybeSingle();
    if (groupError) throw groupError;
    if (!groupLink) icazeYoxdur();
  }

  return access;
}

/** Müəllim yalnız öz course_teachers təyinatlarından yaranan qruplara keçə bilər. */
export async function canAccessTeacherGroup(groupId: string) {
  const access = await requireTeacher();

  const { data: groupCourses, error: groupError } = await supabase
    .from("course_groups")
    .select("course_id")
    .eq("group_id", groupId);
  if (groupError) throw groupError;

  const courseIds = [...new Set((groupCourses ?? []).map((row) => row.course_id))];
  if (courseIds.length === 0) icazeYoxdur();

  const { data: teacherLink, error: teacherError } = await supabase
    .from("course_teachers")
    .select("course_id")
    .eq("muellim_id", access.userId)
    .in("course_id", courseIds)
    .limit(1)
    .maybeSingle();
  if (teacherError) throw teacherError;
  if (!teacherLink) icazeYoxdur();

  return access;
}

/** Cari session yalnız server-side can_grade_now həqiqət olduqda editable sayılır. */
export async function canEditLessonSession(sessionId: string) {
  const access = await requireTeacher();
  const { data, error } = await supabase.rpc("can_grade_now", {
    p_lesson_id: sessionId,
    p_teacher_id: access.userId,
  });
  if (error) throw error;
  if (!data) icazeYoxdur();
  return access;
}

/** Lesson grading eyni session ownership + time-window guard-undan istifadə edir. */
export async function canGradeLesson(sessionId: string) {
  return canEditLessonSession(sessionId);
}

/**
 * Assessment edit üçün course_teachers.icazeler yoxlanır.
 * Aktiv server vaxt pəncərəsi RLS/trigger qatında authoritative şəkildə məcbur edilir;
 * route guard client saatını təhlükəsizlik mənbəyi kimi istifadə etmir.
 */
export async function canGradeAssessment(courseId: string, permission: TeacherCoursePermission | null) {
  const access = await canAccessTeacherCourse(courseId);

  const { data: teacherLink, error: teacherError } = await supabase
    .from("course_teachers")
    .select("icazeler")
    .eq("course_id", courseId)
    .eq("muellim_id", access.userId)
    .maybeSingle();
  if (teacherError) throw teacherError;
  if (!teacherLink) icazeYoxdur();

  const permissions = (teacherLink.icazeler ?? {}) as Record<string, unknown>;
  if (permission && permissions[permission] !== true) icazeYoxdur();

  return access;
}

/** Müəllim tələbə akademik məlumatını yalnız öz fənninin course_groups roster-ində görə bilər. */
export async function canViewStudentCourseData(courseId: string, studentId: string) {
  const access = await canAccessTeacherCourse(courseId);

  const { data: courseGroups, error: courseGroupsError } = await supabase
    .from("course_groups")
    .select("group_id")
    .eq("course_id", courseId);
  if (courseGroupsError) throw courseGroupsError;

  const groupIds = [...new Set((courseGroups ?? []).map((row) => row.group_id))];
  if (groupIds.length === 0) icazeYoxdur();

  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("user_id", studentId)
    .in("group_id", groupIds)
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) icazeYoxdur();

  return access;
}

/** Journal route özü role-aware view seçir; bu helper authenticated akademik rolları sənədləşdirir. */
export async function canMonitorJournal() {
  const access = await cariIstifadeciIcazeleri();
  if (!rollardanBiriVar(access.roles, ["admin", "dekan", "tyutor", "muellim", "telebe"])) icazeYoxdur();
  return access;
}

/** Tutor exam management yalnız assigned group sərhədindədir. */
export async function canManageExamSchedule(groupId?: string) {
  const access = await cariIstifadeciIcazeleri();
  if (!rollardanBiriVar(access.roles, ["admin", "dekan", "tyutor"])) icazeYoxdur();
  if (!groupId || access.roles.includes("admin") || access.roles.includes("dekan")) return access;

  const { data, error } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("tyutor_id", access.userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) icazeYoxdur("/qruplar");
  return access;
}
