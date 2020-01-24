import logging
import threading
import werkzeug
import time
import itertools
import pathlib
from this import d, s
from flask import Flask, jsonify, redirect
import appchen.server_send_events as sse
from random import randint, random
import datetime
import pymongo

import appchen.routes as routes

logging.getLogger().setLevel(logging.INFO)

db = pymongo.MongoClient('localhost:27017', tz_aware=True, serverSelectionTimeoutMS=1000).get_database('appchen')

static_folder = pathlib.Path('./client').resolve()
# WARNING: When exposing the app to an unsecure location, the static_folder MUST only contain web resources!!!
app = Flask(__name__, static_folder=static_folder, static_url_path='/')
app.config['db'] = db
app.register_blueprint(routes.app, url_prefix='/appchen/client')

trade_execution_schema = {'type': 'object', 'properties': {
    'delivery': {'columnIndex': 0, 'type': 'string', 'width': 200},
    'executionTime': {'columnIndex': 3, 'type': 'string', 'format': 'date-time', 'period': 'SECONDS', 'width': 200},
    'quantity': {'columnIndex': 1, 'title': 'Quantity[MW]', 'type': 'number'},
    'price': {'columnIndex': 2, 'title': 'Price[€/MWh]', 'type': 'number'},
    '_id': {'columnIndex': 4, 'type': 'string', 'width': 250}
}}


@app.route("/", methods=['GET'])
def get_home():
    return redirect('/appchen/client/myapp.html')


@app.route("/trade_executions", methods=['GET'])
def get_trade_executions():
    # Simulate network delay
    time.sleep(1.0)

    cursor = db.get_collection('trade_executions').find({}, sort=[('executionTime', pymongo.ASCENDING)])
    trades = []

    for trade in cursor:
        trade['_id'] = str(trade['_id'])
        trades.append(trade)

    schema = {
        "title": 'Modules',
        "type": 'array',
        "items": trade_execution_schema
    }

    if len(trades):
        return jsonify(schema=schema, data=trades, _id=trades[-1]['_id'])
    else:
        return jsonify(schema=schema)


def pump_zen():
    def target():
        zen_cycle = itertools.cycle("".join([d.get(c, c) for c in s]).split('\n')[2:])
        index = itertools.count()
        while True:
            time.sleep(5.0)
            sse.broadcast('zen', dict(index=next(index), lesson=next(zen_cycle)))

    # schema = {'properties': {'lesson': {'type': 'string'}}}
    sse.declare_topic('zen', 'A new zen of python every 5 seconds',
                      {
                          "index": 0,
                          "lesson": "Beautiful is better than ugly."
                      }
                      )
    threading.Thread(target=target).start()


def pump_trade_executions():
    def target():
        price = randint(400, 600) / 10
        while True:
            time.sleep(random() * 5)
            trade = dict(
                delivery=datetime.datetime(2020, 2, 1, randint(0, 23), 15 * randint(0, 3)).isoformat()[0:16] + 'PT15M',
                executionTime=datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
                quantity=randint(1, 40) / 10,
                price=price
            )
            routes.time_line_index += 1
            price += randint(-10, 10) / 10
            db.get_collection('trade_executions').insert_one(trade)
            trade['_id'] = str(trade['_id'])
            sse.broadcast('trade_execution', trade)

    # schema = {'properties': {
    #     'product': {'type': 'string'},
    #     'executionTime': {'type': 'string', 'format': 'date-time'},
    #     'quantity': {'type': 'number', 'unit': 'MW'},
    #     'price': {'type': 'number', 'unit': '€/MWh'}
    # }}
    sse.declare_topic('trade_execution', 'A trade occurred. Price is in [€/MWh], quantity is in [MW]', {
        "_id": "5e2af2115e6d266444f1c69e",
        "delivery": "2020-02-01T06:45PT15M",
        "executionTime": "2020-01-24T13:33:05.246293+00:00",
        "price": 51.7,
        "quantity": 1.9
    })
    threading.Thread(target=target).start()


# db.get_collection('transactions').drop()
routes.import_modules(pathlib.Path('appchen/client').resolve())

pump_zen()
pump_trade_executions()

werkzeug.serving.run_simple('localhost', 8080, app, threaded=True)
