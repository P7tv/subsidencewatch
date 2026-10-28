#!/bin/zsh
# Creates ~/.netrc for NASA Earthdata. Prompts for credentials; nothing is echoed or stored in history.
set -e
if [[ -e ~/.netrc ]] && grep -q "urs.earthdata.nasa.gov" ~/.netrc; then
  echo "~/.netrc already has an Earthdata entry; edit it manually if you need to change it."
  exit 1
fi
read "u?Earthdata username: "
read -s "p?Earthdata password: "; echo
printf 'machine urs.earthdata.nasa.gov login %s password %s\n' "$u" "$p" >> ~/.netrc
unset p
chmod 600 ~/.netrc
echo "Saved ~/.netrc (permissions 600)."
