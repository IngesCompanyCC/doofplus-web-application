import {FormulaItem} from "../domain/model/formula-item.entity.js";
import {EnumValue} from "../../shared/infrastructure/enum-value.js";

/**
 * Maps the items that come inside the master formulas of the DoofPlus Platform to FormulaItem entities.
 *
 * @class FormulaItemAssembler
 */
export class FormulaItemAssembler {
    /**
     * @param {Object} resource - Item resource (component or parameter).
     * @param {number} formulaId - Identifier of the master formula that contains it.
     * @returns {FormulaItem} The entity.
     */
    static toEntityFromResource(resource, formulaId) {
        return new FormulaItem({
            id: resource.id,
            formulaId,
            kind: EnumValue.toView(resource.kind),
            name: resource.name,
            role: resource.role ?? '',
            target: resource.target ?? '',
            tolerance: resource.tolerance ?? '',
            control: resource.control ?? ''
        });
    }

    /**
     * @param {Array<Object>} formulaResources - Master formula resources with their items.
     * @returns {Array<FormulaItem>} The items of every formula.
     */
    static toEntitiesFromFormulas(formulaResources) {
        return formulaResources.flatMap(formula =>
            (formula.items ?? []).map(item => this.toEntityFromResource(item, formula.id)));
    }
}
