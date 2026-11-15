import {EnumValue} from "../../shared/infrastructure/enum-value.js";

/**
 * Prepares a Quality & Compliance resource of the DoofPlus Platform for its entity: the enum fields go from
 * PascalCase to kebab-case (InReview becomes in-review) and the empty dates come as empty text instead of null.
 * @param {Object} resource - Resource answered by the platform.
 * @param {Array<string>} [enumFields] - Fields that hold an enum value.
 * @returns {Object} The resource with the values the views use.
 */
export const fromPlatform = (resource, enumFields = []) => Object.fromEntries(Object.entries(resource)
    .map(([field, value]) => [field, value === null ? '' : enumFields.includes(field) ? EnumValue.toView(value) : value]));
