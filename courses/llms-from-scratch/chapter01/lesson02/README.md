# Lesson 2: Pre-Normalization and Residuals

Llama 3 uses a "Pre-Norm" architecture. This means normalization happens immediately *before* the Attention and Feed Forward blocks, while residual (skip) connections bypass those blocks and add their original value to the output.

### Your Goal:
Draw the addition operations and the residual connections around the two main sub-layers inside the central, repeated Transformer block.

### Instructions:
1. Inside the dark central block, find the spots where the skipped data merges back with the processed data. Draw the two `+` (addition) operation circles.
2. Draw the path (the line and arrow) that bypasses **RMSNorm 1** and the **Attention** module, feeding straight into the first `+`.
3. Draw the path that bypasses **RMSNorm 2** and the **Feed forward** module, feeding into the second `+` circle.
