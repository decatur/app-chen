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
        props: {}
    };

    /** @type{AppChenNS.Weblet[]} */
    const weblets = /**@type{AppChenNS.Weblet[]}*/ [];

    function webletById(id) {
        return weblets.find(weblet => weblet.id === id)
    }

    function refreshWebletsPriority() {
        const webletsPriority = document.getElementById('webletsPriority');
        webletsPriority.textContent = '';

        let weblet = weblets.find(weblet => !weblet.prev);
        while (weblet) {
            const navElement = createWebletLink(weblet.id, weblet.title);
            webletsPriority.appendChild(navElement);
            weblet = weblet.next;
        }
    }

    /**
     * @returns {Promise}
     */
    function activateWebletFromHash() {
        const id = location.hash.substr(1);
        console.log('Activate Weblet ' + id);

        for (let weblet of weblets) {
            weblet.element.style.display = 'none';
            weblet.navElement.className = 'nav';
        }

        const weblet = weblets.find(weblet => weblet.id === id);
        if (weblet.prev) {
            weblet.prev.next = weblet.next;
            if (weblet.next) {
                weblet.next.prev = weblet.prev;
            }
            const first = weblets.find(weblet => !weblet.prev);
            weblet.prev = null;
            weblet.next = first;
            first.prev = weblet;
        }

        refreshWebletsPriority();

        weblet.element.style.display = weblet.display;
        weblet.navElement.className = 'activeNav';

        if (weblet.module) {
            // TODO: module may not have loaded yet. Use promise returnd by import below...
            return weblet.module.render(weblet);
        } else {
            import(id)
                .then((module) => {
                    weblet.module = /**@type {AppChenNS.WebletModule}*/module;
                    return module.init(weblet, weblet.element);
                })
                .catch((err) => {
                    console.error(err);
                    weblet.element.textContent = String(err);
                });
        }
    }

    /**
     */
    app.activate = function() {
        let hash = window.location.hash;
        if (!webletById(hash.substr(1))) {
             hash = '#' + weblets[0].id;
        }
        // There must be a better way to call activateWebletFromHash exactly once.
        window.location.hash = hash;
        activateWebletFromHash();
        window.setTimeout(() => {
            // Attach onhashchange after the microtask otherwise activateWebletFromHash is called the second time.
            window.onhashchange = function () {
                if (!webletById(window.location.hash.substr(1))) {
                    window.location.hash = hash = '#' + weblets[0].id;
                } else {
                    activateWebletFromHash();
                }
            }
        }, 10);
    };

    function createWebletLink(id, title) {
        const navElement = document.createElement('a');
        navElement.className = 'nav';
        navElement.textContent = title;
        navElement.href = '#' + id;
        return navElement
    }

    function createWebLets() {
        /** @type{HTMLDialogElement} */
        const dialogElement = /** @type{HTMLDialogElement} */(document.getElementById('menu'));
        // window.localStorage
        let prev = null;
        for (const webletInfo of webletInfos) {
            const id = webletInfo.src;
            const title = webletInfo.title;
            const webletElement = document.createElement('div');
            webletElement.title = title;
            webletElement.className = 'weblet';
            document.body.appendChild(webletElement);

            const navElement = createWebletLink(id, title);
            dialogElement.firstElementChild.appendChild(navElement);
            const weblet = {
                id, title, element: webletElement, navElement,
                display: webletElement.style.display || 'flex',
                props: app.props,
                isVisible() {
                    return !document.hidden && this.element.style.display !== 'none'
                }
            };
            weblets.push(weblet);

            weblet.prev = prev;
            if (prev) {
                prev.next = weblet;
            }
            prev = weblet;
        }

        document.getElementById('showMenu').onclick = () => {
            dialogElement.classList.add('menu-opens');
            dialogElement.showModal();
        };

        dialogElement.addEventListener('click', () => {
            dialogElement.classList.remove('menu-opens');
            dialogElement.close();
        });
    }

    function rerender() {
        if (document.hidden) {
            return
        }

        for (const weblet of weblets.filter(weblet => weblet.module)) {
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




