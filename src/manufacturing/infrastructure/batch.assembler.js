import {Batch} from "../domain/model/batch.entity.js";
import {EnumValue} from "../../shared/infrastructure/enum-value.js";
import {BatchEventAssembler} from "./batch-event.assembler.js";

/**
 * Unit of the planned quantity of the batches created from the Web Application.
 * @type {string}
 */
const QUANTITY_UNIT = 'units';

/**
 * Maps production batch resources of the DoofPlus Platform to and from Batch entities.
 *
 * @class BatchAssembler
 */
export class BatchAssembler {
    /**
     * @param {Object} resource - Production batch resource, with its incidents and events.
     * @param {Array<import('../domain/model/production-order.entity.js').ProductionOrder>} orders - Orders, to find the
     *     order and the product of the batch.
     * @returns {Batch} The entity: the open incident and the last event are shown as its incident and last activity.
     */
    static toEntityFromResource(resource, orders = []) {
        const order = orders.find(item => item.id === resource.productionOrderId);
        const events = BatchEventAssembler.toEntitiesFromBatches([resource])
            .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));
        const lastEvent = events[events.length - 1];
        const openIncident = (resource.incidents ?? []).filter(incident => incident.status !== 'Resolved').pop();
        return new Batch({
            id: resource.id,
            code: resource.batchNumber,
            productCode: order?.productCode ?? '',
            orderCode: order?.code ?? '',
            quantity: resource.plannedQuantityValue,
            line: resource.line ?? '',
            owner: resource.owner ?? '',
            status: EnumValue.toView(resource.status),
            progress: resource.progress,
            incident: openIncident?.description ?? '',
            lastActivity: lastEvent?.title ?? '',
            lastActivityAt: lastEvent?.occurredAt ?? ''
        });
    }

    /**
     * @param {import('axios').AxiosResponse<Array<Object>>} response - HTTP response with the resources.
     * @param {Array} orders - Orders, to find the order and the product of each batch.
     * @returns {Array<Batch>} The entities, or an empty array when the response failed.
     */
    static toEntitiesFromResponse(response, orders = []) {
        if (response.status !== 200) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        return response.data.map(resource => this.toEntityFromResource(resource, orders));
    }

    /**
     * @param {Batch} entity - The entity.
     * @param {number} productionOrderId - Identifier of the order of the batch.
     * @returns {Object} The resource to create the batch.
     */
    static toResourceFromEntity(entity, productionOrderId) {
        return {
            batchNumber: entity.code,
            productionOrderId,
            plannedQuantityValue: entity.quantity,
            plannedQuantityUnit: QUANTITY_UNIT,
            line: entity.line || null,
            owner: entity.owner || null
        };
    }
}
