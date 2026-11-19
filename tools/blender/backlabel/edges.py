import cv2,numpy as np,json
names=[1857,1856,1855,1854,1853,1852,1851,1850,1849,1848,1847,1846,1845,1844,1858,1859]
out={}
for n in names:
    im=cv2.imread(f'n{n}.png'); hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    h,s,v=[hsv[...,i].astype(np.float32) for i in range(3)]
    yel=((h>=8)&(h<=26)&(s>150)&(v>120)).astype(np.uint8)
    yel=cv2.morphologyEx(yel,cv2.MORPH_OPEN,np.ones((9,9),np.uint8))
    nl,lab,st,cen=cv2.connectedComponentsWithStats(yel)
    k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); m=lab==k
    ys=np.nonzero(m.any(1))[0]; ytop,ybot=int(ys[0]),int(ys[-1])
    bg=((s<70)&(v>55)&(v<190)).astype(np.float32)          # grey fabric, floor
    bg=cv2.blur(bg,(15,3))
    rows=np.arange(ytop+int((ybot-ytop)*0.08),ytop+int((ybot-ytop)*0.55),5)
    pts={'l':[],'r':[]}
    for y in rows:
        xs=np.nonzero(m[y])[0]
        if len(xs)<20: continue
        c=int(np.median(xs))
        r=c
        while r<im.shape[1]-1 and bg[y,r]<0.6: r+=1
        l=c
        while l>0 and bg[y,l]<0.6: l-=1
        pts['l'].append((y,l)); pts['r'].append((y,r))
    fits={}
    for side,P in pts.items():
        P=np.array(P,float); keep=np.ones(len(P),bool)
        for _ in range(6):
            a,b=np.polyfit(P[keep,0],P[keep,1],1); res=np.abs(P[:,1]-(a*P[:,0]+b)); keep=res<max(2.5,2.5*np.median(res))
        fits[side]=(float(a),float(b),int(keep.sum()),len(P))
    out[n]=dict(l=fits['l'][:2],r=fits['r'][:2],yel=ytop,ybot=ybot)
    y=(ytop+ybot)//2
    print(n,'slopes',round(fits['l'][0],3),round(fits['r'][0],3),'inl',fits['l'][2:],fits['r'][2:],'w@mid',round((fits['r'][0]-fits['l'][0])*y+fits['r'][1]-fits['l'][1]))
    vis=im.copy()
    for side in 'lr':
        a,b=fits[side][:2]; cv2.line(vis,(int(b),0),(int(a*2015+b),2015),(255,255,0),3)
    cv2.line(vis,(0,ytop),(1511,ytop),(0,255,0),3)
    cv2.imwrite(f'm{n}.jpg',cv2.resize(vis,(378,504)))
json.dump(out,open('geo.json','w'))
t=[cv2.imread(f'm{n}.jpg') for n in names]
cv2.imwrite('msheet.jpg',np.vstack([np.hstack(t[i:i+8]) for i in (0,8)]))
