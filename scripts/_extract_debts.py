import re

text = open('docs/TECH_DEBT_BOARD.md').read()
# The board may have wrapped rows where continuation lines start with a cell delimiter.
# Rows start with `| **TD-` or `| TD-`. Extract the ID from the first cell of each row start.
lines = text.split('\n')
ids = []
for l in lines:
    m = re.match(r'^\| \*\*(TD-[A-Z0-9-]+)\*\*|^\| (TD-[A-Z0-9-]+)\b', l)
    if m:
        ids.append(m.group(1) or m.group(2))
print('unique ids:', sorted(set(ids)))
