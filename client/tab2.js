// This is a tab, and as such will export a render(props, container) function.

import {sourceEvents} from "./app.js"
import "/grid-chen/webcomponent.js";
import {createView} from "/grid-chen/matrixview.js"

const innerHTML = `
<section style="height: 5ex;">
    Last Price: <code class="LastPrice"></code>€/MWh
    <br/>
    VWAP: <code class="vwap"></code>€/MWh
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
        document.querySelector('.vwap').textContent = Intl.NumberFormat().format(model.vwp / model.volume);
    }

    class Model {
        constructor() {
            /** @type{object[]} */
            this.transactions = [];
            this.schema = void 0;
            this.lastPrice = NaN;
            this.volume = 0.;
            this.vwp = 0.;
        }

        onchanged() {
            displayTransactions();
        }

        addTransactions(transactions) {
            transactions.forEach(transaction => {
                this.lastPrice = transaction.price;
                this.volume += transaction.quantity;
                this.vwp += transaction.quantity * transaction.price;
                this.transactions.unshift(transaction);
            });
            this.onchanged();
        }
    }

    const model = new Model();
    let errCount = 0;

    sourceEvents('/transactions', 'transaction', (response) => {
        try {
            if (response.schema) {
                model.schema = response.schema;
                model.addTransactions(response.data);
            } else if (model.schema) {
                model.addTransactions([response]);
            }
        } catch(e) {
            console.error(e);
            errCount++;
        }
    });
}