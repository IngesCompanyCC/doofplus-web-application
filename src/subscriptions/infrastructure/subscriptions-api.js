import {BaseApi, platformApiUrl} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";

const plansEndpointPath = import.meta.env.VITE_PLANS_ENDPOINT_PATH;
const subscriptionsEndpointPath = import.meta.env.VITE_SUBSCRIPTIONS_ENDPOINT_PATH;

/**
 * API of the Subscriptions bounded context over the DoofPlus Platform: plans, subscriptions, payments and plan changes.
 */
export class SubscriptionsApi extends BaseApi {
    #plansEndpoint;

    constructor() {
        super(platformApiUrl);
        this.#plansEndpoint = new BaseEndpoint(this, plansEndpointPath);
    }

    /** Gets the plans. */
    getPlans() {
        return this.#plansEndpoint.getAll();
    }

    /**
     * Gets the subscriptions of an organization.
     * @param {number} organizationId - Identifier of the organization.
     */
    getSubscriptionsByOrganization(organizationId) {
        return this.http.get(subscriptionsEndpointPath, {params: {organizationId}});
    }

    /**
     * Creates a pending subscription.
     * @param {object} resource - Organization, plan, billing cycle and card.
     */
    createSubscription(resource) {
        return this.http.post(subscriptionsEndpointPath, resource);
    }

    /**
     * Changes the plan and the billing cycle of a subscription.
     * @param {number} id - Identifier of the subscription.
     * @param {number} planId - Identifier of the new plan.
     * @param {string} billingCycle - Monthly or Annual.
     */
    changePlan(id, planId, billingCycle) {
        return this.http.put(`${subscriptionsEndpointPath}/${id}/plan`, {planId, billingCycle});
    }

    /**
     * Pays the next billing period with Niubiz.
     * @param {number} id - Identifier of the subscription.
     * @param {string} cardToken - Token of the card.
     */
    paySubscription(id, cardToken) {
        return this.http.post(`${subscriptionsEndpointPath}/${id}/payments`, {cardToken});
    }
}
