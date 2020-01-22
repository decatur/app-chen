# Copyright 2020 Wolfgang Kühn
#

import logging
import pathlib
from typing import List
import datetime

from flask import Response, request, jsonify, Blueprint
import pymongo
from pymongo.errors import ServerSelectionTimeoutError

import appchen.server_send_events as sse

time_line_index = 1
db: pymongo.mongo_client.database.Database or None = None
app = Blueprint('appchen', __name__, static_folder='client', static_url_path='')


def on_register(state):
    global db
    db = state.app.config.get('db', None)


app.record(on_register)


def import_modules(src_dir: pathlib.Path):
    """Initializes the database."""
    logging.warning(f'Dropping modules collection from database')
    collection: pymongo.collection.Collection = db.get_collection('modules')
    collection.drop()
    logging.info(f'Importing modules from {src_dir.resolve()}')
    modules = src_dir.glob('*.js')
    for path in modules:
        logging.info(f'Importing module {path}')
        module = dict(
            code=path.read_text(encoding='utf8'),
            name=path.stem,
            createAt=datetime.datetime.utcnow(),
            createBy='importer'
        )
        collection.insert_one(module)


def current_module(name: str):
    """Returns the latest module of the specified name."""
    return db.get_collection('modules').find_one({"name": name}, sort=[('createAt', pymongo.DESCENDING)])


@app.errorhandler(ServerSelectionTimeoutError)
def db_error_handler(error):
    return f'Database connection failed: {str(error)}', 500


# @app.route("/grid-chen/<filename>", methods=['GET'])
# def get_grid_chen(filename: str):
#     grid_chen: pathlib.Path = pathlib.Path('../grid-chen/grid-chen').absolute()
#     return send_from_directory(grid_chen, filename)


@app.route("/modules", methods=['GET'])
def get_modules():
    schema = {
        "title": 'Modules',
        "type": 'array',
        "items": {
            "type": 'object',
            "properties": {
                "name": {"title": 'Name', "type": 'string', "format": 'uri', "width": 100},
                "createAt": {
                    "title": 'Create At', "type": 'string', "format": 'date-time', "period": 'MILLISECONDS',
                    "width": 300
                },
                "createBy": {"title": 'Create By', "type": 'string', "width": 200},
                "id": {"title": 'Id', "type": 'string', "width": 200}
            }
        }
    }

    modules_cursor = db.get_collection('modules').find({}, sort=[('createAt', pymongo.ASCENDING)])
    modules = []
    for module in modules_cursor:
        module['id'] = str(module['_id'])
        del module['_id']
        create_at: datetime.datetime = module['createAt']
        module['createAt'] = create_at.isoformat()
        modules.append(module)

    return jsonify(schema=schema, modules=modules)


@app.route("/modules/<name>.js", methods=['GET'])
def get_module_code(name: str):
    module = current_module(name)
    if module is None:
        return jsonify(error='Module not found'), 404
    return Response(response=module['code'], mimetype="application/javascript; charset=utf-8")


@app.route("/modules/<name>", methods=['GET'])
def get_module(name: str):
    module = current_module(name)
    if module is None:
        return jsonify(error='Module not found'), 404
    del module['_id']
    return jsonify(module)


# schema = {'properties': {'name': {'type': 'string', 'format': 'uri'}}}
sse.declare_topic('module_upsert', 'A module was created or changed')


@app.route("/modules/<name>", methods=['POST'])
def post_module(name: str):
    module: dict = request.get_json(force=True)
    module['name'] = name
    module['createAt'] = datetime.datetime.now(tz=datetime.timezone.utc)
    db.get_collection('modules').insert_one(module)
    module['createAt'] = module['createAt'].isoformat()
    module['id'] = str(module['_id'])
    del module['_id']
    sse.broadcast('module_upsert', module)
    return jsonify(message='Inserted module.')


@app.route('/stream/subscribe', methods=['POST'])
def eventing_subscribe():
    request_data: dict = request.get_json(force=True)
    connection_id: str = request_data['connectionId']
    topics: List[str] = request_data['topics']
    connection = sse.get_connection_by_id(connection_id)
    sse.subscribe(connection, topics)
    # Create pre-cursor event
    for topic in topics:
        connection.emit(topic, None)
    return jsonify('Done')


@app.route('/stream/connection', methods=['GET'])
def open_connection():
    connection = sse.Connection()
    sse.register(connection, 'zen')
    connection.emit('connection_open', dict(connectionId=connection.id))
    return Response(connection.event_generator(), mimetype="text/event-stream")


@app.route('/topics', methods=['GET'])
def get_topics():
    return jsonify(list(sse.declared_topics.values()))
