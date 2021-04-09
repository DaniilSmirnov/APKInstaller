import sys
import os
from PyQt5 import QtCore, QtGui, QtWidgets
from PyQt5.QtCore import QTimer
from ppadb.client import Client as AdbClient
from threading import Timer

from database import get_settings, set_settings, getPackages
from utils import getDeviceName, getVersionCode, getAndroidVersion
from fileedit import FileEdit


def generateBox():
    deviceBox = QtWidgets.QGroupBox()
    boxLayout = QtWidgets.QGridLayout(deviceBox)
    deviceBox.setLayout(boxLayout)

    return deviceBox, boxLayout


def getDeviceBox(device):
    deviceBox, boxLayout = generateBox()

    deviceName = QtWidgets.QLabel(getDeviceName(device))
    deviceVersion = QtWidgets.QLabel(getAndroidVersion(device))
    deviceVersionCode = QtWidgets.QLabel(getVersionCode(device, ui.getCurrentPackage()))

    installButton = QtWidgets.QPushButton("Установить")
    deleteButton = QtWidgets.QPushButton("Удалить")
    installButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
    deleteButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)

    installButton.clicked.connect(lambda state, target=device: ui.install(target))
    deleteButton.clicked.connect(lambda state, target=device: ui.uninstall(target))
    ui.installButtons.update({device: installButton})
    ui.deleteButtons.update({device: deleteButton})
    ui.builds.update({device: deviceVersionCode})

    deviceName.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
    deviceVersion.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
    deviceVersionCode.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)

    boxLayout.addWidget(deviceName, 0, 0, 1, 2)  # row, col. 2 нужна из-за двух кнопок в нижнем ряду
    boxLayout.addWidget(deviceVersion, 1, 0, 1, 2)
    boxLayout.addWidget(deviceVersionCode, 2, 0, 1, 2)
    boxLayout.addWidget(installButton, 3, 0, 1, 1)
    boxLayout.addWidget(deleteButton, 3, 1, 1, 1)

    if deviceVersionCode.text().find('Не установлено') != -1:
        deleteButton.setEnabled(False)

    return deviceBox


class Ui_MainWindow(QtWidgets.QWidget):
    installButtons = {}
    deleteButtons = {}
    builds = {}
    current_devices = {}

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
        self.scrollArea.verticalScrollBar().setEnabled(False)
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
        self.drawDevices()

        self.allInstallButton.clicked.connect(self.allInstall)
        self.openSettingsButton.clicked.connect(self.openSettings)
        self.fileDrop.clicked.connect(self.openFileSelect)
        self.packageSelector.currentTextChanged.connect(self.drawDevices)

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

        settingsBox, boxLayout = generateBox()

        packageLabel = QtWidgets.QLabel("Имя пакета приложения")
        packageInfoLabel = QtWidgets.QLabel("Можно ввести несколько через запятую")

        packageEdit = QtWidgets.QLineEdit(settings.get('package'))


        boxLayout.addWidget(packageLabel)
        boxLayout.addWidget(packageInfoLabel)
        boxLayout.addWidget(packageEdit)

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
            self.drawDevices()

    def allInstall(self):
        connected_devices = self.client.devices()
        for device in connected_devices:
            try:
                device.install(path=self.getPath(), reinstall=True)

            except Exception:

                return
        self.cleanScrollLayout()
        self.drawDevices()

    def cleanScrollLayout(self):
        for i in range(self.scrollLayout.count()):
            self.scrollLayout.itemAt(i).widget().deleteLater()

    def startAdb(self):
        try:
            os.system("adb devices")
            self.client = AdbClient(host="127.0.0.1", port=5037)
        except Exception:
            deviceBox, boxLayout = generateBox()
            boxLayout.addWidget(QtWidgets.QLabel('ADB не может быть запущен'))
            self.scrollLayout.addWidget(deviceBox)

    def drawDevices(self):
        boxes = []
        self.installButtons.clear()

        self.cleanScrollLayout()

        if self.packageSelector.currentText() == 'Выбери пакет':

            deviceBox, boxLayout = generateBox()
            boxLayout.addWidget(QtWidgets.QLabel('Сначала нужно выбрать имя пакета'))
            boxes.append(deviceBox)


        connected_devices = self.client.devices()
        self.current_devices = connected_devices
        if len(self.client.devices()) == 0:

            deviceBox, boxLayout = generateBox()
            boxLayout.addWidget(QtWidgets.QLabel('Устройства не обнаружены'))
            boxes.append(deviceBox)
        else:
            for device in connected_devices:
                try:
                    boxes.append(getDeviceBox(device))

                except Exception:
                    continue

        if len(boxes) == 1:
            self.scrollLayout.addWidget(boxes[0])
            return

        if len(boxes) > 1:
            for box in boxes:
                self.scrollLayout.addWidget(box)

    def getPath(self):
        return self.fileDrop.placeholderText()

    def install(self, device):
        def deploy(device):
            try:
                device.install(path=self.getPath(), reinstall=True)
            except Exception:
                self.installButtons.get(device).setText('Повторить')
                return
            self.installButtons.get(device).setText('Установить')
            self.deleteButtons.get(device).setEnabled(True)
            self.builds.get(device).setText(getVersionCode(device, self.getCurrentPackage()))

        self.installButtons.get(device).setText('Установка')

        Timer(0, deploy, args=[device]).start()

    def uninstall(self, device):
        device.uninstall(self.getCurrentPackage())
        self.deleteButtons.get(device).setEnabled(False)
        self.builds.get(device).setText(getVersionCode(device, self.getCurrentPackage()))


def checkDevicesActuality():
    def isActualOnline():
        for device in ui.current_devices:
            try:
                device.get_serial_no()
            except RuntimeError:
                ui.drawDevices()
                return False
        return True

    def getSerialsArray(devices):
        response = []
        for device in devices:
            try:
                response.append(device.get_serial_no())
            except RuntimeError:
                ui.drawDevices()
                break
        return response

    if not ui.in_settings:
        if isActualOnline():
            if len(ui.client.devices()) != len(ui.current_devices):
                ui.drawDevices()
                return

            connected_devices = ui.client.devices()
            current_devices = getSerialsArray(ui.current_devices)

            for device in connected_devices:
                try:
                    if device.get_serial_no() not in current_devices:
                        ui.drawDevices()
                except RuntimeError:
                    ui.drawDevices()
                    return
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
    updater.start(100)


    sys.exit(app.exec_())
