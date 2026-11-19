import numpy as np,cv2,sys
from solve import *
P=np.load('P3.npy'); TW,TH=2048,1656
def fwd(n,p,phi_deg,h):
    phi0,Y0,et,eb,ck=p; k=width(n)/66.2*ck
    th=np.radians(phi_deg-phi0); Yf=Y0+(HT-h)*k; y=Yf.copy(); ee=et+(eb-et)*(HT-h)/(HT-HB)
    for _ in range(4):
        xl,xr=edges(n,y); R=(xr-xl)/2*taper(h); y=Yf-ee*R*(1-np.cos(th))
    xl,xr=edges(n,y); R=(xr-xl)/2*taper(h); return (xl+xr)/2+R*np.sin(th), y
phi=(np.arange(TW)/TW-0.5)*360; hh=(1-np.arange(TH)/(TH-1))*168; PH,HH=np.meshgrid(phi,hh)
def layer(n):
    p=unpack(P,order.index(n)); im=cv2.imread(f'n{n}.png')
    X,Y=fwd(n,p,PH,HH); th=((PH-p[0]+180)%360)-180
    out=cv2.remap(im,X.astype(np.float32),Y.astype(np.float32),cv2.INTER_LINEAR); out[np.abs(th)>70]=0
    return out
if __name__=='__main__':
    F=cv2.imread('front.png')
    for n in map(int,sys.argv[1:]):
        L=layer(n); cv2.imwrite(f'L{n}.png',L)
        g=cv2.cvtColor(L,cv2.COLOR_BGR2GRAY); gf=cv2.cvtColor(F,cv2.COLOR_BGR2GRAY)
        for name,(u0,u1) in {'BATTERY':(0.60,0.68),'plusv':(0.40,0.47)}.items():
            a=slice(int(u0*TW),int(u1*TW)); valid=(L[:,a].sum(2)>0).mean(1)>0.9
            pl=((g[:,a]<70).mean(1)>0.15)&valid; pf=(gf[:,a]<70).mean(1)>0.15
            rl=np.nonzero(pl[100:1550])[0]+100; rf=np.nonzero(pf[100:1550])[0]+100
            if len(rl): print(n,name,'S',round(rl.min()/TH,3),round(rl.max()/TH,3),'F',round(rf.min()/TH,3),round(rf.max()/TH,3), 'valid cols', int(valid.sum()))
