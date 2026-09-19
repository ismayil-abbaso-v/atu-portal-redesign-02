import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import "./group-responsive.css";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // The portal intentionally starts every route at the top. TanStack Router's
    // scroll restoration was restoring the previous saved position *after* the
    // new page rendered, which caused the visible jump reproduced in the video.
    scrollRestoration: false,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
