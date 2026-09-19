import type { MutableRefObject as ReactMutableRefObject, ReactNode as ReactNodeType } from "react";

declare global {
  namespace React {
    type MutableRefObject<T> = ReactMutableRefObject<T>;
    type ReactNode = ReactNodeType;
  }
}

export {};
