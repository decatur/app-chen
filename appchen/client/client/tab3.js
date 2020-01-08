// This is a tab, and as such will export a render(props, container) function.

const innerHTML = `
<style>.tab3 label {display: block;}</style>
<section style="height: 10ex;">
    Data Binding
    <form style="columns: 2">
        <label>Start <input name="start"></label>
        <label>End <input name="end"></label>
    </form>
</section>
<section style="flex: 1;">
    Section 2
</section>
<section style="height: 10ex;">
    Section 3
</section>`;


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

    const form = container.querySelector('form');
    form['start'].value = props.start;
    form['end'].value = props.end;
}