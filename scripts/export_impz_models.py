"""Export the Imp body and trait Blockbench models from the club-impz repo into public/impz/ for the Imp Customization page.

Run from this repo's root:  python scripts/export_impz_models.py [path to club-impz]
Writes public/impz/manifest.json, public/impz/models/<id>.json (geometry only), public/impz/textures/<id>.png
and, with --icons, public/impz/icons/<id>.png (the trait's 2D layer art; the menu shows text for now)."""
import json, os, re, shutil, sys
from PIL import Image
from pathlib import Path

ICONS = '--icons' in sys.argv
ARGS = [a for a in sys.argv[1:] if a != '--icons']
GAME = Path(ARGS[0] if ARGS else 'C:/Users/lucas/club-impz')
ASSETS = GAME / 'godot-game/assets'
LAYERS = GAME / 'docs/imp-traits/layers'
OUT = Path(__file__).resolve().parent.parent / 'public/impz'
TYPES = ['body', 'head', 'eyes', 'clothing', 'back']
FOLDER = {'body': 'bodies', 'head': 'head', 'eyes': 'eyes', 'clothing': 'clothing', 'back': 'back'}
# Eyes traits that are only a face texture, and the face texture each eyewear model sits over (as in the eyes showcase)
EYE_OVERLAYS = ['red_pupils', 'gold_pupils', 'purple_pupils', 'ghostly']
EYE_BASE = {'eye_patch': 'red_pupils', 'monacle': 'red_pupils', 'tracker_blue': 'red_pupils', 'tracker_purple': 'red_pupils',
            'lazer': 'lazer_glow', 'neon_beam': 'neon_beam_glow'}
KEEP = ('name', 'from', 'to', 'origin', 'rotation', 'stretch', 'inflate', 'faces')


def key(s):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')


# display names from the trait tables in docs/implingz_collection.md
names = {}
section = None
for line in (GAME / 'docs/implingz_collection.md').read_text(encoding='utf8').splitlines():
    m = re.match(r'## \d+\. (\w+)', line)
    if m:
        section = m.group(1).lower()
    m = re.match(r'\| ([^|]+?) \| [\d,]+ \(', line)
    if m and section in TYPES:
        names[(section, key(m.group(1)))] = m.group(1)

if OUT.exists():
    shutil.rmtree(OUT)
for d in ('models', 'textures') + (('icons',) if ICONS else ()):
    (OUT / d).mkdir(parents=True)


def slim(model):
    elements = [{k: e[k] for k in KEEP if k in e} for e in model['elements']]
    for e in elements:
        e['faces'] = {f: {k: v for k, v in fc.items() if k in ('uv', 'rotation')} for f, fc in e['faces'].items() if fc.get('texture') is not None}
    groups = {g['uuid']: {'name': g['name'], 'origin': g['origin'], 'rotation': g.get('rotation', [0, 0, 0])} for g in model['groups']}
    index = {e['uuid']: i for i, e in enumerate(model['elements'])}

    def tree(n):
        if isinstance(n, str):
            return index[n]
        return {**groups[n['uuid']], 'children': [tree(k) for k in n['children']]}
    t = model['textures'][0]
    return {'texture': [t['uv_width'], t['uv_height']], 'elements': elements, 'bones': [tree(n) for n in model['outliner']]}


manifest = {t: [] for t in TYPES}
for ty in TYPES:
    for src in sorted((ASSETS / 'models/impz' / FOLDER[ty]).glob('*.bbmodel')):
        fid = src.stem                                   # body_green, head_afro, eyes_lazer ...
        short = fid.split('_', 1)[1]
        model = json.loads(src.read_text(encoding='utf8'))
        (OUT / 'models' / f'{fid}.json').write_text(json.dumps(slim(model), separators=(',', ':')), encoding='utf8')
        shutil.copyfile(ASSETS / 'textures/impz' / FOLDER[ty] / f'{fid}.png', OUT / 'textures' / f'{fid}.png')
        entry = {'id': fid, 'name': names.get((ty, short), short.replace('_', ' ').title()), 'model': True}
        if ty == 'eyes' and short in EYE_BASE:
            entry['overlay'] = f'eyes_{EYE_BASE[short]}'
        manifest[ty].append(entry)
    if ty == 'eyes':
        for short in EYE_OVERLAYS:
            manifest[ty].append({'id': f'eyes_{short}', 'name': names[(ty, short)], 'model': False, 'overlay': f'eyes_{short}'})
        for f in (ASSETS / 'textures/impz/eyes').glob('eyes_*.png'):
            if f.stem.endswith('_glow') or f.stem[5:] in EYE_OVERLAYS:
                shutil.copyfile(f, OUT / 'textures' / f.name)
    for e in (manifest[ty] if ICONS else []):
        layer = LAYERS / f"{ty}_{e['id'].split('_', 1)[1]}.png"
        if ty == 'body':
            layer = next((GAME / 'docs/imp-traits/bodies').glob(f"body_{e['id'][5:]}_*.png"), None)
        if layer and layer.exists():
            icon = Image.open(layer).convert('RGBA')
            if ty != 'body':                         # crop the layer to the trait and centre it on a square
                icon = icon.crop(icon.getbbox())
                side = max(icon.size) + 2
                sq = Image.new('RGBA', (side, side))
                sq.paste(icon, ((side - icon.width) // 2, (side - icon.height) // 2))
                icon = sq
            icon.save(OUT / 'icons' / f"{e['id']}.png", optimize=True)
            e['icon'] = True
    manifest[ty].sort(key=lambda e: e['name'].lower())
    missing = [e['id'] for e in manifest[ty] if ICONS and not e.get('icon')]
    print(f"{ty}: {len(manifest[ty])} options{'  (no icon: ' + ', '.join(missing) + ')' if missing else ''}")
    unnamed = [e['id'] for e in manifest[ty] if (ty, e['id'].split('_', 1)[1]) not in names]
    assert not unnamed, f'no doc name for {unnamed}'

(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1), encoding='utf8')
size = sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file())
print(f'wrote {OUT}  ({size / 1024:.0f} KB)')
