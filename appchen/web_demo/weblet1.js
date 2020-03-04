// This is a Weblet module.

const innerHTML = `
<section style="height: 15ex;">
    section 1 with fixed height
    <ul>
        <li><a href="/appchen/web_client/editor.html" target="Edit">Edit</a></li>
    </ul>
</section>
<section style="flex: 1;">
    section 2 with flex
</section>
<section style="height: 10ex;">
    section 3 with fixed height
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
}