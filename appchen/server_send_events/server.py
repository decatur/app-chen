"""
    server.py

    Implements the server side of server send events.
    A Connection represents the HTTP connection initiated by a client (Browser) over which the events are send.
    The Connection must then be registered with an event type to receive these events.
    Events can be broadcast to all registered Connections.
    Events can also be emitted to a single Connection.

    Usage see routes.py
"""
import threading
import time
import collections
import json
import logging
import secrets
import datetime
import types
from queue import Queue
from typing import List, Dict, Optional, Callable, Union

_connections = collections.deque()
_connections_by_event_type = collections.defaultdict(set)
declared_topics: Dict[str, dict] = dict()
_keep_alive_thread: threading.Thread = None
_event_cache_by_topic: Dict[str, str] = {}

class Connection:
    """A Connection represents the HTTP connection initiated by a client (Browser) over which the events are send."""

    def __init__(self):
        self.queue = Queue()
        self.id: str = secrets.token_hex(10)
        _connections.append(self)

    def remove(self):
        _connections.remove(self)
        for event_type in _connections_by_event_type:
            try:
                _connections_by_event_type[event_type].remove(self)
            except:
                pass

    def event_generator(self):
        try:
            while True:
                event_type, data = self.queue.get()
                self.queue.task_done()  # We do not need this
                yield f'event: {event_type}\ndata: {data}\n\n'  # This is SSE syntax
        except GeneratorExit as e:
            print(repr(e))
            self.remove()

    def emit(self, event_type: str, event: dict):
        """Emit the event to this connection only."""
        data = json.dumps(event)
        logging.debug(f'emit {event_type}')
        self.queue.put((event_type, data))


def register(connection: Connection, event_type: str):
    """
    Registers a connection to receive a specific event type.
    Multiple registrations with the same event type are condensed into one.
    """
    # Note that the connection is hashed by its id(), not by its id attribute.
    _connections_by_event_type[event_type].add(connection)
    if _keep_alive_thread is None or not _keep_alive_thread.is_alive():
        pump_keep_alive_or_let_die()


def subscribe(connection: Connection, event_types: List[str]):
    if connection is None:
        raise ValueError(connection.id)
    for event_type in event_types:
        register(connection, event_type)
        if event_type in _event_cache_by_topic:
            connection.queue.put((event_type, _event_cache_by_topic[event_type]))


def get_connection_by_id(guid: str) -> Optional[Connection]:
    """Returns the specified connection"""
    for connection in _connections:
        if connection.id == guid:
            return connection
    return None


def broadcast(topic: str, event: Union[Callable[[], Dict], Dict]):
    """
    Broadcasts the event to all registered Connections.
    The event must be serializable by json.dumps()
    """
    if topic not in _connections_by_event_type:
        return

    if isinstance(event, types.FunctionType):
        event = event()
    data = json.dumps(event)
    _event_cache_by_topic[topic] = data
    logging.debug(f'broadcast {topic}')
    if topic not in declared_topics:
        declared_topics[topic] = dict(topic=topic, description='TODO', example=event)
    if declared_topics[topic]['example'] is None:
        declared_topics[topic]['example'] = event

    for connection in _connections_by_event_type[topic]:
        connection.queue.put((topic, data))


def declare_topic(topic: str, description: str, example: dict = None):
    declared_topics[topic] = dict(topic=topic, description=description, example=example)


def pump_keep_alive_or_let_die():
    global _keep_alive_thread

    def target():
        while len(_connections_by_event_type):
            time.sleep(10)
            broadcast('keep_alive_or_let_die', dict(
                datetime=datetime.datetime.utcnow().isoformat() + 'Z',
                threadCount=threading.active_count()))

    _keep_alive_thread = threading.Thread(target=target)
    _keep_alive_thread.start()


declare_topic('keep_alive_or_let_die',
              """Event send each 10 seconds on each connection without explicitly subscribing to it.
Needed to (1) prevent HTTP proxy timeouts and (2) needed to detect closed connections via GeneratorExit.""",
              {
                  "threadCount": 7,
                  "datetime": "2020-02-29T13:00:00Z"
              })
