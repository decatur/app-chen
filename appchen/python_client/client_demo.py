import json
import argparse
import requests

from appchen.python_client import EventSource, Event


parser = argparse.ArgumentParser()
parser.add_argument("--httpport", required=True, type=int)
args = parser.parse_args()

base_url = f'http://localhost:{args.httpport}/appchen/client/stream/'
es = EventSource(base_url + 'connection')


@es.route('connection_open')
def on_connection_open(event: Event):
    data: dict = json.loads(event.data)
    print(data['connectionId'])
    r = requests.post(base_url + 'subscribe', data=json.dumps({
        'connectionId': data['connectionId'],
        'topics': ['zen', 'trade_executions_state', 'trade_execution']
    }))
    print(r.text)


@es.route('zen')
def on_zen(event: Event):
    data: dict = json.loads(event.data)
    print(data)


@es.route('trade_execution')
def on_trade_execution(event: Event):
    data: dict = json.loads(event.data)
    print(data)


@es.route('trade_executions_state')
def on_trade_executions_state(event: Event):
    data: dict = json.loads(event.data)
    print(data)
