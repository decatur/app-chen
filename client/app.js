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

/**
 *
 * @param {{title: string, src: string}[]} tabs
 * @returns {{eventListeners: {}, eventSource: EventSource, activeTabId: string, connectionId: *, props: {}}}
 */
export function initializeApp(tabs) {

    const app = {
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

        return import(tabId)
            .then((module) => {
                return module['render'](this, this.props, tab.tabElement);
            })
            .catch((foo) => {
                console.error(foo);
                tab.tabElement.textContent = String(foo);
            });
    };

    function createTabs() {
        const menuElement = document.getElementById('menu');

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

    createTabs();

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

/**
 * Loads the specified scripts in order. The returned promise is never rejected.
 * @param {string[]} scriptSources
 * @returns {Promise<void>}
 */
export function loadLegacyScript(scriptSources) {
    return new Promise(function (resolve, reject) {
        void reject;
        for (const [index, src] of scriptSources.entries()) {
            const scriptElement = document.createElement('script');
            scriptElement.src = src;
            scriptElement.async = false;
            if (index === scriptSources.length-1) {
                scriptElement.onload = resolve;
            }
            document.body.appendChild(scriptElement);
        }
    })
}
