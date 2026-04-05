Now it's time for the ultimate test! Can you draw the full Llama 3 architecture from memory?

Your goal is to construct the entire transformer block pipeline within the provided template. You have been given the outer structural boundary and the foundational input/output elements.

Using the drawing tools on your canvas, your tasks are to:
1. Draw and label the **RMS Norm** blocks at the start of both major computational paths.
2. Outline and label the **Grouped-Query Attention** block, specifically illustrating how the Query (Q) separates from the grouped Key (K) and Value (V) paths.
3. Draw the **Feed Forward** neural network structure. Make sure you break it down to show the two parallel branches leading into the final `Linear` down-projection, and label the `SiLU` activation function on the left branch!
4. Use the new **Arrow tool** to draw all the internal routing paths connecting these blocks back into the main residual stream.
5. Use the **Text tool** to neatly label `RMS Norm`, `Grouped-Query Attention`, `Feed Forward`, `Linear`, and `SiLU`.

Good luck!
