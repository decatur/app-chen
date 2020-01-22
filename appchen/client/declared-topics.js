// This is a tab, and as such will export a render(props, container) function.

import * as io from "./io.js";

const innerHTML = `
<header>
    All Topics
</header>
<section class="topics"></section>`;


/**
 * @param {MyProps} props
 * @param {HTMLElement} container
 * @returns {Promise<undefined>}
 */
export function render(props, container) {
    if (container.firstElementChild) {
        return
    }

    container.innerHTML = innerHTML;

    function renderTopic(elem, topic)
    {
        const pre = document.createElement('pre');
        pre.textContent = JSON.stringify(topic, null, 4);
        elem.appendChild(pre);
    }

    io.fetchJSON('/appchen/client/topics')
        .then(topics => {
            const elem = document.querySelector('.topics');
            elem.innerHTML = '';
            for (const topic of topics) {
                renderTopic(elem, topic);
            }
        });
}