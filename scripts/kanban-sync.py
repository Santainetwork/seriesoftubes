"""Jaga papan kanban dan Virtual Office tetap sepakat.

Dua hal yang mudah terpisah:

1. Kartu ditugaskan ke `default`. Profil itu sengaja disembunyikan kantor (ia orchestrator,
   bukan kolega), jadi pekerjaannya berjalan tanpa avatar dan tidak bisa dipantau. Skrip ini
   memindahkan kartu seperti itu ke agent yang punya wajah, memilih yang paling sedikit
   bebannya.

2. Status papan hanya terlihat kalau kantor dibuka. Skrip ini juga menulis
   docs/KANBAN_STATUS.md supaya bisa dibaca dari repo.

Pakai:
    python3 scripts/kanban-sync.py            # laporkan + tulis status
    python3 scripts/kanban-sync.py --fix      # sekaligus pindahkan kartu dari default
"""
import json
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

OFFICE = 'http://127.0.0.1:3001'
# Profil yang punya avatar di kantor, dalam urutan preferensi kalau bebannya sama.
VISIBLE = ['deepseek-dev', 'glm-dev', 'spark-dev', 'asoy']


def api(path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {'Content-Type': 'application/json', 'Origin': OFFICE} if payload else {}
    req = urllib.request.Request(OFFICE + path, data=data, headers=headers,
                                 method='POST' if payload else 'GET')
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except Exception as e:
        return {'error': str(e)}


def cli(*args):
    r = subprocess.run(['hermes', 'kanban'] + list(args), capture_output=True, text=True,
                       timeout=90)
    return (r.stdout or '') + (r.stderr or '')


def move_off_default(tasks, fix):
    """Kartu yang masih dipegang `default` tidak akan terlihat di kantor."""
    stuck = [t for t in tasks if (t.get('assignee') == 'default'
                                  and t.get('status') not in ('done', 'archived'))]
    if not stuck:
        return []
    load = {n: 0 for n in VISIBLE}
    for t in tasks:
        a = t.get('assignee')
        if a in load and t.get('status') not in ('done', 'archived'):
            load[a] += 1

    moved = []
    for t in stuck:
        target = min(VISIBLE, key=lambda n: (load[n], VISIBLE.index(n)))
        if fix:
            out = cli('reassign', t['id'], target, '--reclaim', '--reason',
                      'Dipindah dari default: profil orchestrator sengaja disembunyikan di '
                      'Virtual Office, jadi pekerjaannya tidak bisa dipantau.')
            ok = 'Reassigned' in out
            moved.append((t['id'], t['title'], target, ok))
            if ok:
                load[target] += 1
        else:
            moved.append((t['id'], t['title'], target, None))
    return moved


def write_status(tasks, board):
    order = ['running', 'ready', 'todo', 'blocked', 'scheduled', 'review', 'done', 'archived']
    by = {}
    for t in tasks:
        by.setdefault(t.get('status', '?'), []).append(t)

    lines = [
        '# Status papan kanban',
        '',
        'Dibuat otomatis oleh `scripts/kanban-sync.py`. Sumbernya sama dengan Virtual Office',
        '(`http://127.0.0.1:3001`): keduanya membaca board SQLite `default`.',
        '',
        'Diperbarui: ' + datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'),
        '',
        '| status | jumlah |',
        '|---|---|',
    ]
    for st in order:
        if st in by:
            lines.append('| %s | %d |' % (st, len(by[st])))
    lines.append('| **total** | **%d** |' % len(tasks))
    lines.append('')

    agents = {}
    for t in tasks:
        if t.get('status') in ('done', 'archived'):
            continue
        a = t.get('assignee') or '(tanpa pemilik)'
        agents[a] = agents.get(a, 0) + 1
    if agents:
        lines += ['## Beban per agent', '', '| agent | kartu terbuka |', '|---|---|']
        for a, n in sorted(agents.items(), key=lambda x: -x[1]):
            lines.append('| %s | %d |' % (a, n))
        lines.append('')

    for st in order:
        if st not in by:
            continue
        lines += ['## ' + st, '']
        for t in sorted(by[st], key=lambda x: (x.get('priority') or 0, x.get('createdAt') or '')):
            pr = t.get('priority')
            tag = ('p%d ' % pr) if pr is not None else ''
            lines.append('- `%s` %s%s — %s' % (t['id'], tag, t['title'], t.get('assignee') or '-'))
        lines.append('')

    waiting = (board.get('board') or {}).get('waitingOnHuman') or []
    if waiting:
        lines += ['## Menunggu keputusan manusia', '']
        for w in waiting:
            lines.append('- `%s` %s' % (w.get('id'), w.get('title')))
            reason = (w.get('reason') or {}).get('reason')
            if reason:
                lines.append('  - %s' % reason)
        lines.append('')

    open('docs/KANBAN_STATUS.md', 'w').write('\n'.join(lines))


def main():
    fix = '--fix' in sys.argv
    data = api('/api/hermes/tasks')
    board = api('/api/hermes/board')
    if 'tasks' not in data:
        print('kantor tidak menjawab:', data)
        return 1

    tasks = data['tasks']
    moved = move_off_default(tasks, fix)
    if moved:
        print('kartu dipegang `default` (tak terlihat di kantor): %d' % len(moved))
        for tid, title, target, ok in moved:
            state = '' if ok is None else (' -> ' + target if ok else ' GAGAL')
            print('  %s %s%s' % (tid, title[:52], state))
        if not fix:
            print('  jalankan dengan --fix untuk memindahkannya')

    agents = api('/api/hermes/agents')
    if 'available' in agents:
        print('\nagent di kantor:')
        for a in agents['available']:
            print('  %-13s %-28s %s kartu' % (a['name'], a.get('model') or '-', a.get('total', 0)))
        if agents.get('hidden'):
            print('  disembunyikan:', ', '.join(agents['hidden']))

    write_status(tasks, board)
    by = {}
    for t in tasks:
        by[t.get('status', '?')] = by.get(t.get('status', '?'), 0) + 1
    print('\nkartu: %d  %s' % (len(tasks), by))
    return 0


if __name__ == '__main__':
    sys.exit(main())
