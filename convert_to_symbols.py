#!/usr/bin/env python3
"""Convert emoji faces to circle symbols in survey.html"""

import re

# Symbol mapping
symbols = {
    '1': '●○○○○',  # None - 1 filled
    '2': '●●○○○',  # Mild - 2 filled  
    '3': '●●●○○',  # Moderate - 3 filled
    '4': '●●●●○',  # Bad - 4 filled
    '5': '●●●●●'   # Severe - 5 filled
}

# Read the file
with open('survey.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all emoji faces with symbols
for value, symbol in symbols.items():
    # Pattern to match value="X" ... class="rating-face">emoji
    pattern = rf'(value="{value}"[^>]*>\s*<label[^>]*class="rating-face">)[😊🙂😐🙁😢]'
    replacement = rf'\1{symbol}'
    content = re.sub(pattern, replacement, content)

# Also replace class names
content = content.replace('rating-face', 'rating-symbol')

# Handle the N/A option (value="0") 
content = re.sub(r'(value="0"[^>]*>\s*<label[^>]*class="rating-symbol[^"]*">)➖', r'\1○○○○○', content)

# Write back
with open('survey.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Converted all emoji faces to circle symbols")
