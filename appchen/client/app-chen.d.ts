declare module AppChenNS {
    export interface SubscriptionConfig {
        resource?: {
            uri: string,
            handler: (response: object) => void;
        };
        topics: {
            uri: string,
            handler: (event: object) => void;
        }[];
        visibilityElement?: HTMLElement;
        render: () => void;
    }

    export interface Stream {
        subscribe: (SubscriptionConfig) => Subscription;
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