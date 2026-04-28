import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

export const routerPushMock = vi.fn();
export const routerReplaceMock = vi.fn();
export const routerRefreshMock = vi.fn();
export const routerBackMock = vi.fn();
export const toastSuccessMock = vi.fn();
export const toastErrorMock = vi.fn();
export const toastInfoMock = vi.fn();
export const signOutMock = vi.fn();
export const signInEmailMock = vi.fn();
export const signUpEmailMock = vi.fn();
export const signInSocialMock = vi.fn();

let currentPathname = "/dashboard";
let currentSearchParams = new URLSearchParams();

export function setMockPathname(pathname: string) {
  currentPathname = pathname;
}

export function setMockSearchParams(params: Record<string, string> | URLSearchParams = {}) {
  currentSearchParams =
    params instanceof URLSearchParams ? params : new URLSearchParams(params);
}

class LocalStorageMock implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class EventSourceMock {
  url: string;
  onerror: ((event?: Event) => void) | null = null;
  private listeners = new Map<string, Set<(event: MessageEvent) => void>>();

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, data: unknown) {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  close() {}
}

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
    refresh: routerRefreshMock,
    back: routerBackMock,
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => currentSearchParams,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
    info: toastInfoMock,
  },
}));

vi.mock("recharts", () => {
  const Mock = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children);

  return {
    ResponsiveContainer: Mock,
    BarChart: Mock,
    Bar: Mock,
    XAxis: Mock,
    YAxis: Mock,
    Tooltip: Mock,
    PieChart: Mock,
    Pie: Mock,
    Cell: Mock,
    LineChart: Mock,
    Line: Mock,
    CartesianGrid: Mock,
    Legend: Mock,
  };
});

vi.mock("@/lib/auth/client", () => ({
  signOut: signOutMock,
  signIn: {
    email: signInEmailMock,
    social: signInSocialMock,
  },
  signUp: {
    email: signUpEmailMock,
  },
  authClient: {
    signIn: {
      email: signInEmailMock,
      social: signInSocialMock,
    },
    signUp: {
      email: signUpEmailMock,
    },
  },
}));

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new LocalStorageMock(),
    configurable: true,
    writable: true,
  });

  Object.defineProperty(window, "scrollTo", {
    value: vi.fn(),
    configurable: true,
    writable: true,
  });

  Object.defineProperty(window, "matchMedia", {
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    configurable: true,
    writable: true,
  });

  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });

  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserverMock,
    configurable: true,
    writable: true,
  });

  Object.defineProperty(globalThis, "EventSource", {
    value: EventSourceMock,
    configurable: true,
    writable: true,
  });

  setMockPathname("/dashboard");
  setMockSearchParams({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
