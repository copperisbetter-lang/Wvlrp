"""Non-destructive facial/body texture atlas cleanup for Beverly's separate join patch.
Targets two painted dark U-like streaks in a 1024x1024 join texture.
NEVER changes geometry, skin weights, certified GLB, or attachment texture.
"""
import cv2, numpy as np, sys, os
src, dst = sys.argv[1:3]
img=cv2.imread(src,cv2.IMREAD_UNCHANGED)
if img is None or img.shape[:2]!=(1024,1024) or img.shape[2]!=4:
    raise SystemExit('Unexpected source atlas; leave original unmodified')
mask=np.zeros(img.shape[:2],dtype=np.uint8)
for line,width in [
 ([(392,546),(385,611),(366,667),(345,721),(315,769),(314,790),(370,814),(441,819)],58),
 ([(633,545),(647,609),(667,666),(692,717),(729,770),(728,787),(667,811),(580,819)],58),
 ([(439,819),(483,819)],42),
 ([(543,819),(584,819)],42),
]:
    pts=np.array(line,dtype=np.int32).reshape(-1,1,2)
    cv2.polylines(mask,[pts],False,255,width,lineType=cv2.LINE_AA)
# Protect the original central anatomical/skin shading below this boundary.
mask[835:,:]=0
clean=cv2.inpaint(img[:,:,:3],mask,22,cv2.INPAINT_TELEA)
clean=np.dstack((clean,img[:,:,3]))
os.makedirs(os.path.dirname(dst),exist_ok=True)
if not cv2.imwrite(dst,clean,[cv2.IMWRITE_PNG_COMPRESSION,7]):
    raise SystemExit('Clean texture could not be written')
print('BEVERLY_PATCH_CLEANED source=',src,'output=',dst,'pixels=',int(np.count_nonzero(mask)))
