import {BaseApi, platformApiUrl} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";

const productsEndpointPath = import.meta.env.VITE_PRODUCTS_ENDPOINT_PATH;
const masterFormulasEndpointPath = import.meta.env.VITE_MASTER_FORMULAS_ENDPOINT_PATH;
const productionOrdersEndpointPath = import.meta.env.VITE_PRODUCTION_ORDERS_ENDPOINT_PATH;
const productionBatchesEndpointPath = import.meta.env.VITE_PRODUCTION_BATCHES_ENDPOINT_PATH;
const materialLotsEndpointPath = import.meta.env.VITE_MATERIAL_LOTS_ENDPOINT_PATH;

/**
 * Infrastructure gateway for the Manufacturing & Batch Management endpoints of the DoofPlus Platform.
 * The formula items come inside their master formula, the operations inside their production order and the
 * events inside their batch; the changes of state are commands (release, inspection, operation progress).
 *
 * @class ManufacturingApi
 * @extends BaseApi
 */
export class ManufacturingApi extends BaseApi {
    #productsEndpoint;
    #masterFormulasEndpoint;
    #productionOrdersEndpoint;
    #productionBatchesEndpoint;
    #materialLotsEndpoint;

    /** Creates one endpoint client per manufacturing collection. */
    constructor() {
        super(platformApiUrl);
        this.#productsEndpoint = new BaseEndpoint(this, productsEndpointPath);
        this.#masterFormulasEndpoint = new BaseEndpoint(this, masterFormulasEndpointPath);
        this.#productionOrdersEndpoint = new BaseEndpoint(this, productionOrdersEndpointPath);
        this.#productionBatchesEndpoint = new BaseEndpoint(this, productionBatchesEndpointPath);
        this.#materialLotsEndpoint = new BaseEndpoint(this, materialLotsEndpointPath);
    }

    /**
     * Retrieves the products.
     * @returns {Promise<import('axios').AxiosResponse<Array<Object>>>} HTTP response with the products.
     */
    getProducts() {
        return this.#productsEndpoint.getAll();
    }

    /**
     * Registers a product.
     * @param {Object} resource - Code, name and dosage form, built by the ProductAssembler.
     * @returns {Promise<import('axios').AxiosResponse<Object>>} HTTP response with the created product.
     */
    createProduct(resource) {
        return this.#productsEndpoint.create(resource);
    }

    /**
     * Retrieves the master formulas, each one with its components and parameters.
     * @returns {Promise<import('axios').AxiosResponse<Array<Object>>>} HTTP response with the master formulas.
     */
    getMasterFormulas() {
        return this.#masterFormulasEndpoint.getAll();
    }

    /**
     * Retrieves the production orders, each one with its operations.
     * @returns {Promise<import('axios').AxiosResponse<Array<Object>>>} HTTP response with the production orders.
     */
    getProductionOrders() {
        return this.#productionOrdersEndpoint.getAll();
    }

    /**
     * Creates a production order with the master formula of its product.
     * @param {Object} resource - Order built by the ProductionOrderAssembler.
     * @returns {Promise<import('axios').AxiosResponse<Object>>} HTTP response with the created order.
     */
    createProductionOrder(resource) {
        return this.#productionOrdersEndpoint.create(resource);
    }

    /**
     * Records the progress of an operation of a production order.
     * @param {number} orderId - Identifier of the order.
     * @param {number} sequence - Sequence of the operation in the order.
     * @param {Object} resource - Progress, status and reference, built by the OperationAssembler.
     * @returns {Promise<import('axios').AxiosResponse<Object>>} HTTP response with the updated order.
     */
    updateOperation(orderId, sequence, resource) {
        return this.http.put(`${productionOrdersEndpointPath}/${orderId}/operations/${sequence}`, resource);
    }

    /**
     * Retrieves the production batches, each one with its incidents, consumptions and events.
     * @returns {Promise<import('axios').AxiosResponse<Array<Object>>>} HTTP response with the batches.
     */
    getBatches() {
        return this.#productionBatchesEndpoint.getAll();
    }

    /**
     * Creates a planned batch of a production order.
     * @param {Object} resource - Batch built by the BatchAssembler.
     * @returns {Promise<import('axios').AxiosResponse<Object>>} HTTP response with the created batch.
     */
    createBatch(resource) {
        return this.#productionBatchesEndpoint.create(resource);
    }

    /**
     * Releases a batch whose release was requested, after the QA electronic signature.
     * @param {number} batchId - Identifier of the batch.
     * @param {string} releasedBy - Name of the QA approver.
     * @returns {Promise<import('axios').AxiosResponse<Object>>} HTTP response with the released batch.
     */
    releaseBatch(batchId, releasedBy) {
        return this.http.post(`${productionBatchesEndpointPath}/${batchId}/release`, {releasedBy});
    }

    /**
     * Retrieves the raw-material lots.
     * @returns {Promise<import('axios').AxiosResponse<Array<Object>>>} HTTP response with the material lots.
     */
    getMaterialLots() {
        return this.#materialLotsEndpoint.getAll();
    }

    /**
     * Records the receipt of a raw-material lot, which enters quarantine.
     * @param {Object} resource - Receipt built by the MaterialLotAssembler.
     * @returns {Promise<import('axios').AxiosResponse<Object>>} HTTP response with the received lot.
     */
    receiveMaterialLot(resource) {
        return this.#materialLotsEndpoint.create(resource);
    }

    /**
     * Records the inspection of a raw-material lot.
     * @param {number} lotId - Identifier of the lot.
     * @param {Object} resource - Verifications and sampling status, built by the MaterialLotAssembler.
     * @returns {Promise<import('axios').AxiosResponse<Object>>} HTTP response with the inspected lot.
     */
    inspectMaterialLot(lotId, resource) {
        return this.http.put(`${materialLotsEndpointPath}/${lotId}/inspection`, resource);
    }
}
