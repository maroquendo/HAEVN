# HAEVN Directives

This folder contains Standard Operating Procedures (SOPs) written in Markdown.

## Purpose
Directives define **what** to do — the goals, inputs, tools/scripts to use, outputs, and edge cases. They are natural language instructions that the orchestration layer (AI) reads and executes.

## Creating Directives
Each directive should include:
- **Goal**: What this directive accomplishes
- **Inputs**: What data/information is needed
- **Tools**: Which scripts in `execution/` to use
- **Outputs**: What the expected result looks like
- **Edge Cases**: Known issues and how to handle them

## Example Structure
```markdown
# Directive: [Name]

## Goal
[What this accomplishes]

## Inputs
- [Required input 1]
- [Required input 2]

## Tools
- `execution/script_name.py` - [What it does]

## Outputs
- [Expected output]

## Edge Cases
- [Known issue] → [How to handle]
```
