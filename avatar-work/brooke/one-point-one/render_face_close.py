from pathlib import Path
import sys
source=Path(__file__).with_name('render.py').read_text().split("if __name__")[0].replace('scale=1850','scale=10000').replace('[0,1.515,0]','[0,1.49,.14]')
namespace={}
exec(source,namespace)
namespace['render'](sys.argv[1],sys.argv[2],float(sys.argv[3]) if len(sys.argv)>3 else 0)
