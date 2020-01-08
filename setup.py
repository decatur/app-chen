from distutils.core import setup

# Stub needed to make pip install from git possible.

setup(
    name='app-chen',
    version='0.1dev',
    packages=['appchen'],
    # package_data={'appchen': ['client/**/*', 'client/**/**/*']},
    # include_package_data=True,
    data_files = [('appchen', 'appchen/client/app.js')],
    license='MIT'
)