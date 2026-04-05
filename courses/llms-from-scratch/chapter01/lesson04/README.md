# Lesson 4: The SwiGLU Feed Forward Network

Llama 3 abandons standard ReLU FFNs in favor of the SwiGLU structure. This architecture is highlighted in the detailed breakout box on the right side of the diagram.

### Your Goal:
Draw the internal routing of data through the SwiGLU network inside the detailed Feed Forward breakout box.

### Instructions:
1. Look at the large dotted breakout box connected to "Feed forward".
2. You will notice the incoming data (from the bottom) splits into two parallel paths. 
3. Draw the right path connecting directly into a **Linear layer** box.
4. Draw the left path going through a **Linear layer** box, and then connecting to the **SiLU activation** box.
5. Draw the Element-wise Multiplication circle (with the `X` inside) combining the outputs of those two paths.
6. Route the combined result of that multiplication upwards into the final **Linear layer** box to exit the network.
