import { APIRequestContext, APIResponse } from '@playwright/test';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
  ignoreHTTPSErrors?: boolean;
  maxRedirects?: number;
}

export class ApiUtils {
  private request: APIRequestContext;
  private defaultHeaders: Record<string, string>;

  constructor(request: APIRequestContext) {
    this.request = request;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Perform GET request
   */
  async get(url: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    const requestOptions: any = {
      headers: { ...this.defaultHeaders, ...options.headers },
      params: options.params,
      timeout: options.timeout || 30000
    };

    if (options.ignoreHTTPSErrors !== undefined) {
      requestOptions.ignoreHTTPSErrors = options.ignoreHTTPSErrors;
    }
    if (options.maxRedirects !== undefined) {
      requestOptions.maxRedirects = options.maxRedirects;
    }

    return await this.request.get(url, requestOptions);
  }

  /**
   * Perform POST request
   */
  async post(url: string, data: any, options: ApiRequestOptions = {}): Promise<APIResponse> {
    const requestOptions: any = {
      headers: { ...this.defaultHeaders, ...options.headers },
      data: data,
      params: options.params,
      timeout: options.timeout || 30000
    };

    if (options.ignoreHTTPSErrors !== undefined) {
      requestOptions.ignoreHTTPSErrors = options.ignoreHTTPSErrors;
    }
    if (options.maxRedirects !== undefined) {
      requestOptions.maxRedirects = options.maxRedirects;
    }

    return await this.request.post(url, requestOptions);
  }

  /**
   * Perform PUT request
   */
  async put(url: string, data: any, options: ApiRequestOptions = {}): Promise<APIResponse> {
    const requestOptions: any = {
      headers: { ...this.defaultHeaders, ...options.headers },
      data: data,
      params: options.params,
      timeout: options.timeout || 30000
    };

    if (options.ignoreHTTPSErrors !== undefined) {
      requestOptions.ignoreHTTPSErrors = options.ignoreHTTPSErrors;
    }
    if (options.maxRedirects !== undefined) {
      requestOptions.maxRedirects = options.maxRedirects;
    }

    return await this.request.put(url, requestOptions);
  }

  /**
   * Perform DELETE request
   */
  async delete(url: string, options: ApiRequestOptions = {}): Promise<APIResponse> {
    const requestOptions: any = {
      headers: { ...this.defaultHeaders, ...options.headers },
      params: options.params,
      timeout: options.timeout || 30000
    };

    if (options.ignoreHTTPSErrors !== undefined) {
      requestOptions.ignoreHTTPSErrors = options.ignoreHTTPSErrors;
    }
    if (options.maxRedirects !== undefined) {
      requestOptions.maxRedirects = options.maxRedirects;
    }

    return await this.request.delete(url, requestOptions);
  }

  /**
   * Set default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Get response as JSON
   */
  async getResponseJson(response: APIResponse): Promise<any> {
    return await response.json();
  }

  /**
   * Get response as text
   */
  async getResponseText(response: APIResponse): Promise<string> {
    return await response.text();
  }

  /**
   * Verify response status
   */
  verifyStatus(response: APIResponse, expectedStatus: number): boolean {
    return response.status() === expectedStatus;
  }

  /**
   * Verify response contains text
   */
  async verifyResponseContains(response: APIResponse, text: string): Promise<boolean> {
    const responseText = await response.text();
    return responseText.includes(text);
  }
}