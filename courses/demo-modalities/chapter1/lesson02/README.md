# Topic: Normalize a pixel with formulas

## Objective
Compute normalized channel values with spreadsheet formulas, one cell at a time.

## Explanation
Dividing by 255 maps the 0-255 display range onto 0.0-1.0 math range. Doing it
in cells makes each intermediate value visible: you see 128 become 0.50196
before any code hides the arithmetic inside a function.

## Example (Predict First)
Open your provisioned sheet copy and find these starter cells:
```text
B1=255, C1=128, D1=0  -->  B2, C2, D2 hold each channel ÷ 255
```

**Expected Outcome:** `B2=1, C2=0.50196, D2=0 and G2:G4 all TRUE`

## Assignment (Formulas, Not Code)
In B2 enter `=ROUND(B1/255,5)`, fill it right to D2. Predict each result before
pressing Enter. The G-column checks turn TRUE when a channel is right.

## 3. Live Inspection
Before checking: predict what C2 shows for 128. Then look at G2:G4 — all TRUE?

## 4. Curiosity & Simplification
What single formula in B2 (filled right) replaces all three cells? Try `=ARRAYFORMULA`.

---
*Modality: Spreadsheet | Pedagogy: Solveit (Fast.ai / Answer.AI)*
