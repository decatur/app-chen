import threading
from typing import Dict, Callable

from sseclient import SSEClient, Event
import time

import requests


class EventSource:
    def __init__(self, url: str):
        self.url = url
        self.event_listeners_by_type: Dict[str, Callable] = dict()

        def target():
            while True:
                messages = SSEClient(self.url)
                try:
                    for event in messages:
                        self._process_event(event)
                except requests.exceptions.ConnectionError as e:
                    pass

                print('Reconnect...')
                time.sleep(1)

        threading.Thread(target=target).start()

    def _process_event(self, event: Event):
        print(event)
        if event.event == 'message':  # TODO: Spec says to call onmessage handler if event has no event field.
            self.onmessage(event)
        elif event.event in self.event_listeners_by_type:
            for callback in self.event_listeners_by_type[event.event]:
                callback(event)

    def onmessage(self, event: Event):
        pass

    def add_event_listener(self, type: str, callback: Callable):
        if type not in self.event_listeners_by_type:
            self.event_listeners_by_type[type] = []
        self.event_listeners_by_type[type].append(callback)

    def route(self, topic: str):
        """A decorator that is used to add an event listener for a given topic.
        """
        def decorator(f):
            self.add_event_listener(topic, f)
            return f
        return decorator


# def connect():
#     messages = SSEClient('http://localhost:8080/appchen/client/stream/connection')
#     for evt in messages:
#         print(evt.event)
#
#         if evt.event == 'connection_open':
#             data: dict = json.loads(evt.data)
#             print(data['connectionId'])
#             r = requests.post('http://localhost:8080/appchen/client/stream/subscribe', data=json.dumps({
#                 'connectionId': data['connectionId'],
#                 'topics': ['zen']
#             }))
#             print(r.text)
#         else:
#             print(evt)


# while True:
#     try:
#         connect()
#     except requests.exceptions.ConnectionError as e:
#         pass
#
#     print('Reconnect...')
#     time.sleep(1)
#


# def my_handler(self, event: Event):
#     print(event.event)
#
#     if event.event == 'connection_open':
#         data: dict = json.loads(event.data)
#         print(data['connectionId'])
#         r = requests.post('http://localhost:8080/appchen/client/stream/subscribe', data=json.dumps({
#             'connectionId': data['connectionId'],
#             'topics': ['zen']
#         }))
#         print(r.text)
#     else:
#         print(event)
# event_source.onmessage = partial(my_handler, event_source)


