from pathlib import Path
import re

xml = Path(r'C:/Users/Steve/Documents/GitHub/jetlagpro-website/_temp_docx/word/document.xml').read_text(encoding='utf-8')

text = re.sub(r'<w:br[^/]*/>', '\n', xml)
text = re.sub(r'</w:p>', '\n', text)
text = re.sub(r'<[^>]+>', '', text)

lines = [l.rstrip() for l in text.splitlines()]
out = []
prev_blank = False
for l in lines:
    if l == '':
        if not prev_blank:
            out.append(l)
        prev_blank = True
    else:
        out.append(l)
        prev_blank = False

print('\n'.join(out))
