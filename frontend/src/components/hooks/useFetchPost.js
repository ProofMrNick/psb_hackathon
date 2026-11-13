
import { useState, useEffect } from 'react';


export const useFetchPost = (url, payload, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...options.headers, 
          },
          body: JSON.stringify(payload),
          signal,  // for request cancellation
        });

        if (!response.ok) {
          throw new Error(`error: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();  // request cancellation when user leaves the page
  }, [url, payload, options]);

  return { data, loading, error };
};

