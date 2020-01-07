import threading
import werkzeug
import time
import itertools
import pathlib
from this import d, s
from flask import Flask, jsonify
import flask_server.server_send_events as sse
from random import randint
import datetime
import pymongo

import flask_server.routes as routes
import flask_server.database as database


static_folder = pathlib.Path('./client').resolve()
# WARNING: When exposing the app to an unsecure location, the static_folder MUST only contain web resources!!!
app = Flask(__name__, static_folder=static_folder, static_url_path='/')

transaction_schema = {'type': 'object', 'properties': {
        'product': {'type': 'string', 'width': 200},
        'executionTime': {'type': 'string', 'format': 'date-time', 'period': 'SECONDS', 'width': 200},
        'quantity': {'type': 'number', 'unit': 'MW'},
        'price': {'type': 'number', 'unit': '€/MWh'}
    }}


@app.route("/transactions", methods=['GET'])
def get_transactions():
    cursor = database.db.get_collection('transactions').find({}, sort=[('executionTime', pymongo.ASCENDING)])
    transactions = []

    for transaction in cursor:
        transaction['id'] = str(transaction['_id'])
        del transaction['_id']
        transactions.append(transaction)

    schema = {
        "title": 'Modules',
        "type": 'array',
        "items": transaction_schema
    }

    if len(transactions):
        return jsonify(schema=schema, data=transactions, transactionIndex=transactions[-1]['transactionIndex'])
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
            time.sleep(randint(1, 10) / 5)
            transaction = dict(
                product=datetime.datetime(2020, 2, 1, randint(0, 23), 15 * randint(0, 3)).isoformat()[0:16] + 'PT15M',
                executionTime=datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
                quantity=randint(0, 40) / 10,
                price=price,
                transactionIndex=routes.transaction_index
            )
            routes.transaction_index += 1
            price += randint(-10, 10) / 10
            database.db.get_collection('transactions').insert_one(transaction)
            del transaction['_id']
            sse.broadcast('transaction', transaction)

    schema = {'properties': {
        'product': {'type': 'string'},
        'executionTime': {'type': 'string', 'format': 'date-time'},
        'quantity': {'type': 'number', 'unit': 'MW'},
        'price': {'type': 'number', 'unit': '€/MWh'}
    }}
    sse.declare_topic('transaction', 'A transaction occurred', schema)
    threading.Thread(target=target).start()


database.db.get_collection('transactions').drop()
pump_zen()
pump_transactions()

routes.mixin_routes(app)
werkzeug.serving.run_simple('localhost', 8080, app, threaded=True)
