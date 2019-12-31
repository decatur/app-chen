// *
//  A lazy navigation system for a single page application.
//  Each tab is represented by a JavaScript module. This module must export a function
//
// export function render(app: App, props: StrategyProps, container: HTMLElement) {}
//
// Tabs must have class names 'tab' and the associated module name.

if (!!window.MSInputMethodContext && !!document['documentMode']) {
    const msg = 'IE11 is not supported. Please use Chrome.';
    alert(msg);
    throw Error(msg)
}

export function initializeApp() {

    const app = {
        /** @type{string} */
        tabRoot: undefined,
        eventSource: new EventSource("/connection"),
        props: {},
        eventListeners: {},
        connectionId: void 0,
        /** @type{string} */
        activeTabId: void 0,
    };

    app.subscribe = function () {
        const eventTypes = Object.keys(this.eventListeners);
        if (!eventTypes.length) return;

        fetch('/eventing/subscribe', {
            method: 'POST',
            headers: {'Content-Type': 'application/json; charset=utf-8'},
            body: JSON.stringify({
                connectionId: this.connectionId,
                eventTypes
            })
        })
            .then(assertResponseOk)
            .catch(handleError);
    };

    /**
     * @param {object} listenerMap
     */
    app.register = function (listenerMap) {
        for (let type in listenerMap) {
            const listener = listenerMap[type];
            this.eventListeners[type] = listener;
            this.eventSource.addEventListener(type, listener);
        }
        if (app.connectionId) {
            this.subscribe();
        }
    };

    app.eventSource.onopen = function (event) {
        // pass
    };

    app.eventSource.onerror = function (event) {
        // pass
    };

    app.eventSource.addEventListener('connection_open', function (event) {
        const data = JSON.parse(event.data);
        app.connectionId = data['connectionId'];
        app.subscribe();
    });

    const tabsById = {};

    /**
     * @param {string?} tabId
     * @returns {Promise}
     */
    app.activateTab = function (tabId) {
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

        return import(this.tabRoot + `${tabId}.js`)
            .then((module) => {
                return module.render(this, this.props, tab.tabElement);
            });
    };

    function createMenu() {
        const menuElement = document.getElementById('menu');
        const tabs = document.getElementsByClassName('tab');

        for (let i = 0; i < tabs.length; i++) {
            const tabElement = tabs.item(i);
            let id;
            for (id of tabElement.classList.values()) {
                if (id !== 'tab') break;
            }

            const navElement = document.createElement('button');
            navElement.value = id;
            navElement.className = 'nav';
            navElement.textContent = tabElement.title;
            menuElement.firstElementChild.appendChild(navElement);
            tabsById[id] = {id, tabElement, navElement, display: tabElement.style.display || 'flex'};
        }

        menuElement.onclose = function () {
            menuElement.classList.remove('menu-opens');
            if (menuElement.returnValue && menuElement.returnValue !== app.activeTabId) {
                app.activateTab(menuElement.returnValue);
            }
        };

        // menuElement.onclick = function() {
        //     menuElement.close();
        // };

        document.getElementById('activeTab').onclick = () => {
            menuElement.classList.add('menu-opens');
            menuElement.showModal();
        };
    }

    createMenu();

    return app
}

window.onerror = function (error, url, line) {
    // console.log(Array.prototype.slice.call(arguments).join(' '));
    console.log([error, url, line].join(' '));
    alert(`While fetching ${url}\n${String(error)}`);
};

/**
 * @param {Response} response
 * @returns {Object}
 */
export function assertResponseOk(response) {
    if (!response.ok) {
        return rejectHttpError(response)
    }
}

/**
 * @param {Response} response
 * @returns {Object}
 */
export function responseToJSON(response) {
    if (response.ok) {
        // status is in the range 200-299
        return response.json();
    }
    return rejectHttpError(response);
}

/**
 * @param {Error} error
 */
export function handleError(error) {
    console.error(error);
    alert((error.title || error.name) + '\n' + error.message);
}

export function rejectHttpError(response) {
    // Returns a rejected promise.
    return response.text().then(function (body) {
        if (response.headers.get('content-type').startsWith("text/html")) {
            console.log(body);
            //body = 'See console.'
        }
        const ex = new Error([response.url, body].join(' '));
        ex.name = ex.title = response.statusText;
        throw ex;
    });
}
