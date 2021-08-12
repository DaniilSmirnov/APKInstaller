import sqlite3


def get_conn():
    conn = sqlite3.connect('../settings.db')
    return conn, conn.cursor()


def create_db():
    conn, cursor = get_conn()

    cursor.execute('CREATE TABLE "settings" ("package" TEXT, "ui_state" INTEGER);')
    conn.commit()

    query = 'insert into settings values ("com.android.chrome", 0);'
    cursor.execute(query)
    conn.commit()


def set_settings(url, ui_state):
    conn, cursor = get_conn()
    query = 'update settings set package = ?, ui_state = ?;'
    data = (url, ui_state)
    cursor.execute(query, data)
    conn.commit()


def get_settings():
    conn, cursor = get_conn()
    query = 'select * from settings;'
    try:
        cursor.execute(query)
    except sqlite3.OperationalError:
        create_db()
        cursor.execute(query)

    return get_dict(cursor, get_column_names(cursor.description))


def get_dict(cursor, keys):
    keys = list(keys)
    response = []

    data = cursor.fetchone()
    while data is not None:
        response.append(dict(zip(keys, data)))
        data = cursor.fetchone()
    return response[0]


def get_array(cursor, keys):
    keys = list(keys)
    response = []

    data = cursor.fetchone()
    while data is not None:
        response.append(dict(zip(keys, data)))
        data = cursor.fetchone()

    return response


def get_column_names(colnames):
    response = []
    for row in colnames:
        response.append(row[0])

    return response


def getPackages():
    response = []
    raw = get_settings().get('package')
    if raw.find(',') == -1:
        response.append(raw)
    else:
        response = raw.split(',')
    return response


def isOneDevice():
    return get_settings().get('ui_state') == 1


def addOneDeviceColumn():
    conn, cursor = get_conn()
    query = 'alter table settings add ui_state text;'
    cursor.execute(query)
    query = 'update settings set onedevice = 0;'
    cursor.execute(query)
    conn.commit()
