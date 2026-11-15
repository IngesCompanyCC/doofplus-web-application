import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {IamApi} from "../infrastructure/iam-api.js";
import {UserAssembler} from "../infrastructure/user.assembler.js";
import {RoleProfileAssembler} from "../infrastructure/role-profile.assembler.js";
import {InvitationAssembler} from "../infrastructure/invitation.assembler.js";
import {User} from "../domain/model/user.entity.js";
import {TOKEN_KEY} from "../infrastructure/iam-token.interceptor.js";
import {homeOf} from "../../shared/presentation/workspace-environments.js";

const iamApi = new IamApi();
const SESSION_KEY = 'doofplus-session';

/**
 * Restores the session saved in local storage.
 * @returns {import('../domain/model/user.entity.js').User|null} The saved user, or null.
 */
const restoreSession = () => {
    try {
        const saved = localStorage.getItem(SESSION_KEY);
        return saved ? UserAssembler.toEntityFromResource(JSON.parse(saved)) : null;
    } catch {
        return null;
    }
};

/**
 * Sends a sign-in request to the DoofPlus Platform and turns its answer into an outcome.
 * The platform answers 401 with the reason in the detail of the problem.
 * @param {string} email - Work email of the user.
 * @param {string} password - Password of the user.
 * @param {string} [twoFactorCode] - Six-digit code; omitted in the first step.
 * @returns {Promise<{status: string, user?: User, token?: string}>} signed-in (with the user and its JWT),
 *     two-factor-required, invalid-credentials or invalid-two-factor-code.
 */
const requestSignIn = (email, password, twoFactorCode) =>
    iamApi.signIn(email, password, twoFactorCode)
        .then(response => ({
            status: 'signed-in',
            user: UserAssembler.toEntityFromResource(response.data),
            token: response.data.token
        }))
        .catch(error => {
            if (error.response?.status !== 401) throw error;
            const reason = error.response.data?.detail ?? error.response.data?.details;
            if (reason === 'two-factor-required' || reason === 'invalid-two-factor-code') return {status: reason};
            return {status: 'invalid-credentials'};
        });

/**
 * Builds the user shown in the two-factor step: the platform reveals the account only after the code.
 * @param {string} email - Work email entered by the user.
 * @returns {User} A user with the email and a name taken from it (maria.mexico becomes Maria Mexico).
 */
const pendingUserFromEmail = email => new User({
    id: 0, initials: '', email, role: '', environment: '', facility: '', status: '', organizationId: 0,
    organizationName: '', plant: '', privilege: '',
    fullName: email.split('@')[0].split(/[._-]+/).filter(Boolean)
        .map(part => part[0].toUpperCase() + part.slice(1)).join(' ')
});

/**
 * Application service store for the IAM bounded context.
 * It runs the sign-in flow (credentials, two-factor code and environment check) and keeps the session.
 *
 * @returns {Object} Store state and actions.
 */
const useIamStore = defineStore('iam', () => {
    /** @type {import('vue').Ref<import('../domain/model/user.entity.js').User|null>} User with an active session. */
    const currentUser = ref(restoreSession());
    /** @type {import('vue').Ref<import('../domain/model/user.entity.js').User|null>} User whose credentials were accepted. */
    const pendingUser = ref(null);
    /** @type {import('vue').Ref<string|null>} Environment the user asked to enter. */
    const requestedEnvironment = ref(null);
    /**
     * Current step of the sign-in flow: credentials, invalid-credentials, two-factor, invalid-code or not-authorized.
     * @type {import('vue').Ref<string>}
     */
    const signInStep = ref('credentials');
    /** @type {import('vue').Ref<boolean>} Whether a request is running. */
    const loading = ref(false);
    /** @type {import('vue').Ref<Array<Error>>} Errors of the last requests. */
    const errors = ref([]);
    /** @type {import('vue').ComputedRef<boolean>} Whether a user is signed in. */
    const isSignedIn = computed(() => currentUser.value !== null);
    /** @type {import('vue').Ref<Array<import('../domain/model/user.entity.js').User>>} Users of the organization. */
    const users = ref([]);
    /** @type {import('vue').ComputedRef<Array>} Users of the organization with an active account. */
    const activeUsers = computed(() => users.value.filter(user => user.status === 'active'));
    /** @type {import('vue').Ref<Array<import('../domain/model/role-profile.entity.js').RoleProfile>>} Role profiles of the access control. */
    const roleProfiles = ref([]);
    /** @type {import('vue').Ref<Array<import('../domain/model/invitation.entity.js').Invitation>>} Invitations sent by the administrator. */
    const invitations = ref([]);
    /** @type {import('vue').ComputedRef<Array>} Invitations that were not accepted yet. */
    const pendingInvitations = computed(() => invitations.value.filter(invitation => invitation.status === 'pending'));
    /** Credentials kept in memory between the password step and the two-factor step. */
    let pendingCredentials = null;

    /**
     * Sends the credentials to the DoofPlus Platform. A user with two-factor authentication continues to the
     * code step; a user without it signs in at once.
     * @param {import('../domain/model/sign-in.command.js').SignInCommand} signInCommand - Credentials and requested environment.
     * @param {import('vue-router').Router} [router] - Router used to open the workspace when no code is needed.
     */
    function signIn(signInCommand, router) {
        loading.value = true;
        requestSignIn(signInCommand.email, signInCommand.password)
            .then(result => {
                requestedEnvironment.value = signInCommand.environment;
                errors.value = [];
                if (result.status === 'two-factor-required') {
                    pendingCredentials = {email: signInCommand.email, password: signInCommand.password};
                    pendingUser.value = pendingUserFromEmail(signInCommand.email);
                    signInStep.value = 'two-factor';
                    return;
                }
                completeSignIn(result, router);
            })
            .catch(error => errors.value.push(error))
            .finally(() => loading.value = false);
    }

    /**
     * Sends the two-factor code with the credentials of the first step. The DoofPlus Platform answers the user
     * and its JWT only when the code is right.
     * @param {string} code - Six-digit code from the authenticator app.
     * @param {import('vue-router').Router} router - Router used to open the workspace.
     */
    function verifyTwoFactorCode(code, router) {
        const credentials = pendingCredentials;
        if (!credentials) {
            signInStep.value = 'credentials';
            return;
        }
        loading.value = true;
        requestSignIn(credentials.email, credentials.password, code)
            .then(result => completeSignIn(result, router))
            .catch(error => errors.value.push(error))
            .finally(() => loading.value = false);
    }

    /**
     * Opens the session when the platform signed the user in, or moves the form to the step of the failure.
     * The session opens only if the role of the user belongs to the requested environment.
     * @param {{status: string, user?: User, token?: string}} result - Outcome of the sign-in request.
     * @param {import('vue-router').Router} [router] - Router used to open the workspace.
     */
    function completeSignIn(result, router) {
        if (result.status === 'invalid-two-factor-code') {
            signInStep.value = 'invalid-code';
            return;
        }
        if (result.status !== 'signed-in') {
            pendingCredentials = null;
            signInStep.value = 'invalid-credentials';
            return;
        }
        const user = result.user;
        if (user.environment !== requestedEnvironment.value) {
            pendingCredentials = null;
            pendingUser.value = user;
            signInStep.value = 'not-authorized';
            return;
        }
        currentUser.value = user;
        localStorage.setItem(SESSION_KEY, JSON.stringify(UserAssembler.toResourceFromEntity(user)));
        localStorage.setItem(TOKEN_KEY, result.token);
        resetSignIn();
        router?.push(homeOf(user.environment));
    }

    /** Loads the users of the organization of the signed-in user, for the administration pages. */
    function fetchUsers() {
        iamApi.getUsers()
            .then(response => users.value = UserAssembler.toEntitiesFromResponse(response)
                .filter(user => user.organizationId === currentUser.value?.organizationId))
            .catch(error => errors.value.push(error));
    }

    /** Loads the users, role profiles and invitations shown in the users and profiles page. */
    function fetchDirectory() {
        loading.value = true;
        Promise.all([iamApi.getUsers(), iamApi.getRoleProfiles(), iamApi.getInvitations()])
            .then(([usersResponse, profilesResponse, invitationsResponse]) => {
                users.value = UserAssembler.toEntitiesFromResponse(usersResponse)
                    .filter(user => user.organizationId === currentUser.value?.organizationId);
                roleProfiles.value = RoleProfileAssembler.toEntitiesFromResponse(profilesResponse);
                invitations.value = InvitationAssembler.toEntitiesFromResponse(invitationsResponse);
            })
            .catch(error => errors.value.push(error))
            .finally(() => loading.value = false);
    }

    /**
     * Checks whether a user or a pending invitation already uses the email.
     * @param {string} email - Email to check.
     * @returns {boolean} True when the email is already taken.
     */
    function isEmailTaken(email) {
        const normalized = email.trim().toLowerCase();
        return users.value.some(user => user.email.toLowerCase() === normalized)
            || invitations.value.some(invitation => invitation.email.toLowerCase() === normalized);
    }

    /**
     * Sends an invitation and returns to the invitations of the users and profiles page.
     * @param {import('../domain/model/invitation.entity.js').Invitation} invitation - The invitation to send.
     * @param {import('vue-router').Router} router - Router used to return to the user directory.
     */
    function addInvitation(invitation, router) {
        loading.value = true;
        const {id, ...resource} = InvitationAssembler.toResourceFromEntity(invitation);
        iamApi.createInvitation(resource)
            .then(response => {
                const created = InvitationAssembler.toEntityFromResource(response.data);
                invitations.value.push(created);
                router.push({ path: '/administration/users', query: { tab: 'invitations', sent: created.email } });
            })
            .catch(error => errors.value.push(error))
            .finally(() => loading.value = false);
    }

    /**
     * Creates the first administrator of a newly registered organization with the sign-up of the DoofPlus Platform. The account stays invited
     * until the administrator verifies the email and enrolls two-factor authentication.
     * @param {Object} administrator - Organization and personal data of the administrator.
     * @param {number} administrator.organizationId - Identifier of the new organization.
     * @param {string} administrator.organizationName - Legal name of the organization.
     * @param {string} administrator.plant - Name of the primary plant.
     * @param {string} administrator.fullName - Full name of the administrator.
     * @param {string} administrator.email - Work email of the administrator.
     * @param {string} administrator.password - Password chosen by the administrator.
     * @returns {Promise<void>} Resolves when the account was created.
     */
    function registerAdministrator({organizationId, organizationName, plant, fullName, email, password}) {
        const initials = fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
        const {id, ...resource} = UserAssembler.toResourceFromEntity(new User({
            fullName, initials, email, role: 'administrator', environment: 'administration', facility: 'All facilities',
            status: 'invited', organizationId, organizationName, plant, privilege: 'administrator'
        }));
        return iamApi.createUser({...resource, password})
            .then(response => users.value.push(UserAssembler.toEntityFromResource(response.data)))
            .catch(error => errors.value.push(error));
    }

    /**
     * Re-authenticates the signed-in user, as required before an electronic signature.
     * @param {string} password - Password entered by the user.
     * @returns {Promise<boolean>} Resolves to true when the password is correct.
     */
    function verifyPassword(password) {
        const user = currentUser.value;
        if (!user) return Promise.resolve(false);
        // The platform answers two-factor-required only after it checked the password.
        return requestSignIn(user.email, password)
            .then(result => result.status === 'signed-in' || result.status === 'two-factor-required')
            .catch(error => {
                errors.value.push(error);
                return false;
            });
    }

    /** Returns the sign-in flow to the credentials step. */
    function resetSignIn() {
        pendingCredentials = null;
        pendingUser.value = null;
        requestedEnvironment.value = null;
        signInStep.value = 'credentials';
    }

    /**
     * Closes the session and returns to the environment selection.
     * @param {import('vue-router').Router} router - Router used to leave the workspace.
     */
    function signOut(router) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
        currentUser.value = null;
        resetSignIn();
        router.push({name: 'iam-environment-selection'});
    }

    return {
        currentUser,
        pendingUser,
        signInStep,
        loading,
        errors,
        isSignedIn,
        users,
        activeUsers,
        roleProfiles,
        invitations,
        pendingInvitations,
        fetchUsers,
        fetchDirectory,
        isEmailTaken,
        addInvitation,
        registerAdministrator,
        verifyPassword,
        signIn,
        verifyTwoFactorCode,
        resetSignIn,
        signOut
    };
});

export default useIamStore;
