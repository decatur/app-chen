/**
 * Author: Wolfgang Kühn 2020
 * Source located at https://github.com/decatur/app-chen/client
 *
 * Module implementing support for real time streaming via Server Send Events.
 *
 */

export const readyStateLabels = [];
['CLOSED', 'CONNECTING', 'OPEN'].forEach(state => readyStateLabels[EventSource[state]] = state);

// TODO: ev must not be a singleton but be parametrized by its url.
let ev = {
    eventSource: new EventSource("/appchen/client/stream/connection"),
    connectionId: void 0,
    subscriptionConfigs: []
};

/**
 * @param {Set<string>} topicsToSubscribe
 */
ev.sendTopics = function (topicsToSubscribe) {
    fetch('/appchen/client/stream/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json; charset=utf-8'},
        body: JSON.stringify({
            connectionId: this.connectionId,
            topics: Array.from(topicsToSubscribe)
        })
    })
        .then(assertResponseOk)
        .catch(handleError);
};

/**
 * @param {string} topic
 * @param {function} listener
 */
ev.register = function (topic, listener) {
    const wrapper = function (event) {
        event.json = JSON.parse(event.data);
        listener(event);
    };
    this.eventSource.addEventListener(topic, wrapper);
    return function () {
        ev.eventSource.removeEventListener(topic, wrapper);
    }
};

ev.eventSource.addEventListener('connection_open', function (event) {
    // ev.subscribedTopics.clear();
    const data = JSON.parse(event.data);
    ev.connectionId = data['connectionId'];
    const topicURIs = new Set();
    for (const config of ev.subscriptionConfigs) {
        config.topics.forEach(topic => topicURIs.add(topic.uri));
    }
    ev.sendTopics(topicURIs);
});

/**
 * @param {AppChenNS.SubscriptionConfig} config
 */
ev.registerSubscription = function (config) {
    ev.subscriptionConfigs.push(config);
    const handler = subscriptionHandler(config);
    /** @type{function()[]} */
    const unregisterFuncs = [];
    for (const topic of config.topics) {
        unregisterFuncs.push(ev.register(topic.uri, handler));
    }
    if (ev.connectionId) {
        ev.sendTopics(new Set(config.topics.map(topic => topic.uri)));
    }
    return function () {
        for (const unregister of unregisterFuncs) {
            unregister();
        }
    }
};

ev.unregisterEventSourcing = function (config) {
    const index = ev.subscriptionConfigs.findIndex((s) => s.id === config.id);
    if (index === -1) throw RangeError(config.id);
    ev.subscriptionConfigs.splice(index, 1);
};

/**
 * @param {AppChenNS.SubscriptionConfig} config
 */
function isHidden(config) {
    // TODO: config.visibilityElement.hidden is always false. Why?
    return document.hidden || config.visibilityElement.style.display === 'none'
}

export function rerender() {
    // TODO: This should be in the app.js module, somehow.
    if (document.hidden) {
        return
    }

    for (const config of ev.subscriptionConfigs) {
        if (!isHidden(config)) {
            config.render();
        }
    }
}

// TODO: This should be in the app.js module, somehow.
document.addEventListener('visibilitychange', rerender);

/**
 * @param {object} precursorTopic
 * @param {AppChenNS.SubscriptionConfig} config
 * @returns {function(event)}
 */
function subscriptionHandler(config) {
    // We make sure no events are lost. Our solution is to, using a transaction id,
    //  1. first start the events and queue them
    //  2. then load and handle the resource
    //  3. send the queued events not yet subsumed by the response to the event handler.
    // This will also insure that the resource handler is called BEFORE any event handler is called.
    // The contract is that
    // * each event has an _id property.
    // * the state also has an _id property, which is the _id of the latest event subsumed by the state.
    // See also http://matrix.org

    let bootState = 0;
    let eventQueue = [];
    const topicsByTopic = {};
    for (const topic of config.topics) {
        topicsByTopic[topic.uri] = topic;
    }

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

        const index = eventQueue.findIndex((e => e.json._id === state._id));
        // Deduplicate event at index and all before. These must already be contained in the state.
        eventQueue = eventQueue.slice(index + 1);
        for (const e of eventQueue) {
            processEvent(e);
        }
        eventQueue = void 0;
        bootState = 2;
        if (!isHidden(config)) {
            console.log('subscriptionHandler.processState -> render');
            config.render();
        }
    }

    function processEvent(event) {
        try {
            topicsByTopic[event.type].handler(event.json);
            if (!isHidden(config)) {
                console.log('subscriptionHandler.processEvent -> render');
                config.render();
            }
        } catch (e) {
            console.error(e);
        }
    }

    return function (event) {
        if (bootState === 2) {
            if (event.json != null) {
                processEvent(event);
            }
        } else if (bootState === 0) {
            if (event.json != null) {
                // This is not the sentinell event.
                eventQueue.push(event);
            }
            if (config.resource) {
                bootState = 1;
                getState();
            } else {
                bootState = 2;
            }
        } else if (bootState === 1) {
            if (event.json != null) {
                eventQueue.push(event);
            }
        }
    }
}

let configCounter = 0;

/**
 * @param {HTMLElement?} visibilityElement
 * @returns {AppChenNS.Stream}
 */
export function stream(visibilityElement) {
    let config;
    return {
        /**
         * @param {AppChenNS.SubscriptionConfig} _config
         */
        subscribe(_config) {
            config = _config;
            config.id = 'ID' + (configCounter++);
            config.visibilityElement = visibilityElement || document.body;
            config.render = config.render || (() => {
            });
            let suspend = ev.registerSubscription(config);
            return {
                // TODO: Wow, pretty convoluted. Clean this up!
                suspend() {
                    suspend()
                },
                resume() {
                    suspend = ev.registerSubscription(config)
                }
            }
        },
        setOpenListener(listener) {
            ev.eventSource.onopen = listener;
        },
        setErrorListener(listener) {
            ev.eventSource.onerror = listener;
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


