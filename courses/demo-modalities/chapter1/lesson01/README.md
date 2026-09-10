# Topic: Sketch the pixel pipeline

## Objective
See the full RGB normalization pipeline as three labeled stages before touching any formula or code.

## Explanation
Displays store color as integers 0-255 per channel, but models need floats 0.0-1.0.
Normalization is one idea with three stages: raw triple in, divide each channel
by 255, normalized triple out. Drawing it first gives you a mental picture every
later formula and line of code hangs onto.

## Example (Look First)
```text
raw [255, 128, 0]  -->  [÷ 255, ÷ 255, ÷ 255]  -->  [1.0, 0.50196, 0.0]
```

**Expected Outcome:** `one sketch: three labeled boxes with arrows, values above`

## Assignment (Sketch on the Canvas)
Draw three boxes labeled IN (write [255, 128, 0]), MATH (write ÷255 under each channel), OUT (write [1.0, 0.50196, 0.0]). Connect them with arrows in order.

## 3. Live Inspection
Before submitting: exactly three boxes, values match the example, arrows flow left to right, no stray marks?

## 4. Curiosity & Simplification
What would break in your sketch if a channel could be 300 instead of 255?

---
*Modality: Drawing | Pedagogy: Solveit (Fast.ai / Answer.AI)*
