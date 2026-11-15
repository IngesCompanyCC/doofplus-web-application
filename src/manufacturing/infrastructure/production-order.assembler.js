import {ProductionOrder} from "../domain/model/production-order.entity.js";
import {EnumValue} from "../../shared/infrastructure/enum-value.js";

/**
 * Maps production order resources of the DoofPlus Platform to and from ProductionOrder entities.
 * The operations of each order are mapped by the OperationAssembler.
 *
 * @class ProductionOrderAssembler
 */
export class ProductionOrderAssembler {
    /**
     * @param {Object} resource - Production order resource.
     * @returns {ProductionOrder} The entity, with its status in kebab-case.
     */
    static toEntityFromResource(resource) {
        return new ProductionOrder({
            id: resource.id,
            code: resource.code,
            productCode: resource.productCode,
            formulaId: resource.formulaId,
            batchCode: resource.batchCode ?? '',
            plannedQuantity: resource.plannedQuantity,
            line: resource.line ?? '',
            status: EnumValue.toView(resource.status),
            plannedStart: resource.plannedStart ?? '',
            plannedEnd: resource.plannedEnd ?? ''
        });
    }

    /**
     * @param {import('axios').AxiosResponse<Array<Object>>} response - HTTP response with the resources.
     * @returns {Array<ProductionOrder>} The entities, or an empty array when the response failed.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        return response.data.map(resource => this.toEntityFromResource(resource));
    }

    /**
     * @param {ProductionOrder} entity - The entity.
     * @returns {Object} The resource to create the order; the platform takes the product from the master formula.
     */
    static toResourceFromEntity(entity) {
        return {
            code: entity.code,
            formulaId: entity.formulaId,
            batchCode: entity.batchCode,
            plannedQuantity: entity.plannedQuantity,
            line: entity.line,
            plannedStart: entity.plannedStart || null,
            plannedEnd: entity.plannedEnd || null,
            operations: []
        };
    }
}
