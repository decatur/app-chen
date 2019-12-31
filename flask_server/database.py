import logging
from typing import List

import pymongo
import glob
import pathlib
import datetime
import logging

logging.getLogger().setLevel(logging.DEBUG)
db = pymongo.MongoClient('localhost:27017', tz_aware=True, serverSelectionTimeoutMS=1000).get_database('app-shell')


def initialize():
    collection: pymongo.collection.Collection = db.get_collection('modules')
    collection.drop()
    tabs = pathlib.Path('../client').glob('tab*.js')
    for path in tabs:
        logging.info(f'Importing module {path.resolve()}')
        module = dict(
            code=path.read_text(encoding='utf8'),
            name=path.stem,
            createAt=datetime.datetime.utcnow(),
            createBy='importer'
        )
        collection.insert_one(module)


if __name__ == '__main__':
    initialize()
