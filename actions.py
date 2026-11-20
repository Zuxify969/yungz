from jnius import autoclass

APPS = {
    "whatsapp": "com.whatsapp", "wa": "com.whatsapp",
    "facebook": "com.facebook.katana", "fb": "com.facebook.katana",
    "instagram": "com.instagram.android", "ig": "com.instagram.android",
    "youtube": "com.google.android.youtube", "chrome": "com.android.chrome",
    "telegram": "org.telegram.messenger", "tiktok": "com.zhiliaoapp.musically",
    "gmail": "com.google.android.gm", "maps": "com.google.android.apps.maps",
    "shopee": "com.shopee.id", "gojek": "com.gojek.app",
    "spotify": "com.spotify.music", "playstore": "com.android.vending",
}


def _act():
    return autoclass("org.kivy.android.PythonActivity").mActivity


def open_url(url):
    Intent = autoclass("android.content.Intent")
    Uri = autoclass("android.net.Uri")
    _act().startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    return "Intent dikirim"


def open_app(name):
    key = name.lower().strip()
    pkg = APPS.get(key, key)
    intent = _act().getPackageManager().getLaunchIntentForPackage(pkg)
    if intent is None:
        raise RuntimeError("Aplikasi tidak ditemukan: " + name)
    _act().startActivity(intent)
    return "Membuka " + name


def battery():
    Intent = autoclass("android.content.Intent")
    IF = autoclass("android.content.IntentFilter")
    i = _act().registerReceiver(None, IF(Intent.ACTION_BATTERY_CHANGED))
    lv, sc = i.getIntExtra("level", -1), i.getIntExtra("scale", 100)
    return "Baterai %d%%" % (lv * 100 // sc)


def run(agent, action, args):
    try:
        if action == "open_url":
            return True, open_url(args["url"])
        if action == "open_app":
            return True, open_app(args["name"])
        if action == "battery":
            return True, battery()
        if action == "remember":
            agent.remember(args["text"])
            return True, "Tersimpan"
        return False, "Action tidak dikenal: " + str(action)
    except Exception as e:
        return False, str(e)
