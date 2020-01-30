# Copyright 2020 Wolfgang Kühn
#

import logging
import pathlib
import threading
import time
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


def import_weblets(src_dir: pathlib.Path):
    """Initializes the database."""
    logging.warning(f'Dropping weblets collection from database')
    collection: pymongo.collection.Collection = db.get_collection('weblets')
    collection.drop()
    logging.info(f'Importing weblets from {src_dir.resolve()}')
    weblets = src_dir.glob('*.js')
    for path in weblets:
        logging.info(f'Importing weblet {path}')
        weblet = dict(
            code=path.read_text(encoding='utf8'),
            name=path.stem,
            createAt=datetime.datetime.utcnow(),
            createBy='importer'
        )
        collection.insert_one(weblet)


def current_weblet(name: str):
    """Returns the latest weblet of the specified name."""
    return db.get_collection('weblets').find_one({"name": name}, sort=[('createAt', pymongo.DESCENDING)])


@app.errorhandler(ServerSelectionTimeoutError)
def db_error_handler(error):
    return f'Database connection failed: {str(error)}', 500


# @app.route("/grid-chen/<filename>", methods=['GET'])
# def get_grid_chen(filename: str):
#     grid_chen: pathlib.Path = pathlib.Path('../grid-chen/grid-chen').absolute()
#     return send_from_directory(grid_chen, filename)


@app.route("/weblets", methods=['GET'])
def get_weblets():
    schema = {
        "title": 'Weblets',
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

    weblets_cursor = db.get_collection('weblets').find({}, sort=[('createAt', pymongo.ASCENDING)])
    weblets = []
    for weblet in weblets_cursor:
        weblet['id'] = str(weblet['_id'])
        del weblet['_id']
        create_at: datetime.datetime = weblet['createAt']
        weblet['createAt'] = create_at.isoformat()
        weblets.append(weblet)

    return jsonify(schema=schema, weblets=weblets)


@app.route("/weblets/<name>.js", methods=['GET'])
def get_weblet_code(name: str):
    weblet = current_weblet(name)
    if weblet is None:
        return jsonify(error='weblet not found'), 404
    return Response(response=weblet['code'], mimetype="application/javascript; charset=utf-8")


@app.route("/weblets/<name>", methods=['GET'])
def get_weblet(name: str):
    weblet = current_weblet(name)
    if weblet is None:
        return jsonify(error='Weblet not found'), 404
    del weblet['_id']
    return jsonify(weblet)


# schema = {'properties': {'name': {'type': 'string', 'format': 'uri'}}}
sse.declare_topic('weblet_upsert', 'A weblet was created or changed', {
    "code": "Some JavaScript es6 module code",
    "createAt": "2020-01-24T13:37:18.269714+00:00",
    "id": "5e2af30e5e6d266444f1c703",
    "name": "tab3"
})


@app.route("/weblets/<name>", methods=['POST'])
def post_weblet(name: str):
    weblet: dict = request.get_json(force=True)
    weblet['name'] = name
    weblet['createAt'] = datetime.datetime.now(tz=datetime.timezone.utc)
    db.get_collection('weblets').insert_one(weblet)
    weblet['createAt'] = weblet['createAt'].isoformat()
    weblet['id'] = str(weblet['_id'])
    del weblet['_id']
    sse.broadcast('weblet_upsert', weblet)
    return jsonify(message='Inserted weblet.')


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
    sse.register(connection, 'keep_alive_or_let_die')
    connection.emit('connection_open', dict(connectionId=connection.id))
    return Response(connection.event_generator(), mimetype="text/event-stream")


@app.route('/topics', methods=['GET'])
def get_topics():
    return jsonify(list(sse.declared_topics.values()))


def pump_keep_alive_or_let_die():
    def target():
        while True:
            time.sleep(10)
            sse.broadcast('keep_alive_or_let_die', dict(threadCount=threading.active_count()))

    threading.Thread(target=target).start()


sse.declare_topic('keep_alive_or_let_die',
                  """Event send each 10 seconds on each connection without explicitly subscribing to it.
Needed to (1) prevent HTTP proxy timeouts and (2) needed to detect closed connections via GeneratorExit.""",
                  {
                      "threadCount": 7
                  })

pump_keep_alive_or_let_die()
