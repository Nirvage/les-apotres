"""Construit les fichiers json/vo/*.json (version originale anglaise) lus par vo.js.

Usage : python3 outils/vo/build_vo.py <dossier data 5etools> <racine du site>
Le dossier 5etools contient une copie de https://github.com/5etools-mirror-3/5etools-src/tree/main/data
(spells/, bestiary/, class/, items.json, items-base.json, magicvariants.json, feats.json, races.json,
backgrounds.json, conditionsdiseases.json, books.json, adventures.json) ; hb/ peut contenir les fichiers
homebrew tiers (Tal'Dorei Reborn, Loot Tavern, Matthew Mercer) pour les noms de sous-classes.

Texte anglais complet uniquement pour le contenu du SRD 5.1 / 5.2.1 (licence CC-BY-4.0) ;
sinon seulement le nom anglais et le livre d'origine."""
import json, glob, re, sys, os, collections
sys.path.insert(0, os.path.dirname(__file__))
from r5e import entries, tags, esc, ABIL
from dicts import *

ET, REPO = sys.argv[1], sys.argv[2]
J = lambda p: json.load(open(p, encoding='utf-8'))
BOOKS = {b['id']: b['name'] for b in J(ET + '/books.json')['book'] + J(ET + '/adventures.json')['adventure']}
BOOKS.update({'PSA': 'Plane Shift: Amonkhet', 'PSK': 'Plane Shift: Kaladesh', 'TDR': "Tal'Dorei Campaign Setting Reborn",
              'BH': 'Blood Hunter (Matthew Mercer)', 'MM': 'Matthew Mercer (homebrew)', 'HG': "Heliana's Guide to Monster Hunting (Loot Tavern)",
              'HF': "Heliana's Field Notes 2025 (Loot Tavern)", 'AL': "L'Arsène's Ledger of Treasures and Trinkets (Loot Tavern)",
              'RY': "Ryoko's Guide to the Yokai Realms (Loot Tavern)"})
STATS = collections.Counter()


def out(name, src, html=None, lic=None, nolink=False, extra=None):
    o = {'n': name, 's': BOOKS.get(src, src)}
    if html:
        o['h'] = html
        o['l'] = lic
    if nolink:
        o['x'] = 1
    if extra:
        o.update(extra)
    return o


def lic_of(x):
    if x.get('srd52'):
        return '52'
    if x.get('srd'):
        return '51'
    return None


def srd_name(x):
    s = x.get('srd52') or x.get('srd')
    return s if isinstance(s, str) else x['name']


# ---------------- Sorts ----------------
SCH = {'A': 'Abjuration', 'C': 'Conjuration', 'D': 'Divination', 'E': 'Enchantment', 'V': 'Evocation', 'I': 'Illusion', 'N': 'Necromancy', 'T': 'Transmutation'}


def spell_time(s):
    out_ = []
    for t in s.get('time', []):
        u = t['unit']
        u = {'bonus': 'Bonus Action', 'action': 'Action', 'reaction': 'Reaction'}.get(u, u)
        txt = (u if t['number'] == 1 and u in ('Action', 'Bonus Action', 'Reaction') else '%s %s%s' % (t['number'], u, 's' if t['number'] > 1 else ''))
        if t.get('condition'):
            txt += ', ' + tags(t['condition'])
        out_.append(txt)
    if s.get('meta', {}).get('ritual'):
        out_.append('Ritual')
    return ' or '.join(out_)


def spell_range(s):
    r = s.get('range', {}); d = r.get('distance', {})
    t = d.get('type')
    if r.get('type') == 'special':
        return 'Special'
    if t == 'self':
        base = 'Self'
    elif t == 'touch':
        base = 'Touch'
    elif t in ('sight', 'unlimited'):
        base = t.title()
    elif t in ('feet', 'miles'):
        base = '%s %s' % (d['amount'], 'feet' if t == 'feet' else ('mile' if d['amount'] == 1 else 'miles'))
    else:
        base = str(t)
    if r.get('type') in ('radius', 'sphere', 'cone', 'line', 'cube', 'emanation', 'hemisphere', 'cylinder') and t in ('feet', 'miles'):
        return 'Self (%s-%s %s)' % (d['amount'], 'foot' if t == 'feet' else 'mile', r['type'])
    return base


def spell_comp(s):
    c = s.get('components', {})
    p = [k.upper() for k in 'vsr' if c.get(k)]
    if c.get('m'):
        m = c['m']
        p.append('M (%s)' % tags(m['text'] if isinstance(m, dict) else m) if m is not True else 'M')
    return ', '.join(p)


def spell_dur(s):
    out_ = []
    for d in s.get('duration', []):
        t = d['type']
        if t == 'instant':
            out_.append('Instantaneous')
        elif t == 'permanent':
            ends = d.get('ends', [])
            out_.append('Until dispelled' + (' or triggered' if 'trigger' in ends else '') if ends else 'Permanent')
        elif t == 'special':
            out_.append('Special')
        elif t == 'timed':
            a = d['duration']['amount']; u = d['duration']['type']
            v = '%s %s%s' % (a, u, 's' if a > 1 else '')
            if d.get('concentration'):
                v = 'Concentration, up to ' + v
            elif d['duration'].get('upTo'):
                v = 'Up to ' + v
            out_.append(v)
    return ' or '.join(out_)


def spell_html(s):
    lvl = s['level']
    sch = SCH[s['school']]
    head = ('%s cantrip' % sch) if lvl == 0 else ('Level %d %s' % (lvl, sch) if s['source'] == 'XPHB' else '%s-level %s' % ({1: '1st', 2: '2nd', 3: '3rd'}.get(lvl, '%dth' % lvl), sch.lower()))
    if s['source'] == 'XPHB' and lvl == 0:
        head = '%s Cantrip' % sch
    h = '<p class="vo-sub"><i>%s</i></p>' % head
    h += '<p><b>Casting Time:</b> %s<br><b>Range:</b> %s<br><b>Components:</b> %s<br><b>Duration:</b> %s</p>' % (
        spell_time(s), spell_range(s), spell_comp(s), spell_dur(s))
    h += '<p>' + entries(s.get('entries', [])) + '</p>'
    if s.get('entriesHigherLevel'):
        h += '<p>' + entries(s['entriesHigherLevel']) + '</p>'
    return h


def build_spells():
    EN = collections.defaultdict(list)
    for f in glob.glob(ET + '/spells/spells-*.json'):
        for s in J(f)['spell']:
            EN[s['name']].append(s)
    site = J(REPO + '/json/vf/spells.json')
    names = {}
    for l in open(os.path.join(os.path.dirname(__file__), 'sorts_en.txt'), encoding='utf-8'):
        if l.startswith('#') or '=' not in l:
            continue
        fr, en = l.rstrip('\n').split('=', 1)
        names[fr] = en
    res = {}
    for sp in site:
        en = names.get(sp['n'])
        if not en or en == '?' or en not in EN:
            STATS['sorts-absents'] += 1
            continue
        cands = EN[en]
        want = 'PHB' if sp.get('ed') == '2014' else 'XPHB'
        pick = next((c for c in cands if c['source'] == want), None)
        if not pick:
            other = [c for c in cands if c['source'] not in ('PHB', 'XPHB')]
            pick = other[0] if other else cands[0]
        lic = lic_of(pick)
        res[sp['n']] = out(srd_name(pick) if lic else pick['name'], pick['source'], spell_html(pick) if lic else None, lic)
        STATS['sorts-srd' if lic else 'sorts-nom'] += 1
    return res


# ---------------- Objets ----------------
RAR = {'none': '', 'unknown': '', 'unknown (magic)': '', 'varies': 'rarity varies'}
ITYPE = {'W': 'Wondrous Item', 'RG': 'Ring', 'RD': 'Rod', 'WD': 'Wand', 'P': 'Potion', 'SC': 'Scroll', 'ST': 'Staff',
         'LA': 'Light Armor', 'MA': 'Medium Armor', 'HA': 'Heavy Armor', 'S': 'Shield', 'M': 'Melee Weapon', 'R': 'Ranged Weapon',
         'A': 'Ammunition', 'AF': 'Ammunition', 'G': 'Adventuring Gear', 'INS': 'Instrument', 'AT': "Artisan's Tools", 'T': 'Tools',
         'GS': 'Gaming Set', 'SCF': 'Spellcasting Focus', 'TAH': 'Tack and Harness', 'MNT': 'Mount', 'VEH': 'Vehicle', 'SHP': 'Ship',
         'FD': 'Food and Drink', 'TG': 'Trade Good', '$': 'Treasure', 'OTH': 'Other', 'EXP': 'Explosive', 'IDG': 'Illegal Drug'}


def item_sub(x):
    t = (x.get('type') or '').split('|')[0]
    typ = ITYPE.get(t, '')
    if x.get('wondrous'):
        typ = 'Wondrous Item'
    if x.get('staff') and not typ:
        typ = 'Staff'
    if t in ('M', 'R') and x.get('weapon'):
        typ = 'Weapon'
    r = x.get('rarity', '')
    r = RAR.get(r, r)
    att = x.get('reqAttune')
    a = ''
    if att is True:
        a = ' (requires attunement)'
    elif isinstance(att, str):
        a = ' (requires attunement %s)' % tags(att)
    s = ', '.join(p for p in [typ, r] if p)
    return (s[0].upper() + s[1:] if s else '') + a


def item_html(x):
    h = '<p class="vo-sub"><i>%s</i></p>' % esc(item_sub(x)) if item_sub(x) else ''
    body = entries(x.get('entries', []))
    if x.get('items') and not body:
        body = 'Items: ' + ', '.join(i.split('|')[0] for i in x['items'])
    return h + '<p>' + body + '</p>'


def norm_item(n):
    n = n.replace('’', "'").strip()
    return n.lower()


def build_items():
    data = J(ET + '/items.json')
    base = J(ET + '/items-base.json')['baseitem']
    mv = J(ET + '/magicvariants.json')['magicvariant']
    pool = collections.defaultdict(list)
    for x in data['item'] + data['itemGroup'] + base:
        pool[norm_item(x['name'])].append(x)
    for x in mv:
        inh = dict(x.get('inherits', {}))
        y = {'name': x['name'], 'source': inh.get('source', '?'), 'entries': inh.get('entries', x.get('entries', [])),
             'rarity': inh.get('rarity'), 'reqAttune': inh.get('reqAttune'), 'srd52': inh.get('srd52'), 'srd': inh.get('srd'),
             'type': x.get('type', '')}
        pool[norm_item(x['name'])].append(y)
    return pool


ALIAS_ITEMS = {
    'weapon, +1, +2, or +3': '+1 weapon', 'armor, +1, +2, or +3': '+1 armor', 'shield, +1, +2, or +3': '+1 shield (*)',
    'ammunition, +1, +2, or +3': '+1 ammunition', 'wraps of unarmed power, +1, +2 or +3': 'wraps of unarmed power',
    'stone of good luck (luckstone)': 'stone of good luck (luckstone)', 'javelin / spear of backbiting': 'javelin of backbiting',
    'stone / keystone / chip of creation': 'stone of creation', 'reliquary of dawn / twilight': 'reliquary of dawn',
    'hammock of worlds (and lesser)': 'hammock of worlds', "quaal's feather token": "quaal's feather token",
    'scroll of protection': 'scroll of protection', 'spell scroll': 'spell scroll', 'slaying arrow': 'arrow of slaying',
    'potion of resistance': 'potion of resistance', 'ring of resistance': 'ring of resistance',
}


def pick_item(pool, en, ed):
    k = norm_item(en)
    cands = pool.get(k) or pool.get(ALIAS_ITEMS.get(k, '')) or []
    if not cands:
        k2 = re.sub(r'\s*\(.*?\)\s*$', '', k).split(' / ')[0]
        cands = pool.get(k2) or []
    if not cands:
        for suf in (' armor', ' (20)', ' (50)', ' (10)', ' (1 piece)'):
            if pool.get(k + suf):
                cands = pool[k + suf]; break
    if not cands:
        cands = pool.get('+1 ' + k) or pool.get(k + ' (*)') or pool.get(k.replace('worshipping', 'worshiping')) or []
    if not cands:
        cands = next((v for kk, v in pool.items() if kk.startswith(k + ' (')), [])
    if not cands:
        m = re.match(r'(.+?), (.+)$', k)  # « Bottle, Glass » → « Glass Bottle »
        if m:
            cands = pool.get(m.group(2) + ' ' + m.group(1)) or pool.get(m.group(1) + ' (' + m.group(2) + ')') or []
    if not cands:
        return None
    pref = ['DMG', 'PHB'] if ed == '2014' else ['XDMG', 'XPHB']
    for p in pref:
        for c in cands:
            if c['source'] == p:
                return c
    other = [c for c in cands if c['source'] not in ('DMG', 'PHB', 'XDMG', 'XPHB')]
    return other[0] if other else cands[0]


def build_objets(pool):
    res = {}
    for o in J(REPO + '/json/vf/objets.json'):
        x = pick_item(pool, o['en'], o.get('ed'))
        if not x:
            res[o['n']] = out(o['en'], '')
            STATS['objets-nom-seul'] += 1
            continue
        lic = lic_of(x)
        res[o['n']] = out(srd_name(x) if lic else x['name'], x['source'], item_html(x) if lic else None, lic)
        STATS['objets-srd' if lic else 'objets-nom'] += 1
    return res


def build_equipement(pool):
    res = {}
    for o in J(REPO + '/json/vf/equipement.json'):
        x = pick_item(pool, o['en'], None)
        if not x:
            res[o['n']] = out(o['en'], 'XPHB')
            STATS['equip-nom-seul'] += 1
            continue
        lic = lic_of(x)
        html = None
        if lic:
            html = item_html(x) if x.get('entries') else None
            if not html:
                lic_ = None
        res[o['n']] = out(srd_name(x) if lic else x['name'], x['source'], html, lic if html else None)
        STATS['equip-srd' if html else 'equip-nom'] += 1
    return res


# ---------------- Monstres ----------------
SIZE = {'T': 'Tiny', 'S': 'Small', 'M': 'Medium', 'L': 'Large', 'H': 'Huge', 'G': 'Gargantuan'}
AL = {'L': 'Lawful', 'N': 'Neutral', 'C': 'Chaotic', 'G': 'Good', 'E': 'Evil', 'U': 'Unaligned', 'A': 'Any alignment'}
XP = {'0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900,
      '9': 5000, '10': 5900, '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000,
      '19': 22000, '20': 25000, '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000, '26': 90000, '27': 105000,
      '28': 120000, '29': 135000, '30': 155000}
PB = lambda cr: 2 + max(0, (int(eval(cr)) - 1) // 4) if cr not in ('0', '1/8', '1/4', '1/2') else 2
SKILLS = {'perception': 'Perception', 'stealth': 'Stealth', 'sleight of hand': 'Sleight of Hand', 'animal handling': 'Animal Handling'}


def mtype(t):
    if isinstance(t, str):
        return t.title()
    s = t.get('type')
    s = s.get('choose') and ' or '.join(s['choose']) if isinstance(s, dict) else s
    s = str(s).title()
    if t.get('swarmSize'):
        s = 'Swarm of %s %ss' % (SIZE[t['swarmSize']], s)
    if t.get('tags'):
        s += ' (%s)' % ', '.join(x if isinstance(x, str) else x.get('tag', '') for x in t['tags']).title()
    return s


def malign(a):
    if not a:
        return ''
    if isinstance(a[0], dict):
        return ' or '.join(malign(x.get('alignment', [])) for x in a)
    if a == ['A']:
        return 'Any Alignment'
    if a == ['U']:
        return 'Unaligned'
    if a == ['N']:
        return 'Neutral'
    return ' '.join(AL.get(x, x) for x in a)


def mac(ac):
    out_ = []
    for a in ac:
        if isinstance(a, int):
            out_.append(str(a))
        elif 'special' in a:
            out_.append(tags(a['special']))
        else:
            s = str(a['ac'])
            if a.get('from'):
                s += ' (%s)' % ', '.join(tags(f) for f in a['from'])
            if a.get('condition'):
                s += ' ' + tags(a['condition'])
            out_.append(s)
    return ', '.join(out_)


def mspeed(sp):
    out_ = []
    for k in ('walk', 'burrow', 'climb', 'fly', 'swim'):
        if k in sp:
            v = sp[k]
            n = v if isinstance(v, int) else v.get('number')
            c = '' if isinstance(v, int) else ' ' + v.get('condition', '')
            out_.append(('%s ft.' % n if k == 'walk' else '%s %s ft.' % (k.title(), n)) + tags(c).rstrip())
    if sp.get('canHover'):
        out_[-1] += ' (hover)'
    return ', '.join(out_)


def mod(v):
    m = (v - 10) // 2
    return '%+d' % m


def mlist(v):
    out_ = []
    for x in v or []:
        if isinstance(x, str):
            out_.append(x.title() if x.islower() else x)
        elif 'special' in x:
            out_.append(tags(x['special']))
        else:
            k = next((k for k in ('immune', 'resist', 'vulnerable', 'conditionImmune') if k in x), None)
            s = ', '.join(mlist(x[k]).split(', ')) if k else ''
            out_.append(tags((x.get('preNote', '') + ' ' + s + ' ' + x.get('note', '')).strip()))
    return ', '.join(out_)


def block(title, arr, intro=None):
    if not arr:
        return ''
    h = '<h4>%s</h4>' % title
    if intro:
        h += '<p>' + entries(intro) + '</p>'
    for a in arr:
        nm = a.get('name')
        body = entries(a.get('entries', []))
        h += '<p>' + ('<b><i>%s.</i></b> ' % tags(nm) if nm else '') + body + '</p>'
    return h


def monster_html(m):
    t = mtype(m.get('type', ''))
    h = '<p class="vo-sub"><i>%s %s, %s</i></p>' % ('/'.join(SIZE[s] for s in m.get('size', [])), t, malign(m.get('alignment')))
    hp = m.get('hp', {})
    hp = '%s (%s)' % (hp['average'], hp['formula']) if 'average' in hp else tags(hp.get('special', ''))
    ini = ''
    if m.get('initiative') is not None or m['source'] == 'XMM':
        dexm = (m.get('dex', 10) - 10) // 2
        i = m.get('initiative', {})
        prof = i.get('proficiency', 0) if isinstance(i, dict) else 0
        cr = m.get('cr', '0'); cr = cr['cr'] if isinstance(cr, dict) else cr
        val = dexm + prof * PB(cr) if not isinstance(i, int) else i
        if isinstance(i, dict) and 'initiative' in i:
            val = i['initiative']
        ini = '<br><b>Initiative</b> %+d (%d)' % (val, 10 + val)
    h += '<p><b>AC</b> %s%s<br><b>HP</b> %s<br><b>Speed</b> %s</p>' % (mac(m.get('ac', [])), ini, hp, mspeed(m.get('speed', {})))
    h += '<table class="vo-t vo-ab"><tr>' + ''.join('<th>%s</th>' % k.upper() for k in ABIL) + '</tr><tr>' + ''.join(
        '<td>%s (%s)</td>' % (m.get(k, 10), mod(m.get(k, 10))) for k in ABIL) + '</tr></table>'
    rows = []
    if m.get('save'):
        rows.append('<b>Saving Throws</b> ' + ', '.join('%s %s' % (k.title(), v) for k, v in m['save'].items()))
    if m.get('skill'):
        rows.append('<b>Skills</b> ' + ', '.join('%s %s' % (SKILLS.get(k, k.title()), v) for k, v in m['skill'].items() if k != 'other'))
    if m.get('vulnerable'):
        rows.append('<b>Vulnerabilities</b> ' + mlist(m['vulnerable']))
    if m.get('resist'):
        rows.append('<b>Resistances</b> ' + mlist(m['resist']))
    imm = mlist(m.get('immune')); cim = mlist(m.get('conditionImmune'))
    if imm or cim:
        rows.append('<b>Immunities</b> ' + '; '.join(x for x in (imm, cim) if x))
    sens = ', '.join(tags(s) for s in m.get('senses') or [])
    rows.append('<b>Senses</b> ' + (sens + '; ' if sens else '') + 'Passive Perception %s' % m.get('passive', 10))
    rows.append('<b>Languages</b> ' + (', '.join(tags(l) for l in m.get('languages') or []) or 'None'))
    cr = m.get('cr', '0')
    crs = cr['cr'] if isinstance(cr, dict) else cr
    xp = XP.get(crs, 0)
    extra = ''
    if isinstance(cr, dict) and cr.get('xpLair'):
        extra = ', or %s in lair' % format(cr['xpLair'], ',')
    rows.append('<b>CR</b> %s (XP %s%s; PB +%d)' % (crs, format(xp, ','), extra, PB(crs)))
    h += '<p>' + '<br>'.join(rows) + '</p>'
    sc = m.get('spellcasting', [])
    traits = list(m.get('trait', []))
    acts = list(m.get('action', []))
    for s in sc:
        disp = s.get('displayAs', 'trait' if m['source'] != 'XMM' else 'action')
        e = {'name': s.get('name', 'Spellcasting'), 'entries': [{'type': 'spellcasting', **{k: v for k, v in s.items() if k != 'name'}}]}
        (acts if disp == 'action' else traits).append(e)
    h += block('Traits', traits)
    h += block('Actions', acts)
    h += block('Bonus Actions', m.get('bonus'))
    h += block('Reactions', m.get('reaction'))
    h += block('Legendary Actions', m.get('legendary'), m.get('legendaryHeader'))
    h += block('Mythic Actions', m.get('mythic'), m.get('mythicHeader'))
    return h


def build_monsters():
    pool = collections.defaultdict(list)
    for f in glob.glob(ET + '/bestiary/bestiary-*.json'):
        for x in J(f).get('monster', []):
            pool[x['name'].lower()].append(x)
    def pick(en, v):
        k = en.lower().replace('’', "'")
        c = pool.get(k) or pool.get(re.sub(r' \(.*\)$', '', k.split(',')[0])) or pool.get(k.replace('-', ' ')) or []
        if not c:
            return None
        pref = ['XMM', 'XPHB', 'XDMG'] if v == '2024' else ['MM', 'PHB', 'DMG']
        for p in pref:
            for x in c:
                if x['source'] == p:
                    return x
        return c[0]
    res = {}
    for m in J(REPO + '/json/vf/bestiaire.json'):
        x = pick(m['en'], m.get('v'))
        if not x:
            res[m['n']] = out(m['en'], ''); STATS['monstres-nom-seul'] += 1; continue
        lic = lic_of(x)
        res[m['n']] = out(srd_name(x) if lic else x['name'], x['source'], monster_html(x) if lic else None, lic)
        STATS['monstres-srd' if lic else 'monstres-nom'] += 1
    fam = {}
    for m in J(REPO + '/json/vf/familiers.json'):
        x = pick(m['en'], '2014' if '2014' in m.get('src', '') or 'SRD 5.1' in m.get('src', '') else '2024')
        if not x:
            fam[m['n']] = out(m['en'], ''); STATS['familiers-nom-seul'] += 1; continue
        lic = lic_of(x)
        fam[m['n']] = out(srd_name(x) if lic else x['name'], x['source'], monster_html(x) if lic else None, lic)
        STATS['familiers-srd' if lic else 'familiers-nom'] += 1
    return res, fam


# ---------------- Dons, espèces, historiques, états ----------------
def simple(items, fr2en, kind, sitekeys, prefer=('XPHB',)):
    pool = collections.defaultdict(list)
    for x in items:
        pool[x['name'].lower()].append(x)
    res = {}
    for fr in sitekeys:
        en = fr2en.get(fr)
        c = pool.get((en or '').lower()) or []
        if not c:
            STATS[kind + '-absent'] += 1
            if en:
                res[fr] = out(en, '')
            continue
        x = next((y for p in prefer for y in c if y['source'] == p), None) or c[0]
        lic = lic_of(x)
        html = None
        if lic:
            body = entries(x.get('entries', []))
            html = '<p>' + body + '</p>'
        res[fr] = out(srd_name(x) if lic else x['name'], x['source'], html, lic)
        STATS[kind + ('-srd' if lic else '-nom')] += 1
    return res


def feat_html(x):
    pre = ''
    cat = {'O': 'Origin Feat', 'G': 'General Feat', 'FS': 'Fighting Style Feat', 'EB': 'Epic Boon Feat'}.get(x.get('category'), '')
    if 'EI' in x.get('featureType', []):
        cat = 'Eldritch Invocation'
    if x.get('prerequisite'):
        p = x['prerequisite'][0]
        bits = []
        if 'level' in p:
            bits.append('Level %s+' % (p['level'] if isinstance(p['level'], int) else p['level'].get('level')))
        for a in p.get('ability', []):
            bits.append(' or '.join('%s %s+' % (ABIL[k], v) for k, v in a.items()))
        if p.get('level') and isinstance(p['level'], dict) and p['level'].get('class'):
            bits[-1] = 'Level %s+ %s' % (p['level']['level'], p['level']['class']['name'])
        if p.get('spellcasting2020') or p.get('spellcasting'):
            bits.append('Spellcasting or Pact Magic Feature')
        if p.get('feature'):
            bits.append(', '.join(p['feature']))
        if p.get('proficiency'):
            bits.append(', '.join('%s Armor Training' % v.title() for d in p['proficiency'] for v in d.values()))
        if bits:
            pre = ' (Prerequisite: %s)' % ', '.join(bits)
    return '<p class="vo-sub"><i>%s%s</i></p><p>%s</p>' % (cat, pre, entries(x.get('entries', [])))


def build_feats():
    pool = collections.defaultdict(list)
    for x in J(ET + '/feats.json')['feat'] + J(ET + '/optionalfeatures.json')['optionalfeature']:
        pool[x['name'].lower()].append(x)
    res = {}
    for d in J(REPO + '/json/vf/dons.json'):
        en = d.get('en') or FEATS.get(d['nom'])
        c = pool.get((en or '').lower().replace('’', "'")) or []
        old = d.get('ed') == '2014'
        x = (next((y for y in c if y['source'] not in ('XPHB',)), None) if old else next((y for y in c if y['source'] == 'XPHB'), None)) or (c[0] if c else None)
        if not x:
            STATS['dons-absent'] += 1; continue
        lic = lic_of(x)
        res[d['id']] = out(srd_name(x) if lic else x['name'], x['source'], feat_html(x) if lic else None, lic, False,
                           {'i': 1} if 'EI' in x.get('featureType', []) else None)
        STATS['dons-srd' if lic else 'dons-nom'] += 1
    return res


# ---------------- Classes ----------------
def build_classes():
    cls, cf, sc, scf = [], [], [], []
    for f in glob.glob(ET + '/class/class-*.json'):
        d = J(f)
        cls += d.get('class', []); cf += d.get('classFeature', []); sc += d.get('subclass', []); scf += d.get('subclassFeature', [])
    hb = {}
    for f in glob.glob(ET + '/hb/*.json'):
        d = J(f)
        cls += d.get('class', []); cf += d.get('classFeature', []); scf += d.get('subclassFeature', [])
        for s in d.get('subclass', []):
            sc.append(s); hb[s['source']] = f
    CF = {}
    for x in cf:
        CF[(x['name'], x['className'], x['classSource'], x['level'])] = x

    def feat_entries(x, depth=0):
        """Entrées d'une capacité, avec les sous-capacités référencées (refClassFeature) intégrées."""
        h = []
        for e in x.get('entries', []):
            if isinstance(e, dict) and e.get('type') in ('refClassFeature', 'refSubclassFeature'):
                ref = e.get('classFeature') or e.get('subclassFeature')
                p = ref.split('|')
                if e['type'] == 'refClassFeature':
                    sub = CF.get((p[0], p[1], p[2] or 'PHB', int(p[3])))
                else:
                    sub = next((y for y in scf if y['name'] == p[0] and y['className'] == p[1] and y['subclassShortName'] == p[3]
                                and y.get('subclassSource', '') == (p[4] or 'PHB') and y['level'] == int(p[5])), None)
                if sub and depth < 3:
                    h.append('<b><i>%s.</i></b> %s' % (tags(sub['name']), feat_entries(sub, depth + 1)))
            else:
                h.append(entries(e, 1))
        return '<br>'.join(x for x in h if x)

    info = J(REPO + '/json/vf/classes_infos.json')
    caps = J(REPO + '/json/vf/capacites.json')
    res = {'classes': {}, 'capacites': {}, 'sous': {}}
    for fr, en in CLASSES.items():
        src = 'EFA' if en == 'Artificer' else ('BH' if en == 'Blood Hunter' else 'XPHB')
        c = next((x for x in cls if x['name'] == en and (x['source'] == src or en == 'Blood Hunter')), None)
        if not c:
            STATS['classe-absente'] += 1; continue
        csrc = c['source']
        lic = lic_of(c)
        fl_ = sorted({(x['level'], x['name']) for x in cf if x['className'] == en and x['classSource'] == csrc})
        chtml = None
        if lic:
            sp = c.get('startingProficiencies', {})
            sk = ''
            for s_ in sp.get('skills', []):
                ch = s_.get('choose', {})
                if ch:
                    sk = 'Choose %s: %s' % (ch.get('count', 1), ', '.join(x.title() for x in ch.get('from', [])))
                elif s_.get('any'):
                    sk = 'Choose any %s skills' % s_['any']
            rows = [('Primary Ability', ' or '.join(' and '.join(ABIL[k] for k in d_) for d_ in c.get('primaryAbility', []))),
                    ('Hit Point Die', 'D%s per %s level' % (c['hd']['faces'], en)),
                    ('Saving Throw Proficiencies', ' and '.join(ABIL[k] for k in c.get('proficiency', []))),
                    ('Skill Proficiencies', sk),
                    ('Weapon Proficiencies', ', '.join(tags(w if isinstance(w, str) else w.get('proficiency', '')) for w in sp.get('weapons', [])).replace('martial', 'Martial weapons').replace('simple', 'Simple weapons')),
                    ('Tool Proficiencies', ', '.join(tags(w) for w in sp.get('tools', []) if isinstance(w, str))),
                    ('Armor Training', ', '.join({'light': 'Light armor', 'medium': 'Medium armor', 'heavy': 'Heavy armor', 'shield': 'Shields'}.get(a, tags(a)) if isinstance(a, str) else tags(a.get('full', a.get('proficiency', ''))) for a in sp.get('armor', [])))]
            chtml = '<h4>Core %s Traits</h4><table class="vo-t">%s</table><h4>%s Features</h4><p>%s</p>' % (
                en, ''.join('<tr><th>%s</th><td>%s</td></tr>' % (a, b) for a, b in rows if b), en,
                '<br>'.join('Level %d: %s' % (lv, esc(nm)) for lv, nm in fl_))
        res['classes'][fr] = out(en, csrc if en != 'Blood Hunter' else 'BH', chtml, lic, False,
                                 None if lic else {'f': [[lv, nm] for lv, nm in fl_]})
        feats = [x for x in cf if x['className'] == en and x['classSource'] == csrc]
        picks = {}
        for i, f in enumerate(caps.get(fr, [])):
            if f['nom'] == 'Sous-classe':
                continue
            cands = [x for x in feats if x['level'] == f['niv']]
            tr = FEATURES.get(f['nom'])
            m_ = re.search(r'\(([A-Z][^()]*)\)$', f['nom'])
            if m_:
                tr = m_.group(1)
            pick = next((x for x in cands if x['name'] == tr), None) if tr else None
            if not pick and len([x for x in cands if 'Subclass' not in x['name']]) == 1:
                pick = [x for x in cands if 'Subclass' not in x['name']][0]
            if not pick:
                STATS['capacite-absente'] += 1; continue
            picks[fr + '|' + str(f['niv']) + '|' + f['nom']] = pick
        used = {id(p) for p in picks.values()}
        first = {}
        for k, pick in picks.items():
            first.setdefault(pick['level'], k)
        for k, pick in picks.items():
            fl = lic_of(pick)
            html = None
            if fl:
                html = '<p>' + feat_entries(pick) + '</p>'
                if first[pick['level']] == k:
                    for x in feats:
                        if x['level'] == pick['level'] and id(x) not in used and 'Subclass' not in x['name'] and x['name'] != 'Subclass Feature':
                            html += '<p><b><i>%s.</i></b> %s</p>' % (tags(x['name']), feat_entries(x))
            res['capacites'][k] = out(pick['name'], csrc if en != 'Blood Hunter' else 'BH', html, fl)
            STATS['capacite-srd' if fl else 'capacite-nom'] += 1
        for sfr, meta in info['sous'].get(fr, {}).items():
            sen = SUBCLASSES.get(sfr)
            ssrc = meta['src']
            cand = [x for x in sc if x['name'] == sen and x['className'] == en and (x['source'] == ssrc or ssrc in ('TDR', 'MM', 'HG', 'HF', 'AL', 'RY', 'BH'))]
            if not cand:
                STATS['sous-absente'] += 1
                print('sous-classe absente', fr, sfr, sen, ssrc)
                continue
            nfeat = lambda x: sum(1 for y in scf if y['className'] == en and y['subclassShortName'] == x['shortName']
                                  and y['subclassSource'] == x['source'] and y.get('classSource', '') == x.get('classSource', ''))
            s = max(cand, key=lambda x: (nfeat(x), x.get('classSource') in ('XPHB', 'EFA')))
            fs = sorted({(y['level'], y['name']) for y in scf if y['className'] == en and y['subclassShortName'] == s['shortName']
                         and y['subclassSource'] == s['source'] and y.get('classSource', '') == s.get('classSource', '')})
            lic = lic_of(s)
            if lic:
                parts = []
                for y in sorted((y for y in scf if y['className'] == en and y['subclassShortName'] == s['shortName']
                                 and y['subclassSource'] == s['source'] and y.get('classSource') == s.get('classSource')), key=lambda y: y['level']):
                    parts.append('<p><b>Level %d: %s.</b> %s</p>' % (y['level'], tags(y['name']), feat_entries(y)))
                html = ''.join(parts)
            else:
                html = None
            nolink = ssrc in NOLINK
            # liste des noms de capacités par niveau (sans texte) pour le contenu hors SRD
            names = None if lic else [[lv, nm] for lv, nm in fs if nm != s['name']]
            o = out(s['name'], ssrc if ssrc in ('TDR', 'MM', 'HG', 'HF', 'AL', 'RY') else s['source'], html, lic, nolink,
                    {'f': names} if names else None)
            res['sous'][fr + '|' + sfr] = o
            STATS['sous-srd' if lic else 'sous-nom'] += 1
    return res


def build_species():
    races = J(ET + '/races.json')['race']
    pool = collections.defaultdict(list)
    for x in races:
        pool[x['name'].lower()].append(x)
    res = {}
    site = list(J(REPO + '/json/vf/especes.json')) + list(J(REPO + '/json/vf/especes_infos.json').get('extra', {}))
    for fr in site:
        en = SPECIES.get(fr)
        c = pool.get((en or '').lower()) or []
        x = next((y for p in ('XPHB', 'PHB', 'MPMM', 'VRGR', 'AAG', 'ERLW', 'GGR', 'MOT', 'SCC', 'AI', 'EGW') for y in c if y['source'] == p), None) or (c[0] if c else None)
        if not x:
            STATS['especes-absent'] += 1; print('espèce absente', fr, en); continue
        lic = lic_of(x)
        html = None
        if lic:
            sz = {'S': 'Small', 'M': 'Medium'}
            spd = x.get('speed', 30)
            spd = spd if isinstance(spd, int) else spd.get('walk')
            html = '<p class="vo-sub"><i>Creature Type: %s · Size: %s · Speed: %s feet</i></p><p>%s</p>' % (
                str(x.get('creatureTypes', ['humanoid'])[0]).title(), ' or '.join(sz.get(s, s) for s in x.get('size', [])), spd, entries(x.get('entries', [])))
        res[fr] = out(srd_name(x) if lic else x['name'], x['source'], html, lic)
        STATS['especes-srd' if lic else 'especes-nom'] += 1
    return res


def build_backgrounds():
    return simple(J(ET + '/backgrounds.json')['background'], BACKGROUNDS, 'historiques', list(J(REPO + '/json/vf/historiques.json')))


def build_conditions():
    return simple(J(ET + '/conditionsdiseases.json')['condition'], CONDITIONS, 'etats', list(CONDITIONS))


def dump(name, data):
    p = os.path.join(REPO, 'json', 'vo', '%s.json' % name)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    print(name, len(data), os.path.getsize(p) // 1024, 'Ko')


if __name__ == '__main__':
    pool = build_items()
    dump('sorts', build_spells())
    dump('objets', build_objets(pool))
    dump('equipement', build_equipement(pool))
    mon, fam = build_monsters()
    dump('monstres', mon)
    dump('familiers', fam)
    dump('dons', build_feats())
    dump('classes', build_classes())
    dump('especes', build_species())
    dump('historiques', build_backgrounds())
    dump('etats', build_conditions())
    for k, v in sorted(STATS.items()):
        print(k, v)
