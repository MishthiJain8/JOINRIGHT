import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for debounced API requests
 * Prevents multiple rapid API calls that could overwhelm the backend
 */
export const useDebounceApi = (minInterval = 1000) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastRequestTime = useRef(0);
  const activeRequestsRef = useRef(new Set());

  const debouncedApiCall = useCallback(async (apiFunction, requestId = 'default', options = {}) => {
    const {
      forceRefresh = false,
      skipDebounce = false,
      onStart = () => {},
      onSuccess = () => {},
      onError = () => {},
      onComplete = () => {}
    } = options;

    // Create unique request ID if not provided
    const reqId = requestId + '_' + Date.now();
    
    // Check if request is already in progress
    if (activeRequestsRef.current.has(requestId) && !forceRefresh) {
      console.log(`Request ${requestId} already in progress, skipping...`);
      return null;
    }

    // Debounce rapid requests
    const now = Date.now();
    if (!skipDebounce && (now - lastRequestTime.current) < minInterval) {
      console.log(`Request ${requestId} too soon, debouncing...`);
      return null;
    }

    try {
      // Mark request as active
      activeRequestsRef.current.add(requestId);
      lastRequestTime.current = now;
      
      setIsLoading(true);
      setError(null);
      onStart();

      console.log(`Starting API request: ${requestId}`);
      
      // Execute the API function
      const result = await apiFunction();
      
      console.log(`API request completed: ${requestId}`);
      onSuccess(result);
      
      return result;
      
    } catch (err) {
      console.error(`API request failed: ${requestId}`, err);
      const errorMessage = err.message || 'Request failed';
      setError(errorMessage);
      onError(err);
      throw err;
      
    } finally {
      // Remove request from active set
      activeRequestsRef.current.delete(requestId);
      setIsLoading(false);
      onComplete();
    }
  }, [minInterval]);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
    activeRequestsRef.current.clear();
    lastRequestTime.current = 0;
  }, []);

  return {
    debouncedApiCall,
    isLoading,
    error,
    reset,
    hasActiveRequests: activeRequestsRef.current.size > 0
  };
};

export default useDebounceApi;