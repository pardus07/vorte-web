/**
 * API Client with RFC 9457 Problem Details, ETag, and Idempotency support.
 * 
 * Features:
 * - RFC 9457 Problem Details parsing
 * - ETag storage and If-Match header injection
 * - Idempotency-Key generation for mutations
 * - W3C Trace Context propagation
 * - RFC 8288 Link header parsing
 */
import axios, { AxiosInstance, AxiosError } from 'axios';

// RFC 9457 Problem Details type
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  traceId?: string;
  [key: string]: any;
}

// ETag store
const etagStore = new Map<string, string>();

// Link header parser (RFC 8288)
export interface LinkHeader {
  url: string;
  rel: string;
}

function parseLinkHeader(header: string): LinkHeader[] {
  const links: LinkHeader[] = [];
  const parts = header.split(',');
  
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      links.push({ url: match[1], rel: match[2] });
    }
  }
  
  return links;
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add trace context (W3C Trace Context)
    const traceId = crypto.randomUUID();
    config.headers['X-Trace-ID'] = traceId;
    
    // Add If-Match header for updates (PATCH, PUT, DELETE)
    if (['patch', 'put', 'delete'].includes(config.method?.toLowerCase() || '')) {
      const url = config.url || '';
      const etag = etagStore.get(url);
      
      if (etag) {
        config.headers['If-Match'] = etag;
      }
    }
    
    // Add Idempotency-Key for mutations (POST, PATCH, PUT)
    if (['post', 'patch', 'put'].includes(config.method?.toLowerCase() || '')) {
      // Check if idempotency key already provided
      if (!config.headers['Idempotency-Key']) {
        const idempotencyKey = crypto.randomUUID();
        config.headers['Idempotency-Key'] = idempotencyKey;
      }
    }
    
    // Add auth token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Store ETag for future requests
    const etag = response.headers['etag'];
    if (etag && response.config.url) {
      etagStore.set(response.config.url, etag);
    }
    
    // Parse Link headers for pagination
    const linkHeader = response.headers['link'];
    if (linkHeader) {
      response.data._links = parseLinkHeader(linkHeader);
    }
    
    return response;
  },
  (error: AxiosError) => {
    // Handle RFC 9457 Problem Details
    if (error.response?.headers['content-type']?.includes('application/problem+json')) {
      const problem = error.response.data as ProblemDetails;
      
      // Create user-friendly error
      const enhancedError = new Error(problem.detail || problem.title);
      (enhancedError as any).problem = problem;
      (enhancedError as any).status = problem.status;
      
      return Promise.reject(enhancedError);
    }
    
    // Handle 409 Conflict (ETag mismatch)
    if (error.response?.status === 409) {
      const problem = error.response.data as ProblemDetails;
      
      // Clear stale ETag
      if (error.config?.url) {
        etagStore.delete(error.config.url);
      }
      
      const enhancedError = new Error(
        problem.detail || 'Resource was modified. Please refresh and try again.'
      );
      (enhancedError as any).problem = problem;
      (enhancedError as any).status = 409;
      (enhancedError as any).needsRefresh = true;
      
      return Promise.reject(enhancedError);
    }
    
    // Handle 428 Precondition Required
    if (error.response?.status === 428) {
      const problem = error.response.data as ProblemDetails;
      
      const enhancedError = new Error(
        problem.detail || 'Required header missing. Please try again.'
      );
      (enhancedError as any).problem = problem;
      (enhancedError as any).status = 428;
      
      return Promise.reject(enhancedError);
    }
    
    // Handle 429 Rate Limit
    if (error.response?.status === 429) {
      const problem = error.response.data as ProblemDetails;
      const retryAfter = error.response.headers['retry-after'];
      
      const enhancedError = new Error(
        problem.detail || `Rate limit exceeded. Please try again in ${retryAfter || '60'} seconds.`
      );
      (enhancedError as any).problem = problem;
      (enhancedError as any).status = 429;
      (enhancedError as any).retryAfter = retryAfter;
      
      return Promise.reject(enhancedError);
    }
    
    return Promise.reject(error);
  }
);

// Helper to clear ETag for a URL
export function clearETag(url: string) {
  etagStore.delete(url);
}

// Helper to manually set ETag
export function setETag(url: string, etag: string) {
  etagStore.set(url, etag);
}

export default apiClient;
