// This is a Weblet module.

const innerHTML = `
<style>.weblet3 label {display: block;}</style>
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
 * @param {AppChenNS.Weblet} weblet
 * @returns {Promise<undefined>}
 */
export function render(weblet) {
    if (!weblet.element.firstElementChild) {
        weblet.element.innerHTML = innerHTML;
    }

    const form = weblet.element.querySelector('form');
    form['start'].value = weblet.props['start'];
    form['end'].value = weblet.props['end'];
}