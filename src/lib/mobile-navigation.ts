export type MobileNavRole = "admin" | "dekan" | "muellim" | "tyutor" | "telebe";

export type MobileNavRoute =
  | "/ev"
  | "/elektron-jurnal"
  | "/teqvim"
  | "/imtahanlar"
  | "/sohbet"
  | "/kitabxana"
  | "/ofis"
  | "/bildirisler"
  | "/menyu"
  | "/menyu/profil"
  | "/qruplar"
  | "/fakulte-icmali"
  | "/tyutor-paneli"
  | "/admin";

export type MobileNavIconName =
  | "home"
  | "journal"
  | "calendar"
  | "exams"
  | "chat"
  | "library"
  | "office"
  | "notifications"
  | "profile"
  | "services"
  | "groups"
  | "faculty"
  | "tutor"
  | "admin";

export type MobileNavItem = {
  to: MobileNavRoute;
  labelKey: string;
  icon: MobileNavIconName;
  activePrefixes?: readonly string[];
};

export type MobileNavModel = {
  primary: readonly [MobileNavItem, MobileNavItem, MobileNavItem, MobileNavItem];
  secondary: MobileNavItem[];
};

const HOME: MobileNavItem = { to: "/ev", labelKey: "nav.home", icon: "home" };
const CALENDAR: MobileNavItem = { to: "/teqvim", labelKey: "nav.calendar", icon: "calendar" };
const NOTIFICATIONS: MobileNavItem = {
  to: "/bildirisler",
  labelKey: "nav.notifications",
  icon: "notifications",
};
const PROFILE: MobileNavItem = { to: "/menyu/profil", labelKey: "nav.profile", icon: "profile" };
const JOURNAL: MobileNavItem = {
  to: "/elektron-jurnal",
  labelKey: "page.journal",
  icon: "journal",
  activePrefixes: ["/elektron-jurnal", "/muellim/"],
};
const TUTOR: MobileNavItem = {
  to: "/tyutor-paneli",
  labelKey: "page.tutorWorkspace",
  icon: "tutor",
  activePrefixes: ["/tyutor-paneli", "/tyutor/"],
};
const FACULTY: MobileNavItem = {
  to: "/fakulte-icmali",
  labelKey: "nav.facultyOverview",
  icon: "faculty",
};
const ADMIN: MobileNavItem = {
  to: "/admin",
  labelKey: "nav.admin",
  icon: "admin",
  activePrefixes: ["/admin"],
};

const PRIMARY_BY_ROLE: Record<MobileNavRole, MobileNavModel["primary"]> = {
  telebe: [HOME, CALENDAR, NOTIFICATIONS, PROFILE],
  muellim: [HOME, JOURNAL, NOTIFICATIONS, PROFILE],
  tyutor: [HOME, TUTOR, NOTIFICATIONS, PROFILE],
  dekan: [HOME, FACULTY, NOTIFICATIONS, PROFILE],
  admin: [HOME, ADMIN, NOTIFICATIONS, PROFILE],
};

const COMMON_SECONDARY: MobileNavItem[] = [
  JOURNAL,
  CALENDAR,
  { to: "/imtahanlar", labelKey: "nav.exams", icon: "exams" },
  { to: "/sohbet", labelKey: "nav.chat", icon: "chat" },
  { to: "/kitabxana", labelKey: "nav.library", icon: "library" },
  { to: "/ofis", labelKey: "nav.office", icon: "office" },
  { to: "/menyu", labelKey: "nav.allServices", icon: "services" },
];

function resolvedRole(primaryRole: MobileNavRole | null | undefined): MobileNavRole {
  return primaryRole ?? "telebe";
}

export function getMobileNavModel(
  primaryRole: MobileNavRole | null | undefined,
  roles: readonly MobileNavRole[],
): MobileNavModel {
  const role = resolvedRole(primaryRole);
  const primary = PRIMARY_BY_ROLE[role];
  const secondary = [...COMMON_SECONDARY];

  const hasAdmin = roles.includes("admin");
  const hasDekan = roles.includes("dekan");
  const primaryTutor = role === "tyutor";

  if (hasDekan) {
    secondary.push(FACULTY);
  }

  if (hasAdmin || hasDekan || primaryTutor) {
    secondary.push({ to: "/qruplar", labelKey: "nav.groups", icon: "groups" });
  }

  if (hasAdmin) {
    secondary.push(ADMIN);
  }

  if (primaryTutor) {
    secondary.push(TUTOR);
  }

  const primaryRoutes = new Set(primary.map((item) => item.to));
  const seen = new Set<MobileNavRoute>();

  return {
    primary,
    secondary: secondary.filter((item) => {
      if (primaryRoutes.has(item.to) || seen.has(item.to)) return false;
      seen.add(item.to);
      return true;
    }),
  };
}

export function routeMatchesMobileNavItem(pathname: string, item: MobileNavItem) {
  if (item.activePrefixes?.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return true;
  }

  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function getMobileRouteContext(pathname: string, model: MobileNavModel) {
  const primary = model.primary.find((item) => routeMatchesMobileNavItem(pathname, item)) ?? null;
  if (primary) {
    return { primaryTo: primary.to, secondaryActive: false };
  }

  const secondaryActive =
    model.secondary.some((item) => routeMatchesMobileNavItem(pathname, item)) ||
    pathname.startsWith("/fennler/") ||
    pathname === "/elanlar";

  return { primaryTo: null, secondaryActive };
}
