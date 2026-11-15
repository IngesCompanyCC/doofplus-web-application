/**
 * Key of the local storage entry that keeps the JWT issued by the DoofPlus Platform at sign-in.
 * @type {string}
 */
export const TOKEN_KEY = 'doofplus-token';

/**
 * Adds the JWT of the signed-in user as a Bearer token to a request sent to the DoofPlus Platform.
 * @param {import('axios').InternalAxiosRequestConfig} config - Request about to be sent.
 * @returns {import('axios').InternalAxiosRequestConfig} The request, with the Authorization header when there is a token.
 */
export const iamTokenInterceptor = config => {
    let token = null;
    try {
        token = localStorage.getItem(TOKEN_KEY);
    } catch {
        token = null;
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
};
