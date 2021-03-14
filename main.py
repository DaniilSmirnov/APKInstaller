import sys
import re
from PyQt5 import QtCore, QtGui, QtWidgets
from ppadb.client import Client as AdbClient
from threading import Timer

package = 'com.vkontakte.android'


class FileEdit(QtWidgets.QLineEdit):
    def __init__(self, parent):
        super(FileEdit, self).__init__(parent)

        self.setDragEnabled(True)
        self.setPlaceholderText('Помести сюда файл через drag n drop')

    def dragEnterEvent(self, event):
        data = event.mimeData()
        urls = data.urls()
        if urls and urls[0].scheme() == 'file':
            event.acceptProposedAction()

    def dragMoveEvent(self, event):
        data = event.mimeData()
        urls = data.urls()
        if urls and urls[0].scheme() == 'file':
            event.acceptProposedAction()

    def dropEvent(self, event):
        data = event.mimeData()
        url = data.urls()[0]
        path = url.toLocalFile()
        self.setPlaceholderText(str(path))


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


class Ui_MainWindow(QtWidgets.QWidget):
    buttons = {}
    builds = {}

    def setupUi(self):
        MainWindow.setObjectName("MainWindow")
        MainWindow.resize(500, 180)
        self.centralwidget = QtWidgets.QWidget(MainWindow)
        self.centralwidget.setObjectName("centralwidget")
        self.mainLayout = QtWidgets.QGridLayout(self.centralwidget)
        MainWindow.setCentralWidget(self.centralwidget)

        self.fileDrop = FileEdit(self.centralwidget)
        self.mainLayout.addWidget(self.fileDrop, 0, 0, 1, 1)

        self.forceDevices = QtWidgets.QPushButton("Обновить")
        self.mainLayout.addWidget(self.forceDevices, 0, 1, 1, 1)

        self.allInstallButton = QtWidgets.QPushButton("Установить на все")
        # self.mainLayout.addWidget(self.allInstallButton, 0, 2, 1, 1)

        self.downloadBuild = QtWidgets.QPushButton("Скачать")
        # self.mainLayout.addWidget(self.downloadBuild, 0, 3, 1, 1)

        self.openSettingsButton = QtWidgets.QPushButton("Настройки")
        self.mainLayout.addWidget(self.openSettingsButton, 0, 4, 1, 1)

        self.scrollArea = QtWidgets.QScrollArea(self.centralwidget)
        self.mainLayout.addWidget(self.scrollArea, 1, 0, 1, 5)
        self.scrollArea.setWidgetResizable(True)
        self.scrollArea.setSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Maximum)
        self.scrollWidget = QtWidgets.QWidget()
        self.scrollLayout = QtWidgets.QHBoxLayout(self.scrollWidget)
        self.scrollWidget.setLayout(self.scrollLayout)
        self.scrollArea.setWidget(self.scrollWidget)

        self.retranslateUi(MainWindow)
        QtCore.QMetaObject.connectSlotsByName(MainWindow)

    def retranslateUi(self, MainWindow):
        _translate = QtCore.QCoreApplication.translate
        MainWindow.setWindowTitle(_translate("MainWindow", "APK Installer"))

        self.startAdb()
        self.forceDevices.clicked.connect(self.drawDevices)
        self.allInstallButton.clicked.connect(self.allInstall)
        self.openSettingsButton.clicked.connect(self.openSettings)
        self.drawDevices()

    def openSettings(self):
        for i in range(self.scrollLayout.count()):
            self.scrollLayout.itemAt(i).widget().deleteLater()

        self.openSettingsButton.setText("Применить")

        settings = QtCore.QSettings()
        downloadPath = settings.value('downloadPath', "")

        settingsBox = QtWidgets.QGroupBox()
        boxLayout = QtWidgets.QVBoxLayout(settingsBox)
        settingsBox.setLayout(boxLayout)

        pathLabel = QtWidgets.QLabel("URL для загрузки сборки")
        urlEdit = QtWidgets.QLineEdit()
        urlEdit.setText(downloadPath)

        boxLayout.addWidget(pathLabel)
        boxLayout.addWidget(urlEdit)

        self.openSettingsButton.clicked.connect(lambda state, data=urlEdit.text(): self.saveSettings(data))
        self.scrollLayout.addWidget(settingsBox)

    def saveSettings(self, data):
        settings = QtCore.QSettings()
        settings.setValue('downloadPath', data)
        settings.sync()

        self.openSettingsButton.setText("Настройки")
        self.openSettingsButton.clicked.connect(self.openSettings)
        self.drawDevices()

    def allInstall(self):
        for device in self.client.devices():
            self.install(device)

    def startAdb(self):
        try:
            self.client = AdbClient(host="127.0.0.1", port=5037)
        except Exception:
            self.scrollLayout.addWidget(QtWidgets.QLabel('ADB не может быть запущен'))

    def drawDevices(self):
        self.buttons.clear()

        for i in range(self.scrollLayout.count()):
            self.scrollLayout.itemAt(i).widget().deleteLater()

        connected_devices = self.client.devices()
        if len(self.client.devices()) == 0:
            self.scrollLayout.addWidget(QtWidgets.QLabel('Устройства не обнаружены'))
        else:
            for device in connected_devices:
                try:
                    deviceName = QtWidgets.QLabel(getDeviceName(device))
                    deviceVersion = QtWidgets.QLabel(getAndroidVersion(device))
                    deviceVersionCode = QtWidgets.QLabel(getVersionCode(device, package))
                except Exception:
                    continue

                installButton = QtWidgets.QPushButton("Установить")
                installButton.clicked.connect(lambda state, target=device: self.install(target))
                self.buttons.update({device: installButton})
                self.builds.update({device: deviceVersionCode})

                deviceName.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
                deviceVersion.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
                deviceVersionCode.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
                installButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)

                deviceBox = QtWidgets.QGroupBox()
                boxLayout = QtWidgets.QVBoxLayout(deviceBox)
                deviceBox.setLayout(boxLayout)

                boxLayout.addWidget(deviceName)
                boxLayout.addWidget(deviceVersion)
                boxLayout.addWidget(deviceVersionCode)
                boxLayout.addWidget(installButton)

                self.scrollLayout.addWidget(deviceBox)

    def getPath(self):
        return self.fileDrop.placeholderText()

    def install(self, device):
        def deploy(device):
            try:
                device.install(path=self.getPath(), reinstall=True)
            except Exception:
                self.buttons.get(device).setText('Ошибка')
                return
            self.buttons.get(device).setText('Установить')
            self.builds.get(device).setText(getVersionCode(device, package))

        self.buttons.get(device).setText('Установка')

        Timer(0, deploy, args=[device]).start()


if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    MainWindow = QtWidgets.QMainWindow()
    ui = Ui_MainWindow()
    ui.setupUi()
    MainWindow.show()
    sys.exit(app.exec_())
