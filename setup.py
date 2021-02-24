# -*- coding: utf-8 -*-
from setuptools import setup

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

packages = \
['appchen', 'appchen.server_send_events', 'appchen.web_demo', 'appchen.weblet']

package_data = \
{'': ['*'],
 'appchen': ['web_client/*',
             'web_client/codemirror/*',
             'web_client/codemirror/addon/edit/*',
             'web_client/codemirror/lib/*',
             'web_client/codemirror/mode/javascript/*']}

install_requires = \
['flask>=1.1,<2.0',
 'gridchen>=0.1.3,<0.2.0',
 'pymongo>=3.7,<4.0',
 'requests>=2.18.0,<3.0.0',
 'sseclient>=0.0.24,<0.0.25']


setup(
    name='appchen',
    version='0.3.6',
    description='A client/server web framework based on Python and modern JavaScript.',
    long_description=long_description,
    long_description_content_type="text/markdown",
    author='Wolfgang Kühn',
    author_email=None,
    maintainer=None,
    maintainer_email=None,
    url='https://github.com/decatur/appchen',
    packages=packages,
    package_data=package_data,
    install_requires=install_requires,
    python_requires='>=3.6,<4.0'
)
