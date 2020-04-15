// This is a Weblet module.

import * as dummy from "/appchen/web_client/time_interval.js";

const innerHTML = `
<section style="height: 15ex;">
    section 1 with fixed height
    <ul>
        <li><a href="/appchen/weblet/editor.html" target="Edit">Edit</a></li>
    </ul>
</section>
<section style="flex: 1;">
    import * as dummy from "/appchen/web_client/time_interval1.js";
</section>
<section style="height: 10ex;">
    <time-interval startOffset="-PT15M" endOffset="P1D"></time-interval>
</section>
`;

/**
 * @param {AppChenNS.Weblet} weblet
 * @returns {Promise<*>}
 */
export function render(weblet) {
}

/**
 * @param {AppChenNS.Weblet} weblet
 * @returns {Promise<*>}
 */
export function init(weblet) {
    weblet.element.innerHTML = innerHTML;
    weblet.element.querySelector('time-interval1').onsubmit = (start, end) => {
        alert(`${start} ${end}`);
        return Promise.resolve();
    }
}