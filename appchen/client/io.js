
let ev;


export function eventing() {
    if (ev) return ev;

    ev = {
        eventSource: new EventSource("/appchen/client/connection"),
        eventListeners: {},
        connectionId: void 0
    };

    const eventSourcings = [];

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
    ev.registerEventSourcing = function(config) {
        eventSourcings.push(config);
        if (ev.connectionId) {
            sourceEvents(config);
        }
    };

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
            for (const e of eventQueue) {
                if (e._timeLineIndex > state._timeLineIndex) {
                    processEvent(e);
                }
            }
            eventQueue = void 0;
            bootState = 2;
        }

        function processEvent(event) {
            try {
                config.topic.handler(event.json);
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
                    bootState = 1;
                    getState();
                } else if (bootState === 1) {
                    eventQueue.push(event);
                }
            }
        });
    }

    return ev
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


