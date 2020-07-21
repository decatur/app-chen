/**
 * @param {number} duration in seconds
 * @return {string}
 */
/*function formatDuration(duration) {
    const units = [['seconds', 60], ['minutes', 60], ['hours', 24], ['days', 100000000]];

    for (let i = 0; i < units.length; i++) {
        let unit = units[i];
        let nextUnit = units[i];

        if (duration / nextUnit[1] < 1) {
            return (duration).toFixed(2) + ' ' + unit[0]
        }

        duration /= nextUnit[1]
    }
}*/

/**
 * Disable all child buttons of the form
 * @param {HTMLElement} form
 */
export function disableButtons(form) {
    const buttons = form.querySelectorAll('button');
    for (let i=0; i<buttons.length; i++) {
        const button = /**@type{HTMLButtonElement}*/(buttons[i]);
        //button.dataset['orgDisabled'] = button.disabled;
        button.disabled = true;
    }
}

/**
 * Set the button to busy state.
 * @param {HTMLButtonElement} button
 */
export function busy(button) {
    // Remember idle text content.
    button.dataset['orgtextContent'] = button.textContent;
    button.textContent = '⌛';
}

/**
 * Enable all child buttons of the form
 * @param {HTMLElement} form
 */
export function enableButtons(form) {
    const buttons = form.querySelectorAll('button');
    for (let i=0; i<buttons.length; i++) {
        const button = buttons[i];
        if ('orgtextContent' in button.dataset) {
            button.textContent = button.dataset['orgtextContent'];
        }
        //if ('orgDisabled' in button.dataset) {
        //    button.disabled = button.dataset['orgDisabled'];
        //} else {
        button.disabled = false;
        //}
    }
}
