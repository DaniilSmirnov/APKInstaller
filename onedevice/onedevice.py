import sentry_sdk
from PyQt6 import QtWidgets

from multidevice.groupbox import RichInfoBox, Box
from multidevice.styles import getButton, getIconButton, settings_icon, getCheckBox, getLabel
from multidevice.utils import getDeviceName, getAndroidVersion, getVersionCode, getDPI, getScreenSize, revokePermission, \
    setPermission, getPermissions

sentry_sdk.init(
    "https://0cbf9befcec248f3adca4c61df10dccf@o694682.ingest.sentry.io/5775215",
    traces_sample_rate=1.0
)


class OneDeviceWidget(QtWidgets.QGroupBox):
    def __init__(self, parent, device, ui):
        super(OneDeviceWidget, self).__init__(parent)
        self.boxLayout = QtWidgets.QGridLayout()
        self.setSizePolicy(QtWidgets.QSizePolicy.Policy.Maximum, QtWidgets.QSizePolicy.Policy.Maximum)
        self.setLayout(self.boxLayout)
        self.boxLayout.setVerticalSpacing(5)

        self.device = device
        self.ui = ui

        self.deviceName = RichInfoBox(self, 'Название устройства', getDeviceName(self.device))
        self.deviceVersion = RichInfoBox(self, 'ОС', getAndroidVersion(self.device))
        self.deviceVersionCode = RichInfoBox(self, 'Номер сборки',
                                             getVersionCode(self.device, self.ui.getCurrentPackage()))

        dpiBox = Box(self)
        dpiBox.setTitle('DPI устройства')
        dpiLabel = getLabel('Текущий ' + str(getDPI(self.device)))

        dpiEdit = QtWidgets.QLineEdit()
        dpiApplyButton = getButton('Применить')
        dpiResetButton = getButton('Сбросить')

        dpiBox.boxLayout.addWidget(dpiLabel)
        dpiBox.boxLayout.addWidget(dpiEdit)
        dpiBox.boxLayout.addWidget(dpiApplyButton)
        dpiBox.boxLayout.addWidget(dpiResetButton)

        deviceScreenBox = Box(self)
        deviceScreenBox.setTitle('Размер экрана')
        deviceScreenLabel = getLabel('Текущий ' + str(getScreenSize(self.device)))

        deviceScreenEdit = QtWidgets.QLineEdit()
        deviceScreenApplyButton = getButton('Применить')
        deviceScreenResetButton = getButton('Сбросить')

        deviceScreenBox.boxLayout.addWidget(deviceScreenLabel)
        deviceScreenBox.boxLayout.addWidget(deviceScreenEdit)
        deviceScreenBox.boxLayout.addWidget(deviceScreenApplyButton)
        deviceScreenBox.boxLayout.addWidget(deviceScreenResetButton)

        self.installButton = getButton("Установить")
        self.deleteButton = getButton("Удалить")

        self.installButton.clicked.connect(lambda state, target=device,
                                                  button=self.installButton,
                                                  delete_button=self.deleteButton,
                                                  code=self.deviceVersionCode:
                                           ui.install(target, button, delete_button, code))
        self.deleteButton.clicked.connect(lambda state, target=device,
                                                 button=self.deleteButton,
                                                 code=self.deviceVersionCode:
                                          ui.uninstall(target, button, code))

        if self.deviceVersionCode.text().find('Не установлено') != -1:
            self.deleteButton.setEnabled(False)

        self.boxLayout.addWidget(self.deviceName, 0, 0, 1, 1)
        self.boxLayout.addWidget(self.deviceVersion, 0, 1, 1, 1)
        self.boxLayout.addWidget(self.deviceVersionCode, 0, 2, 1, 1)
        self.boxLayout.addWidget(PermissionsBox(self, device, self.ui), 0, 3, 5, 5)

        self.boxLayout.addWidget(dpiBox, 1, 0, 1, 1)

        self.boxLayout.addWidget(deviceScreenBox, 1, 1, 1, 1)

        self.boxLayout.addWidget(self.installButton, 2, 0, 1, 1)
        self.boxLayout.addWidget(self.deleteButton, 2, 1, 1, 1)


class PermissionsBox(QtWidgets.QGroupBox):
    def __init__(self, parent, device, ui):
        super(PermissionsBox, self).__init__(parent)
        self.setTitle('Разрешения')
        self.boxLayout = QtWidgets.QGridLayout()
        self.setLayout(self.boxLayout)
        self.device = device
        self.ui = ui
        self.checkboxes = []

        permissions = getPermissions(self.device, self.ui.getCurrentPackage())

        j = 0
        i = 0

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
        j = 0

        for permission in permissions:
            permissionsCheck = getCheckBox(permission.get('permission'))
            if permission.get('state'):
                permissionsCheck.toggle()

            permissionsCheck.clicked.connect(lambda state, target=permissionsCheck:
                                             togglePermission(target))

            if j % 3 == 0:
                i += 1
                j = 0
            self.boxLayout.addWidget(permissionsCheck, i, j, 2, 2)
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
