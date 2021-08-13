from PyQt6 import QtWidgets, QtCore
from PyQt6.QtWidgets import QInputDialog

from styles import getButton, getIconButton, settings_icon, getLabel, getCheckBox
from utils import getDeviceName, getAndroidVersion, getVersionCode, setDPI, resetDPI, getDPI, setScreenSize, \
    resetScreenSize, getPermissions, setPermission, revokePermission, getScreenSize


class Box(QtWidgets.QGroupBox):
    def __init__(self, parent):
        super(Box, self).__init__(parent)
        self.setSizePolicy(QtWidgets.QSizePolicy.Policy.Maximum, QtWidgets.QSizePolicy.Policy.Maximum)
        self.boxLayout = QtWidgets.QGridLayout()
        self.setLayout(self.boxLayout)


class InfoBox(Box):
    def __init__(self, parent, text):
        super(InfoBox, self).__init__(parent)
        self.boxLayout.addWidget(QtWidgets.QLabel(text))


class RichInfoBox(Box):
    def __init__(self, parent, title, text):
        super(RichInfoBox, self).__init__(parent)
        self.setTitle(title)
        self.textLabel = QtWidgets.QLabel(text)
        self.boxLayout.addWidget(self.textLabel)

    def setText(self, text):
        self.textLabel.setText(text)

    def text(self):
        return self.textLabel.text()


class DeviceBox(Box):
    def __init__(self, parent, device, ui):
        super(DeviceBox, self).__init__(parent)
        self.device = device
        self.ui = ui
        self.checkboxes = []
        self.deviceName = QtWidgets.QLabel(getDeviceName(self.device))
        self.deviceVersion = QtWidgets.QLabel(getAndroidVersion(self.device))
        self.deviceVersionCode = QtWidgets.QLabel(getVersionCode(self.device, ui.getCurrentPackage()))

        self.deviceVersion.setTextInteractionFlags(QtCore.Qt.TextInteractionFlag.TextSelectableByMouse)
        self.deviceName.setTextInteractionFlags(QtCore.Qt.TextInteractionFlag.TextSelectableByMouse)
        self.deviceVersionCode.setTextInteractionFlags(QtCore.Qt.TextInteractionFlag.TextSelectableByMouse)

        self.installButton = getButton("Установить")
        self.deleteButton = getButton("Удалить")
        self.additionsButton = getIconButton(settings_icon, 'Настройки')

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

        self.additionsTitle = getLabel(getDeviceName(self.device))
        self.boxLayout.addWidget(self.additionsTitle, 0, 0, 1, 1)

        self.screenSizeButton = getButton("Разрешение экрана")
        self.screenSizeButton.clicked.connect(self.screenSize)
        self.boxLayout.addWidget(self.screenSizeButton, 2, 0, 1, 1)

        self.screenDPIButton = getButton("DPI")
        self.screenDPIButton.clicked.connect(self.openDPI)
        self.boxLayout.addWidget(self.screenDPIButton, 2, 1, 1, 1)

        self.permissionsButton = getButton("Разрешения")
        self.permissionsButton.clicked.connect(self.drawPermissions)
        self.boxLayout.addWidget(self.permissionsButton, 3, 0, 1, 1)

        self.closeButton = getButton("Закрыть")
        self.closeButton.clicked.connect(self.restoreLayout)
        self.boxLayout.addWidget(self.closeButton, 3, 1, 1, 1)

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
                                        "Текущее разрешение - " + getScreenSize(
                                            self.device) + "\nВведите новое разрешение экрана в формате 'Число'x'Число'")
        if ok:
            setScreenSize(self.device, text)
        else:
            resetScreenSize(self.device)

    def drawPermissions(self):
        self.cleanLayout()
        self.checkboxes = []

        permissions = getPermissions(self.device, self.ui.getCurrentPackage())

        j = 0
        i = 0
        self.closeButton = getButton("Закрыть")
        self.closeButton.clicked.connect(self.restoreLayout)
        self.boxLayout.addWidget(self.closeButton, i, j, 1, 1)
        self.checkboxes.append(self.closeButton)
        i += 1

        self.grantAllButton = getButton("Выдать все")
        self.grantAllButton.clicked.connect(lambda state, target=permissions:
                                            grantAll(target))
        self.boxLayout.addWidget(self.grantAllButton, i, j, 1, 1)
        self.checkboxes.append(self.grantAllButton)
        i += 1

        self.revokeAllButton = getButton("Забрать все")
        self.revokeAllButton.clicked.connect(lambda state, target=permissions:
                                             revokeAll(target))
        self.boxLayout.addWidget(self.revokeAllButton, i, j, 1, 1)
        self.checkboxes.append(self.revokeAllButton)
        i += 1

        j += 1

        for permission in permissions:
            permissionsCheck = getCheckBox(permission.get('permission'))
            if permission.get('state'):
                permissionsCheck.toggle()

            permissionsCheck.clicked.connect(lambda state, target=permissionsCheck:
                                             togglePermission(target))

            if i % 3 == 0:
                j += 1
                i = 0
            self.boxLayout.addWidget(permissionsCheck, i, j, 1, 1)
            self.checkboxes.append(permissionsCheck)
            i += 1

        def togglePermission(checkbox):
            if not checkbox.isChecked():
                revokePermission(self.device, self.ui.getCurrentPackage(), checkbox.text())
            else:
                setPermission(self.device, self.ui.getCurrentPackage(), checkbox.text())

        def grantAll(permissions):
            for permission in permissions:
                setPermission(self.device, self.ui.getCurrentPackage(), permission.get('permission'))
                self.cleanLayout()
                self.drawPermissions()

        def revokeAll(permissions):
            for permission in permissions:
                revokePermission(self.device, self.ui.getCurrentPackage(), permission.get('permission'))
                self.cleanLayout()
                self.drawPermissions()

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
