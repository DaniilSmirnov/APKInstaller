from PyQt5 import QtCore, QtGui, QtWidgets
from ppadb.client import Client as AdbClient
import sys

from fileedit import FileEdit

client = AdbClient(host="127.0.0.1", port=5037)


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

        self.errorLabel = QtWidgets.QLabel('')
        self.mainLayout.addWidget(self.errorLabel, 2, 0, 1, 1)

        self.retranslateUi(MainWindow)
        QtCore.QMetaObject.connectSlotsByName(MainWindow)

    def retranslateUi(self, MainWindow):
        _translate = QtCore.QCoreApplication.translate
        MainWindow.setWindowTitle(_translate("MainWindow", "APK Installer"))

        self.forceDevices.clicked.connect(self.drawDevices)

        self.drawDevices()

    def drawDevices(self):

        for i in range(self.scrollLayout.count()):
            self.scrollLayout.itemAt(i).widget().deleteLater()

        i = 0

        connected_devices = client.devices()
        for device in connected_devices:
            try:
                name = device.get_properties().get('ro.product.manufacturer') + " " + device.get_properties().get(
                        'ro.product.model')
                deviceName = QtWidgets.QLabel(name)
                deviceVersion = QtWidgets.QLabel("Android " + device.get_properties().get('ro.build.version.release'))
            except RuntimeError:
                self.drawDevices()

            installButton = QtWidgets.QPushButton("Установить")
            installButton.clicked.connect(lambda state, target=device, model=name: self.install(target, model))

            deviceName.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
            deviceVersion.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)
            installButton.setSizePolicy(QtWidgets.QSizePolicy.Maximum, QtWidgets.QSizePolicy.Maximum)

            self.scrollLayout.addWidget(deviceName, 0, i, 1, 1)
            self.scrollLayout.addWidget(deviceVersion, 1, i, 1, 1)
            self.scrollLayout.addWidget(installButton, 2, i, 1, 1)
            i += 1

    def getPath(self):
        return self.fileDrop.placeholderText()

    def install(self, device, name):
        try:
            device.install(path=self.getPath(), reinstall=True)
        except Exception:
            self.errorLabel.setText('Произошла ошибка установки на ' + name)
            return

        self.errorLabel.setText('Установка завершена на ' + name)


if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    MainWindow = QtWidgets.QMainWindow()
    ui = Ui_MainWindow()
    ui.setupUi()
    MainWindow.show()
    sys.exit(app.exec_())
