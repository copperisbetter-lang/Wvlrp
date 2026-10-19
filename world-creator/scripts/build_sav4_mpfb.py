"""Compatibility entry point; the permanent native anatomy build is canonical."""
import runpy
import shutil
from pathlib import Path

root = Path(__file__).resolve().parents[1]
runpy.run_path(str(root / 'scripts/build_sav4_vulva2_native_fit.py'), run_name='__main__')
shutil.copy2(root / 'assets/sav4-vulva2-native-fit.glb', root / 'assets/sav4-realistic.glb')
