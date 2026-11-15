import axios from "axios";
import {iamTokenInterceptor} from "../../iam/infrastructure/iam-token.interceptor.js";

/** DoofPlus Platform (RESTful Web Services): IAM (sign-in, sign-up, users), Manufacturing, Organizations, IoT Monitoring and Subscriptions. */
export const platformApiUrl = import.meta.env.VITE_PLATFORM_API_URL;
/** Fake API (json-server) for the resources not connected yet: IAM profiles and invitations and Quality. */
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
        // The JWT of the signed-in user goes as a Bearer token to the DoofPlus Platform, not to the fake API.
        if (baseUrl === platformApiUrl) this.#http.interceptors.request.use(iamTokenInterceptor);
    }

    /**
     * Returns the configured Axios HTTP client.
     * @returns {import('axios').AxiosInstance}
     */
    get http() {
        return this.#http;
    }
}
