import { useCallback, useEffect, useState } from 'react';

export default function useDashboardQuery(repository) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await repository.getDashboard();
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('unknown dashboard error'));
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    error,
    reload: load,
  };
}
