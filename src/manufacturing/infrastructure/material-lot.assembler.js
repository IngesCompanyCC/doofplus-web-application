import {MaterialLot} from "../domain/model/material-lot.entity.js";
import {EnumValue} from "../../shared/infrastructure/enum-value.js";

/**
 * Maps raw-material lot resources of the DoofPlus Platform to and from MaterialLot entities.
 *
 * @class MaterialLotAssembler
 */
export class MaterialLotAssembler {
    /**
     * @param {Object} resource - Raw-material lot resource.
     * @returns {MaterialLot} The entity, with its category and statuses in kebab-case.
     */
    static toEntityFromResource(resource) {
        return new MaterialLot({
            id: resource.id,
            code: resource.code,
            receiptCode: resource.receiptCode ?? '',
            material: resource.material,
            category: EnumValue.toView(resource.category),
            supplier: resource.supplier ?? '',
            supplierLot: resource.supplierLot ?? '',
            quantity: resource.quantity ?? '',
            expiryDate: resource.expiryDate ?? '',
            storageLocation: resource.storageLocation ?? '',
            certificate: resource.certificate ?? '',
            status: EnumValue.toView(resource.status),
            packagingVerified: resource.packagingVerified,
            identityVerified: resource.identityVerified,
            samplingStatus: EnumValue.toView(resource.samplingStatus),
            allocatedBatch: resource.allocatedBatch ?? ''
        });
    }

    /**
     * @param {import('axios').AxiosResponse<Array<Object>>} response - HTTP response with the resources.
     * @returns {Array<MaterialLot>} The entities, or an empty array when the response failed.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        return response.data.map(resource => this.toEntityFromResource(resource));
    }

    /**
     * @param {MaterialLot} entity - The entity.
     * @returns {Object} The resource to record the receipt of the lot.
     */
    static toResourceFromEntity(entity) {
        return {
            code: entity.code,
            receiptCode: entity.receiptCode || null,
            material: entity.material,
            category: entity.category,
            supplier: entity.supplier || null,
            supplierLot: entity.supplierLot || null,
            quantity: entity.quantity || null,
            expiryDate: entity.expiryDate,
            storageLocation: entity.storageLocation || null,
            certificate: entity.certificate || null
        };
    }

    /**
     * @param {MaterialLot} entity - The entity.
     * @param {string} samplingStatus - New sampling status (pending, requested or done).
     * @returns {Object} The resource to record the inspection of the lot.
     */
    static toInspectionResourceFromEntity(entity, samplingStatus) {
        return {
            packagingVerified: entity.packagingVerified,
            identityVerified: entity.identityVerified,
            samplingStatus,
            storageLocation: entity.storageLocation || null
        };
    }
}
