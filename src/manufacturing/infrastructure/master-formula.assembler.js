import {MasterFormula} from "../domain/model/master-formula.entity.js";
import {EnumValue} from "../../shared/infrastructure/enum-value.js";

/**
 * Maps master formula resources of the DoofPlus Platform to MasterFormula entities.
 * The items of each formula are mapped by the FormulaItemAssembler.
 *
 * @class MasterFormulaAssembler
 */
export class MasterFormulaAssembler {
    /**
     * @param {Object} resource - Master formula resource.
     * @returns {MasterFormula} The entity, with its status in kebab-case (approved, draft...).
     */
    static toEntityFromResource(resource) {
        return new MasterFormula({
            id: resource.id,
            productCode: resource.productCode,
            version: resource.version,
            status: EnumValue.toView(resource.status),
            approvedBy: resource.approvedBy ?? '',
            approvedAt: resource.approvedAt ?? '',
            batchSize: resource.batchSize
        });
    }

    /**
     * @param {import('axios').AxiosResponse<Array<Object>>} response - HTTP response with the resources.
     * @returns {Array<MasterFormula>} The entities, or an empty array when the response failed.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        return response.data.map(resource => this.toEntityFromResource(resource));
    }

    /**
     * @param {MasterFormula} entity - The entity.
     * @returns {Object} The resource.
     */
    static toResourceFromEntity(entity) {
        return {
            id: entity.id,
            productCode: entity.productCode,
            version: entity.version,
            status: entity.status,
            approvedBy: entity.approvedBy,
            approvedAt: entity.approvedAt,
            batchSize: entity.batchSize
        };
    }
}
