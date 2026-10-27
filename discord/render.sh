#!/bin/sh
# Renders Discord / site images from render.html with headless Chrome.
# Usage: sh discord/render.sh
cd "$(dirname "$0")"
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() { # name w h out
  "$C" --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --virtual-time-budget=6000 --window-size="$2,$3" --screenshot="$4" "file://$PWD/render.html?t=$1" 2>/dev/null
}
shot icon    512  512  server-icon.png
shot icon2   512  512  server-icon-mascot.png
shot banner  960  540  server-banner.png
shot splash  1920 1080 invite-splash.png
shot og      1200 630  ../assets/og.png
shot favicon 64   64   ../assets/favicon.png
shot logo    1500 175  logo-black.png
shot logow   1500 175  logo-white.png
ls -la *.png ../assets/*.png
