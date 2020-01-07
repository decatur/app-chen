export interface SourceEventsConfig {
    resource: {
        uri: string,
        handler: (response: object[]) => void;
    };
    topic: {
        uri: string,
        handler: (event: object) => void;
    };
}