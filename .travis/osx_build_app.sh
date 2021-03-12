#!/bin/bash

set -e

if [ -z $1 ]; then
    echo "Please specify package name as command line argument!"
    exit 1
fi
NAME=$1

if [ -z $2 ]; then
    NAMEVERSION=${1}
else
    NAMEVERSION=${1}_${2}
fi

SCRIPT="${NAME}.py"
APP="./dist_app/${NAME}.app"
DMG="./dist_app/${NAMEVERSION}.dmg"
PKG="./dist_app/${NAME}.pkg"
TMP="./dist_app/pack.temp.dmg"

rm -rf ./build
rm -rf ./dist_app

pip install pyinstaller

pyinstaller -w -y --distpath="./dist_app" --onefile --name=ApkInstaller --exclude-module tkinter --additional-hooks-dir=".travis" $SCRIPT

pkgbuild --install-location /Applications/ --component ${APP} ${PKG}

mkdir ./dist_app/ui-release
cd ./dist_app/ui-release
ln -s /Applications
cd -
mv ${APP} ./dist_app/ui-release/

hdiutil create -srcfolder ./dist_app/ui-release/ -volname "${NAMEVERSION}" -fs HFS+ \
        -fsargs "-c c=64,a=16,e=16" -format UDRW "${TMP}"

hdiutil convert "${TMP}" -format UDZO -imagekey zlib-level=9 -o "${DMG}"

rm $TMP
