import { describe, expect, test } from "bun:test";

import { getMobileNavModel, getMobileRouteContext } from "./mobile-navigation";

describe("mobile navigation information architecture", () => {
  test("student navigation has four route destinations and no route-backed center action", () => {
    const model = getMobileNavModel("telebe", ["telebe"]);
    expect(model.primary.map((item) => item.to)).toEqual([
      "/ev",
      "/teqvim",
      "/bildirisler",
      "/menyu/profil",
    ]);
    expect(model.primary).toHaveLength(4);
    expect(model.secondary.some((item) => item.to === "/ofis")).toBe(true);
  });

  test("primary workspaces adapt to the current role", () => {
    expect(getMobileNavModel("muellim", ["muellim"]).primary[1].to).toBe("/elektron-jurnal");
    expect(getMobileNavModel("tyutor", ["tyutor"]).primary[1].to).toBe("/tyutor-paneli");
    expect(getMobileNavModel("dekan", ["dekan"]).primary[1].to).toBe("/fakulte-icmali");
    expect(getMobileNavModel("admin", ["admin"]).primary[1].to).toBe("/admin");
  });

  test("secondary routes remain permission-aware and do not duplicate primary destinations", () => {
    const admin = getMobileNavModel("admin", ["admin"]);
    expect(admin.secondary.some((item) => item.to === "/qruplar")).toBe(true);
    expect(admin.secondary.some((item) => item.to === "/admin")).toBe(false);

    const student = getMobileNavModel("telebe", ["telebe"]);
    expect(student.secondary.some((item) => item.to === "/qruplar")).toBe(false);
    expect(student.secondary.some((item) => item.to === "/admin")).toBe(false);

    const primary = new Set(student.primary.map((item) => item.to));
    expect(student.secondary.every((item) => !primary.has(item.to))).toBe(true);
  });

  test("dynamic teacher and tutor routes retain their primary navigation context", () => {
    const teacher = getMobileNavModel("muellim", ["muellim"]);
    expect(getMobileRouteContext("/muellim/group-1/course-1", teacher).primaryTo).toBe(
      "/elektron-jurnal",
    );

    const tutor = getMobileNavModel("tyutor", ["tyutor"]);
    expect(getMobileRouteContext("/tyutor/group-1", tutor).primaryTo).toBe("/tyutor-paneli");
  });

  test("settings routes use secondary context except the primary profile destination", () => {
    const model = getMobileNavModel("telebe", ["telebe"]);
    expect(getMobileRouteContext("/menyu/profil", model)).toEqual({
      primaryTo: "/menyu/profil",
      secondaryActive: false,
    });
    expect(getMobileRouteContext("/menyu/tehlukesizlik", model).secondaryActive).toBe(true);
  });
});
