"use client";

import { useCallback, useEffect, useRef } from "react";

const DEFAULT_WARNING_MESSAGE = "You have unsaved code changes. Leave this page?";
const HISTORY_GUARD_STATE_KEY = "__ojUnsavedChangesGuard";
const HISTORY_INDEX_STATE_KEY = "__ojUnsavedChangesGuardIndex";

type HistoryNavigationApi = {
  addEventListener: (type: "navigate", listener: (event: Event) => void) => void;
  removeEventListener: (type: "navigate", listener: (event: Event) => void) => void;
};

type HistoryNavigateEvent = Event & {
  canIntercept?: boolean;
  destination?: {
    url?: string;
  };
  navigationType?: string;
};

type HistoryStateValue = Record<string, unknown>;

type UseUnsavedChangesGuardResult = {
  allowNextNavigation: () => void;
};

type UseUnsavedChangesGuardOptions = {
  isDirty: boolean;
  warningMessage?: string;
};

function getHistoryNavigationApi() {
  return (window as Window & { navigation?: HistoryNavigationApi }).navigation;
}

function toHistoryStateValue(value: unknown): HistoryStateValue {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as HistoryStateValue;
}

function getHistoryStateIndex(state: unknown) {
  const index = toHistoryStateValue(state)[HISTORY_INDEX_STATE_KEY];

  return typeof index === "number" ? index : null;
}

function resolveNavigationUrl(target: string | URL | null | undefined) {
  if (!target) {
    return null;
  }

  const currentUrl = new URL(window.location.href);
  const nextUrl = new URL(target.toString(), currentUrl);

  return `${nextUrl.pathname}${nextUrl.search}`;
}

function isPathNavigation(currentLocation: string, nextLocation: string | null) {
  return !!nextLocation && currentLocation !== nextLocation;
}

export function useUnsavedChangesGuard({
  isDirty,
  warningMessage = DEFAULT_WARNING_MESSAGE,
}: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardResult {
  const bypassNavigationRef = useRef(false);
  const confirmedLocationRef = useRef<string | null>(null);
  const historyIndexRef = useRef(0);

  const allowNextNavigation = useCallback(() => {
    bypassNavigationRef.current = true;
    confirmedLocationRef.current = null;
  }, []);

  const confirmNavigation = useCallback(
    (target: string | URL | null | undefined) => {
      const currentLocation = `${window.location.pathname}${window.location.search}`;
      const nextLocation = resolveNavigationUrl(target);

      if (!isPathNavigation(currentLocation, nextLocation)) {
        return true;
      }

      if (bypassNavigationRef.current) {
        return true;
      }

      if (nextLocation && confirmedLocationRef.current === nextLocation) {
        return true;
      }

      const confirmed = window.confirm(warningMessage);

      if (confirmed) {
        confirmedLocationRef.current = nextLocation;
      }

      return confirmed;
    },
    [warningMessage],
  );

  useEffect(() => {
    if (!isDirty) {
      bypassNavigationRef.current = false;
      confirmedLocationRef.current = null;
    }
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      Reflect.set(event, "returnValue", warningMessage);
      return warningMessage;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, warningMessage]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const navigation = getHistoryNavigationApi();

    if (!navigation) {
      return;
    }

    const handleNavigate = (event: Event) => {
      const navigateEvent = event as HistoryNavigateEvent;

      if (navigateEvent.navigationType !== "traverse") {
        return;
      }

      if (!event.cancelable && !navigateEvent.canIntercept) {
        return;
      }

      if (!confirmNavigation(navigateEvent.destination?.url)) {
        event.preventDefault();
      }
    };

    navigation.addEventListener("navigate", handleNavigate);

    return () => {
      navigation.removeEventListener("navigate", handleNavigate);
    };
  }, [confirmNavigation, isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const stateWithIndex = toHistoryStateValue(window.history.state);
    const currentIndex = getHistoryStateIndex(stateWithIndex) ?? Date.now();

    historyIndexRef.current = currentIndex;

    if (stateWithIndex[HISTORY_INDEX_STATE_KEY] !== currentIndex) {
      window.history.replaceState(
        {
          ...stateWithIndex,
          [HISTORY_INDEX_STATE_KEY]: currentIndex,
        },
        "",
        window.location.href,
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      const nextLocation = `${window.location.pathname}${window.location.search}`;
      const nextIndex = getHistoryStateIndex(event.state);
      const direction = nextIndex === null || nextIndex < historyIndexRef.current ? 1 : -1;

      if (bypassNavigationRef.current) {
        bypassNavigationRef.current = false;
        confirmedLocationRef.current = null;
        historyIndexRef.current = nextIndex ?? historyIndexRef.current;
        return;
      }

      if (!confirmNavigation(nextLocation)) {
        bypassNavigationRef.current = true;
        window.history.go(direction);
        return;
      }

      confirmedLocationRef.current = null;
      historyIndexRef.current = nextIndex ?? historyIndexRef.current;
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [confirmNavigation, isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const currentState = toHistoryStateValue(window.history.state);
    const baseIndex = getHistoryStateIndex(currentState) ?? Date.now();
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    historyIndexRef.current = baseIndex;

    const wrapState = (state: unknown, nextIndex: number) => ({
      ...toHistoryStateValue(state),
      [HISTORY_GUARD_STATE_KEY]: true,
      [HISTORY_INDEX_STATE_KEY]: nextIndex,
    });

    window.history.pushState = function pushState(data, unused, url) {
      if (!confirmNavigation(url)) {
        return;
      }

      const nextIndex = historyIndexRef.current + 1;

      historyIndexRef.current = nextIndex;
      confirmedLocationRef.current = resolveNavigationUrl(url);
      originalPushState(wrapState(data, nextIndex), unused, url);
    };

    window.history.replaceState = function replaceState(data, unused, url) {
      if (!confirmNavigation(url)) {
        return;
      }

      confirmedLocationRef.current = resolveNavigationUrl(url);
      originalReplaceState(wrapState(data, historyIndexRef.current), unused, url);
    };

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [confirmNavigation, isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(anchor.href, currentUrl);

      if (currentUrl.pathname === nextUrl.pathname && currentUrl.search === nextUrl.search) {
        return;
      }

      if (!confirmNavigation(anchor.href)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [confirmNavigation, isDirty]);

  return {
    allowNextNavigation,
  };
}
