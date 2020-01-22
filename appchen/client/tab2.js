// This is a tab, and as such will export a render(props, container) function.

import "/appchen/client/grid-chen/webcomponent.js";
import {createView} from "/appchen/client/grid-chen/matrixview.js"
import * as io from "./io.js";

const innerHTML = `
<label>Subscription Active <input class="subscribed" type="checkbox" checked></label>
<section style="height: 14ex;">
    <grid-chen class="summaryTable" style="display: block; height: 100%;"></grid-chen>
</section>
<section style="flex: 1;">
   <grid-chen class="transactionsTable" style="display: block; height: 100%;"></grid-chen>
</section>
`;

/**
 * @param {object} props
 * @param {HTMLElement} container
 * @returns {Promise<undefined>}
 */
export function render(props, container) {
    if (container.firstElementChild) {
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

        /**
         * @param {{delivery:string, price:number, quantity:number}[]} trades
         */
        addTrades(trades) {
            trades.forEach(trade => {
                this.lastPrice = trade.price;
                this.volume += trade.quantity;
                this.pnl += trade.quantity * trade.price;
                this.transactions.unshift(trade);
            });
        }
    }

    const model = new Model();

    const stream = io.stream(container);
    const subscription = stream.subscribe({
        resource: {
            uri: '/trade_executions', handler: (response) => {
                transactionsTable.resetFromView(createView(response.schema, model.transactions));
                model.addTrades(response.data);
            }
        },
        topic: {
            uri: 'trade_execution', handler: (event) => {
                model.addTrades([event]);
            }
        },
        render: () => {
            displayModel();
        }
    });

    document.querySelector('.subscribed').onchange = (evt) => {
        if (evt.target.checked) {
            subscription.resume();
        } else {
            subscription.suspend();
        }
    };

}