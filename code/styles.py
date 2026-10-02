import os

from PyQt6 import QtCore, QtGui, QtWidgets
from PyQt6.QtGui import QColor, QPixmap

app_icon = './icons/APK_icon.png'
settings_icon = './icons/settings.png'

color = '#3F8AE0'

buttonStyleSheet = f'''
color: {color};
background-color: rgba(0, 28, 61, 0.05);
border-radius: 10px; 
border: 1px solid {color};
padding: 3px;
'''


def getIcon(path):
    pixmap = QPixmap(path)
    mask = pixmap.createMaskFromColor(QColor('blue'), QtCore.Qt.MaskMode.MaskOutColor)
    pixmap.fill((QColor(color)))
    pixmap.setMask(mask)

    return QtGui.QIcon(pixmap)


def getButton(text):
    button = QtWidgets.QPushButton(text)
    button.setSizePolicy(QtWidgets.QSizePolicy.Policy.Maximum, QtWidgets.QSizePolicy.Policy.Maximum)
    button.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
    button.setStyleSheet(buttonStyleSheet)

    return button


def getIconButton(icon_path, tooltip):
    if os.path.exists(icon_path):
        icon = getIcon(icon_path)
        button = QtWidgets.QPushButton(icon=icon)
        button.setStyleSheet(buttonStyleSheet)
        button.setSizePolicy(QtWidgets.QSizePolicy.Policy.Maximum, QtWidgets.QSizePolicy.Policy.Maximum)
        button.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        button.setToolTip(tooltip)
    else:
        button = getButton(tooltip)

    return button


def getLabel(text):
    label = QtWidgets.QLabel(text)
    label.setSizePolicy(QtWidgets.QSizePolicy.Policy.Maximum, QtWidgets.QSizePolicy.Policy.Maximum)
    return label


def getComboBox():
    comboBox = QtWidgets.QComboBox()
    comboBox.setStyleSheet(buttonStyleSheet)
    comboBox.setSizePolicy(QtWidgets.QSizePolicy.Policy.Maximum, QtWidgets.QSizePolicy.Policy.Maximum)
    comboBox.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))

    return comboBox


def getCheckBox(text):
    comboBox = QtWidgets.QCheckBox(text)
    comboBox.setStyleSheet(buttonStyleSheet)
    comboBox.setSizePolicy(QtWidgets.QSizePolicy.Policy.Maximum, QtWidgets.QSizePolicy.Policy.Maximum)
    comboBox.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))

    return comboBox
