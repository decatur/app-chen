//  A lazy navigation system for a single page application.
//  Each weblet is represented by a JavaScript module. This module must export a function
//      export function render(weblet) {}


if (!!window.MSInputMethodContext && !!document['documentMode']) {
    const msg = 'IE11 is not supported. Please use Chrome.';
    alert(msg);
    throw Error(msg)
}

/**
 *
 * @param {{title: string, src: string}[]} webletInfos
 */
export function initializeApp(webletInfos) {

    const app = {
        props: {},
        /** @type{string} */
        activeWebletId: void 0,
        activeWeblet() {
            return webletsById[this.activeWebletId]
        }
    };

    /** @type{AppChenNS.WebletCollection} */
    const webletsById = /**@type{AppChenNS.WebletCollection}*/ {};

    /**
     * @returns {Promise}
     */
    function activateWebletFromHash() {
        const id = location.hash.substr(1);
        document.getElementById('activeWeblet').textContent = '🗐 ' + webletsById[id].element.title;
        console.log('Activate Weblet ' + id);

        for (let weblet of Object.values(webletsById)) {
            weblet.element.style.display = 'none';
            weblet.navElement.className = 'nav';
        }

        /** @type{AppChenNS.Weblet} */
        const weblet = webletsById[id];
        weblet.element.style.display = weblet.display;
        weblet.navElement.className = 'activeNav';
        app.activeWebletId = id;

        if (weblet.module) {
            // TODO: Rename to onvisible()
            return weblet.module.render(weblet);
        } else {
            import(id)
                .then((module) => {
                    weblet.module = module;
                    return module.init(weblet, weblet.element);
                })
                .catch((err) => {
                    console.error(err);
                    weblet.element.textContent = String(err);
                });
        }
    };

    /**
     */
    app.activate = function() {
        let hash = window.location.hash;
        if (!(hash.substr(1) in webletsById)) {
             hash = '#' + Object.keys(webletsById)[0];
        }
        // There must be a better way to call activateWebletFromHash exactly once.
        window.location.hash = hash;
        activateWebletFromHash();
        window.setTimeout(() => {
            // Attach onhashchange after the microtask otherwise activateWebletFromHash is called the second time.
            window.onhashchange = function (evt) {
                if (!(window.location.hash.substr(1) in webletsById)) {
                    window.location.hash = '#' + Object.keys(webletsById)[0];
                } else {
                    activateWebletFromHash();
                }
            }
        }, 10);
    };

    function createWebLets() {
        /** @type{HTMLDialogElement} */
        const dialogElement = /** @type{HTMLDialogElement} */(document.getElementById('menu'));

        for (const webletInfo of webletInfos) {
            const id = webletInfo.src;
            const webletElement = document.createElement('div');
            webletElement.title = webletInfo.title;
            webletElement.className = 'weblet';
            document.body.appendChild(webletElement);

            const navElement = document.createElement('a');
            navElement.className = 'nav';
            navElement.textContent = webletElement.title;
            navElement.href = '#' + id;
            dialogElement.firstElementChild.appendChild(navElement);
            webletsById[id] = {
                id, element: webletElement, navElement,
                display: webletElement.style.display || 'flex',
                props: app.props,
                isVisible() {
                    return !document.hidden && this.element.style.display !== 'none'
                }
            };
        }

        document.getElementById('activeWeblet').onclick = () => {
            dialogElement.classList.add('menu-opens');
            dialogElement.showModal();
        };

        dialogElement.addEventListener('click', (evt) => {
            dialogElement.classList.remove('menu-opens');
            dialogElement.close();
        });
    }

    function rerender() {
        if (document.hidden) {
            return
        }

        for (const weblet of Object.values(webletsById).filter(weblet => weblet.module)) {
            weblet.module.render(weblet);
        }
    }

    document.addEventListener('visibilitychange', rerender);
    createWebLets();
    return app
}



window.onerror = function (error, url, line) {
    // console.log(Array.prototype.slice.call(arguments).join(' '));
    console.log([error, url, line].join(' '));
    alert(error);
};




