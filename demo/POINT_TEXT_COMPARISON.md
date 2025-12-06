# Point Text Comparison: Demo vs iOS

## Summary
The demo's `points.json` has **several differences** from iOS localization strings. Most locations match, but there are significant differences in stimulation methods.

## Differences Found

### LU-8 (Lung-8)
**Location:** ✅ Same
**Stimulation:**
- Demo: "Press into the point and rub **it** deeply with a firm pressure..."
- iOS: "Press into the point and rub deeply with a firm pressure..."
- **Difference:** Demo has extra "it"

### ST-36 (Stomach-36)
**Location:**
- Demo: "It may **sore** when you press into it." ❌ (grammar error - missing "be")
- iOS: "It may **be sore** when you press into it." ✅
- **Difference:** Demo has grammar error

**Stimulation:** ✅ Same

### SP-3 (Spleen-3)
**Location:** ✅ Same
**Stimulation:**
- Demo: "...rubbing into **the bone** and will **likely** be sore."
- iOS: "...rubbing into **the base of the bone** and will **often** be sore."
- **Difference:** "the bone" vs "the base of the bone", "likely" vs "often"

### HT-8 (Heart-8)
**Location:**
- Demo: "The point is where your pinky touches the crease **between the bones**."
- iOS: "The point is **found** where your pinky touches the crease."
- **Difference:** Demo adds "between the bones", iOS adds "found"

**Stimulation:**
- Demo: "Use your **index finger or knuckle** to press **this point that is** between the bones. Press firmly and rub in an **up and down motion**."
- iOS: "Use **any finger or your knuckle** to press **into this point**. It is between the bones so you have to press firmly. You can use a **press and release, press and release techniue**."
- **Difference:** Completely different text

### SI-5 (Small Intestine-5)
**Location:** ✅ Same
**Stimulation:** ✅ Same

### BL-66 (Bladder-66)
**Location:** ✅ Same
**Stimulation:**
- Demo: "Use your index or middle finger to rub into the base of the big bone. **It may be sore so be both firm and gentle.**"
- iOS: "Use your index or middle finger to rub into the base of the big bone. **It's easier to do if your leg is crossed over your knee.**"
- **Difference:** Different ending text

### KI-10 (Kidney-10)
**Location:** ✅ Same
**Stimulation:**
- Demo: "**Rub your thumb around this area.** It will be sore don't press too hard. Apply a firm pressure and you press into the point and a press and release method."
- iOS: "**Press your thumb into this area.** Use a press and release, press and release technique as shown in the video."
- **Difference:** Different approach and wording

### PC-8 (Pericardium-8)
**Location:** ✅ Same
**Stimulation:**
- Demo: "Press between the bones with your **index finger, thumb or knuckle**. Press firmly and rub **back and forth**."
- iOS: "Use **any finger or your knuckle** to press into this point. It is between the bones so you have to press firmly. You can use a **press and release, press and release techniue**."
- **Difference:** Different text

### SJ-6 (San Jiao-6)
**Location:** ✅ Same
**Stimulation:**
- Demo: "Use your index finger or thumb to press between the bones and into the point."
- iOS: "Use your index finger or thumb to press between the bones and into the point **while moving your wrist back and forth as in the video**."
- **Difference:** iOS adds wrist movement instruction

### GB-41 (Gall Bladder-41)
**Location:** ✅ Same
**Stimulation:**
- Demo: "Press into the depression and rub up and down while maintaining a steady pressure."
- iOS: "**Cross your leg over your knee or lean over if you have enough room.** Press into the depression and rub into the point while maintaining a steady pressure."
- **Difference:** iOS adds positioning instruction

### LIV-1 (Liver-1)
**Location:** ✅ Same
**Stimulation:**
- Demo: "Use your index finger to press into this point and rub it around with a firm pressure."
- iOS: "Press into this point and rub it with a firm pressure. Steady pressure works as well. It can be done with your foot on the floor or with your foot crossed over your knee."
- **Difference:** iOS has more detailed instructions

### LI-1 (Large Intestine-1)
**Location:** ✅ Same
**Stimulation:**
- Demo: "Press into this point and rub it with a firm pressure **for about a minute**."
- iOS: "Press into this point and rub it with a firm pressure. **Steady pressure works as well.**"
- **Difference:** Different ending

## Recommendation

**Phase 3 should include updating `points.json` to match iOS localization exactly.** This ensures consistency across platforms and uses the official, reviewed text.

## Points That Need Updates

1. **LU-8** - Remove "it" from stimulation
2. **ST-36** - Fix grammar: "may be sore" not "may sore"
3. **SP-3** - Change "the bone" to "the base of the bone", "likely" to "often"
4. **HT-8** - Update both location and stimulation to match iOS
5. **BL-66** - Update stimulation ending
6. **KI-10** - Update stimulation method
7. **PC-8** - Update stimulation method
8. **SJ-6** - Add wrist movement instruction
9. **GB-41** - Add positioning instruction
10. **LIV-1** - Update stimulation with full iOS text
11. **LI-1** - Update stimulation ending

