#!/usr/bin/env python3
"""Convert symbols back to emoji faces in survey.html"""

import re

# Read the file
with open('survey.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all symbols with emoji
replacements = {
    '●○○○○': '😊',  # None - happy
    '●●○○○': '🙂',  # Mild - slight smile
    '●●●○○': '😐',  # Moderate - neutral
    '●●●●○': '🙁',  # Bad - sad
    '●●●●●': '😢',  # Severe - crying
    '○○○○○': '➖'   # N/A - dash
}

for symbol, emoji in replacements.items():
    content = content.replace(f'class="rating-symbol">{symbol}', f'class="rating-emoji">{emoji}')

# Also update class names
content = content.replace('rating-symbols', 'rating-emojis')
content = content.replace('rating-symbol', 'rating-emoji')

# Write back
with open('survey.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Converted all symbols back to emoji faces")
