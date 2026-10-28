// Opt-in so existing web reports retain their complete-array contract.
export function paginationOptions(query = {}) {
  if (query.page === undefined && query.pageSize === undefined) return null;
  const integer = (value, fallback) => {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
      throw Object.assign(new Error('page and pageSize must be positive integers.'), { status: 400 });
    }
    return Number(value);
  };
  const page = integer(query.page, 1);
  const limit = Math.min(integer(query.pageSize, 20), 100);
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) throw Object.assign(new Error('Requested page is too large.'), { status: 400 });
  return { page, limit, offset };
}

export function paginationMeta(options, count) {
  const total = Number(count);
  return { page: options.page, pageSize: options.limit, total,
    totalPages: Math.ceil(total / options.limit), hasMore: options.offset + options.limit < total };
}
