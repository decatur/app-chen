declare module AppChenNS {

    export interface WebletModule {
        render: (Weblet) => Promise<any>;
    }

    export interface Weblet {
        id: string;
        title: string;
        element: HTMLElement;
        navElement: HTMLElement;
        display: string;
        props: object;
        isVisible: () => boolean;
        module?: WebletModule;
        next?: Weblet;
        prev?: Weblet;
    }

    export type RenderType = (weblet: Weblet, container: HTMLElement) => Promise<any>;

    export interface WebletCollection {
        [index: string]: Weblet;
    }

    export interface SubscriptionHandlers {
        [index: string]: (event: object) => void;
    }

    export interface Stream {
        subscribe: (config: SubscriptionHandlers) => Subscription;
        // Listener is called whenever stream is initially connected or re-connected.
        setOpenListener: (listener:(event: Event) => void) => void;
        // Listener is called whenever stream is disconnected.
        setErrorListener: (listener:(event: Event) => void) => void;
    }
    
    export interface Subscription {
        suspend: () => void;
        resume: () => void;
    }

}