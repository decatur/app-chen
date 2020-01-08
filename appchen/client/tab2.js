// This is a tab, and as such will export a render(props, container) function.

import "/grid-chen/webcomponent.js";
import {createView} from "/grid-chen/matrixview.js"
import {eventing} from "./io.js";

const innerHTML = `
<section style="height: 10ex;">
    Last Price: <code class="LastPrice"></code>€/MWh
    <br/>
    VWAP: <code class="VWAP"></code>€/MWh
    <br/>
    Transaction Count: <code class="TransactionCount"></code>
</section>
<section style="flex: 1;">
   <grid-chen style="height: 100%;"></grid-chen>
</section>
`;

/**
 * @param {App} app
 * @param {MyProps} props
 * @param {HTMLElement} container
 * @returns {Promise<undefined>}
 */
export function render(app, props, container) {
    if (!container.firstElementChild) {
        container.innerHTML = innerHTML;
    }

    function displayTransactions() {
        document.querySelector('grid-chen').resetFromView(createView(model.schema, model.transactions));
        document.querySelector('.LastPrice').textContent = Intl.NumberFormat().format(model.lastPrice);
        document.querySelector('.VWAP').textContent = Intl.NumberFormat().format(model.pnl / model.volume);
        document.querySelector('.TransactionCount').textContent = String(model.transactions.length);
    }

    class Model {
        constructor() {
            /** @type{object[]} */
            this.transactions = [];
            this.schema = void 0;
            this.lastPrice = NaN;
            this.volume = 0.;
            this.pnl = 0.;
        }

        onchanged() {
            displayTransactions();
        }

        addTransactions(transactions) {
            transactions.forEach(transaction => {
                this.lastPrice = transaction.price;
                this.volume += transaction.quantity;
                this.pnl += transaction.quantity * transaction.price;
                this.transactions.unshift(transaction);
            });
            this.onchanged();
        }
    }

    const model = new Model();

    const ev = eventing();
    ev.sourceEvents({
        resource: {
            uri: '/transactions', handler: (response) => {
                model.schema = response.schema;
                model.addTransactions(response.data);
            }
        },
        topic: {
            uri: 'transaction', handler: (event) => {
                model.addTransactions([event]);
            }
        }
    })

}