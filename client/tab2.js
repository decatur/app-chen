// This is a tab, and as such will export a render(props, container) function.

const innerHTML = `
<section style="height: 20ex;">
    Section 1
</section>
<section style="flex: 1;">
    Section 2
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