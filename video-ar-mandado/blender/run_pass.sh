#!/bin/bash
# Uso: run_pass.sh <inicio> <passo>   (retomável: pula quadros já prontos)
cd "$(dirname "$0")"
timeout 6900 python3 render_bl.py $1 2976 $2 frames540 12 960 540 2>&1 | grep "^T \|Traceback\|Error\|nada a fazer" | tail -4
echo "prontos: $(ls frames540 2>/dev/null | wc -l)"
