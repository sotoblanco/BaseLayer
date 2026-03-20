# Lesson 11: The Architecture Blueprint (Final Challenge)

"Excellent," your interviewer says. "You've shown me the high-level stack. But now, I want to see if you understand how these layers actually **collaborate** to execute a single calculation like `z = x + y`."

They point to a whiteboard with 4 empty layers. 

> "Every calculation in TinyTorch is a handoff between four distinct **Roles**. I want you to place each role in its correct layer, provide **one specific technical example** for each, and draw the flow of control."

### Your Task: The Role-Based Blueprint

This is the final test of Chapter 1. You need to demonstrate that you understand both the *structure* of the architecture and the *implementation* details that make it work.

**The 4 Roles you must map:**
1.  **The Entry Point**: Where the user triggers the calculation in their script.
2.  **The Orchestrator**: The logic in the framework that manages the `Tensor` objects and calls the backend. 
3.  **The Numerical Workhorse**: The specialized library that performs the actual vector math.
4.  **The Physical Execution**: The specific mechanism in the hardware that allows for high-speed computation.

**How to complete the "Whiteboard Test":**
- **Place the Roles**: Correctly identify which role belongs in which of the 4 architectural layers.
- **Provide Examples**: Inside each box, write **one specific example** we've discussed (e.g., a magic method name, a library name, or a hardware instruction set).
- **Draw the Flow**: Connect the layers with arrows showing how the operation travels from the user down to the silicon. Label these arrows as **"Dispatch"** or **"Execution"**.

### Why this matters

As a framework engineer, you need to know exactly which role Each layer plays. This allows you to scale the system, swap backends (like moving to a GPU), and debug the exact point where a calculation might be failing or slow.

**Master this blueprint, and you have officially completed Chapter 1!**

> [!TIP]
> Think about the "seams" between the layers. The **Orchestrator** is the bridge between the user's high-level intent and the backend's raw numerical power.
