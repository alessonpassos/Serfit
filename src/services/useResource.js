import { useCallback, useEffect, useState } from 'react';
import { request } from './api';

export function useResource(path) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const reload = useCallback(() => setRevision(x => x + 1), []);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');

    request(path)
        .then(d => {
            if (active) setData(d);
        })
        .catch(e => {
            if (active) setError(e.message);
        })
        .finally(() => {
            if (active) setLoading(false);
        });

    return () => {
        active = false;
    };
}, [path, revision]);

return { data, loading, error, reload, setData };
}