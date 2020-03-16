/**
 * Author: Wolfgang Kühn 2020
 * Source located at https://github.com/decatur/app-chen
 *
 * Module implementing a web component which represents a transactional time interval.
 * It subscribes to the 'time_state' and 'time_changed' events to synchronize UI-time with server time.
 * This web component may serve as a template for your own web components.
 */
import {disableButtons, enableButtons, busy} from "/static/modules/formen.js"
import * as io from "/appchen/web_client/io.js"
import {toLocaleISODateTimeString, resolvePeriod} from "/appchen/web_client/grid-chen/utils.js";

const html = `<form style="margin-top:1ex">
    <fieldset>
        <label>Start Transaction Time <input name="start" value="" size="30"></label>
        <label>End Transaction Time <input name="end" value="" size="30"></label>
        <button name="toggleLock" title="Toggle Time Lock" type="button" style="font-size: large; background-color: #222">🔒</button>
        <button name="query" title="Apply Transaction Interval" type="submit" style="font-size: large">🔍</button>
        <span class="status"></span>
    </fieldset>
</form>`;

class TimeInterval extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        const container = this.shadowRoot;
        container.innerHTML = html;
        const form = container.querySelector('form');
        this.form = form;
        /** @type{HTMLButtonElement} */
        const toggleLock = form.toggleLock;
        const status = form.querySelector('.status');
        form.onsubmit = (event) => {
            event.preventDefault();
            disableButtons(form);
            busy(form.query);
            status.textContent = 'Loading ...';
            this.onsubmit(this.start(), this.end())

                .then((statusText) => {
                    status.textContent = /**@type{string}*/ statusText;
                    enableButtons(form)
                });
        };

        toggleLock.onclick = () => {
            if (toggleLock.textContent === '🔒') {
                toggleLock.textContent = '🔓'
            } else {
                toggleLock.textContent = '🔒'
            }
        };

        function processTime(response) {
            const startTransactionTime = new Date(response['startTransactionTime']);
            const endTransactionTime = new Date(response['endTransactionTime']);
            form.start.value = toLocaleISODateTimeString(startTransactionTime, resolvePeriod('SECONDS'));
            form.end.value = toLocaleISODateTimeString(endTransactionTime, resolvePeriod('SECONDS'));
        }

        io.stream().subscribe({
            'time_state': processTime,
            'time_changed': (response) => {
                if (toggleLock.textContent === '🔓') return;
                processTime(response);
            }
        });
    }

    /**
     * Overwrite this method to react to the form submit event, .i.e. query button pressed.
     * @param {string} start
     * @param {string} end
     * @returns {Promise}
     */
    onsubmit(start, end) {
        void [start, end];
        return Promise.resolve()
    }

    /**
     * @returns {string}
     */
    start() {
        return this.form['start'].value.trim()
    }

    /**
     * @returns {string}
     */
    end() {
        return this.form['end'].value.trim()
    }
}

customElements.define('time-interval', TimeInterval);
