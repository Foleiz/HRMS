#!/usr/bin/env python3
"""
สร้าง src/app/dark-theme.css อัตโนมัติ — แปลงสีของ utility class ที่ใช้จริงในโค้ด ให้เข้ากับโหมดมืด

ทำไมต้องสร้างอัตโนมัติ: หน้าเว็บส่วนใหญ่เขียนสีแบบโหมดสว่าง (bg-white, text-slate-900, text-[#0B2046], ป้ายสีอ่อน ฯลฯ)
สคริปต์นี้อ่าน class สีทั้งหมดใน src/ แล้วสร้างกฎ `html.dark .class { ... }` ที่ให้ค่าสีเทียบเท่าในโหมดมืด
  - พื้นหลังสว่าง -> พื้นผิวเข้ม, ป้ายสีอ่อน -> สีเดียวกันโทนเข้ม
  - ตัวอักษรเข้ม -> ตัวอักษรสว่าง (คงเฉดสีเดิม), สีกรมท่า #0B2046 -> ฟ้าอ่อน
  - เส้นขอบสว่าง -> เส้นขอบเข้ม
องค์ประกอบที่อยู่ใน .theme-light (เช่น กระดาษใบลา/เอกสาร, หน้า login) ไม่ถูกเปลี่ยน

รันใหม่ทุกครั้งที่เพิ่ม class สีใหม่:  python3 scripts/gen-dark-theme.py
"""
import colorsys
import math
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
OUT = SRC / 'app' / 'dark-theme.css'
THEME = ROOT / 'node_modules' / 'tailwindcss' / 'theme.css'

NEUTRAL_FAMILIES = {'slate', 'gray', 'zinc', 'neutral', 'stone'}
FAMILIES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
EXEMPT = ':not(.theme-light, .theme-light *)'

# ---------- สี ----------
def oklch_to_rgb(L, C, H):
    a = C * math.cos(math.radians(H)); b = C * math.sin(math.radians(H))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    def enc(x):
        x = max(0.0, min(1.0, x))
        return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
    return tuple(enc(v) for v in (r, g, bb))

def load_palette():
    pal = {'white': (1.0, 1.0, 1.0), 'black': (0.0, 0.0, 0.0)}
    for m in re.finditer(r'--color-([a-z]+-\d+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)', THEME.read_text(encoding='utf-8')):
        pal[m.group(1)] = oklch_to_rgb(float(m.group(2)) / 100, float(m.group(3)), float(m.group(4)))
    return pal

def hex_to_rgb(h):
    h = h.lstrip('#')
    if len(h) in (3, 4):
        h = ''.join(c * 2 for c in h[:3])
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

def rgb_hex(c):
    return '#%02X%02X%02X' % tuple(round(max(0, min(1, v)) * 255) for v in c)

def lum(c):
    def lin(v): return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(v) for v in c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def chroma(c):
    return max(c) - min(c)

def hsl(c, L=None, S_max=None):
    h, l, s = colorsys.rgb_to_hls(*c)
    if L is not None: l = L
    if S_max is not None: s = min(s, S_max)
    return colorsys.hls_to_rgb(h, l, s)

# ---------- กติกาแปลงสี (คืน None = ไม่ต้องเปลี่ยน) ----------
NEUTRAL_BG = [(0.97, '#1E293B'), (0.88, '#131C2E'), (0.8, '#0F172A'), (0.55, '#334155'), (0.4, '#475569')]

def map_bg(c, neutral):
    y = lum(c)
    if neutral:
        for th, val in NEUTRAL_BG:
            if y >= th: return val
        return None
    if y >= 0.55:   # ป้าย/พื้นสีอ่อน -> สีเดียวกันโทนเข้ม
        return rgb_hex(hsl(c, L=0.20 if y >= 0.8 else 0.25, S_max=0.55))
    if y < 0.04 and chroma(c) > 0.12:   # กรมท่าเข้มมาก (ปุ่มหลัก) -> สว่างขึ้นให้เห็นบนพื้นมืด
        return rgb_hex(hsl(c, L=0.38))
    return None

def map_text(c, neutral):
    y = lum(c)
    if c == (1.0, 1.0, 1.0): return None
    if neutral:
        if y < 0.03: return '#F1F5F9'
        if y < 0.12: return '#CBD5E1'
        if y < 0.3: return '#94A3B8'
        return None
    if y < 0.2:   # ตัวอักษรสีเข้ม -> สีเดียวกันโทนสว่าง
        return rgb_hex(hsl(c, L=0.72, S_max=0.75))
    return None

def map_border(c, neutral):
    y = lum(c)
    if neutral:
        return '#334155' if y >= 0.45 else None
    if y >= 0.45:
        return rgb_hex(hsl(c, L=0.32, S_max=0.6))
    if y < 0.04 and chroma(c) > 0.12:
        return rgb_hex(hsl(c, L=0.55))
    return None

PROP = {
    'bg': ('background-color', map_bg),
    'text': ('color', map_text),
    'border': ('border-color', map_border),
    'ring': ('--tw-ring-color', map_border),
    'from': ('--tw-gradient-from', map_bg),
    'via': ('--tw-gradient-via', map_bg),
    'to': ('--tw-gradient-to', map_bg),
    'divide': ('border-color', map_border),
    'outline': ('outline-color', map_border),
}

CLASS_RE = re.compile(
    r'(?<![\w:\-/\[])((?:hover:|focus:|group-hover:)?)'
    r'(bg|text|border(?:-[trblxy])?|ring|from|via|to|divide|outline)-'
    r'((?:' + FAMILIES + r')-(?:50|100|200|300|400|500|600|700|800|900|950)|white|black|\[#[0-9A-Fa-f]{3,8}\])'
    r'(?:/(\d{1,3}))?(?![\w\-/])'
)

def esc(cls):
    return re.sub(r'([:/\[\]#.])', r'\\\1', cls)

def main():
    pal = load_palette()
    found = set()
    for f in SRC.rglob('*'):
        if f.suffix in ('.ts', '.tsx') and f.is_file():
            for m in CLASS_RE.finditer(f.read_text(encoding='utf-8', errors='ignore')):
                found.add(tuple(g or '' for g in m.groups()))

    rules = []
    for variant, kind, color, alpha in sorted(found):
        base_kind = 'border' if kind.startswith('border') else kind
        prop, fn = PROP[base_kind]
        if color.startswith('['):
            c = hex_to_rgb(color[2:-1]); neutral = chroma(c) < 0.06
        else:
            if color not in pal: continue
            c = pal[color]; neutral = color in ('white', 'black') or color.split('-')[0] in NEUTRAL_FAMILIES
        # พื้นขาวโปร่งใสจาง ๆ (glass บนแถบสีเข้ม) คงไว้ตามเดิม
        if base_kind in ('bg', 'from', 'via', 'to') and neutral and alpha and int(alpha) <= 30:
            continue
        target = fn(c, neutral)
        if target is None: continue
        if alpha:
            t = hex_to_rgb(target)
            target = 'rgba(%d, %d, %d, %.2f)' % (round(t[0] * 255), round(t[1] * 255), round(t[2] * 255), int(alpha) / 100)
        cls = f'{variant}{kind}-{color}' + (f'/{alpha}' if alpha else '')
        sel = '.' + esc(cls)
        if variant == 'hover:': sel += ':hover'
        elif variant == 'focus:': sel += ':focus'
        if variant == 'group-hover:': sel = f'html.dark .group:hover {sel}{EXEMPT}'
        else: sel = f'html.dark {sel}{EXEMPT}'
        if base_kind == 'divide': sel += ' > :not(:last-child)'
        rules.append(f'{sel} {{ {prop}: {target} !important; }}')

    header = ('/* ไฟล์นี้สร้างอัตโนมัติจาก scripts/gen-dark-theme.py — ห้ามแก้มือ (รันสคริปต์ใหม่แทน) */\n'
              f'/* {len(rules)} rules */\n')
    OUT.write_text(header + '\n'.join(rules) + '\n', encoding='utf-8', newline='\n')
    print(f'wrote {OUT.relative_to(ROOT)}: {len(rules)} rules from {len(found)} classes')

if __name__ == '__main__':
    main()
