import os, sys
sys.stdout.reconfigure(encoding='utf-8')

FIXES = [
    ('\u00e2\u20ac\u201d', '\u2014'),   # em dash —
    ('\u00e2\u20ac\u2122', '\u2019'),   # right single quote '
    ('\u00e2\u20ac\u0153', '\u201c'),   # left double quote "
    ('\u00e2\u20ac\u00a2', '\u2022'),   # bullet •
    ('\u00e2\u20ac\u00a6', '\u2026'),   # ellipsis …
    ('\u00e2\u2020\u2019', '\u2192'),   # right arrow →
    ('\u00c2\u00b7',       '\u00b7'),   # middle dot ·
    ('\u00e2\u20ac\u201c', '\u2013'),   # en dash –
]

src_root = 'src'
changed = []
for root, dirs, files in os.walk(src_root):
    for fname in files:
        if not fname.endswith(('.tsx', '.ts')):
            continue
        path = os.path.join(root, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        new_content = content
        for bad, good in FIXES:
            new_content = new_content.replace(bad, good)
        if new_content != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            changed.append(fname)

print('Fixed:', changed if changed else 'none')
