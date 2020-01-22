// This is a tab, and as such will export a render(props, container) function.

const innerHTML = `
<section style="height: 15ex;">
    section 1 with fixed height
    <ul>
        <li><a href="editor.html" target="Edit">Edit</a></li>
        <li><a href="topics" target="topics">topics</a></li>
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
 * @param {MyProps} props
 * @param {HTMLElement} container
 * @returns {Promise<undefined>}
 */
export function render(props, container) {
    if (!container.firstElementChild) {
        container.innerHTML = innerHTML;
    }
}