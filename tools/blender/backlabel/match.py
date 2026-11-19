import cv2,numpy as np,json,pickle
G=json.load(open('geo.json'))
order=[1857,1856,1855,1854,1853,1852,1851,1850,1849,1848,1847,1846,1845,1844,1858,1859]
sift=cv2.SIFT_create(nfeatures=6000,contrastThreshold=0.02)
K={}
for n in order:
    e=G[str(n)]; im=cv2.imread(f'n{n}.png'); hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    h,s,v=[hsv[...,i].astype(int) for i in range(3)]
    lab=(((h<=28)|(h>=165))&(s>140)&(v>100)).astype(np.uint8)
    lab=cv2.morphologyEx(lab,cv2.MORPH_CLOSE,np.ones((41,41),np.uint8))
    (al,bl),(ar,br)=e['l'],e['r']; Y,X=np.mgrid[0:im.shape[0],0:im.shape[1]]
    inside=(X>al*Y+bl+4)&(X<ar*Y+br-4)&(Y>e['yel']-40)
    m=(lab.astype(bool)&inside).astype(np.uint8)*255
    m=cv2.erode(m,np.ones((7,7),np.uint8))
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    kp,d=sift.detectAndCompute(g,m); K[n]=(np.float32([k.pt for k in kp]),d); print(n,len(kp))
F=cv2.imread('front.png'); Fg=cv2.cvtColor(F,cv2.COLOR_BGR2GRAY)
fm=np.zeros(Fg.shape,np.uint8); fm[:, int(2048*(0.5-75/360)):int(2048*(0.5+75/360))]=255
kp,d=sift.detectAndCompute(Fg,fm); K['F']=(np.float32([k.pt for k in kp]),d); print('F',len(kp))
bf=cv2.BFMatcher()
def match(a,b,ratio=0.75):
    pa,da=K[a]; pb,db=K[b]
    if da is None or db is None: return np.zeros((0,4))
    mm=bf.knnMatch(da,db,k=2); good=[x for x,y in mm if x.distance<ratio*y.distance]
    A=pa[[x.queryIdx for x in good]]; B=pb[[x.trainIdx for x in good]]
    if len(A)<8: return np.zeros((0,4))
    # coarse outlier rejection: a fundamental-like RANSAC with a homography (loose) between neighbouring views
    H,inl=cv2.findHomography(A,B,cv2.RANSAC,25.0)
    inl=inl.ravel().astype(bool)
    return np.hstack([A[inl],B[inl]])
M={}
for i,a in enumerate(order):
    for j in (1,2):
        b=order[(i+j)%len(order)]
        r=match(a,b); M[(a,b)]=r; print(a,b,len(r))
for n in order:
    r=match(n,'F',0.8); M[(n,'F')]=r; print(n,'F',len(r))
pickle.dump(M,open('matches.pkl','wb'))
