export const DEFAULT_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const PAGE_SIZE_QUERY_PARAM = "pageSize";

const MAX_PAGE = 10000;

/** Normalizes a page number query parameter. Values below 1 default to 1;
 *  values above 10000 are capped to prevent unbounded DB OFFSET queries. */
export function normalizePage(value?: string) {
  const parsed = parseInt(value ?? "1", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(Math.floor(parsed), MAX_PAGE);
}

export function normalizePageSize(value?: string) {
  const parsed = parseInt(value ?? String(DEFAULT_PAGE_SIZE), 10);

  if (PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])) {
    return parsed;
  }

  return DEFAULT_PAGE_SIZE;
}

export function setPaginationParams(params: URLSearchParams, page: number, pageSize: number) {
  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }

  if (pageSize === DEFAULT_PAGE_SIZE) {
    params.delete(PAGE_SIZE_QUERY_PARAM);
  } else {
    params.set(PAGE_SIZE_QUERY_PARAM, String(pageSize));
  }
}
