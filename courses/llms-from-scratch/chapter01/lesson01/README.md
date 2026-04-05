# Lesson 1: The Periphery of Llama 3

Before we look at the internal Transformer blocks (which repeat 32 times for Llama 3 8B), we need to understand how tokens enter and exit the model.

### Your Goal:
Draw the entry point (Token embeddings) and the exit point (Final Norm and Output projection) of the Llama 3 architecture.

### Instructions:
1. At the very bottom, draw the **Token embedding layer** box and the arrow leading into it from "Tokenized text".
2. At the very top, draw the **Final RMSNorm** box and the **Linear output layer** box, with the arrow pointing out to the upper output.
3. Be sure to connect them properly to the main 32x repeated central block!
