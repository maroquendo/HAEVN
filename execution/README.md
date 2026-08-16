# HAEVN Execution Scripts

This folder contains deterministic Python scripts that handle the actual work.

## Purpose
Execution scripts are **reliable, testable, and fast**. They handle:
- API calls
- Data processing
- File operations
- Database interactions

## Principles
1. **Deterministic**: Same input → same output
2. **Well-commented**: Future maintainers should understand the logic
3. **Environment-driven**: API keys and secrets come from `.env`
4. **Error-handling**: Graceful failures with clear error messages

## Script Template
```python
#!/usr/bin/env python3
"""
Script: [name]
Purpose: [what it does]
Usage: python script_name.py [args]
"""

import os
from dotenv import load_dotenv

load_dotenv()

def main():
    # Script logic here
    pass

if __name__ == "__main__":
    main()
```
