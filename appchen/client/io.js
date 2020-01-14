// TODO: Move to ev object
const eventSourcings = [];
// TODO: ev should not be a singleton.
let ev = {
    eventSource: new EventSource("/appchen/client/eventing/connection"),
    eventListeners: {},
    connectionId: void 0
};
export const eventSource = ev.eventSource;

ev.subscribe = function () {
    const eventTypes = Object.keys(this.eventListeners);
    if (!eventTypes.length) return;

    fetch('/appchen/client/eventing/subscribe', {
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
ev.register = function (listenerMap) {
    for (let type in listenerMap) {
        const listener = function (event) {
            event.json = JSON.parse(event.data);
            listenerMap[type](event);
        };
        this.eventListeners[type] = listener;
        this.eventSource.addEventListener(type, listener);
    }
    if (ev.connectionId) {
        this.subscribe();
    }
};

ev.eventSource.onopen = function (event) {
    // pass
};

ev.eventSource.onerror = function (event) {
    // pass
};

ev.eventSource.addEventListener('connection_open', function (event) {
    const data = JSON.parse(event.data);
    ev.connectionId = data['connectionId'];
    ev.subscribe();
    for (const config of eventSourcings) {
        sourceEvents(config);
    }
});

/**
 * @param {AppChenNS.SourceEventsConfig} config
 */
ev.registerEventSourcing = function (config) {
    eventSourcings.push(config);
    if (ev.connectionId) {
        sourceEvents(config);
    }
};

/**
 * @param {AppChenNS.SourceEventsConfig} config
 */
function isHidden(config) {
    // TODO: config.visibilityElement.hidden is always false. Why?
    return document.hidden || config.visibilityElement.style.display === 'none'
}

export function rerender() {
    if (document.hidden) return

    for (const config of eventSourcings) {
        if (!isHidden(config)) {
            config.render();
        }
    }
}

document.addEventListener('visibilitychange', rerender);

/**
 * @param {AppChenNS.SourceEventsConfig} config
 */
function sourceEvents(config) {
    // We make sure no events are lost. Our solution is to, using a transaction counter,
    //  1. first start the events and queue them
    //  2. then load and handle the resource
    //  3. send the queued events<response to the event handler.
    // This will also insure that the resource handler is called BEFORE any event handler is called.
    // See also http://matrix.org

    let bootState = 0;
    let eventQueue = [];


    function getState() {
        fetch(config.resource.uri)
            .then(responseToJSON)
            .then(processState)
            .catch(handleError);
    }

    function processState(state) {
        try {
            config.resource.handler(state);
        } catch (e) {
            console.error(e);
        }

        const index = eventQueue.findIndex((e => e._id === state._id));
        // Deduplicate event at index and all before. These must allread be contained in state.
        eventQueue = eventQueue.slice(index + 1);
        for (const e of eventQueue) {
            processEvent(e);
        }
        eventQueue = void 0;
        bootState = 2;
        if (!isHidden(config)) {
            console.log('sourceEvents.processState -> render');
            config.render();
        }
    }

    function processEvent(event) {
        if (!event.json) return // This is a sentinell event, ignore it
        try {
            config.topic.handler(event.json);
            if (!isHidden(config)) {
                console.log('sourceEvents.processEvent -> render');
                config.render();
            }
        } catch (e) {
            console.error(e);
        }
    }

    ev.register({
        [config.topic.uri]: function (event) {
            if (bootState === 2) {
                processEvent(event);
            } else if (bootState === 0) {
                eventQueue.push(event);
                if (config.resource) {
                   bootState = 1;
                   getState();
                } else {
                    bootState = 2;
                }
            } else if (bootState === 1) {
                eventQueue.push(event);
            }
        }
    });
}

/**
 * @param {HTMLElement?} visibilityElement
 * @returns {{registerEventSourcing(AppChenNS.SourceEventsConfig): void}}
 */
export function eventing(visibilityElement) {
    return {
        /**
         * @param {AppChenNS.SourceEventsConfig} config
         */
        registerEventSourcing(config) {
            config.visibilityElement = visibilityElement || document.body;
            config.render = config.render || (() => {});
            ev.registerEventSourcing(config);
        }
    }
}

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
            if (index === scriptSources.length - 1) {
                scriptElement.onload = resolve;
            }
            document.body.appendChild(scriptElement);
        }
    })
}

export function fetchJSON(uri) {
    return fetch(uri)
        .then(responseToJSON)
        .catch(handleError);
}


