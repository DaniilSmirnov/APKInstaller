import os

from PyQt6 import QtCore, QtGui, QtWidgets
from PyQt6.QtGui import QColor, QPixmap

color = '#3F8AE0'

iconButtonStyleSheet = '''
QPushButton{
color: transparent;
background-color: transparent;
}
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

    return button


def getIconButton(icon_path, tooltip):
    if os.path.exists(icon_path):
        icon = getIcon(icon_path)
        button = QtWidgets.QPushButton(icon=icon)
        button.setStyleSheet(iconButtonStyleSheet)
        button.setSizePolicy(QtWidgets.QSizePolicy.Policy.Maximum, QtWidgets.QSizePolicy.Policy.Maximum)
        button.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        button.setToolTip(tooltip)
    else:
        button = getButton(tooltip)

    return button
