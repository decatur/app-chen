import json
import argparse
import logging

import requests

from appchen.eventsource.client import EventSource, Event


logging.getLogger().setLevel(logging.DEBUG)
parser = argparse.ArgumentParser()
parser.add_argument("--httpport", required=True, type=int)
args = parser.parse_args()

base_url = f'http://localhost:{args.httpport}/appchen/web_client/stream/'
es = EventSource(base_url + 'connection')


@es.route('connection_open')
def on_connection_open(event: Event):
    data: dict = json.loads(event.data)
    # logging.info(data['connectionId'])
    r = requests.post(base_url + 'subscribe', data=json.dumps({
        'connectionId': data['connectionId'],
        'topics': ['zen', 'trade_executions_state', 'trade_execution']
    }))
    assert r.ok


@es.route('zen')
def on_zen(event: Event):
    data: dict = json.loads(event.data)
    logging.debug(data)


@es.route('trade_execution')
def on_trade_execution(event: Event):
    data: dict = json.loads(event.data)
    logging.debug(data)


@es.route('trade_executions_state')
def on_trade_executions_state(event: Event):
    data: dict = json.loads(event.data)
    logging.debug(data)
