import pathlib

from typing import List
import datetime


from flask import Flask, Response, request, jsonify, send_from_directory, redirect
import pymongo

import flask_server.database as database
import flask_server.server_send_events as sse


def mixin_routes(app: Flask):
    """Well, bye bye blueprints"""

    @app.errorhandler(pymongo.errors.ServerSelectionTimeoutError)
    def db_error_handler(error):
        return f'Database connection failed: {str(error)}', 500


    @app.route("/", methods=['GET'])
    def get_home():
        return redirect('/myapp.html')


    @app.route("/grid-chen/<filename>", methods=['GET'])
    def get_grid_chen(filename: str):
        grid_chen: pathlib.Path = pathlib.Path('../grid-chen/grid-chen').absolute()
        return send_from_directory(grid_chen, filename)


    @app.route("/modules", methods=['GET'])
    def get_modules():
        schema = {
            "title": 'Modules',
            "type": 'array',
            "items": {
                "type": 'object',
                "properties": {
                    "name": {"title": 'Name', "type": 'string', "format": 'uri', "width": 100},
                    "createAt": {"title": 'Create At', "type": 'string', "format": 'date-time', "frequency": 'MS', "width": 300},
                    "createBy": {"title": 'Create By', "type": 'string', "width": 200},
                    "id": {"title": 'Id', "type": 'string', "width": 200}
                }
            }
        }

        modules_cursor = database.db.get_collection('modules').find({}, sort=[('createAt', pymongo.ASCENDING)])
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
        module = database.current_module(name)
        if module is None:
            return jsonify(error='Module not found'), 404
        return Response(response=module['code'], mimetype="application/javascript; charset=utf-8")


    @app.route("/modules/<name>", methods=['GET'])
    def get_module(name: str):
        module = database.current_module(name)
        if module is None:
            return jsonify(error='Module not found'), 404
        del module['_id']
        return jsonify(module)


    sse.declare_topic('moduleChanged', 'A module was changed', dict(properties=dict(name=dict(type='string', format='uri'))))


    @app.route("/modules/<name>", methods=['POST'])
    def post_module(name: str):
        module: dict = request.get_json(force=True)
        module['name'] = name
        module['createAt'] = datetime.datetime.now(tz=datetime.timezone.utc)
        database.db.get_collection('modules').insert_one(module)
        module['createAt'] = module['createAt'].isoformat()
        module['id'] = str(module['_id'])
        del module['_id']
        sse.broadcast('moduleChanged', module)
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



