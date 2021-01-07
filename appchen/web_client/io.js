/**
 * Author: Wolfgang Kühn 2020
 * Source located at https://github.com/decatur/appchen
 *
 * Module implementing support for real time streaming via Server Send Events.
 *
 */

// console.log(import.meta.url)

export const readyStateLabels = [];
['CLOSED', 'CONNECTING', 'OPEN'].forEach(state => readyStateLabels[EventSource[state]] = state);

// TODO: ev must not be a singleton but be parametrized by its url.
let ev = {
    rootPath: '',
    connectionId: void 0,
    /** @type{AppChenNS.SubscriptionHandlers[]} */
    subscriptionConfigs: []
};

// ev.onmessage = (event) => {
//     alert(event);
// };

/**
 * @param {Set<string>} topicsToSubscribe
 */
ev.sendTopics = function (topicsToSubscribe) {
    fetch(this.rootPath + '/@appchen/web_client/stream/subscribe', {
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
 * @param {AppChenNS.SubscriptionHandlers} topics
 */
ev.registerSubscription = function (topics) {
    ev.subscriptionConfigs.push(topics);

    /** @type{function()[]} */
    const unregisterFuncs = [];
    for (const topic of Object.keys(topics)) {
        function processEvent(event) {
            // Note: event.type == topic
            // console.debug(`processEvent ${event.type}`);
            try {
                const json = JSON.parse(event.data);
                topics[topic](json);
            } catch (e) {
                console.error(e);
            }
        }

        ev.eventSource.addEventListener(topic, processEvent);
        unregisterFuncs.push(() => ev.eventSource.removeEventListener(topic, processEvent));
    }
    if (ev.connectionId) {
        ev.sendTopics(new Set(Object.keys(topics)));
    }
    return function () {
        for (const unregister of unregisterFuncs) {
            unregister();
        }
    }
};

ev.unregisterEventSourcing = function (config) {
    const index = ev.subscriptionConfigs.indexOf(config);
    if (index === -1) throw RangeError(config);
    ev.subscriptionConfigs.splice(index, 1);
};


let streamObj = null;
/**
 * @param {string} rootPath
 * @returns {AppChenNS.Stream}
 */
export function stream(rootPath) {
    if (streamObj) {
        return streamObj
    }

    ev.rootPath = rootPath;
    ev.eventSource = new EventSource(rootPath + "/@appchen/web_client/stream/connection");
    ev.eventSource.addEventListener('connection_open', function (event) {
        const data = JSON.parse(event.data);
        ev.connectionId = data['connectionId'];
        const topicTypes = new Set();
        for (const /**@type{AppChenNS.SubscriptionHandlers}*/topics of ev.subscriptionConfigs) {
            Object.keys(topics).forEach(topic => topicTypes.add(topic));
        }
        ev.sendTopics(topicTypes);
    });

    streamObj = {
        /**
         * @param {AppChenNS.SubscriptionHandlers} topics
         */
        subscribe(topics) {
            let suspend = ev.registerSubscription(topics);
            return {
                // TODO: Wow, pretty convoluted. Clean this up!
                suspend() {
                    suspend()
                },
                resume() {
                    suspend = ev.registerSubscription(topics)
                }
            }
        },
        setOpenListener(listener) {
            ev.eventSource.onopen = listener;
        },
        setErrorListener(listener) {
            ev.eventSource.onerror = listener;
        }
    };

    return streamObj
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


