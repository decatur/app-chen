// *
//  A lazy navigation system for a single page application.
//  Each tab is represented by a JavaScript module. This module must export a function
//
// export function render(props: object, container: HTMLElement) {}
//
// Tabs must have class names 'tab' and the associated module name.

import * as io from "./io.js";

if (!!window.MSInputMethodContext && !!document['documentMode']) {
    const msg = 'IE11 is not supported. Please use Chrome.';
    alert(msg);
    throw Error(msg)
}

/**
 *
 * @param {{title: string, src: string}[]} tabs
 * @returns {{eventListeners: {}, eventSource: EventSource, activeTabId: string, connectionId: *, props: {}}}
 */
export function initializeApp(tabs) {

    const app = {
        props: {},
        /** @type{string} */
        activeTabId: void 0,
    };

    const tabsById = {};

    /**
     * @param {string?} tabId
     * @returns {Promise}
     */
    app.activateTabFromHash = function (tabId) {
        tabId = tabId || location.hash.substr(1);
        if (!(tabId in tabsById)) {
            tabId = Object.keys(tabsById)[0];
        }
        document.getElementById('activeTab').textContent = '...' + tabsById[tabId].tabElement.title + '...';

        console.log('Activate tab ' + tabId);

        for (let tab of Object.values(tabsById)) {
            tab.tabElement.style.display = 'none';
            tab.navElement.className = 'nav';
        }

        const tab = tabsById[tabId];
        tab.tabElement.style.display = tab.display;
        tab.navElement.className = 'activeNav';
        window.location.hash = '#' + tabId;
        app.activeTabId = tabId;

        return import(tabId)
            .then((module) => {
                io.rerender();
                return module['render'](this.props, tab.tabElement);
            })
            .catch((err) => {
                console.error(err);
                tab.tabElement.textContent = String(err);
            });
    };

    function createTabs() {
         /** @type{HTMLDialogElement} */
        const dialogElement = /** @type{HTMLDialogElement} */(document.getElementById('menu'));

        for (const tab of tabs) {
            const id = tab.src;
            const tabElement = document.createElement('div');
            tabElement.title = tab.title;
            tabElement.className = 'tab';
            document.body.appendChild(tabElement);

            const navElement = document.createElement('button');
            navElement.value = id;
            navElement.className = 'nav';
            navElement.textContent = tabElement.title;
            dialogElement.firstElementChild.appendChild(navElement);
            tabsById[id] = {id, tabElement, navElement, display: tabElement.style.display || 'flex'};
        }

        dialogElement.onclose = function () {
            dialogElement.classList.remove('menu-opens');
            if (dialogElement.returnValue && dialogElement.returnValue !== app.activeTabId) {
                app.activateTabFromHash(dialogElement.returnValue);
            }
        };

        //document.getElementById('activeTab').onmouseenter =
        document.getElementById('activeTab').onclick = () => {
            dialogElement.classList.add('menu-opens');
            dialogElement.showModal();
        };

        dialogElement.addEventListener('click', (evt) => {
            if (evt.target.tagName === 'BUTTON') {
                // This is quirky: We use method="dialog" on the dialog form to get at the clicked button
                // (dialogElement.onclose()) AND to close the dialog auto-magically.
                // To this click we must not to react here.
                return
            }
            console.log(evt);
            dialogElement.close();
        });
    }

    createTabs();

    return app
}

window.onerror = function (error, url, line) {
    // console.log(Array.prototype.slice.call(arguments).join(' '));
    console.log([error, url, line].join(' '));
    // alert(`While fetching ${url}\n${String(error)}`);
};

