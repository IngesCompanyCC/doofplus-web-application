import {Facility} from "../domain/model/facility.entity.js";
import {EnumValue} from "../../shared/infrastructure/enum-value.js";

/**
 * Maps facilities resources of the API to and from Facility entities.
 *
 * @class FacilityAssembler
 */
export class FacilityAssembler {
    /**
     * @param {Object} resource - Resource from the API.
     * @returns {Facility} The entity.
     */
    static toEntityFromResource(resource) {
        return new Facility({...resource, type: EnumValue.toView(resource.type), status: EnumValue.toView(resource.status)});
    }

    /**
     * @param {import('axios').AxiosResponse<Array<Object>>} response - HTTP response with the resources.
     * @returns {Array<Facility>} The entities, or an empty array when the response failed.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        return response.data.map(resource => this.toEntityFromResource(resource));
    }

    /**
     * @param {Facility} entity - The entity.
     * @returns {Object} The resource sent to the API.
     */
    static toResourceFromEntity(entity) {
        return {
            id: entity.id,
            organizationId: entity.organizationId,
            name: entity.name,
            type: EnumValue.toPlatform(entity.type),
            timezone: entity.timezone,
            ownerName: entity.ownerName,
            status: EnumValue.toPlatform(entity.status)
        };
    }
}
