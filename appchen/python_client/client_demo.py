import json
import argparse
import requests

from sseclient import Event
from appchen.python_client import EventSource


parser = argparse.ArgumentParser()
parser.add_argument("--httpport", required=True, type=int)
args = parser.parse_args()

event_source = EventSource(f'http://localhost:{args.httpport}/appchen/client/stream/connection')


@event_source.route('connection_open')
def on_connection_open(event: Event):
    data: dict = json.loads(event.data)
    print(data['connectionId'])
    r = requests.post('http://localhost:8080/appchen/client/stream/subscribe', data=json.dumps({
        'connectionId': data['connectionId'],
        'topics': ['zen', 'trade_executions_state', 'trade_execution']
    }))
    print(r.text)


@event_source.route('zen')
def on_zen(event: Event):
    data: dict = json.loads(event.data)
    print(data)


@event_source.route('trade_execution')
def on_trade_execution(event: Event):
    data: dict = json.loads(event.data)
    print(data)

@event_source.route('trade_executions_state')
def on_trade_executions_state(event: Event):
    data: dict = json.loads(event.data)
    print(data)
