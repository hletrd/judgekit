type PaginationOptions = {
  defaultLimit?: number;
  maxLimit?: number;
};

export function parsePagination(
  searchParams: URLSearchParams,
  options: PaginationOptions = {}
) {
  const defaultLimit = options.defaultLimit ?? 20;
  const maxLimit = options.maxLimit ?? 100;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(searchParams.get("limit") || String(defaultLimit), 10) || defaultLimit)
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}
