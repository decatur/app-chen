import pathlib
import time
import threading
import itertools
from typing import List
import datetime

import werkzeug
from flask import Flask, Response, request, jsonify, send_from_directory
import pymongo

import flask_server.database as database
import flask_server.server_send_events as sse
from this import d, s

# WARNING: When exposing the app to an unsecure location, the static_folder MUST only contain web resources!!!
app = Flask(__name__, root_path='./', static_folder='./client', static_url_path='/')


def pump_zen_events():
    zen_cycle = itertools.cycle("".join([d.get(c, c) for c in s]).split('\n')[2:])
    index = itertools.count()
    while True:
        time.sleep(5.0)
        sse.broadcast('zen', dict(index=next(index), lesson=next(zen_cycle)))


@app.route("/grid-chen/<filename>", methods=['GET'])
def get_grid_chen(filename: str):
    grid_chen: pathlib.Path = pathlib.Path('../grid-chen/grid-chen').absolute()
    return send_from_directory(
        grid_chen, filename  # , cache_timeout=cache_timeout
    )


@app.route("/modules", methods=['GET'])
def get_modules():
    modules_cursor = database.db.get_collection('modules').find({}, sort=[('createAt', pymongo.DESCENDING)])
    modules = []
    for module in modules_cursor:
        module['id'] = str(module['_id'])
        del module['_id']
        create_at: datetime.datetime = module['createAt']
        module['createAt'] = create_at.isoformat()
        modules.append(module)

    return jsonify(modules)


@app.route("/modules/<name>.js", methods=['GET'])
def get_module_code(name: str):
    module = database.current_module(name)
    if module is None:
        return jsonify(error='Module not found'), 404
    return Response(response=module['code'], mimetype="application/JavaScript")


@app.route("/modules/<name>", methods=['GET'])
def get_module(name: str):
    module = database.current_module(name)
    if module is None:
        return jsonify(error='Module not found'), 404
    del module['_id']
    return jsonify(module)


@app.route("/modules/<name>", methods=['POST'])
def post_module(name: str):
    module: dict = request.get_json(force=True)
    module['name'] = name
    module['createAt'] = datetime.datetime.utcnow()
    database.db.get_collection('modules').insert_one(module)
    sse.broadcast('moduleChanged', dict(name=request.url))
    return jsonify(message='Inserted module.')


@app.route('/eventing/subscribe', methods=['POST'])
def eventing_subscribe():
    request_data: dict = request.get_json(force=True)
    connection_id: str = request_data['connectionId']
    event_types: List[str] = request_data['eventTypes']
    sse.subscribe(connection_id, event_types)
    return jsonify('Done')


@app.route('/connection', methods=['GET'])
def open_connection():
    connection = sse.Connection()
    sse.register(connection, 'zen')
    connection.emit('connection_open', dict(connectionId=connection.id))
    return Response(connection.event_generator(), mimetype="text/event-stream")


@app.route('/topics', methods=['GET'])
def get_topics():
    return jsonify(list(sse._declared_topics.values()))


sse.declare_topic('zen', 'A new zen of python every 5 seconds', dict(properties=dict(lesson=dict(type='string'))))
sse.declare_topic('moduleChanged', 'A module was changed', dict(properties=dict(name=dict(type='string', format='uri'))))

threading.Thread(target=pump_zen_events).start()

werkzeug.serving.run_simple('localhost', 8080, app, threaded=True)
