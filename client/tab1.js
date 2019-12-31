// This is a tab, and as such will export a render(props, container) function.

const innerHTML = `
<section style="height: 10ex;">
    section 1 with fixed height
</section>
<section style="flex: 1;">
    section 2 with flex
</section>
<section style="height: 10ex;">
    section 3 with fixed height
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
}