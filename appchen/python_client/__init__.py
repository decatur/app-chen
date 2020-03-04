"""A very small EventSource implementation based on the sseclient package."""

import threading
from typing import List, Dict, Callable

from sseclient import SSEClient, Event
import time

import requests

EVENT_LISTENER = Callable[[Event], None]


class EventSource:
    def __init__(self, url: str):
        self.url = url
        self._event_listeners_by_type: Dict[str, List[EVENT_LISTENER]] = dict()

        def sse_connect():
            while True:
                messages = SSEClient(self.url)
                try:
                    for event in messages:
                        self._process_event(event)
                except (ConnectionResetError, requests.exceptions.ConnectionError) as e:
                    # TODO: We do not need to handle ConnectionError, SSEClient does it for us.
                    print(str(e))
                    pass

                print('Reconnect...')
                time.sleep(1)

        threading.Thread(target=sse_connect).start()

    def _process_event(self, event: Event):
        print(event)
        if event.event == 'message':  # TODO: Spec says to call onmessage handler if event has no event field.
            self.onmessage(event)
        elif event.event in self._event_listeners_by_type:
            for callback in self._event_listeners_by_type[event.event]:
                callback(event)

    def onmessage(self, event: Event):
        pass

    def add_event_listener(self, topic: str, callback: EVENT_LISTENER):
        """Adds an event listener for a given topic.
        """
        if type not in self._event_listeners_by_type:
            self._event_listeners_by_type[topic] = []
        self._event_listeners_by_type[topic].append(callback)

    def route(self, topic: str):
        """A decorator that is used to add an event listener for a given topic.
        """
        def decorator(f):
            self.add_event_listener(topic, f)
            return f
        return decorator
