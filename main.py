import re

from PyQt5 import QtCore, QtGui, QtWidgets
from ppadb.client import Client as AdbClient
import sys

from fileedit import FileEdit
from threading import Timer

from utils import getVersionCode, getDeviceName, getAndroidVersion

package = 'com.vkontakte.android'
buttons = {}


class Ui_MainWindow(QtWidgets.QWidget):
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

        self.scrollArea = QtWidgets.QScrollArea(self.centralwidget)
        self.mainLayout.addWidget(self.scrollArea, 1, 0, 1, 2)
        self.scrollArea.setWidgetResizable(True)
        self.scrollArea.setSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Maximum)
        self.scrollWidget = QtWidgets.QWidget()
        self.scrollLayout = QtWidgets.QGridLayout(self.scrollWidget)
        self.scrollWidget.setLayout(self.scrollLayout)
        self.scrollArea.setWidget(self.scrollWidget)

        self.retranslateUi(MainWindow)
        QtCore.QMetaObject.connectSlotsByName(MainWindow)

    def retranslateUi(self, MainWindow):
        _translate = QtCore.QCoreApplication.translate
        MainWindow.setWindowTitle(_translate("MainWindow", "APK Installer"))

        self.startAdb()
        self.forceDevices.clicked.connect(self.drawDevices)
        self.drawDevices()

    def startAdb(self):
        try:
            self.client = AdbClient(host="127.0.0.1", port=5037)
        except Exception:
            self.scrollLayout.addWidget(QtWidgets.QLabel('ADB не может быть запущен'), 0, 0, 1, 1)

    def drawDevices(self):
        buttons.clear()

        for i in range(self.scrollLayout.count()):
            self.scrollLayout.itemAt(i).widget().deleteLater()

        i = 0

        connected_devices = self.client.devices()
        if len(self.client.devices()) == 0:
            self.scrollLayout.addWidget(QtWidgets.QLabel('Устройства не обнаружены'), 0, i, 1, 1)
        else:
            for device in connected_devices:
                try:
                    deviceName = QtWidgets.QLabel(getDeviceName(device))
                    deviceVersionCode = QtWidgets.QLabel(getVersionCode(device, package))
                    deviceVersion = QtWidgets.QLabel(getAndroidVersion(device))
                except Exception:
                    continue

                installButton = QtWidgets.QPushButton("Установить")
                installButton.clicked.connect(lambda state, target=device: self.install(target))
                buttons.update({device: installButton})

                deviceName.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
                deviceVersion.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
                deviceVersionCode.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
                installButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)

                self.scrollLayout.addWidget(deviceName, 0, i, 1, 1)
                self.scrollLayout.addWidget(deviceVersion, 1, i, 1, 1)
                self.scrollLayout.addWidget(deviceVersionCode, 2, i, 1, 1)
                self.scrollLayout.addWidget(installButton, 3, i, 1, 1)
                i += 1

    def getPath(self):
        return self.fileDrop.placeholderText()

    def install(self, device):
        def deploy(device):
            try:
                device.install(path=self.getPath(), reinstall=True)
            except Exception:
                buttons.get(device).setText('Ошибка')
                return
            buttons.get(device).setText('Установить')

        buttons.get(device).setText('Установка')

        Timer(0, deploy, args=[device]).start()


if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    MainWindow = QtWidgets.QMainWindow()
    ui = Ui_MainWindow()
    ui.setupUi()
    MainWindow.show()
    sys.exit(app.exec_())
