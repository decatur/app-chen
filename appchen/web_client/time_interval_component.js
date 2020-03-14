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
        <button name="toggleLock" title="Toggle Time Lock" type="button" style="font-size: large">🔒</button>
        <button name="load" title="Apply Transaction Interval" type="button" style="font-size: large">🔍</button>
        <span class="status"></span>
    </fieldset>
</form>`;

class TimeInterval extends HTMLElement {
    /** @param{HTMLElement} container */
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
        form.onsubmit = (event) => event.preventDefault();
        form.load.onclick = () => {
            disableButtons(form);
            busy(form.load);
            status.textContent = 'Loading ...';
            this.onload(this.start(), this.end())
                .then((statusText) => {
                    status.textContent = statusText;
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

    onload(start, end) {
        void [start, end]
    }

    start() {
        return this.form['start'].value.trim()
    }

    end() {
        return this.form['end'].value.trim()
    }
}

customElements.define('time-interval', TimeInterval);
