import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function usePagedHistory(fetchPage, filters = {}) {
  const key = JSON.stringify(filters);
  const params = useMemo(() => JSON.parse(key), [key]);
  const sequence = useRef(0);
  const busy = useRef(false);
  const active = useRef(true);
  const page = useRef(0);
  const lastAppend = useRef(false);
  const [state, setState] = useState({ key, rows: [], loading: true, error: '', hasMore: false, summary: null });
  const load = useCallback(async (append = false) => {
    if (!active.current) return;
    if (append && busy.current) return;
    const request = ++sequence.current;
    const nextPage = append ? page.current + 1 : 1;
    lastAppend.current = append;
    busy.current = true;
    setState(current => ({ ...(current.key === key ? current : { rows: [], summary: null, hasMore: false }), key, loading: true, error: '' }));
    try {
      const response = await fetchPage({ ...params, page: nextPage, pageSize: 20 });
      if (request !== sequence.current) return;
      if (response.data.success === false) throw new Error(response.data.message || 'Unable to load history.');
      const rows = response.data.data || [];
      page.current = nextPage;
      setState(current => {
        const existing = append ? current.rows : [];
        const ids = new Set(existing.map(row => String(row.id)));
        return { key, rows: [...existing, ...rows.filter(row => !ids.has(String(row.id)))],
          summary: response.data.summary || null, loading: false, error: '',
          hasMore: Boolean(response.data.pagination?.hasMore) };
      });
    } catch (error) {
      if (request === sequence.current) setState(current => ({ ...current, loading: false, error: error.message || 'Unable to load history.' }));
    } finally {
      if (request === sequence.current) busy.current = false;
    }
  }, [fetchPage, key, params]);
  useEffect(() => {
    active.current = true;
    page.current = 0;
    load();
    return () => { active.current = false; sequence.current++; busy.current = false; };
  }, [load]);
  const reload = useCallback(() => load(false), [load]);
  const loadMore = useCallback(() => load(true), [load]);
  const retry = useCallback(() => load(lastAppend.current), [load]);
  const current = state.key === key ? state : { rows: [], summary: null, loading: true, error: '', hasMore: false };
  return { ...current, reload, loadMore, retry };
}
