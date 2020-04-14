# Copyright 2020 Wolfgang Kühn
#

import logging
import datetime
import pathlib
import pymongo
from pymongo.errors import ServerSelectionTimeoutError
from flask import Response, request, jsonify, Blueprint, send_from_directory

from appchen.server_send_events import server
from appchen.server_send_events.routes import route

db: pymongo.mongo_client.database.Database
static_folder = pathlib.Path(__file__).parent
app = Blueprint('weblet', __name__, static_folder=static_folder, static_url_path='')


app.record(lambda state: globals().setdefault('db', state.app.config.get('db', None)))


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


@route('weblets_state')
def weblets_state():
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

    return dict(schema=schema, weblets=weblets)


@app.route("editor.html", methods=['GET'])
def get_editor():
    return send_from_directory(static_folder, "editor.html")


@app.route("/weblets", methods=['GET'])
def get_weblets():
    return jsonify(weblets_state())


@app.route("<name>.js", methods=['GET'])
def get_weblet_code(name: str):
    weblet = current_weblet(name)
    if weblet is None:
        return jsonify(error='weblet not found'), 404
    return Response(response=weblet['code'], mimetype="application/javascript; charset=utf-8")


@app.route("<name>", methods=['GET'])
def get_weblet(name: str):
    weblet = current_weblet(name)
    if weblet is None:
        return jsonify(error='Weblet not found'), 404
    del weblet['_id']
    return jsonify(weblet)


# schema = {'properties': {'name': {'type': 'string', 'format': 'uri'}}}
server.declare_topic('weblet_upsert', 'A weblet was created or changed', {
    "code": "Some JavaScript es6 module code",
    "createAt": "2020-01-24T13:37:18.269714+00:00",
    "id": "5e2af30e5e6d266444f1c703",
    "name": "weblet3"
})


@app.route("<name>", methods=['POST'])
def post_weblet(name: str):
    weblet: dict = request.get_json(force=True)
    weblet['name'] = name
    weblet['createAt'] = datetime.datetime.now(tz=datetime.timezone.utc)
    db.get_collection('weblets').insert_one(weblet)
    weblet['createAt'] = weblet['createAt'].isoformat()
    weblet['id'] = str(weblet['_id'])
    del weblet['_id']
    server.broadcast('weblet_upsert', weblet)
    return jsonify(message='Inserted weblet.')