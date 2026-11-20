import threading
from kivy.app import App
from kivy.clock import Clock
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.popup import Popup
from kivy.uix.scrollview import ScrollView
from kivy.uix.textinput import TextInput
from kivy.utils import escape_markup

from agent import Agent
import actions


class YungzApp(App):
    title = "YUNGZ AI"

    def build(self):
        self.agent = Agent(self.user_data_dir)
        root = BoxLayout(orientation="vertical", padding=6, spacing=6)
        top = BoxLayout(size_hint_y=None, height=96)
        top.add_widget(Label(text="YUNGZ AI", bold=True))
        b = Button(text="Kunci API", size_hint_x=0.4, on_release=self.key_dialog)
        top.add_widget(b)
        root.add_widget(top)

        self.label = Label(size_hint_y=None, halign="left", valign="top", markup=True)
        self.label.bind(width=lambda w, v: setattr(w, "text_size", (v, None)),
                        texture_size=lambda w, v: setattr(w, "height", v[1]))
        sv = ScrollView()
        sv.add_widget(self.label)
        self.sv = sv
        root.add_widget(sv)

        row = BoxLayout(size_hint_y=None, height=110, spacing=6)
        self.inp = TextInput(multiline=False, hint_text="Ketik perintah...",
                             on_text_validate=self.send)
        row.add_widget(self.inp)
        row.add_widget(Button(text="Kirim", size_hint_x=0.3, on_release=self.send))
        root.add_widget(row)
        self.say("[b]YUNGZ AI[/b]: Halo! Isi Kunci API dulu kalau belum.")
        return root

    def say(self, line):
        self.label.text += line + "\n\n"
        Clock.schedule_once(lambda dt: setattr(self.sv, "scroll_y", 0), 0.1)

    def key_dialog(self, *a):
        ti = TextInput(multiline=False, password=True, hint_text="Tempel API key Gemini")
        box = BoxLayout(orientation="vertical", spacing=8, padding=8)
        box.add_widget(ti)
        pop = Popup(title="Kunci API", content=box, size_hint=(0.9, 0.35))

        def save(*_):
            if ti.text.strip():
                self.agent.set_key(ti.text)
                self.say("[b]YUNGZ AI[/b]: Kunci tersimpan.")
            pop.dismiss()
        box.add_widget(Button(text="Simpan", on_release=save))
        pop.open()

    def send(self, *a):
        text = self.inp.text.strip()
        if not text:
            return
        self.inp.text = ""
        self.say("[b]YOU[/b]: " + escape_markup(text))
        threading.Thread(target=self.work, args=(text,), daemon=True).start()

    def work(self, text):
        res = self.agent.ask(text)
        lines = ["[b]YUNGZ AI[/b]: " + escape_markup(res["reply"])]
        for it in res["actions"]:
            ok, msg = actions.run(self.agent, it.get("action"), it.get("args") or {})
            if not ok:
                lines.append("Gagal: " + escape_markup(msg))
        Clock.schedule_once(lambda dt: self.say("\n".join(lines)), 0)


YungzApp().run()
