
import { useState, useEffect } from 'react';


export const useFetchGet = (url) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchData = async () => {
            try {

                const response = await fetch(
                    url, signal
                );
                if (!response.ok) {
                    throw new Error(`error: ${response.status}`);
                }
                const dataJSON = await response.json();
                setData(dataJSON);
                
            } catch(err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchData();

        return () => controller.abort();
    }, [url])

    return { data, loading, error };
}