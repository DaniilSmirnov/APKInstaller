from PyQt5 import QtWidgets, QtCore
from PyQt5.QtWidgets import QInputDialog

from utils import getDeviceName, getAndroidVersion, getVersionCode, setDPI, resetDPI


class Box(QtWidgets.QGroupBox):
    def __init__(self, parent):
        super(Box, self).__init__(parent)
        self.boxLayout = QtWidgets.QGridLayout()
        self.setLayout(self.boxLayout)


class InfoBox(Box):
    def __init__(self, parent, text):
        super(InfoBox, self).__init__(parent)
        self.boxLayout.addWidget(QtWidgets.QLabel(text))


class DeviceBox(Box):
    def __init__(self, parent, device, ui):
        super(DeviceBox, self).__init__(parent)
        self.device = device
        self.setLayout(self.boxLayout)
        self.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
        self.deviceName = QtWidgets.QLabel(getDeviceName(self.device))
        self.deviceVersion = QtWidgets.QLabel(getAndroidVersion(self.device))
        self.deviceVersionCode = QtWidgets.QLabel(getVersionCode(self.device, ui.getCurrentPackage()))

        self.deviceVersion.setTextInteractionFlags(QtCore.Qt.TextSelectableByMouse)
        self.deviceName.setTextInteractionFlags(QtCore.Qt.TextSelectableByMouse)
        self.deviceVersionCode.setTextInteractionFlags(QtCore.Qt.TextSelectableByMouse)

        self.installButton = QtWidgets.QPushButton("Установить")
        self.deleteButton = QtWidgets.QPushButton("Удалить")
        self.screenButton = QtWidgets.QPushButton("DPI")

        self.installButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
        self.deleteButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
        self.screenButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)

        self.installButton.clicked.connect(lambda state, target=device,
                                                  button=self.installButton,
                                                  delete_button=self.deleteButton,
                                                  code=self.deviceVersionCode:
                                           ui.install(target, button, delete_button, code))
        self.deleteButton.clicked.connect(lambda state, target=device,
                                                 button=self.deleteButton,
                                                 code=self.deviceVersionCode:
                                          ui.uninstall(target, button, code))

        self.screenButton.clicked.connect(self.openDPI)

        if self.deviceVersionCode.text().find('Не установлено') != -1:
            self.deleteButton.setEnabled(False)

        self.boxLayout.addWidget(self.deviceName, 0, 0, 1, 2)  # row, col. 2 нужна из-за двух кнопок в нижнем ряду
        self.boxLayout.addWidget(self.deviceVersion, 1, 0, 1, 2)
        self.boxLayout.addWidget(self.deviceVersionCode, 2, 0, 1, 2)
        self.boxLayout.addWidget(self.installButton, 3, 0, 1, 1)
        self.boxLayout.addWidget(self.deleteButton, 3, 1, 1, 1)
        self.boxLayout.addWidget(self.screenButton, 3, 2, 1, 1)

    def openDPI(self):
        text, ok = QInputDialog.getInt(self, 'Установка DPI',
                                       'Введите новый DPI:')
        if ok:
            self.applyDpi(text)
        else:
            self.resetDpi()

    def applyDpi(self, text):
        setDPI(self.device, text)

    def resetDpi(self):
        resetDPI(self.device)


class PlaceholderBox(Box):
    def __init__(self, parent):
        super(PlaceholderBox, self).__init__(parent)
