import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {SubscriptionsApi} from "../infrastructure/subscriptions-api.js";
import {PlanAssembler} from "../infrastructure/plan.assembler.js";
import {SubscriptionAssembler} from "../infrastructure/subscription.assembler.js";
import {EnumValue} from "../../shared/infrastructure/enum-value.js";

const subscriptionsApi = new SubscriptionsApi();

/**
 * Takes the message of the ProblemDetail sent by the platform (400, 404, 409, 422, 503).
 * @param {unknown} error - Axios error.
 * @param {string} fallback - Message used when the platform sends no detail.
 * @returns {Error} Error with a readable message.
 */
const toError = (error, fallback) => new Error(error?.response?.data?.detail ?? error?.response?.data?.title ?? fallback);

/**
 * Holds the plans, the subscription of the current organization and its invoices.
 */
const useSubscriptionsStore = defineStore('subscriptions', () => {
    const plans = ref([]);
    const subscription = ref(null);
    const loading = ref(false);
    const errors = ref([]);

    const invoices = computed(() => [...(subscription.value?.invoices ?? [])].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)));
    const currentPlan = computed(() => plans.value.find(plan => plan.id === subscription.value?.planId));
    const currentAmount = computed(() => {
        if (!currentPlan.value) return 0;
        return subscription.value?.billingCycle === 'annual' ? currentPlan.value.annualPrice : currentPlan.value.monthlyPrice;
    });

    /**
     * Shows a subscription with the key of its plan.
     * @param {import('../domain/model/subscription.entity.js').Subscription|null} value - Subscription or null.
     */
    function setSubscription(value) {
        if (value) value.planKey = plans.value.find(plan => plan.id === value.planId)?.key ?? '';
        subscription.value = value;
    }

    function fetchPlans() {
        return subscriptionsApi.getPlans()
            .then(response => {
                plans.value = PlanAssembler.toEntitiesFromResponse(response);
                if (subscription.value) setSubscription(subscription.value);
            })
            .catch(error => errors.value.push(toError(error, 'Failed to load plans')));
    }

    function fetchForOrganization(organizationId) {
        loading.value = true;
        subscriptionsApi.getSubscriptionsByOrganization(organizationId)
            .then(response => {
                const subscriptions = SubscriptionAssembler.toEntitiesFromResponse(response);
                setSubscription(subscriptions.find(item => item.status === 'pending' || item.status === 'active')
                    ?? subscriptions[0] ?? null);
            })
            .catch(error => errors.value.push(toError(error, 'Failed to load the subscription')))
            .finally(() => loading.value = false);
    }

    function subscribe(organizationId, planKey, billingCycle, billingEmail) {
        const plan = plans.value.find(item => item.key === planKey);
        if (!plan) {
            errors.value.push(new Error('Plan not found'));
            return Promise.resolve();
        }
        // The registration does not ask for the card yet: test card of the Niubiz sandbox
        return subscriptionsApi.createSubscription({
            organizationId, planId: plan.id, billingCycle: EnumValue.toPlatform(billingCycle),
            cardBrand: 'Visa', cardLast4: '4242', cardExpiry: '08/2028', billingEmail
        })
            .then(response => setSubscription(SubscriptionAssembler.toEntityFromResource(response.data)))
            .catch(error => errors.value.push(toError(error, 'Failed to create the subscription')));
    }

    function changePlan(planKey, billingCycle) {
        const plan = plans.value.find(item => item.key === planKey);
        if (!subscription.value || !plan) return;
        loading.value = true;
        errors.value = [];
        return subscriptionsApi.changePlan(subscription.value.id, plan.id, EnumValue.toPlatform(billingCycle))
            .then(response => setSubscription(SubscriptionAssembler.toEntityFromResource(response.data)))
            .catch(error => errors.value.push(toError(error, 'Failed to change the plan')))
            .finally(() => loading.value = false);
    }

    /**
     * Retries a declined charge with Niubiz: an approved payment activates or renews the subscription and becomes
     * a new invoice; a rejected or failed payment shows the reason sent by the platform.
     * @param {string} [cardToken] - Token of the card returned by the Niubiz checkout.
     */
    function retryPayment(cardToken = 'sandbox-card-token') {
        if (!subscription.value) return;
        loading.value = true;
        errors.value = [];
        return subscriptionsApi.paySubscription(subscription.value.id, cardToken)
            .then(response => setSubscription(SubscriptionAssembler.toEntityFromResource(response.data)))
            .catch(error => errors.value.push(toError(error, 'Failed to register the payment')))
            .finally(() => loading.value = false);
    }

    fetchPlans();

    return {
        plans,
        subscription,
        invoices,
        currentPlan,
        currentAmount,
        loading,
        errors,
        fetchPlans,
        fetchForOrganization,
        subscribe,
        changePlan,
        retryPayment
    };
});

export default useSubscriptionsStore;
