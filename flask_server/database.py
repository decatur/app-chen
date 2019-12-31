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
    db.get_collection('tabs').drop()
    collection: pymongo.collection.Collection = db.get_collection('tabs')
    tabs: List[str] = glob.glob('../client/tab*.js')
    for tab_path in tabs:
        path = pathlib.Path(tab_path)
        logging.info(f'Importing module {path}')
        module = dict(
            code=path.read_text(encoding='utf8'),
            name=path.stem,
            createAt=datetime.datetime.utcnow(),
            createBy='importer'
        )
        collection.insert_one(module)


if __name__ == '__main__':
    initialize()
