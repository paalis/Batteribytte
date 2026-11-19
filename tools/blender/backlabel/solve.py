import numpy as np,json,pickle
from scipy.optimize import least_squares
G=json.load(open('geo.json')); M=pickle.load(open('matches.pkl','rb'))
order=[1857,1856,1855,1854,1853,1852,1851,1850,1849,1848,1847,1846,1845,1844,1858,1859]
FRONT_OK={1857,1856,1855,1854,1846,1845,1844,1858,1859}
HT=165.8; HB=6.7; R0=33.1
PROF=np.array([(24.6,0),(33.1,9.5),(33.1,145),(32.8,148.5),(31.9,151.5),(30.4,154.5),(28.8,157.5),(27.6,160),(27.1,162),(27.1,168)])
taper=lambda h: np.interp(h,PROF[:,1],PROF[:,0])/R0
def edges(n,y):
    e=G[str(n)]; (al,bl),(ar,br)=e['l'],e['r']; return al*y+bl, ar*y+br
def width(n):
    y=G[str(n)]['yel']+100; a,b=edges(n,y); return b-a
NP=5   # per photo: phi0, Y0, et, eb, ck
def unpack(P,i): return P[i*NP:(i+1)*NP]
def inv(n,p,ck,x,y):
    phi0,Y0,et,eb,ck=p; k=width(n)/66.2*ck
    xl,xr=edges(n,y); xc=(xl+xr)/2; R=(xr-xl)/2
    h=HT-(y-Y0)/k
    for _ in range(5):
        r=R*taper(h); s=np.clip((x-xc)/r,-0.995,0.995); c=np.sqrt(1-s*s)
        ee=et+(eb-et)*(HT-h)/(HT-HB)
        h=HT-((y+ee*r*(1-c))-Y0)/k
    return np.degrees(np.arcsin(s))+phi0, h
def pair_d(P,a,b,m):
    ck=P[-1]; fa,ha=inv(a,unpack(P,order.index(a)),ck,m[:,0],m[:,1])
    if b=='F': fb=(m[:,2]/2048-0.5)*360; hb=(1-m[:,3]/1655)*168
    else: fb,hb=inv(b,unpack(P,order.index(b)),ck,m[:,2],m[:,3])
    return ((fa-fb+180)%360-180)*np.pi/180*R0, ha-hb
def resid(P,act):
    out=[]
    for (a,b),m in act.items():
        dx,dy=pair_d(P,a,b,m); out+= [dx,dy]
    return np.concatenate(out)
def run(phi_init=None):
    P=[]
    for i,n in enumerate(order):
        phi0={1858:-20,1859:-45}.get(n,25.0*i)
        P+=[(phi_init or {}).get(n,phi0), G[str(n)]['yel']+0.06*width(n), 0.3, 0.4, 0.75]
    P=np.array(P+[1.0])
    lo=[];hi=[]
    for i in order: lo+=[-400,0,0.05,0.1,0.5]; hi+=[400,2016,0.8,0.8,1.0]
    lo+=[0.99]; hi+=[1.01]
    act={k:v for k,v in M.items() if len(v) and not (k[1]=='F' and k[0] not in FRONT_OK)}
    for it in range(5):
        r=least_squares(resid,P,args=(act,),bounds=(lo,hi),loss='soft_l1' if it<2 else 'linear',f_scale=1.5,x_scale='jac',max_nfev=60)
        P=r.x; new={}
        for (a,b),m in M.items():
            if len(m)==0 or (b=='F' and a not in FRONT_OK): continue
            dx,dy=pair_d(P,a,b,m); d=np.hypot(dx,dy); keep=d<(4.0 if it<2 else 2.5)
            if keep.sum()>=5 and keep.mean()>=0.25: new[(a,b)]=m[keep]
        act=new
    return P,act
if __name__=='__main__':
    P,act=run()
    for (a,b),m in act.items():
        dx,dy=pair_d(P,a,b,m); print(a,b,len(m),round(float(np.median(np.hypot(dx,dy))),2))
    print('ck',P[-1])
    for i,n in enumerate(order): print(n,np.round(unpack(P,i),3).tolist())
    np.save('P3.npy',P); pickle.dump(act,open('act3.pkl','wb'))
