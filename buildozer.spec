[app]
title = YUNGZ AI
package.name = yungzai
package.domain = org.yungz
source.dir = .
source.include_exts = py
version = 0.1
requirements = python3,kivy==2.3.0,pyjnius,requests,urllib3,idna,chardet,certifi
orientation = portrait
fullscreen = 0
android.permissions = INTERNET,QUERY_ALL_PACKAGES
android.api = 33
android.minapi = 24
android.archs = arm64-v8a
android.accept_sdk_license = True

[buildozer]
log_level = 2
warn_on_root = 1
