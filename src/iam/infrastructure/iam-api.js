import {BaseApi, platformApiUrl} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";

const signInEndpointPath = import.meta.env.VITE_SIGN_IN_ENDPOINT_PATH;
const signUpEndpointPath = import.meta.env.VITE_SIGN_UP_ENDPOINT_PATH;
const usersEndpointPath = import.meta.env.VITE_USERS_ENDPOINT_PATH;
const roleProfilesEndpointPath = import.meta.env.VITE_ROLE_PROFILES_ENDPOINT_PATH;
const invitationsEndpointPath = import.meta.env.VITE_INVITATIONS_ENDPOINT_PATH;

/**
 * Infrastructure gateway for the IAM endpoints.
 * Sign-in, sign-up and users use the DoofPlus Platform; role profiles and invitations still use the fake API.
 *
 * @class IamApi
 * @extends BaseApi
 */
export class IamApi extends BaseApi {
    #usersEndpoint;
    #roleProfilesEndpoint;
    #invitationsEndpoint;

    /** Creates the endpoint clients for users (platform), role profiles and invitations (fake API). */
    constructor() {
        super(platformApiUrl);
        const fakeApi = new BaseApi();
        this.#usersEndpoint = new BaseEndpoint(this, usersEndpointPath);
        this.#roleProfilesEndpoint = new BaseEndpoint(fakeApi, roleProfilesEndpointPath);
        this.#invitationsEndpoint = new BaseEndpoint(fakeApi, invitationsEndpointPath);
    }

    /**
     * Signs in with the DoofPlus Platform. The platform answers 401 with the reason in the detail of the problem:
     * invalid-credentials, two-factor-required (the password is right; send the code in a second request) or
     * invalid-two-factor-code.
     * @param {string} email - Work email of the user.
     * @param {string} password - Password of the user.
     * @param {string} [twoFactorCode] - Six-digit code of the authenticator app; omitted in the first step.
     * @returns {Promise<import('axios').AxiosResponse<Object>>} HTTP response with the user and its JWT.
     */
    signIn(email, password, twoFactorCode) {
        return this.http.post(signInEndpointPath, {email, password, twoFactorCode: twoFactorCode ?? null});
    }

    /**
     * Creates a user account with its password in the DoofPlus Platform, which stores it hashed.
     * @param {Object} resource - User resource built by the UserAssembler, with the password.
     * @returns {Promise<import('axios').AxiosResponse<Object>>} HTTP response with the created user.
     */
    createUser(resource) {
        return this.http.post(signUpEndpointPath, resource);
    }

    /**
     * Retrieves the users of the platform (only administrators receive them).
     * @returns {Promise<import('axios').AxiosResponse<Array<Object>>>} HTTP response with the user resources.
     */
    getUsers() {
        return this.#usersEndpoint.getAll();
    }

    /**
     * Retrieves the role profiles of the role-based access control.
     * @returns {Promise<import('axios').AxiosResponse<Array<Object>>>} HTTP response with the role profile resources.
     */
    getRoleProfiles() {
        return this.#roleProfilesEndpoint.getAll();
    }

    /**
     * Retrieves the invitations sent by the administrator.
     * @returns {Promise<import('axios').AxiosResponse<Array<Object>>>} HTTP response with the invitation resources.
     */
    getInvitations() {
        return this.#invitationsEndpoint.getAll();
    }

    /**
     * Sends an invitation to a new member of the team.
     * @param {Object} resource - Invitation resource built by the InvitationAssembler.
     * @returns {Promise<import('axios').AxiosResponse<Object>>} HTTP response with the created invitation.
     */
    createInvitation(resource) {
        return this.#invitationsEndpoint.create(resource);
    }
}
