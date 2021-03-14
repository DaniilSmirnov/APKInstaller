import sys
from PyQt5 import QtCore, QtGui, QtWidgets
from ppadb.client import Client as AdbClient
from threading import Timer

from database import get_settings, set_settings
from utils import *
from fileedit import *


class Ui_MainWindow(QtWidgets.QWidget):
    installButtons = {}
    deleteButtons = {}
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

        self.openSettingsButton.setVisible(False)

        applySettingsButton = QtWidgets.QPushButton("Применить")
        self.mainLayout.addWidget(applySettingsButton, 0, 4, 1, 1)

        settings = get_settings()

        settingsBox = QtWidgets.QGroupBox()
        boxLayout = QtWidgets.QVBoxLayout(settingsBox)
        settingsBox.setLayout(boxLayout)

        packageLabel = QtWidgets.QLabel("Имя пакета приложения")
        packageEdit = QtWidgets.QLineEdit()
        packageEdit.setText(settings.get('package'))
        boxLayout.addWidget(packageLabel)
        boxLayout.addWidget(packageEdit)

        applySettingsButton.clicked.connect(lambda state: saveSettings(packageEdit))

        self.scrollLayout.addWidget(settingsBox)

        def saveSettings(url):
            text = url.text()
            if not text.isspace():
                set_settings(url.text())

            applySettingsButton.deleteLater()
            applySettingsButton.setVisible(False)

            self.openSettingsButton.setVisible(True)
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
        self.installButtons.clear()

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
                    deviceVersionCode = QtWidgets.QLabel(getVersionCode(device, self.getPackage()))
                except Exception:
                    continue

                installButton = QtWidgets.QPushButton("Установить")
                deleteButton = QtWidgets.QPushButton("Удалить")
                installButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
                deleteButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)

                installButton.clicked.connect(lambda state, target=device: self.install(target))
                deleteButton.clicked.connect(lambda state, target=device: self.uninstall(target))
                self.installButtons.update({device: installButton})
                self.deleteButtons.update({device: deleteButton})
                self.builds.update({device: deviceVersionCode})

                deviceName.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
                deviceVersion.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
                deviceVersionCode.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)

                deviceBox = QtWidgets.QGroupBox()
                boxLayout = QtWidgets.QGridLayout(deviceBox)
                deviceBox.setLayout(boxLayout)

                boxLayout.addWidget(deviceName, 0, 0, 1, 2)  # row, col. 2 нужна из-за двух кнопок в нижнем ряду
                boxLayout.addWidget(deviceVersion, 1, 0, 1, 2)
                boxLayout.addWidget(deviceVersionCode, 2, 0, 1, 2)
                boxLayout.addWidget(installButton, 3, 0, 1, 1)
                boxLayout.addWidget(deleteButton, 3, 1, 1, 1)

                if deviceVersionCode.text().find('Не установлено') != -1:
                    deleteButton.setEnabled(False)

                self.scrollLayout.addWidget(deviceBox)

    def getPath(self):
        return self.fileDrop.placeholderText()

    def install(self, device):
        def deploy(device):
            try:
                device.install(path=self.getPath(), reinstall=True)
            except Exception:
                self.installButtons.get(device).setText('Ошибка')
                return
            self.installButtons.get(device).setText('Установить')
            self.deleteButtons.get(device).setEnabled(True)
            self.builds.get(device).setText(getVersionCode(device, self.getPackage()))

        self.installButtons.get(device).setText('Установка')

        Timer(0, deploy, args=[device]).start()

    def uninstall(self, device):
        device.uninstall(self.getPackage())
        self.deleteButtons.get(device).setEnabled(False)
        self.builds.get(device).setText(getVersionCode(device, self.getPackage()))

    def getPackage(self):
        return get_settings().get('package')


if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    MainWindow = QtWidgets.QMainWindow()
    ui = Ui_MainWindow()
    ui.setupUi()
    MainWindow.show()
    sys.exit(app.exec_())
