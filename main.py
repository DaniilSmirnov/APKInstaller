import sys
from PyQt5 import QtCore, QtGui, QtWidgets
from PyQt5.QtCore import QTimer
from threading import Timer

from database import get_settings, set_settings, getPackages
from utils import getDeviceName, getVersionCode, getAndroidVersion, getDevices, adbClient
from fileedit import FileEdit


def generateBox():
    deviceBox = QtWidgets.QGroupBox()
    boxLayout = QtWidgets.QGridLayout(deviceBox)
    deviceBox.setLayout(boxLayout)

    return deviceBox, boxLayout


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
    def __init__(self, parent, device):
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

        if self.deviceVersionCode.text().find('Не установлено') != -1:
            self.deleteButton.setEnabled(False)

        self.boxLayout.addWidget(self.deviceName, 0, 0, 1, 2)  # row, col. 2 нужна из-за двух кнопок в нижнем ряду
        self.boxLayout.addWidget(self.deviceVersion, 1, 0, 1, 2)
        self.boxLayout.addWidget(self.deviceVersionCode, 2, 0, 1, 2)
        self.boxLayout.addWidget(self.installButton, 3, 0, 1, 1)
        self.boxLayout.addWidget(self.deleteButton, 3, 1, 1, 1)


class Ui_MainWindow(QtWidgets.QWidget):
    current_devices = []
    boxes = {}

    in_settings = False

    def setupUi(self):
        MainWindow.setObjectName("MainWindow")
        MainWindow.resize(500, 180)
        MainWindow.setWindowIcon(QtGui.QIcon('icons/APK_icon.png'))
        self.centralwidget = QtWidgets.QWidget(MainWindow)
        self.centralwidget.setObjectName("centralwidget")
        self.mainLayout = QtWidgets.QGridLayout(self.centralwidget)
        MainWindow.setCentralWidget(self.centralwidget)

        self.fileDrop = FileEdit(self.centralwidget)
        self.mainLayout.addWidget(self.fileDrop, 0, 0, 1, 1)

        self.packageSelector = QtWidgets.QComboBox()
        self.mainLayout.addWidget(self.packageSelector, 0, 1, 1, 1)
        self.fillPackageSelector()

        self.allInstallButton = QtWidgets.QPushButton("Установить на все")
        self.mainLayout.addWidget(self.allInstallButton, 0, 2, 1, 1)

        self.openSettingsButton = QtWidgets.QPushButton()
        self.openSettingsButton.setIcon(QtGui.QIcon('icons/settings.png'))
        self.openSettingsButton.setToolTip('Открыть настройки')
        self.mainLayout.addWidget(self.openSettingsButton, 0, 3, 1, 1)

        self.scrollArea = QtWidgets.QScrollArea(self.centralwidget)
        self.scrollArea.setFrameStyle(QtWidgets.QFrame.NoFrame)
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
        self.drawUi()

        self.allInstallButton.clicked.connect(self.allInstall)
        self.openSettingsButton.clicked.connect(self.openSettings)
        self.fileDrop.clicked.connect(self.openFileSelect)
        self.packageSelector.currentTextChanged.connect(self.drawUi)

    def getCurrentPackage(self):
        return self.packageSelector.currentText()

    def openFileSelect(self):
        text = QtWidgets.QFileDialog.getOpenFileName(self, "Выбор файла", 'C://Users')
        file = text[0]
        self.fileDrop.setPlaceholderText(file)

    def fillPackageSelector(self):
        self.packageSelector.clear()
        packages = getPackages()
        if len(packages) > 0:
            self.packageSelector.addItems(packages)
        else:
            self.packageSelector.addItem('Выбери приложение')

    def openSettings(self):
        self.in_settings = True

        for i in range(self.scrollLayout.count()):
            self.scrollLayout.itemAt(i).widget().deleteLater()

        self.openSettingsButton.setVisible(False)

        applySettingsButton = QtWidgets.QPushButton("Применить")
        self.mainLayout.addWidget(applySettingsButton, 0, 4, 1, 1)

        settings = get_settings()

        settingsBox = Box(self.scrollWidget)

        packageLabel = QtWidgets.QLabel("Имя пакета приложения")
        packageInfoLabel = QtWidgets.QLabel("Можно ввести несколько через запятую")

        packageEdit = QtWidgets.QLineEdit(settings.get('package'))

        settingsBox.boxLayout.addWidget(packageLabel)
        settingsBox.boxLayout.addWidget(packageInfoLabel)
        settingsBox.boxLayout.addWidget(packageEdit)

        applySettingsButton.clicked.connect(lambda state: saveSettings(packageEdit))

        self.scrollLayout.addWidget(settingsBox)

        def saveSettings(url):
            text = url.text().strip()
            if not text.isspace():
                set_settings(text)

            self.in_settings = False

            applySettingsButton.deleteLater()
            applySettingsButton.setVisible(False)

            self.openSettingsButton.setVisible(True)
            self.fillPackageSelector()
            self.drawUi()

    def allInstall(self):
        connected_devices = getDevices()
        for device in connected_devices:
            try:
                device.install(path=self.getPath(), reinstall=True)
            except Exception:
                return
        self.cleanScrollLayout()
        self.drawUi()

    def cleanScrollLayout(self):
        for i in range(self.scrollLayout.count()):
            self.scrollLayout.itemAt(i).widget().deleteLater()

    def startAdb(self):
        try:
            adbClient()
        except Exception:
            self.scrollLayout.addWidget(InfoBox(self.scrollWidget, 'ADB не может быть запущен'))

    def drawUi(self):
        self.cleanScrollLayout()

        if self.packageSelector.currentText() == 'Выбери пакет':
            self.boxes.update({'no_packet': InfoBox(self.scrollWidget, "Нужно указать имя пакета")})

        connected_devices = getDevices()
        if len(connected_devices) == 0:
            self.boxes.update({'no_devices': InfoBox(self.scrollWidget, 'Устройства не обнаружены')})

        else:
            for device in connected_devices:
                try:
                    self.boxes.update({device.get_serial_no(): DeviceBox(self.scrollWidget, device)})
                    self.current_devices.append(device.get_serial_no())
                except Exception:
                    continue

        self.drawDevices()

    def drawDevices(self):
        for box in self.boxes:
            self.scrollLayout.addWidget(self.boxes[box])

    def getPath(self):
        return self.fileDrop.placeholderText()

    def install(self, device, button, delete_button, code):
        def deploy(device):
            try:
                device.install(path=self.getPath(), reinstall=True)
                button.setText('Установить')
                delete_button.setEnabled(True)
                code.setText(getVersionCode(device, self.getCurrentPackage()))
            except Exception:
                button.setText('Повторить')

        button.setText('Установка')

        Timer(0, deploy, args=[device]).start()

    def uninstall(self, device, button, code):
        try:
            device.uninstall(self.getCurrentPackage())
            button.setEnabled(False)
            code.setText(getVersionCode(device, self.getCurrentPackage()))
        except Exception:
            button.setText('Повторить')


def checkDevicesActuality():
    def getSerialsArray(devices):
        response = []
        for device in devices:
            try:
                response.append(device.get_serial_no())
            except RuntimeError:
                continue
        return response

    if not ui.in_settings:
        connected_devices = getDevices()
        current_devices = ui.current_devices

        for device in connected_devices:
            try:
                if device.get_serial_no() not in current_devices:
                    new_device = DeviceBox(ui.scrollWidget, device)
                    ui.scrollLayout.addWidget(new_device)
                    ui.boxes.update({device.get_serial_no(): new_device})
            except RuntimeError:
                continue

        connected_devices = getSerialsArray(getDevices())

        for device in current_devices:
            if device not in connected_devices:
                widget = ui.boxes.get(device)
                ui.boxes.pop(device)
                ui.scrollLayout.removeWidget(widget)
                widget.deleteLater()

        ui.current_devices = connected_devices
    else:
        return


if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    app.setWindowIcon(QtGui.QIcon('icons/APK_icon.png'))
    MainWindow = QtWidgets.QMainWindow()
    ui = Ui_MainWindow()
    ui.setupUi()
    MainWindow.show()

    updater = QTimer()
    updater.timeout.connect(checkDevicesActuality)
    updater.start(300)

    sys.exit(app.exec_())
