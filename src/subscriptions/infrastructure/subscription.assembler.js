import {Subscription} from "../domain/model/subscription.entity.js";
import {Invoice} from "../domain/model/invoice.entity.js";
import {EnumValue} from "../../shared/infrastructure/enum-value.js";

/**
 * The platform says Rejected; the views of the Web Application say declined.
 * @param {string} status - Status sent by the platform.
 * @returns {string} Status used by the views.
 */
const toViewState = (status) => status === 'Rejected' ? 'declined' : EnumValue.toView(status);

/**
 * Maps subscriptions to and from the resources of the DoofPlus Platform; its payments become its invoices.
 */
export class SubscriptionAssembler {
    static toEntityFromResource(resource) {
        const payments = resource.payments ?? [];
        const last = payments[payments.length - 1];
        return new Subscription({
            id: resource.id,
            organizationId: resource.organizationId,
            planId: resource.planId,
            planKey: '',
            billingCycle: EnumValue.toView(resource.billingCycle),
            status: EnumValue.toView(resource.status),
            paymentState: last ? toViewState(last.status) : 'pending',
            nextInvoiceDate: resource.currentPeriodEnd ?? '',
            autoRenew: resource.autoRenew,
            cardBrand: resource.cardBrand,
            cardLast4: resource.cardLast4,
            cardExpiry: resource.cardExpiry,
            billingEmail: resource.billingEmail,
            invoices: payments.map(payment => new Invoice({
                id: payment.id,
                subscriptionId: resource.id,
                number: payment.invoiceNumber,
                issuedAt: (payment.processedAt ?? '').slice(0, 10),
                amount: payment.amount,
                status: toViewState(payment.status)
            }))
        });
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        return response.data.map(resource => this.toEntityFromResource(resource));
    }

    static toResourceFromEntity(entity) {
        return {
            id: entity.id,
            organizationId: entity.organizationId,
            planId: entity.planId,
            billingCycle: EnumValue.toPlatform(entity.billingCycle),
            cardBrand: entity.cardBrand,
            cardLast4: entity.cardLast4,
            cardExpiry: entity.cardExpiry,
            billingEmail: entity.billingEmail
        };
    }
}
