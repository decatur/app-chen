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
     * @param {string?} id
     * @returns {Promise}
     */
    app.activateWebletFromHash = function (id) {
        id = id || location.hash.substr(1);
        if (!(id in webletsById)) {
            id = Object.keys(webletsById)[0];
        }
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
        window.location.hash = '#' + id;
        app.activeWebletId = id;

        if (weblet.module) {
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
    window.onhashchange = function(evt) {
        app.activateWebletFromHash();
    };
    return app
}



window.onerror = function (error, url, line) {
    // console.log(Array.prototype.slice.call(arguments).join(' '));
    console.log([error, url, line].join(' '));
    alert(error);
};




