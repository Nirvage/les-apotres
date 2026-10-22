"""Rendu HTML des entrées 5etools (texte anglais d'origine)."""
import re, html

ABIL = {'str': 'Strength', 'dex': 'Dexterity', 'con': 'Constitution', 'int': 'Intelligence', 'wis': 'Wisdom', 'cha': 'Charisma'}
ATK = {'m': 'Melee', 'r': 'Ranged', 'mw': 'Melee Weapon', 'rw': 'Ranged Weapon', 'ms': 'Melee Spell', 'rs': 'Ranged Spell',
       'mw,rw': 'Melee or Ranged Weapon', 'ms,rs': 'Melee or Ranged Spell', 'm,r': 'Melee or Ranged'}


def esc(s):
    return html.escape(str(s), quote=False)


def _tag(tag, body):
    parts = body.split('|')
    first = parts[0]
    if tag in ('b', 'bold'):
        return '<b>' + tags(body) + '</b>'
    if tag in ('i', 'italic'):
        return '<i>' + tags(body) + '</i>'
    if tag in ('u', 'underline', 's', 'strike', 'sup', 'sub', 'code', 'kbd', 'style', 'font', 'color', 'highlight', 'help', 'tip'):
        return tags(first)
    if tag in ('h',):
        return '<i>Hit:</i> '
    if tag == 'm':
        return '<i>Miss:</i> '
    if tag == 'hom':
        return '<i>Hit or Miss:</i> '
    if tag == 'atk':
        return '<i>' + ATK.get(first, first) + ' Attack:</i>'
    if tag == 'atkr':
        return '<i>' + ATK.get(first, first) + ' Attack Roll:</i>'
    if tag == 'actSave':
        return '<i>' + ABIL.get(first, first) + ' Saving Throw:</i>'
    if tag == 'actSaveFail':
        return '<i>Failure' + (' by ' + first if first else '') + ':</i>'
    if tag == 'actSaveSuccess':
        return '<i>Success:</i>'
    if tag == 'actSaveSuccessOrFail':
        return '<i>Failure or Success:</i>'
    if tag == 'actTrigger':
        return '<i>Trigger:</i>'
    if tag == 'actResponse':
        return '<i>Response' + (' ' + first if first else '') + ':</i>'
    if tag == 'recharge':
        return '(Recharge ' + (first + '–6' if first and first != '6' else '6') + ')'
    if tag == 'hit':
        return first if first.startswith(('+', '-')) else '+' + first
    if tag == 'd20':
        return (parts[1] if len(parts) > 1 and parts[1] else (first if first.startswith(('+', '-')) else '+' + first))
    if tag == 'dc':
        return 'DC ' + (parts[1] if len(parts) > 1 and parts[1] else first)
    if tag == 'chance':
        return (parts[1] if len(parts) > 1 and parts[1] else first + ' percent')
    if tag in ('scaledamage', 'scaledice'):
        return parts[2] if len(parts) > 2 else first
    if tag in ('dice', 'damage', 'autodice'):
        return parts[1] if len(parts) > 1 and parts[1] else first
    if tag == 'skillCheck':
        a = first.split(' ')
        return ' '.join(a[:-1]).replace('_', ' ').title() + ' check (DC ' + a[-1] + ')' if len(a) > 1 else first
    if tag == 'coinflip':
        return parts[1] if len(parts) > 1 and parts[1] else 'flip a coin'
    if tag in ('note',):
        return '<i>' + tags(body) + '</i>'
    if tag in ('filter',):
        return tags(first)
    if tag in ('area',):
        return parts[2] if len(parts) > 2 else first
    if tag in ('5etools', 'link', 'book', 'adventure', 'quickref'):
        return tags(first) if tag not in ('book', 'adventure') else tags(first)
    # références (spell, item, creature, condition, variantrule…) : texte affiché = 3e partie sinon 1re
    disp = parts[2] if len(parts) > 2 and parts[2] else first
    if tag in ('class',) and len(parts) > 3 and parts[3]:
        disp = parts[3] if not parts[2] else parts[2]
    if tag in ('classFeature', 'subclassFeature'):
        disp = parts[-1] if len(parts) > 5 and parts[-1] else first
    return tags(disp)


TAG = re.compile(r'\{@(\w+)(?: ([^{}]*))?\}')


def tags(s):
    s = str(s)
    prev = None
    while prev != s:
        prev = s
        s = TAG.sub(lambda m: _tag(m.group(1), m.group(2) or ''), s)
    return s


def _cell(c):
    if isinstance(c, dict):
        if c.get('type') == 'cell':
            r = c.get('roll', {})
            if 'exact' in r:
                return str(r['exact'])
            if 'min' in r:
                return '%s–%s' % (r['min'], r['max']) if r['min'] != r['max'] else str(r['min'])
            return entries(c.get('entry', ''), inline=True)
        return entries(c, inline=True)
    return tags(c)


def entries(e, depth=0, inline=False):
    if e is None:
        return ''
    if isinstance(e, list):
        out = [entries(x, depth, inline) for x in e]
        return ('<br>' if not inline else ' ').join(o for o in out if o)
    if isinstance(e, str):
        return tags(e)
    if isinstance(e, (int, float)):
        return str(e)
    t = e.get('type', 'entries')
    name = e.get('name')
    if t in ('entries', 'section', 'inset', 'insetReadaloud', 'variant', 'variantInner', 'variantSub', 'optfeature', 'inline', 'inlineBlock'):
        body = entries(e.get('entries', []), depth + 1, t in ('inline', 'inlineBlock'))
        if t in ('inline', 'inlineBlock'):
            return ''.join(entries(x, depth, True) for x in e.get('entries', []))
        if name:
            if depth == 0 and t not in ('inset', 'variant'):
                return '<b><i>' + tags(name) + '.</i></b> ' + body
            return '<b><i>' + tags(name) + '.</i></b> ' + body
        return body
    if t in ('quote',):
        return '<i>' + entries(e.get('entries', []), depth + 1) + '</i>' + (' — ' + tags(e['by']) if e.get('by') else '')
    if t == 'list':
        items = []
        for it in e.get('items', []):
            items.append('<li>' + entries(it, depth + 1) + '</li>')
        return '<ul>' + ''.join(items) + '</ul>'
    if t in ('item', 'itemSub', 'itemSpell'):
        body = entries(e.get('entries', e.get('entry', '')), depth + 1)
        return ('<b><i>' + tags(name) + '</i></b> ' if name else '') + body
    if t == 'table':
        h = ''
        if e.get('caption'):
            h += '<b>' + tags(e['caption']) + '</b>'
        h += '<table class="vo-t">'
        if e.get('colLabels'):
            h += '<tr>' + ''.join('<th>' + tags(c) + '</th>' for c in e['colLabels']) + '</tr>'
        for row in e.get('rows', []):
            if isinstance(row, dict):
                row = row.get('row', [])
            h += '<tr>' + ''.join('<td>' + _cell(c) + '</td>' for c in row) + '</tr>'
        h += '</table>'
        if e.get('footnotes'):
            h += entries(e['footnotes'], depth + 1)
        return h
    if t == 'tableGroup':
        return entries(e.get('tables', []), depth)
    if t == 'abilityDc':
        return '<b>%s save DC</b> = 8 + your Proficiency Bonus + your %s modifier' % (tags(name), ' or '.join(ABIL[a] for a in e['attributes']))
    if t == 'abilityAttackMod':
        return '<b>%s attack modifier</b> = your Proficiency Bonus + your %s modifier' % (tags(name), ' or '.join(ABIL[a] for a in e['attributes']))
    if t == 'abilityGeneric':
        return '<b>' + (tags(name) + '</b> = ' if name else '</b>') + tags(e.get('text', ''))
    if t in ('refClassFeature', 'refSubclassFeature', 'refOptionalfeature', 'refFeat'):
        return ''
    if t == 'options':
        return entries(e.get('entries', []), depth + 1)
    if t in ('image', 'gallery', 'statblock', 'statblockInline', 'flowchart', 'hr', 'spellcasting', 'homebrew', 'internalLinks', 'link', 'dice', 'pf2-h1'):
        if t == 'spellcasting':
            return spellcasting(e)
        return ''
    if t == 'bonus':
        return ('+' if e['value'] >= 0 else '') + str(e['value'])
    if t == 'bonusSpeed':
        return ('+' if e['value'] >= 0 else '') + str(e['value']) + ' ft.'
    if t == 'attack':
        return '<i>' + ATK.get(e.get('attackType', ''), '') + ' Attack:</i> ' + entries(e.get('attackEntries', []), depth, True) + ' <i>Hit:</i> ' + entries(e.get('hitEntries', []), depth, True)
    if 'entries' in e:
        return entries(e['entries'], depth + 1)
    if 'entry' in e:
        return entries(e['entry'], depth + 1)
    return ''


def spellcasting(sc):
    out = []
    head = entries(sc.get('headerEntries', []))
    if head:
        out.append(head)
    if sc.get('will'):
        out.append('<b>At will:</b> ' + ', '.join(tags(x) for x in sc['will']))
    for k, lbl in (('daily', '/day'), ('rest', '/rest'), ('weekly', '/week'), ('restLong', '/long rest'), ('recharge', '')):
        for n, lst in (sc.get(k) or {}).items():
            each = n.endswith('e')
            out.append('<b>%s%s%s:</b> ' % (n.rstrip('e'), lbl, ' each' if each else '') + ', '.join(tags(x) for x in lst))
    for lvl, d in sorted((sc.get('spells') or {}).items()):
        lbl = 'Cantrips (at will)' if lvl == '0' else 'Level %s (%s slots)' % (lvl, d.get('slots', '?')) if 'slots' in d else 'Level ' + lvl
        out.append('<b>%s:</b> ' % lbl + ', '.join(tags(x) for x in d.get('spells', [])))
    foot = entries(sc.get('footerEntries', []))
    if foot:
        out.append(foot)
    nm = sc.get('name')
    body = '<br>'.join(out)
    return ('<b><i>' + tags(nm) + '.</i></b> ' if nm else '') + body
