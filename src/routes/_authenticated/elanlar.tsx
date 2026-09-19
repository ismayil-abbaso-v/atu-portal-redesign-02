import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/elanlar")({
  beforeLoad: () => {
    throw redirect({ to: "/bildirisler" });
  },
});
