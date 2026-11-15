import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {ManufacturingApi} from "../infrastructure/manufacturing-api.js";
import {ProductAssembler} from "../infrastructure/product.assembler.js";
import {MasterFormulaAssembler} from "../infrastructure/master-formula.assembler.js";
import {FormulaItemAssembler} from "../infrastructure/formula-item.assembler.js";
import {ProductionOrderAssembler} from "../infrastructure/production-order.assembler.js";
import {OperationAssembler} from "../infrastructure/operation.assembler.js";
import {BatchAssembler} from "../infrastructure/batch.assembler.js";
import {BatchEventAssembler} from "../infrastructure/batch-event.assembler.js";
import {MaterialLotAssembler} from "../infrastructure/material-lot.assembler.js";
import {ProductionOrder} from "../domain/model/production-order.entity.js";

const manufacturingApi = new ManufacturingApi();

/**
 * Application service store for the Manufacturing & Batch Management bounded context.
 * It holds products, master formulas, production orders, batches and raw-material lots of the DoofPlus Platform,
 * and applies the manufacturing rules: unique batch codes, approved master formulas and operations in sequence.
 *
 * @returns {Object} Store state and actions.
 */
const useManufacturingStore = defineStore('manufacturing', () => {
    /** @type {import('vue').Ref<Array<import('../domain/model/product.entity.js').Product>>} */
    const products = ref([]);
    /** @type {import('vue').Ref<Array<import('../domain/model/master-formula.entity.js').MasterFormula>>} */
    const formulas = ref([]);
    /** @type {import('vue').Ref<Array<import('../domain/model/formula-item.entity.js').FormulaItem>>} */
    const formulaItems = ref([]);
    /** @type {import('vue').Ref<Array<ProductionOrder>>} */
    const orders = ref([]);
    /** @type {import('vue').Ref<Array<import('../domain/model/operation.entity.js').Operation>>} */
    const operations = ref([]);
    /** @type {import('vue').Ref<Array<import('../domain/model/batch.entity.js').Batch>>} */
    const batches = ref([]);
    /** @type {import('vue').Ref<Array<import('../domain/model/batch-event.entity.js').BatchEvent>>} */
    const batchEvents = ref([]);
    /** @type {import('vue').Ref<Array<import('../domain/model/material-lot.entity.js').MaterialLot>>} */
    const materialLots = ref([]);
    /** @type {import('vue').Ref<boolean>} Whether a request is running. */
    const loading = ref(false);
    /** @type {import('vue').Ref<Array<Error>>} Errors of the last requests. */
    const errors = ref([]);

    /** @type {import('vue').ComputedRef<Object<string, number>>} Number of batches in each status. */
    const batchCounts = computed(() => batches.value.reduce((counts, batch) => {
        counts[batch.status] = (counts[batch.status] ?? 0) + 1;
        return counts;
    }, {}));

    /** @param {Error} error - Error of a request, kept to show it. */
    const keepError = (error) => errors.value.push(error);

    /**
     * Adds to a product the version and the status of its formula: the approved one, or else the latest.
     * @param {import('../domain/model/product.entity.js').Product} product - Product of the platform.
     * @returns {import('../domain/model/product.entity.js').Product} The same product, with its formula.
     */
    const withFormula = (product) => {
        const ofProduct = formulas.value.filter(formula => formula.productCode === product.code);
        const formula = ofProduct.find(item => item.status === 'approved') ?? ofProduct[ofProduct.length - 1];
        product.formulaVersion = formula?.version ?? '';
        product.formulaStatus = formula?.status ?? 'none';
        return product;
    };

    /**
     * Replaces the events of a batch with the ones of its resource.
     * @param {Object} resource - Production batch resource of the platform.
     */
    const replaceEvents = (resource) => {
        batchEvents.value = batchEvents.value
            .filter(event => event.batchCode !== resource.batchNumber)
            .concat(BatchEventAssembler.toEntitiesFromBatches([resource]));
    };

    /**
     * Loads all the manufacturing collections. The items come inside the formulas, the operations inside the
     * orders and the events inside the batches; the batches need the orders to show their product.
     */
    function fetchAll() {
        loading.value = true;
        const formulasLoaded = manufacturingApi.getMasterFormulas().then(response => {
            formulas.value = MasterFormulaAssembler.toEntitiesFromResponse(response);
            formulaItems.value = FormulaItemAssembler.toEntitiesFromFormulas(response.data);
        });
        const ordersLoaded = manufacturingApi.getProductionOrders().then(response => {
            orders.value = ProductionOrderAssembler.toEntitiesFromResponse(response);
            operations.value = OperationAssembler.toEntitiesFromOrders(response.data);
        });
        const productsLoaded = Promise.all([manufacturingApi.getProducts(), formulasLoaded.catch(() => null)])
            .then(([response]) => products.value = ProductAssembler.toEntitiesFromResponse(response).map(withFormula));
        const batchesLoaded = Promise.all([manufacturingApi.getBatches(), ordersLoaded.catch(() => null)])
            .then(([response]) => {
                batches.value = BatchAssembler.toEntitiesFromResponse(response, orders.value);
                batchEvents.value = BatchEventAssembler.toEntitiesFromBatches(response.data);
            });
        const lotsLoaded = manufacturingApi.getMaterialLots()
            .then(response => materialLots.value = MaterialLotAssembler.toEntitiesFromResponse(response));
        Promise.all([formulasLoaded, ordersLoaded, productsLoaded, batchesLoaded, lotsLoaded].map(request => request.catch(keepError)))
            .finally(() => loading.value = false);
    }

    /** @param {string} code - Product code. @returns {Object|undefined} The product. */
    const productByCode = (code) => products.value.find(item => item.code === code);

    /** @param {string} productCode - Product code. @returns {Object|undefined} The approved (effective) master formula of the product. */
    const effectiveFormula = (productCode) =>
        formulas.value.find(formula => formula.productCode === productCode && formula.status === 'approved');

    /** @param {number} formulaId - Master formula identifier. @returns {Array} Components and parameters of the formula. */
    const itemsOfFormula = (formulaId) => formulaItems.value.filter(item => item.formulaId === formulaId);

    /** @param {string} code - Order code. @returns {ProductionOrder|undefined} The production order. */
    const orderByCode = (code) => orders.value.find(item => item.code === code);

    /** @param {number} orderId - Order identifier. @returns {Array} Operations of the order, in sequence. */
    const operationsOfOrder = (orderId) =>
        operations.value.filter(item => item.orderId === orderId).sort((a, b) => a.sequence - b.sequence);

    /** @param {string} code - Batch code. @returns {Object|undefined} The batch. */
    const batchByCode = (code) => batches.value.find(item => item.code === code);

    /** @param {string} batchCode - Batch code. @returns {Array} Status history of the batch, oldest first. */
    const eventsOfBatch = (batchCode) =>
        batchEvents.value.filter(item => item.batchCode === batchCode)
            .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));

    /** @param {string} batchCode - Batch code. @returns {Array} Raw-material lots allocated to the batch. */
    const lotsOfBatch = (batchCode) => materialLots.value.filter(item => item.allocatedBatch === batchCode);

    /**
     * Registers a product when its code is unique.
     * @param {import('../domain/model/product.entity.js').Product} product - Product to register.
     * @returns {boolean} False when the code already exists.
     */
    function addProduct(product) {
        if (products.value.some(item => item.code.toUpperCase() === product.code.toUpperCase())) return false;
        const {id, ...resource} = ProductAssembler.toResourceFromEntity(product);
        manufacturingApi.createProduct(resource)
            .then(response => products.value.push(withFormula(ProductAssembler.toEntityFromResource(response.data))))
            .catch(keepError);
        return true;
    }

    /**
     * Checks the rules to create a batch: a unique code and an approved master formula.
     * @param {string} code - Batch code.
     * @param {string} productCode - Code of the product.
     * @returns {Array<string>} Reasons why the batch cannot be created (duplicate-code, formula-not-approved); empty when it can.
     */
    function validateBatch(code, productCode) {
        const reasons = [];
        if (batches.value.some(batch => batch.code.toUpperCase() === code.toUpperCase())) reasons.push('duplicate-code');
        if (!effectiveFormula(productCode)) reasons.push('formula-not-approved');
        return reasons;
    }

    /**
     * Creates the production order with the effective master formula and then its planned batch.
     * The platform records the creation in the history of the batch.
     * @param {import('../domain/model/batch.entity.js').Batch} batch - Batch to create.
     * @returns {Promise<void>} Resolves when the order and the batch were created.
     */
    function addBatch(batch) {
        const formula = effectiveFormula(batch.productCode);
        if (!formula) return Promise.resolve();
        loading.value = true;
        const now = new Date().toISOString();
        const order = new ProductionOrder({
            code: batch.orderCode, productCode: batch.productCode, formulaId: formula.id, batchCode: batch.code,
            plannedQuantity: batch.quantity, line: batch.line, status: 'planned', plannedStart: now, plannedEnd: now
        });
        return manufacturingApi.createProductionOrder(ProductionOrderAssembler.toResourceFromEntity(order))
            .then(response => {
                const created = ProductionOrderAssembler.toEntityFromResource(response.data);
                orders.value.push(created);
                return manufacturingApi.createBatch(BatchAssembler.toResourceFromEntity(batch, created.id));
            })
            .then(response => {
                batches.value.unshift(BatchAssembler.toEntityFromResource(response.data, orders.value));
                replaceEvents(response.data);
            })
            .catch(keepError)
            .finally(() => loading.value = false);
    }

    /**
     * Records progress on the next pending operation of an order. Not allowed while an operation is on hold.
     * @param {number} orderId - Identifier of the order.
     */
    function recordOperation(orderId) {
        const sequence = operationsOfOrder(orderId);
        if (sequence.some(operation => operation.status === 'on-hold')) return;
        const next = sequence.find(operation => operation.status !== 'complete');
        if (!next) return;
        const resource = OperationAssembler.toResourceFromEntity({...next, progress: 100, status: 'complete'});
        manufacturingApi.updateOperation(orderId, next.sequence, resource)
            .then(response => {
                operations.value = operations.value.filter(operation => operation.orderId !== orderId)
                    .concat(OperationAssembler.toEntitiesFromOrders([response.data]));
                const order = orders.value.find(item => item.id === orderId);
                if (order) Object.assign(order, ProductionOrderAssembler.toEntityFromResource(response.data));
            })
            .catch(keepError);
    }

    /**
     * Releases a batch whose release was requested, after the QA electronic signature.
     * @param {string} batchCode - Code of the batch.
     * @param {string} [releasedBy] - Name of the QA approver.
     */
    function releaseBatch(batchCode, releasedBy = '') {
        const batch = batchByCode(batchCode);
        if (!batch) return;
        manufacturingApi.releaseBatch(batch.id, releasedBy)
            .then(response => {
                Object.assign(batch, BatchAssembler.toEntityFromResource(response.data, orders.value));
                replaceEvents(response.data);
            })
            .catch(keepError);
    }

    /**
     * Records a raw-material receipt; the lot enters quarantine and waits for sampling.
     * @param {import('../domain/model/material-lot.entity.js').MaterialLot} lot - Lot received.
     * @returns {Promise<void>} Resolves when the receipt was recorded.
     */
    function addMaterialLot(lot) {
        loading.value = true;
        return manufacturingApi.receiveMaterialLot(MaterialLotAssembler.toResourceFromEntity(lot))
            .then(response => materialLots.value.unshift(MaterialLotAssembler.toEntityFromResource(response.data)))
            .catch(keepError)
            .finally(() => loading.value = false);
    }

    /**
     * Requests the QC inspection of a lot in quarantine.
     * @param {import('../domain/model/material-lot.entity.js').MaterialLot} lot - Lot to inspect.
     */
    function requestInspection(lot) {
        manufacturingApi.inspectMaterialLot(lot.id, MaterialLotAssembler.toInspectionResourceFromEntity(lot, 'requested'))
            .then(response => Object.assign(lot, MaterialLotAssembler.toEntityFromResource(response.data)))
            .catch(keepError);
    }

    fetchAll();

    return {
        products,
        formulas,
        formulaItems,
        orders,
        operations,
        batches,
        batchEvents,
        materialLots,
        loading,
        errors,
        batchCounts,
        fetchAll,
        productByCode,
        effectiveFormula,
        itemsOfFormula,
        orderByCode,
        operationsOfOrder,
        batchByCode,
        eventsOfBatch,
        lotsOfBatch,
        addProduct,
        validateBatch,
        addBatch,
        recordOperation,
        releaseBatch,
        addMaterialLot,
        requestInspection
    };
});

export default useManufacturingStore;
