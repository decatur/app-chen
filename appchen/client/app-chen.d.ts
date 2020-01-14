declare module AppChenNS {
    export interface SourceEventsConfig {
        resource?: {
            uri: string,
            handler: (response: object) => void;
        };
        topic: {
            uri: string,
            handler: (event: object) => void;
        };
        visibilityElement?: HTMLElement;
        render: () => void;
    }

    export interface Event {
    }

    export interface Eventing {
    }
}