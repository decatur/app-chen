"""
    server_send_events.py

    Implements the server side of server send events.
    A Connection represents the HTTP connection initiated by a client (Browser) over which the events are send.
    The Connection must then be registered with an event type to receive these events.
    Events can be broadcast to all registered Connections.
    Events can also be emitted to a single Connection.

    Usage see routes.py
"""

import collections
import json
import logging
import secrets
from queue import Queue
from typing import List, Dict, Optional

_connections = collections.deque()
_connections_by_event_type = collections.defaultdict(set)
declared_topics: Dict[str, dict] = dict()


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
        logging.info(f'emit {event_type} {data}')
        self.queue.put((event_type, data))


def register(connection: Connection, event_type: str):
    """
    Registers a connection to receive a specific event type.
    Multiple registrations with the same event type are condensed into one.
    """
    # Note that the connection is hashed by its id(), not by its id attribute.
    _connections_by_event_type[event_type].add(connection)


def subscribe(connection: Connection, event_types: List[str]):
    if connection is None:
        raise ValueError(connection.id)
    for event_type in event_types:
        register(connection, event_type)


def get_connection_by_id(guid: str) -> Optional[Connection]:
    """Returns the specified connection"""
    for connection in _connections:
        if connection.id == guid:
            return connection
    return None


def broadcast(event_type: str, event: dict):
    """
    Broadcasts the event to all registered Connections.
    The event must be serializable by json.dumps()
    """
    data = json.dumps(event)
    logging.info(f'broadcast {event_type} {data}')
    for connection in _connections_by_event_type[event_type]:
        connection.queue.put((event_type, data))


def declare_topic(topic: str, description: str, schema: dict):
    declared_topics[topic] = dict(topic=topic, description=description, schema=schema)
