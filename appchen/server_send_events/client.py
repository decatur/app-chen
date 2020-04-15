"""A very small EventSource implementation based on the sseclient package."""
import time
import codecs
import logging
import re
import threading
from typing import Callable
import http.client

from sseclient import SSEClient, Event, end_of_field
from appchen import eventing
import requests


# TODO: Fork, Create issue, and make pull request for, https://github.com/mpetazzoni/sseclient,
#       see workflow at https://github.com/processing/processing/wiki/Contributing-to-Processing-with-Pull-Requests
# TODO: Alternative https://github.com/boppreh/server-sent-events
class SSEClient1(SSEClient):
    """Patches very slow detection of event field delimiters."""
    def __init__(self, url):
        super().__init__(url, chunk_size=10*1024)

    def _event_complete(self):
        assert False

    def __next__(self):
        decoder = codecs.getincrementaldecoder(
            self.resp.encoding)(errors='replace')
        pos = 0
        while end_of_field.search(self.buf, pos) is None:
            try:
                next_chunk = next(self.resp_iterator)
                if not next_chunk:
                    raise EOFError()
                pos = max(0, len(self.buf) - 4)
                self.buf += decoder.decode(next_chunk)

            except (StopIteration, requests.RequestException, EOFError, http.client.IncompleteRead) as e:
                time.sleep(self.retry / 1000.0)
                self._connect()

                # The SSE spec only supports resuming from a whole message, so
                # if we have half a message we should throw it out.
                head, sep, tail = self.buf.rpartition('\n')
                self.buf = head + sep
                continue

        # Split the complete event (up to the end_of_field) into event_string,
        # and retain anything after the current complete event in self.buf
        # for next time.
        (event_string, self.buf) = re.split(end_of_field, self.buf, maxsplit=1)
        msg = Event.parse(event_string)

        # If the server requests a specific retry delay, we need to honor it.
        if msg.retry:
            self.retry = msg.retry

        # last_id should only be set if included in the message.  It's not
        # forgotten if a message omits it.
        if msg.id:
            self.last_id = msg.id

        return msg


class _ImmediateEventLoop(eventing.EventLoop):
    def call_soon(self, callback: Callable[..., None], *args):
        callback(*args)


class MessageEvent:
    data: str
    type: str


# A number representing the state of the connection. Possible values are
_CONNECTING = 0
_OPEN = 1
_CLOSED = 2


class EventSource(eventing.EventSource):
    """
    Partially implements https://developer.mozilla.org/en-US/docs/Web/API/EventSource
    """
    def __init__(self, url: str):
        super().__init__(_ImmediateEventLoop())
        self.url = url
        self.readyState = _CONNECTING

    def connect(self):
        """Non-Web/API/EventSource method to defer connection AFTER event listeners have been added."""
        def sse_connect():
            while True:
                try:
                    messages = SSEClient1(self.url)
                except (requests.exceptions.ConnectionError, requests.exceptions.HTTPError) as e:
                    self._process_event(Event(data=str(e), event='error'))
                    return

                self.readyState = _OPEN
                try:
                    for event in messages:
                        if self.readyState == _CLOSED:  # TODO: We should close the underlying HTTP request.
                            logging.info('EventSource closing...')
                            return

                        self._process_event(event)
                except (ConnectionResetError, requests.exceptions.ConnectionError) as e:
                    # TODO: We do not need to handle ConnectionError, SSEClient does it for us.
                    logging.exception(str(e))
                    pass

                logging.debug('EventSource reconnect...')
                self.readyState = _CONNECTING
                time.sleep(1)

        threading.Thread(target=sse_connect).start()

    def _process_event(self, event: Event):
        if event.event == 'connection_open':
            event.event = 'open'
        elif not event.event:
            event.event = 'message'
        event.type = event.event  # https://developer.mozilla.org/en-US/docs/Web/API/Event/type
        logging.debug('EventSource._process_event: ' + event.type)
        self.dispatch_event(event)

    def close(self):
        self.readyState = _CLOSED

    def onopen(self, event: Event):
        raise NotImplementedError('Use add_event_listener("open", ...)')

    def onmessage(self, event: Event):
        raise NotImplementedError('Use add_event_listener("message", ...)')

    def onerror(self, event: Event):
        raise NotImplementedError('Use add_event_listener("error", ...)')
