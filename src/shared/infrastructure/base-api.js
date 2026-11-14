import axios from "axios";

/** DoofPlus Platform (RESTful Web Services): Organizations and IoT Monitoring. */
export const platformApiUrl = import.meta.env.VITE_PLATFORM_API_URL;
/** Fake API (json-server) for the bounded contexts not connected yet: IAM, Manufacturing, Quality and Subscriptions. */
export const fakeApiUrl = import.meta.env.VITE_FAKE_API_URL;

/**
 * Shared infrastructure base class that configures the HTTP client for the DoofPlus platform API.
 *
 * @class BaseApi
 */
export class BaseApi {
    /**
     * @private
     * Axios HTTP client instance
     * @type {import('axios').AxiosInstance}
     */
    #http;

    /**
     * Initializes the Axios HTTP client with the base URL from environment variables.
     */
    /**
     * @param {string} [baseUrl] - Base URL of the API; the Fake API by default.
     */
    constructor(baseUrl = fakeApiUrl) {
        this.#http = axios.create({
            baseURL: baseUrl,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    /**
     * Returns the configured Axios HTTP client.
     * @returns {import('axios').AxiosInstance}
     */
    get http() {
        return this.#http;
    }
}
