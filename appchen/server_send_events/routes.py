# Copyright 2020 Wolfgang Kühn
#

from functools import partial
from typing import List, Callable, Dict
from flask import Response, request, jsonify, Blueprint

from appchen.server_send_events import server

_state_events_by_topic: Dict[str, Callable[[], dict]] = dict()

# TODO: A note on static folder!
app = Blueprint('appchen', __name__, static_folder='../web_client', static_url_path='')


def route(topic: str, **kwargs):
    """A decorator used to register a state event.
    """

    def decorator(f):
        if topic in _state_events_by_topic:
            raise KeyError('Topic is already routed: ' + topic)
        _state_events_by_topic[topic] = partial(f, **kwargs)
        return f

    return decorator


@app.route('/stream/subscribe', methods=['POST'])
def post_subscribe():
    request_data: dict = request.get_json(force=True)
    connection_id: str = request_data['connectionId']
    topics: List[str] = request_data['topics']
    connection = server.get_connection_by_id(connection_id)
    for topic in topics:
        if topic.endswith('_state') and topic in _state_events_by_topic:
            evt = _state_events_by_topic[topic]()
            if evt:
                connection.emit(topic, evt)

    server.subscribe(connection, topics)
    return jsonify('Done')


@app.route('/stream/connection', methods=['GET'])
def open_connection():
    connection = server.Connection()
    server.register(connection, 'keep_alive_or_let_die')
    connection.emit('connection_open', dict(connectionId=connection.id))
    return Response(connection.event_generator(), mimetype="text/event-stream")


@app.route('/stream/topics', methods=['GET'])
def get_topics():
    return jsonify(list(server.declared_topics.values()))
