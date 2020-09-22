/**
 * Author: Wolfgang Kühn 2020
 * Source located at https://github.com/decatur/app-chen
 *
 * Module implementing a web component which represents a transactional time interval.
 * It subscribes to the 'time_state' and 'time_changed' events to synchronize UI-time with server time.
 * This web component may serve as a template for your own web components.
 */
import {disableButtons, enableButtons, busy} from "./formen.js"
import * as io from "appchen/web_client/io.js"
import {toLocaleISODateTimeString, resolvePeriod} from "gridchen/utils.js";

const html = `<form>
    <fieldset>
        <legend></legend>
        <label>Start <input name="start" value="" size="30"></label>
        <label>End <input name="end" value="" size="30"></label>
        <button name="toggleLock" title="Toggle Time Lock" type="button" style="font-size: large; background-color: #222">🔒</button>
        <button name="query" title="Apply Transaction Interval" type="submit" style="font-size: large">🔍</button>
    </fieldset>
</form>`;

class TimeInterval extends HTMLElement {

    constructor() {
        super();
        const self = this;
        const legend = this.innerHTML.trim();
        this.attachShadow({mode: 'open'});
        const container = this.shadowRoot;
        container.innerHTML = html;
        const form = container.querySelector('form');
        this.form = form;
        form.querySelector('legend').textContent = legend;
        /** @type{HTMLButtonElement} */
        const toggleLock = form.toggleLock;
        /** @type{HTMLInputElement} */
        const start = form['start'];
        /** @type{HTMLInputElement} */
        const end = form['end'];
        start.disabled = end.disabled = true;

        form.onsubmit = (event) => {
            event.preventDefault();
            disableButtons(form);
            busy(form.query);
            this.onsubmit(this.start(), this.end())
                .finally(() => enableButtons(form));
        };

        toggleLock.onclick = () => {
            const isLocked = toggleLock.textContent === '🔓';
            start.disabled = end.disabled = isLocked;
            toggleLock.textContent = isLocked ? '🔒' : '🔓';
        };

        /**
         * @param {string} isoPeriod
         * @returns {number}
         */
        function parsePeriod(isoPeriod) {
            // "-P1DT15M".match(/([+-])?P(\d+D)?(T(\d+H)?(\d+M)?)?/)
            //  0           1    2     3       4          5
            // ["-P1DT15M", "-", "1D", "T15M", undefined, "15M"]
            const m = isoPeriod.match(/([+-])?P(\d+D)?(T(\d+H)?(\d+M)?)?/);
            if (!m) {
                throw Error('Invalid ISO period: ' + isoPeriod);
            }
            const days = parseInt(m[2] || 0);
            const hours = parseInt(m[4] || 0);
            const minutes = parseInt(m[5] || 0);
            const totalMinutes = (days * 24 + hours) * 60 + minutes;
            return (m[1] == '-' ? -1 : 1) * totalMinutes;
        }

        function timeOffset(isoDate, isoPeriod) {
            let time = Date.parse(isoDate);
            const offsetMinutes = parsePeriod(isoPeriod);
            return 60 * 1000 * (offsetMinutes + 15 * Math.floor(time / 15 / 60 / 1000));
        }

        function processTime(response) {
            if (self.getAttribute('startOffset')) {
                let startTime = timeOffset(response['transactionTime'], self.getAttribute('startOffset'));
                start.value = toLocaleISODateTimeString(new Date(startTime), resolvePeriod('MINUTES'));
            } else {
                const startTransactionTime = new Date(response['startTransactionTime']);
                start.value = toLocaleISODateTimeString(startTransactionTime, resolvePeriod('SECONDS'));
            }

            if (self.getAttribute('endOffset')) {
                let endTime = timeOffset(response['transactionTime'], self.getAttribute('endOffset'));
                end.value = toLocaleISODateTimeString(new Date(endTime), resolvePeriod('MINUTES'));
            } else {
                const endTransactionTime = new Date(response['endTransactionTime']);
                end.value = toLocaleISODateTimeString(endTransactionTime, resolvePeriod('SECONDS'));
            }
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
