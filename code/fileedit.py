from PyQt5 import QtWidgets
from PyQt5.QtCore import pyqtSignal


class FileEdit(QtWidgets.QLineEdit):
    def __init__(self, parent):
        super(FileEdit, self).__init__(parent)

        self.setDragEnabled(True)
        self.setPlaceholderText('Поместите сюда файл через drag n drop или нажмите для выбора')

    clicked = pyqtSignal()

    def mousePressEvent(self, event):
        self.clicked.emit()

    def dragEnterEvent(self, event):
        data = event.mimeData()
        urls = data.urls()
        if urls and urls[0].scheme() == 'file':
            event.acceptProposedAction()

    def dragMoveEvent(self, event):
        data = event.mimeData()
        urls = data.urls()
        if urls and urls[0].scheme() == 'file':
            event.acceptProposedAction()

    def dropEvent(self, event):
        data = event.mimeData()
        url = data.urls()[0]
        path = url.toLocalFile()
        self.setPlaceholderText(str(path))
