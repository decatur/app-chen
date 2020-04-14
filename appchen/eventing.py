
import abc
from typing import Dict, List, Callable


# Designed along asyncio.AbstractEventLoop
# TODO: Good idea? Use Python 3.8 interfaces?
class EventLoop(abc.ABC):
    @abc.abstractmethod
    def call_soon(self, callback: Callable[..., None], *args):
        pass


class Event:
    type: str


EVENT_LISTENER = Callable[[Event], None]


class EventSource:
    def __init__(self, event_loop: EventLoop):
        self._event_listeners_by_type: Dict[str, List[EVENT_LISTENER]] = dict()
        self.event_loop = event_loop

    def dispatch_event(self, event: Event):
        if event.type in self._event_listeners_by_type:
            for callback in self._event_listeners_by_type[event.type]:
                self.event_loop.call_soon(callback, event)

    def add_event_listener(self, topic: str, callback: EVENT_LISTENER):
        """Adds an event listener for a given topic.
        """
        if type not in self._event_listeners_by_type:
            self._event_listeners_by_type[topic] = []
        self._event_listeners_by_type[topic].append(callback)

    def route(self, event_type: str):
        """A decorator that is used to add an event listener for a given topic.
        """
        def decorator(f):
            self.add_event_listener(event_type, f)
            return f
        return decorator
