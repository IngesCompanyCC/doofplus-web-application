import {Product} from "../domain/model/product.entity.js";

/**
 * Maps product resources of the DoofPlus Platform to and from Product entities.
 * The platform does not return the formula of the product; the store adds it from the master formulas.
 *
 * @class ProductAssembler
 */
export class ProductAssembler {
    /**
     * @param {Object} resource - Product resource (id, code, name and dosage form).
     * @returns {Product} The entity, without formula until the store adds it.
     */
    static toEntityFromResource(resource) {
        return new Product({
            id: resource.id,
            code: resource.code,
            name: resource.name,
            dosageForm: resource.dosageForm,
            formulaVersion: resource.formulaVersion ?? '',
            formulaStatus: resource.formulaStatus ?? 'none'
        });
    }

    /**
     * @param {import('axios').AxiosResponse<Array<Object>>} response - HTTP response with the resources.
     * @returns {Array<Product>} The entities, or an empty array when the response failed.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        return response.data.map(resource => this.toEntityFromResource(resource));
    }

    /**
     * @param {Product} entity - The entity.
     * @returns {Object} The resource to register the product: code, name and dosage form.
     */
    static toResourceFromEntity(entity) {
        return {
            id: entity.id,
            code: entity.code,
            name: entity.name,
            dosageForm: entity.dosageForm
        };
    }
}
