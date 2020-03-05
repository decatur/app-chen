from distutils.core import setup
from setuptools.command.develop import develop

# Stub needed to make pip install from git possible.

setup(
    name='app-chen',
    version='v0.0.6',
    packages=['appchen'],
    include_package_data=True,  # This also needs a MANIFEST.in, and yes, python packaging sucks.
    license='MIT',
)



