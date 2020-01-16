// This is a tab, and as such will export a render(props, container) function.

import "/appchen/client/grid-chen/webcomponent.js";
import {createView} from "/appchen/client/grid-chen/matrixview.js"
import {eventing, rerender} from "./io.js";

const innerHTML = `
<section style="height: 14ex;">
    <grid-chen class="summaryTable" style="display: block; height: 100%;"></grid-chen>
</section>
<section style="flex: 1;">
   <grid-chen class="transactionsTable" style="display: block; height: 100%;"></grid-chen>
</section>
`;

/**
 * @param {App} app
 * @param {MyProps} props
 * @param {HTMLElement} container
 * @returns {Promise<undefined>}
 */
export function render(app, props, container) {
    if (container.firstElementChild) {
        // TODO: Move this to app.activateTab
        rerender();
        return
    }

    container.innerHTML = innerHTML;

    const transactionsTable = document.querySelector('.transactionsTable');

    const summarySchema = {
        'type': 'array',
        'items': {
            'type': 'object', 'properties': {
                'name': {'type': 'string', 'width': 200},
                'value': {'type': 'number', 'width': 100},
                'unit': {'type': 'string', 'width': 100}
            }
        }
    };
    const lastPrice = {name: 'Last Price', unit: '€/MWh'};
    const vwap = {name: 'VWAP', unit: '€/MWh'};
    const transactionCount = {name: 'TransactionCount'};
    const summaryTable = /***/ document.querySelector('.summaryTable');
    summaryTable.resetFromView(createView(summarySchema, [lastPrice, vwap, transactionCount]));

    function displayModel() {
        transactionsTable.refresh();
        lastPrice.value = model.lastPrice;
        vwap.value = model.pnl / model.volume;
        transactionCount.value = model.transactions.length;
        summaryTable.refresh();
    }

    class Model {
        constructor() {
            /** @type{object[]} */
            this.transactions = [];
            this.lastPrice = NaN;
            this.volume = 0.;
            this.pnl = 0.;
        }

        addTransactions(transactions) {
            transactions.forEach(transaction => {
                this.lastPrice = transaction.price;
                this.volume += transaction.quantity;
                this.pnl += transaction.quantity * transaction.price;
                this.transactions.unshift(transaction);
            });
        }
    }

    const model = new Model();

    const ev = eventing(container);
    ev.registerEventSourcing({
        resource: {
            uri: '/transactions', handler: (response) => {
                transactionsTable.resetFromView(createView(response.schema, model.transactions));
                model.addTransactions(response.data);
            }
        },
        topic: {
            uri: 'transaction', handler: (event) => {
                model.addTransactions([event]);
            }
        },
        render: () => {
            displayModel();
        }
    })

}