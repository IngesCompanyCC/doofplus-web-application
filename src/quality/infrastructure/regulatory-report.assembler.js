import {RegulatoryReport} from "../domain/model/regulatory-report.entity.js";
import {fromPlatform} from "./platform-resource.js";

/**
 * Names shown for the report types of the DoofPlus Platform. The platform accepts these names back.
 * @type {Object<string, string>}
 */
const reportTypes = {
    BatchDossier: 'Batch dossier',
    QualityReview: 'Quality review',
    CapaSummary: 'CAPA summary',
    AuditEvidence: 'Audit evidence'
};

/**
 * Maps regulatory reports resources of the API to and from RegulatoryReport entities.
 *
 * @class RegulatoryReportAssembler
 */
export class RegulatoryReportAssembler {
    /**
     * @param {Object} resource - Resource from the API.
     * @returns {RegulatoryReport} The entity.
     */
    static toEntityFromResource(resource) {
        const fields = fromPlatform(resource, ["status"]);
        return new RegulatoryReport({...fields, type: reportTypes[resource.type] ?? resource.type});
    }

    /**
     * @param {import('axios').AxiosResponse<Array<Object>>} response - HTTP response with the resources.
     * @returns {Array<RegulatoryReport>} The entities, or an empty array when the response failed.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        return response.data.map(resource => this.toEntityFromResource(resource));
    }

    /**
     * @param {RegulatoryReport} entity - The entity.
     * @returns {Object} The resource sent to the API.
     */
    static toResourceFromEntity(entity) {
        return {
            id: entity.id,
            code: entity.code,
            type: entity.type,
            scope: entity.scope,
            owner: entity.owner,
            status: entity.status,
            template: entity.template,
            format: entity.format,
            createdAt: entity.createdAt
        };
    }
}
