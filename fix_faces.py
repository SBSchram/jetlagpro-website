#!/usr/bin/env python3
"""Fix all rating faces in survey.html"""

import re

# Face mapping
faces = {
    '1': '😊',  # None/Happy
    '2': '🙂',  # Mild/Slightly happy  
    '3': '😐',  # Moderate/Neutral
    '4': '🙁',  # Bad/Sad
    '5': '😢'   # Severe/Crying
}

# Read the file
with open('survey.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix all faces - find value="X" followed by rating-face and replace the emoji
for value, face in faces.items():
    # Pattern to match value="X" ... class="rating-face">😊
    pattern = rf'(value="{value}"[^>]*>\s*<label[^>]*class="rating-face">)😊'
    replacement = rf'\1{face}'
    content = re.sub(pattern, replacement, content)

# Also fix any remaining incorrect faces
for value, face in faces.items():
    # More general pattern to catch any incorrect face for this value
    pattern = rf'(value="{value}"[^>]*>\s*<label[^>]*class="rating-face">)[😊🙂😐🙁😢]'
    replacement = rf'\1{face}'
    content = re.sub(pattern, replacement, content)

# Write back
with open('survey.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed all rating faces in survey.html")
