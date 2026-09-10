# Topic: Implement normalize_pixel

## Objective
Turn the sheet math into a tested 1-line Python function.

## Explanation
The function does exactly what your B2:D2 row did: scale each 0-255 channel
into 0.0-1.0. Same values as the sketch and the sheet — now captured as a
reusable, unit-tested primitive.

## Example (Predict First)
Before writing any code, examine this minimal sample:
```text
normalize_pixel([255, 128, 0])
```

**Expected Outcome:** `[1.0, 0.50196, 0.0]`

## Assignment (1 to 3 Lines)
In `normalize_pixel()`, return each channel divided by 255.0, rounded to 5 decimals.

## 3. Live Inspection
Run `print(normalize_pixel([255, 0, 0]))` — first element 1.0, rest 0.0?

## 4. Curiosity & Simplification
Can you drop the rounding and still pass by comparing with `pytest.approx`-style tolerance? Why do the tests pin exact values here?

---
*Modality: Code | Pedagogy: Solveit (Fast.ai / Answer.AI)*
