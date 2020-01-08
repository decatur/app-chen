from distutils.core import setup

# Stub needed to make pip install from git possible.

setup(
    name='app-chen',
    version='0.1dev',
    packages=['appchen'],
    package_data={'appchen': ['client/**']},
    include_package_data=True,
    license='MIT'
)