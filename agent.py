import json, os, re, time, requests

URL = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"
MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
SYSTEM = """Kamu YUNGZ AI, asisten Android berbahasa Indonesia.
Balas SELALU JSON: {"reply": "...", "actions": [{"action": "...", "args": {...}}]}
Action: open_url(url), open_app(name), battery(), remember(text).
Maksimal 5 action. Jangan klaim berhasil sebelum ada hasil. Jangan simpan data sensitif.
Memori pengguna: %s"""


def _load(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


class Agent:
    def __init__(self, data_dir):
        self.cfg_path = os.path.join(data_dir, "config.json")
        self.mem_path = os.path.join(data_dir, "memory.json")
        self.history = []

    def get_key(self):
        return _load(self.cfg_path, {}).get("key", "")

    def set_key(self, key):
        with open(self.cfg_path, "w", encoding="utf-8") as f:
            json.dump({"key": key.strip()}, f)

    def remember(self, text):
        mem = _load(self.mem_path, [])
        mem.append(text[:200])
        with open(self.mem_path, "w", encoding="utf-8") as f:
            json.dump(mem[-50:], f, ensure_ascii=False)

    def ask(self, text):
        key = self.get_key()
        if not key:
            return {"reply": "Isi Kunci API dulu lewat tombol Kunci API.", "actions": []}
        mem = "; ".join(_load(self.mem_path, [])) or "kosong"
        body = {
            "systemInstruction": {"parts": [{"text": SYSTEM % mem}]},
            "contents": self.history + [{"role": "user", "parts": [{"text": text}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }
        last = "tidak diketahui"
        for model in MODELS:
            for _ in range(2):
                try:
                    r = requests.post(URL.format(model), json=body, timeout=30,
                                      headers={"x-goog-api-key": key})
                except Exception as e:
                    last = "jaringan (%s)" % type(e).__name__
                    time.sleep(1)
                    continue
                if r.status_code in (429, 500, 503):
                    last = "server sibuk (%d)" % r.status_code
                    time.sleep(1.5)
                    continue
                if not r.ok:
                    return {"reply": "Error HTTP %d" % r.status_code, "actions": []}
                try:
                    raw = r.json()["candidates"][0]["content"]["parts"][0]["text"]
                    data = json.loads(re.sub(r"^```(json)?|```$", "", raw.strip()).strip())
                except Exception:
                    return {"reply": "Balasan AI tidak valid.", "actions": []}
                self.history += [{"role": "user", "parts": [{"text": text}]},
                                 {"role": "model", "parts": [{"text": raw}]}]
                self.history = self.history[-10:]
                return {"reply": str(data.get("reply", "")),
                        "actions": (data.get("actions") or [])[:5]}
        return {"reply": "Gagal: " + last, "actions": []}
