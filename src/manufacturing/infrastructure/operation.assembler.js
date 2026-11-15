import {Operation} from "../domain/model/operation.entity.js";
import {EnumValue} from "../../shared/infrastructure/enum-value.js";

/**
 * Maps the operations that come inside the production orders of the DoofPlus Platform to Operation entities.
 * The platform identifies an operation by its order and its sequence.
 *
 * @class OperationAssembler
 */
export class OperationAssembler {
    /**
     * @param {Object} resource - Operation resource.
     * @param {number} orderId - Identifier of the production order that contains it.
     * @returns {Operation} The entity; its id joins the order and the sequence.
     */
    static toEntityFromResource(resource, orderId) {
        return new Operation({
            id: orderId * 1000 + resource.sequence,
            orderId,
            sequence: resource.sequence,
            name: resource.name,
            equipment: resource.equipment ?? '',
            progress: resource.progress,
            status: EnumValue.toView(resource.status),
            reference: resource.reference ?? ''
        });
    }

    /**
     * @param {Array<Object>} orderResources - Production order resources with their operations.
     * @returns {Array<Operation>} The operations of every order.
     */
    static toEntitiesFromOrders(orderResources) {
        return orderResources.flatMap(order =>
            (order.operations ?? []).map(operation => this.toEntityFromResource(operation, order.id)));
    }

    /**
     * @param {Operation} entity - The entity.
     * @returns {Object} The resource to record the progress of the operation.
     */
    static toResourceFromEntity(entity) {
        return {
            progress: entity.progress,
            status: entity.status,
            reference: entity.reference
        };
    }
}
