import {RoleProfile} from "../domain/model/role-profile.entity.js";
import {rolePermissions} from "../domain/model/role-permissions.js";

/**
 * Maps the roles of the DoofPlus Platform (for example ROLE_QA_SPECIALIST) to RoleProfile entities with the
 * permission matrix of each role.
 *
 * @class RoleProfileAssembler
 */
export class RoleProfileAssembler {
    /**
     * @param {{id: number, name: string}} resource - Role resource of the platform.
     * @returns {RoleProfile} The role profile.
     */
    static toEntityFromResource(resource) {
        const key = resource.name.replace(/^ROLE_/, '').toLowerCase().replace(/_/g, '-');
        return new RoleProfile({id: resource.id, key, ...(rolePermissions[key] ?? {name: key})});
    }

    /**
     * @param {import('axios').AxiosResponse<Array<Object>>} response - HTTP response with the roles.
     * @returns {Array<RoleProfile>} The role profiles, in the order of the matrix, or an empty array when the response failed.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const order = Object.keys(rolePermissions);
        return response.data.map(resource => this.toEntityFromResource(resource))
            .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    }
}
