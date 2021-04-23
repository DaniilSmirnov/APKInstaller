import re
import os
from ppadb.client import Client as AdbClient


def adbClient():
    try:
        client = AdbClient(host="127.0.0.1", port=5037)
    except Exception:
        os.system("adb devices")
        client = AdbClient(host="127.0.0.1", port=5037)

    return client


def getDevices():
    client = adbClient()
    return client.devices()


def getVersionCode(device, package):
    cmd = 'dumpsys package {} | grep versionCode'.format(package)
    result = device.shell(cmd).strip()

    pattern = "versionCode=([\d\.]+)"

    if result:
        match = re.search(pattern, result)
        version = match.group(1)
        return "Сборка " + version
    else:
        return "Не установлено"


def getDeviceName(device):
    return device.get_properties().get('ro.product.manufacturer') + " " + device.get_properties().get(
        'ro.product.model')


def getAndroidVersion(device):
    return "Android " + device.get_properties().get('ro.build.version.release')


def getSerialsArray(devices):
    response = []
    for device in devices:
        try:
            response.append(device.get_serial_no())
        except RuntimeError:
            continue
    return response


def getPermissions(device, package):
    cmd = 'dumpsys package ' + package + ' | grep permission'
    result = device.shell(cmd).strip()
    print(result)


def setDPI(device, density):
    cmd = 'wm density ' + str(density)
    device.shell(cmd)


def resetDPI(device):
    cmd = 'wm density reset'
    device.shell(cmd)


def getScreenSize(device):
    cmd = 'wm size'
    return device.shell(cmd).strip()


def setScreenSize(device, x, y):
    cmd = 'wm size ' + x + 'x' + y
    device.shell(cmd).strip()


def resetScreenSize(device):
    cmd = 'wm size reset'
    device.shell(cmd).strip()
