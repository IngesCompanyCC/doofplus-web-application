import {BatchEvent} from "../domain/model/batch-event.entity.js";
import {EnumValue} from "../../shared/infrastructure/enum-value.js";

/**
 * Titles of the events that the DoofPlus Platform records in a batch, by type.
 * @type {Object<string, string>}
 */
const titles = {
    BATCH_CREATED: 'Created',
    BATCH_STARTED: 'Production started',
    BATCH_RESUMED: 'Production resumed',
    INCIDENT_REGISTERED: 'Incident registered',
    MATERIAL_CONSUMED: 'Material consumed',
    RELEASE_REQUESTED: 'Release requested',
    BATCH_RELEASED: 'Released for distribution'
};

/**
 * Maps the events that come inside the batches of the DoofPlus Platform to BatchEvent entities.
 *
 * @class BatchEventAssembler
 */
export class BatchEventAssembler {
    /**
     * @param {Object} resource - Event resource (type, description, tone and date).
     * @param {string} batchCode - Number of the batch that contains it.
     * @returns {BatchEvent} The entity: the title comes from the type and the detail is the description.
     */
    static toEntityFromResource(resource, batchCode) {
        return new BatchEvent({
            id: resource.id,
            batchCode,
            title: titles[resource.type] ?? resource.type,
            detail: resource.description ?? '',
            occurredAt: resource.occurredAt,
            tone: EnumValue.toView(resource.tone)
        });
    }

    /**
     * @param {Array<Object>} batchResources - Batch resources with their events.
     * @returns {Array<BatchEvent>} The events of every batch.
     */
    static toEntitiesFromBatches(batchResources) {
        return batchResources.flatMap(batch =>
            (batch.events ?? []).map(event => this.toEntityFromResource(event, batch.batchNumber)));
    }
}
