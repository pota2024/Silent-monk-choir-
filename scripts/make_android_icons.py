"""يولّد أيقونة التطبيق (شعار اللهب) وشاشة البداية من assets/logo-source.png
داخل مشروع android الذي ينشئه `npx cap add android`. يُشغَّل من جذر المشروع."""
import os, glob
from PIL import Image, ImageOps, ImageDraw
import numpy as np

SRC = 'assets/logo-source.png'
RES = 'android/app/src/main/res'
BG = (0, 0, 0)

im = Image.open(SRC).convert('RGB')
a = np.asarray(im).astype(int)
mask = (a[:, :, 0] > 90) & (a[:, :, 0] - a[:, :, 2] > 40)
rows = np.where(mask.any(axis=1))[0]
top, end = int(rows[0]), int(rows[0])
for r in rows[1:]:
    if r - end > 6:
        break
    end = int(r)
cols = np.where(mask[top:end + 1].any(axis=0))[0]
cx, cy, fh = (int(cols.min()) + int(cols.max())) / 2, (top + end) / 2, end - top + 1

# للأيقونة: اللهب وحده (نمسح النص الذي تحته)
mark = im.copy()
ImageDraw.Draw(mark).rectangle((0, end + 6, mark.width, mark.height), fill=BG)
PAD = 600
padded = ImageOps.expand(mark, border=PAD, fill=BG)


def flame(size, frac):
    """شعار اللهب وحده في المنتصف على خلفية سوداء، ارتفاعه frac من الأيقونة."""
    side = size / (frac * size / fh)
    x, y = cx + PAD, cy + PAD
    box = (round(x - side / 2), round(y - side / 2), round(x + side / 2), round(y + side / 2))
    return padded.crop(box).resize((size, size), Image.LANCZOS)


def circle(img):
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).ellipse((0, 0, img.size[0] - 1, img.size[1] - 1), fill=255)
    out = Image.new('RGB', img.size, BG)
    out.paste(img, (0, 0), m)
    return out


DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for d, k in DENS.items():
    folder = f'{RES}/mipmap-{d}'
    os.makedirs(folder, exist_ok=True)
    legacy = flame(round(48 * k), 0.70)
    legacy.save(f'{folder}/ic_launcher.png')
    circle(legacy).save(f'{folder}/ic_launcher_round.png')
    flame(round(108 * k), 0.56).save(f'{folder}/ic_launcher_foreground.png')

os.makedirs(f'{RES}/values', exist_ok=True)
open(f'{RES}/values/ic_launcher_background.xml', 'w').write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#000000</color>\n</resources>\n')
os.makedirs(f'{RES}/mipmap-anydpi-v26', exist_ok=True)
adaptive = ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '    <background android:drawable="@color/ic_launcher_background"/>\n'
            '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
            '</adaptive-icon>\n')
for n in ('ic_launcher.xml', 'ic_launcher_round.xml'):
    open(f'{RES}/mipmap-anydpi-v26/{n}', 'w').write(adaptive)

# شاشة البداية: خلفية سوداء واللوجو الكامل بدل شعار Capacitor الافتراضي
splashes = glob.glob(f'{RES}/drawable*/splash.png')
for p in splashes:
    w, h = Image.open(p).size
    canvas = Image.new('RGB', (w, h), BG)
    s = round(min(w, h) * 0.55)
    canvas.paste(im.resize((s, s), Image.LANCZOS), ((w - s) // 2, (h - s) // 2))
    canvas.save(p)
print('icons done; splash files:', len(splashes))
