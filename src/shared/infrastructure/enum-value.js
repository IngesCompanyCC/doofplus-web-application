/**
 * Converts the enumeration values between the Web Application and the DoofPlus Platform.
 * The views use kebab-case values (for example `pending-verification`), and the platform
 * sends and expects PascalCase values (for example `PendingVerification`).
 */
export class EnumValue {
    /**
     * Converts a platform value to the value used by the views.
     * @param {string|null|undefined} value - Value sent by the platform, for example `NotFit`.
     * @returns {string|null|undefined} The kebab-case value, for example `not-fit`.
     */
    static toView(value) {
        if (typeof value !== 'string') return value;
        return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
    }

    /**
     * Converts a value of the views to the value expected by the platform.
     * @param {string|null|undefined} value - Value used by the views, for example `qc-laboratory`.
     * @returns {string|null|undefined} The PascalCase value, for example `QcLaboratory`.
     */
    static toPlatform(value) {
        if (typeof value !== 'string') return value;
        return value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    }
}
