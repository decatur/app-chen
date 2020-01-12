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

transaction_schema = {'type': 'object', 'properties': {
    'product': {'columnIndex': 0, 'type': 'string', 'width': 200},
    'executionTime': {'columnIndex': 3, 'type': 'string', 'format': 'date-time', 'period': 'SECONDS', 'width': 200},
    'quantity': {'columnIndex': 1, 'title': 'Quantity[MW]', 'type': 'number'},
    'price': {'columnIndex': 2, 'title': 'Price[€/MWh]', 'type': 'number'},
    '_id': {'columnIndex': 4, 'type': 'string', 'width': 250},
    '_timeLineIndex': {'columnIndex': 5, 'type': 'integer'}
}}


@app.route("/", methods=['GET'])
def get_home():
    return redirect('/appchen/client/myapp.html')


@app.route("/transactions", methods=['GET'])
def get_transactions():
    # Simulate network delay
    time.sleep(1.0)

    cursor = db.get_collection('transactions').find({}, sort=[('_timeLineIndex', pymongo.ASCENDING)])
    transactions = []

    for transaction in cursor:
        transaction['_id'] = str(transaction['_id'])
        transactions.append(transaction)

    schema = {
        "title": 'Modules',
        "type": 'array',
        "items": transaction_schema
    }

    if len(transactions):
        return jsonify(schema=schema, data=transactions, _timeLineIndex=transactions[-1]['_timeLineIndex'])
    else:
        return jsonify(schema=schema)


def pump_zen():
    def target():
        zen_cycle = itertools.cycle("".join([d.get(c, c) for c in s]).split('\n')[2:])
        index = itertools.count()
        while True:
            time.sleep(5.0)
            sse.broadcast('zen', dict(index=next(index), lesson=next(zen_cycle)))

    schema = {'properties': {'lesson': {'type': 'string'}}}
    sse.declare_topic('zen', 'A new zen of python every 5 seconds', schema)
    threading.Thread(target=target).start()


def pump_transactions():
    def target():
        price = randint(400, 600) / 10
        while True:
            time.sleep(random() * 5)
            transaction = dict(
                product=datetime.datetime(2020, 2, 1, randint(0, 23), 15 * randint(0, 3)).isoformat()[0:16] + 'PT15M',
                executionTime=datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
                quantity=randint(1, 40) / 10,
                price=price,
                _timeLineIndex=routes.time_line_index
            )
            routes.time_line_index += 1
            price += randint(-10, 10) / 10
            db.get_collection('transactions').insert_one(transaction)
            transaction['_id'] = str(transaction['_id'])
            sse.broadcast('transaction', transaction)

    schema = {'properties': {
        'product': {'type': 'string'},
        'executionTime': {'type': 'string', 'format': 'date-time'},
        'quantity': {'type': 'number', 'unit': 'MW'},
        'price': {'type': 'number', 'unit': '€/MWh'}
    }}
    sse.declare_topic('transaction', 'A transaction occurred', schema)
    threading.Thread(target=target).start()


# db.get_collection('transactions').drop()
routes.import_modules(pathlib.Path('appchen/client').resolve())

latest = db.get_collection('transactions').find_one({}, sort=[('_timeLineIndex', pymongo.DESCENDING)])
routes.time_line_index = latest['_timeLineIndex'] if latest else 1
pump_zen()
pump_transactions()

werkzeug.serving.run_simple('localhost', 8080, app, threaded=True)
