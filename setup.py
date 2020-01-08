from distutils.core import setup

# Stub needed to make pip install from git possible.

setup(
    name='app-chen',
    version='0.1dev',
    packages=['appchen'],
    package_data={'appchen': ['client.zip']},
    # include_package_data=True,
    # data_files = [('appchen', 'appchen/client/app.js')],
    license='MIT',
    cmdclass={
        'install': PostInstallCommand
    },
)

import pathlib
p = pathlib(__file__).absolute()

print(">>>>>>>>>" + p)


def PostInstallCommand():
    return
    with ZipFile(p / 'client.zip', 'r') as zipObj:
        # Extract all the contents of zip file in current directory
        zipObj.extractall(path=p)