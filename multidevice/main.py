import sys
import traceback
from threading import Timer

import sentry_sdk
from PyQt6 import QtCore, QtGui, QtWidgets
from PyQt6.QtCore import QTimer

from database import get_settings, set_settings, getPackages, isOneDevice
from filelabel import FileLabel
from groupbox import DeviceBox, InfoBox, Box
from onedevice.onedevice import OneDeviceWidget
from styles import getIconButton, getButton, settings_icon, app_icon, getLabel, getComboBox
from utils import getVersionCode, getDevices, adbClient, getSerialsArray

sentry_sdk.init(
    "https://0cbf9befcec248f3adca4c61df10dccf@o694682.ingest.sentry.io/5775215",
    traces_sample_rate=1.0
)


class Window(QtWidgets.QWidget):
    current_devices = []
    boxes = {}
    in_settings = False
    onedevice = False

    def setupUi(self):
        MainWindow.resize(520, 200)
        MainWindow.setWindowIcon(QtGui.QIcon(app_icon))
        self.centralwidget = QtWidgets.QWidget(MainWindow)
        self.mainLayout = QtWidgets.QGridLayout(self.centralwidget)
        self.mainLayout.setVerticalSpacing(0)
        MainWindow.setCentralWidget(self.centralwidget)

        self.fileDrop = FileLabel(self.centralwidget)
        self.mainLayout.addWidget(self.fileDrop, 0, 0, 1, 1)

        self.packageSelector = getComboBox()
        self.mainLayout.addWidget(self.packageSelector, 0, 1, 1, 1)
        self.fillPackageSelector()

        self.allInstallButton = getButton("Установить на все")
        self.mainLayout.addWidget(self.allInstallButton, 0, 2, 1, 1)

        self.openSettingsButton = getIconButton(settings_icon, 'Настройки')
        self.mainLayout.addWidget(self.openSettingsButton, 0, 3, 1, 1)

        self.scrollArea = QtWidgets.QScrollArea(self.centralwidget)
        self.scrollArea.setFrameStyle(QtWidgets.QFrame.Shape.NoFrame.value)
        self.mainLayout.addWidget(self.scrollArea, 1, 0, 1, 5)
        self.scrollArea.setWidgetResizable(True)
        self.scrollArea.verticalScrollBar().setEnabled(False)
        self.scrollArea.setSizePolicy(QtWidgets.QSizePolicy.Policy.Expanding, QtWidgets.QSizePolicy.Policy.Expanding)
        self.scrollWidget = QtWidgets.QWidget()
        self.scrollLayout = QtWidgets.QHBoxLayout(self.scrollWidget)
        self.scrollWidget.setLayout(self.scrollLayout)
        self.scrollArea.setWidget(self.scrollWidget)

        QtCore.QMetaObject.connectSlotsByName(MainWindow)

        self.startAdb()

        if isOneDevice():
            self.onedevice = True
            self.drawOneDevice()

        self.allInstallButton.clicked.connect(self.allInstall)
        self.openSettingsButton.clicked.connect(self.openSettings)
        self.fileDrop.clicked.connect(self.openFileSelect)
        self.packageSelector.currentTextChanged.connect(self.updateBuildCodes)

    def drawOneDevice(self):
        devices = getDevices()
        self.OneDevice = OneDeviceWidget(ui.centralwidget, devices[0], ui)
        self.mainLayout.addWidget(self.OneDevice, 2, 0, 5, 5)

    def updateBuildCodes(self):
        try:
            for box in self.boxes:
                widget = self.boxes[box]
                device = self.boxes[box].device
                widget.deviceVersionCode.setText(getVersionCode(device, self.getCurrentPackage()))
        except Exception:
            pass

    def getCurrentPackage(self):
        return self.packageSelector.currentText()

    def openFileSelect(self):
        text = QtWidgets.QFileDialog.getOpenFileName(self, "Выбор файла", 'C://Users')
        file = text[0]
        if file.isspace() or file == "":
            self.fileDrop.setText('Поместите сюда файл через drag n drop или нажмите для выбора')
        else:
            self.fileDrop.setText(file)

    def fillPackageSelector(self):
        self.packageSelector.clear()
        packages = getPackages()
        if len(packages) > 0:
            self.packageSelector.addItems(packages)
        else:
            self.packageSelector.addItem('Выбери приложение')

    def openSettings(self):
        self.in_settings = True

        self.setBoxesVisibility(False)
        self.openSettingsButton.setVisible(False)
        self.allInstallButton.setVisible(False)
        self.packageSelector.setVisible(False)
        self.fileDrop.setVisible(False)

        applySettingsButton = getButton("Применить")
        self.mainLayout.addWidget(applySettingsButton, 0, 4, 1, 1)
        applySettingsButton.clicked.connect(lambda state: saveSettings(packageEdit, oneDeviceCheckBox))

        closeSettingsButton = getButton("Назад")
        self.mainLayout.addWidget(closeSettingsButton, 0, 3, 1, 1)
        closeSettingsButton.clicked.connect(lambda state: closeSettings())

        settings = get_settings()

        settingsBox = Box(self.scrollWidget)

        packageLabel = getLabel("Имя пакета приложения")
        packageInfoLabel = getLabel("Можно ввести несколько через запятую")

        packageEdit = QtWidgets.QLineEdit(settings.get('package'))

        settingsBox.boxLayout.addWidget(packageLabel)
        settingsBox.boxLayout.addWidget(packageInfoLabel)
        settingsBox.boxLayout.addWidget(packageEdit)

        oneDeviceCheckBox = QtWidgets.QCheckBox('Режим одного устройства')
        if isOneDevice():
            self.OneDevice.setVisible(False)
            #self.OneDevice.deleteLater()
            oneDeviceCheckBox.setChecked(True)
        else:
            oneDeviceCheckBox.setChecked(False)
        settingsBox.boxLayout.addWidget(oneDeviceCheckBox)

        self.scrollLayout.addWidget(settingsBox)

        def saveSettings(url, checkbox):
            text = url.text().strip()
            is_checked = checkbox.isChecked()
            if not text.isspace():
                Timer(0, set_settings, args=[text, is_checked]).start()

            closeSettings()

        def closeSettings():
            applySettingsButton.deleteLater()
            closeSettingsButton.deleteLater()
            settingsBox.deleteLater()
            self.in_settings = False

            self.allInstallButton.setVisible(True)
            self.openSettingsButton.setVisible(True)
            self.packageSelector.setVisible(True)
            self.fileDrop.setVisible(True)
            self.setBoxesVisibility(True)

            self.fillPackageSelector()

    def allInstall(self):
        for box in self.boxes:
            widget = self.boxes[box]
            device = widget.device
            self.install(device, widget.installButton, widget.deleteButton, widget.deviceVersionCode)

    def cleanScrollLayout(self):
        for i in range(self.scrollLayout.count()):
            self.scrollLayout.itemAt(i).widget().deleteLater()

    def setBoxesVisibility(self, visibility):
        for box in self.boxes:
            self.boxes[box].setVisible(visibility)

    def startAdb(self):
        try:
            adbClient()
        except Exception:
            self.scrollLayout.addWidget(InfoBox(self.scrollWidget, 'ADB не может быть запущен'))

    def getPath(self):
        return self.fileDrop.text()

    def install(self, device, button, delete_button, code):
        def deploy(device):
            try:
                device.install(path=self.getPath(), reinstall=True)
                button.setText('Установить')
                delete_button.setEnabled(True)
                code.setText(getVersionCode(device, self.getCurrentPackage()))
            except Exception:
                button.setText('Повторить')
                trace = traceback.format_exc()
                sentry_sdk.capture_message(trace)

        button.setText('Установка')

        Timer(0, deploy, args=[device]).start()

    def uninstall(self, device, button, code):
        try:
            device.uninstall(self.getCurrentPackage())
            button.setEnabled(False)
            code.setText(getVersionCode(device, self.getCurrentPackage()))
        except Exception:
            button.setText('Повторить')
            trace = traceback.format_exc()
            sentry_sdk.capture_message(trace)


def checkDevicesActuality():
    try:
        if not ui.in_settings and not ui.onedevice:
            connected_devices = getDevices()
            current_devices = ui.current_devices

            if len(connected_devices) == 0:
                ui.setBoxesVisibility(False)
                info = ui.boxes.get('no_devices')
                if info is None:
                    info = InfoBox(ui.scrollWidget, 'Устройства не обнаружены')
                    ui.boxes.update({'no_devices': info})
                    ui.scrollLayout.addWidget(info)
                else:
                    info.setVisible(True)
                backgroundBoxCleaner()

            if len(connected_devices) > 0:
                widget = ui.boxes.get('no_devices')
                if widget is not None:
                    widget.setVisible(False)

                for device in connected_devices:
                    try:
                        if device.get_serial_no() not in current_devices:
                            new_device = DeviceBox(ui.scrollWidget, device, ui)
                            ui.scrollLayout.addWidget(new_device)
                            ui.boxes.update({device.get_serial_no(): new_device})
                    except RuntimeError:
                        trace = traceback.format_exc()
                        sentry_sdk.capture_message(trace)

                connected_devices = getSerialsArray(getDevices())

                for device in current_devices:
                    if device not in connected_devices:
                        widget = ui.boxes.get(device)
                        ui.boxes.pop(device)
                        ui.scrollLayout.removeWidget(widget)
                        widget.deleteLater()

            ui.current_devices = connected_devices
        #elif ui.onedevice:
        #    connected_devices = getDevices()
        #    if len(connected_devices) == 1:
        #        ui.scrollWidget.setVisible(False)
        #        ui.mainLayout.addWidget(OneDeviceWidget(ui.centralwidget, connected_devices[0], ui), 2, 0, 5, 5)
        else:
            return
    except Exception:
        trace = traceback.format_exc()
        sentry_sdk.capture_message(trace)


def backgroundBoxCleaner():
    try:
        for box in ui.boxes:
            if box != 'no_devices' and not ui.boxes[box].isVisible():
                ui.boxes[box].deleteLater()
                ui.boxes.pop(box)
    except RuntimeError:
        return


if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    app.setWindowIcon(QtGui.QIcon(app_icon))
    MainWindow = QtWidgets.QMainWindow()
    ui = Window()
    ui.setupUi()
    MainWindow.show()

    updater = QTimer()
    updater.timeout.connect(checkDevicesActuality)
    updater.start(300)

    cleaner = QTimer()
    cleaner.timeout.connect(backgroundBoxCleaner)
    cleaner.start(500)

    sys.exit(app.exec())
