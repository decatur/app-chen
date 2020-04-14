// This is a tab, and as such will export a render(props, container) function.

import * as io from "./io.js";

const innerHTML = `
<header>
    Message Discovery
</header>

<template class="topic">
  <section>
    <h3 class="name"></h3>
    <div class="description" style="margin: 0 1ex 1ex 1ex;"></div>
    <div style="margin: 1ex;">
        Example Message
        <pre class="example" style="margin: 0; border: 3px inset"></pre>
    </div>
  </section>
</template> 

<section class="topics"></section>`;


/**
 * @param {AppChenNS.Weblet} weblet
 */
export function render(weblet) {
}

/**
 * @param {AppChenNS.Weblet} weblet
 * @param {HTMLElement} container
 * @returns {Promise<*>}
 */
export function init(weblet, container) {
    container.innerHTML = innerHTML;

    function renderTopic(elem, topic) {
        /** @type{HTMLElement} */
        const topicElement = document.querySelector('.topic').content.cloneNode(true);
        topicElement.querySelector('.name').textContent = topic.topic;
        topicElement.querySelector('.description').textContent = topic.description;
        topicElement.querySelector('.example').textContent = JSON.stringify(topic.example, null, 4);
        elem.appendChild(topicElement);
    }

    io.fetchJSON('/appchen/web_client/stream/topics')
        .then(topics => {
            const elem = document.querySelector('.topics');
            elem.innerHTML = '';
            for (const topic of topics) {
                renderTopic(elem, topic);
            }
        });
}