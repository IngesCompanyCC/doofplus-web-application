import {ContactInquiry} from "../domain/model/contact-inquiry.entity.js";
import {EnumValue} from "../../shared/infrastructure/enum-value.js";

/**
 * Maps contact inquiry resources of the API to and from ContactInquiry entities.
 *
 * @class ContactInquiryAssembler
 */
export class ContactInquiryAssembler {
    /**
     * @param {Object} resource - Resource from the API.
     * @returns {ContactInquiry} The entity.
     */
    static toEntityFromResource(resource) {
        return new ContactInquiry({...resource, status: EnumValue.toView(resource.status)});
    }

    /**
     * @param {ContactInquiry} entity - The entity.
     * @returns {Object} The resource sent to the API.
     */
    static toResourceFromEntity(entity) {
        return {
            fullName: entity.fullName,
            email: entity.email,
            message: entity.message,
            status: EnumValue.toPlatform(entity.status),
            receivedAt: entity.receivedAt
        };
    }
}
