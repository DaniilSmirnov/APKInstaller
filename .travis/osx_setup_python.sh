#!/bin/bash

if [ -z $1 ]; then
    echo "Please specify Python version as first command line argument!"
    exit 1
fi

if [ -z $2 ]; then
    echo "Please specify Python OSx version as second command line argument!"
    exit 1
fi

OLD="$(pwd)"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
cd $DIR

MPV=$1

OSXPV=$2

DLD=${DIR}/dl_cache
mkdir -p $DLD

PKG="python-${MPV}-macosx${OSXPV}.pkg"
curl https://www.python.org/ftp/python/${MPV}/${PKG} > ${DLD}/${PKG}

sudo installer -pkg ${DLD}/${PKG} -target /

PYTHON="/Library/Frameworks/Python.framework/Versions/${MPV::3}/bin/python${MPV::3}"
$PYTHON -m venv .env
source .env/bin/activate

pip install --upgrade pip

pip install certifi
/Applications/Python\ ${MPV::3}/Install\ Certificates.command


mkdir ~/.matplotlib
echo "backend: Agg" >> ~/.matplotlib/matplotlibrc

# go back
cd $OLD