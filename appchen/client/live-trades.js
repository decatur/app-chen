// This is a Weblet module.

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
// Volume Weighted Average Price
const vwap = {name: 'VWAP', unit: '€/MWh'};
const transactionCount = {name: 'TransactionCount'};
let summaryTable;
let transactionsTable;

class Model {
    constructor() {
        /** @type{object[]} */
        this.transactions = [];
        this.lastPrice = NaN;
        this.volume = 0.;
        this.pnl = 0.;
        this.hasChanged = true;
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
        this.hasChanged = (trades.length > 0);
    }
}

const model = new Model();

/**
 * @param {AppChenNS.Weblet} weblet
 */
export function render(weblet) {
    if (!(model.hasChanged && weblet.isVisible())) {
        return
    }
    transactionsTable.refresh();
    lastPrice.value = model.lastPrice;
    vwap.value = model.pnl / model.volume;
    transactionCount.value = model.transactions.length;
    summaryTable.refresh();
    model.hasChanged = false;
}

/**
 * @param {AppChenNS.Weblet} weblet
 * @param {HTMLElement} container
 * @returns {Promise<*>}
 */
export function init(weblet, container) {
    container.innerHTML = innerHTML;
    summaryTable = container.querySelector('.summaryTable');
    summaryTable.resetFromView(createView(summarySchema, [lastPrice, vwap, transactionCount]));
    transactionsTable = container.querySelector('.transactionsTable');

    const subscription = io.stream().subscribe({
        'trade_executions_state': (state) => {
            transactionsTable.resetFromView(createView(state.schema, model.transactions));
            model.addTrades(state.data);
            render(weblet);
        },
        'trade_execution': (event) => {
            model.addTrades([event]);
            render(weblet);
        }
    });

    container.querySelector('.subscribed').onchange = (evt) => {
        if (evt.target.checked) {
            subscription.resume();
        } else {
            subscription.suspend();
        }
    };
}