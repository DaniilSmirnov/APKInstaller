import sqlite3


def get_conn():
    conn = sqlite3.connect('settings.db')
    return conn, conn.cursor()


def create_db():
    conn, cursor = get_conn()

    cursor.execute('''
    CREATE TABLE "settings" (
	"package" TEXT);
    ''')

    conn.commit()

    query = 'insert into settings values ("com.vkontakte.android");'
    cursor.execute(query)

    conn.commit()


def set_settings(url):
    conn, cursor = get_conn()
    query = 'update settings set package = ?;'
    data = (url,)
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
