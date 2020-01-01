# Copyright 2020 Wolfgang Kühn

import pymongo
import pathlib
import datetime
import logging

logging.getLogger().setLevel(logging.DEBUG)
db = pymongo.MongoClient('localhost:27017', tz_aware=True, serverSelectionTimeoutMS=1000).get_database('app-shell')


def current_module(name: str):
    """Returns the latest module of the specified name."""
    return db.get_collection('modules').find_one({"name": name}, sort=[('createAt', pymongo.DESCENDING)])


def initialize():
    """Initializes the database."""
    logging.warning(f'Dropping modules collection from database')
    collection: pymongo.collection.Collection = db.get_collection('modules')
    collection.drop()
    src_dir = pathlib.Path('../client').resolve();
    logging.info(f'Importing modules from {src_dir}')
    modules = src_dir.glob('*.js')
    for path in modules:
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
