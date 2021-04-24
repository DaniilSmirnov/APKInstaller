from PyQt5 import QtWidgets, QtCore, QtGui
from PyQt5.QtWidgets import QInputDialog

from utils import getDeviceName, getAndroidVersion, getVersionCode, setDPI, resetDPI, getDPI, setScreenSize, \
    resetScreenSize, getPermissions, setPermission, revokePermission


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
        self.ui = ui
        self.checkboxes = []
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

        self.additionsButton = QtWidgets.QPushButton()
        self.additionsButton.setIcon(QtGui.QIcon('icons/settings.png'))
        self.additionsButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)

        self.installButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
        self.deleteButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)

        self.installButton.clicked.connect(lambda state, target=device,
                                                  button=self.installButton,
                                                  delete_button=self.deleteButton,
                                                  code=self.deviceVersionCode:
                                           ui.install(target, button, delete_button, code))
        self.deleteButton.clicked.connect(lambda state, target=device,
                                                 button=self.deleteButton,
                                                 code=self.deviceVersionCode:
                                          ui.uninstall(target, button, code))

        self.additionsButton.clicked.connect(self.openAdditional)

        if self.deviceVersionCode.text().find('Не установлено') != -1:
            self.deleteButton.setEnabled(False)

        self.boxLayout.addWidget(self.deviceName, 0, 0, 1, 2)  # row, col. 2 нужна из-за двух кнопок в нижнем ряду
        self.boxLayout.addWidget(self.deviceVersion, 1, 0, 1, 2)
        self.boxLayout.addWidget(self.deviceVersionCode, 2, 0, 1, 2)
        self.boxLayout.addWidget(self.installButton, 3, 0, 1, 1)
        self.boxLayout.addWidget(self.deleteButton, 3, 1, 1, 1)
        self.boxLayout.addWidget(self.additionsButton, 3, 2, 1, 1)

    def openAdditional(self):
        self.cleanLayout()

        getPermissions(self.device, self.ui.getCurrentPackage())

        self.additionsTitle = QtWidgets.QLabel("Настройки устройства")
        self.additionsTitle.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
        self.boxLayout.addWidget(self.additionsTitle, 0, 0, 1, 1)

        self.screenDPIButton = QtWidgets.QPushButton("DPI")
        self.screenDPIButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
        self.screenDPIButton.clicked.connect(self.openDPI)
        self.boxLayout.addWidget(self.screenDPIButton, 1, 0, 1, 1)

        self.screenSizeButton = QtWidgets.QPushButton("Разрешение экрана")
        self.screenSizeButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
        self.screenSizeButton.clicked.connect(self.screenSize)
        self.boxLayout.addWidget(self.screenSizeButton, 2, 0, 1, 1)

        self.permissionsButton = QtWidgets.QPushButton("Разрешения")
        self.permissionsButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
        self.permissionsButton.clicked.connect(self.drawPermissions)
        self.boxLayout.addWidget(self.permissionsButton, 3, 0, 1, 1)

        self.closeButton = QtWidgets.QPushButton("Закрыть")
        self.closeButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
        self.closeButton.clicked.connect(self.restoreLayout)
        self.boxLayout.addWidget(self.closeButton, 4, 0, 1, 1)

    def openDPI(self):
        text, ok = QInputDialog.getInt(self, 'Установка DPI',
                                       'Введите новый DPI:',
                                       getDPI(self.device), 100, 900, 10)
        if ok:
            setDPI(self.device, text)
        else:
            resetDPI(self.device)

    def screenSize(self):
        text, ok = QInputDialog.getText(self, 'Установка разрешения экрана',
                                        'Введите новое разрешение экрана:')
        if ok:
            setScreenSize(self.device, text)
        else:
            resetScreenSize(self.device)

    def drawPermissions(self):
        self.cleanLayout()
        self.checkboxes = []

        i = 0
        j = 0

        permissions = getPermissions(self.device, self.ui.getCurrentPackage())

        for permission in permissions:
            permissionsCheck = QtWidgets.QCheckBox(permission.get('permission'))
            if permission.get('state'):
                permissionsCheck.toggle()
            permissionsCheck.setEnabled(False)
            permissionsCheck.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)

            permissionsCheck.clicked.connect(lambda state, target=permissionsCheck:
                                             togglePermission(target))

            if i % 4 == 0:
                j += 1
                i = 0
            self.boxLayout.addWidget(permissionsCheck, i, j, 1, 1)
            self.checkboxes.append(permissionsCheck)
            i += 1

        self.closeButton = QtWidgets.QPushButton("Закрыть")
        self.closeButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
        self.closeButton.clicked.connect(self.restoreLayout)
        self.boxLayout.addWidget(self.closeButton, i, j, 1, 1)
        self.checkboxes.append(self.closeButton)

        def togglePermission(checkbox):
            if checkbox.isChecked():
                revokePermission(self.device, self.ui.getCurrentPackage(), checkbox.text())
            else:
                setPermission(self.device, self.ui.getCurrentPackage(), checkbox.text())

    def cleanLayout(self):
        for i in range(self.boxLayout.count()):
            self.boxLayout.itemAt(i).widget().setVisible(False)

        try:
            self.closeButton.deleteLater()
        except Exception:
            pass

        for box in self.checkboxes:
            box.setVisible(False)
            box.deleteLater()
        self.checkboxes = []

    def restoreLayout(self):
        try:
            self.additionsTitle.deleteLater()
            self.screenDPIButton.deleteLater()
            self.screenSizeButton.deleteLater()
            self.permissionsButton.deleteLater()
            self.closeButton.deleteLater()
        except Exception:
            pass

        for box in self.checkboxes:
            box.setVisible(False)
            box.deleteLater()
        self.checkboxes = []

        for i in range(self.boxLayout.count()):
            self.boxLayout.itemAt(i).widget().setVisible(True)


class PlaceholderBox(Box):
    def __init__(self, parent):
        super(PlaceholderBox, self).__init__(parent)
