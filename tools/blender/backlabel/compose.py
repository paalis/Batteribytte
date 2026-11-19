import cv2,numpy as np
from layer import *
F=cv2.imread('front.png').astype(np.float32); TH,TW=F.shape[:2]
T=[0.0,0.035,0.20,0.82,0.955,1.0]; Sm=[0.02,0.057,0.22,0.74,0.80,0.82]
s=np.interp(np.arange(TH)/TH,T,Sm)*TH
VX=np.tile(np.arange(TW,dtype=np.float32),(TH,1)); VY=np.repeat(s.astype(np.float32)[:,None],TW,1)
u=np.arange(TW)/TW
# who owns which part of the back (u: 0.5 = front centre), seams in empty label
OWN=[(1852,0.688,0.950,None),(1850,0.950,1.045,None),(1848,1.045,1.262,None),(1853,0.688,0.836,(0.673,0.885))]
FE=0.006
target=F[:,0,:]                                   # the label's own colour per row (the filler build_label uses on the back)
target=cv2.GaussianBlur(target[:,None,:],(1,0),sigmaX=0.1,sigmaY=6)[:,0,:]
out=np.zeros_like(F); wsum=np.zeros((TH,TW),np.float32)
for n,a,b,trange in OWN:
    p=unpack(P,order.index(n)); im=cv2.imread(f'n{n}.png')
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV); H_,S_,V_=[hsv[...,i].astype(int) for i in range(3)]
    lab=(((H_<=28)|(H_>=165))&(S_>130)&(V_>90))
    ok=(lab|(V_<85)|((V_>105)&(S_<65))).astype(np.uint8)
    ok=cv2.erode(cv2.morphologyEx(ok,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8)),np.ones((9,9),np.uint8))
    bgm=(lab&(V_>110)).astype(np.uint8)
    X,Y=fwd(n,p,PH,HH)
    img=cv2.remap(im.astype(np.float32),X.astype(np.float32),Y.astype(np.float32),cv2.INTER_LINEAR)
    okr=cv2.remap(ok.astype(np.float32),X.astype(np.float32),Y.astype(np.float32),cv2.INTER_LINEAR)
    bgr=cv2.remap(bgm.astype(np.float32),X.astype(np.float32),Y.astype(np.float32),cv2.INTER_NEAREST)
    img=cv2.remap(img,VX,VY,cv2.INTER_LINEAR); okr=cv2.remap(okr,VX,VY,cv2.INTER_LINEAR); bgr=cv2.remap(bgr,VX,VY,cv2.INTER_NEAREST)
    # flatten the light: divide by a smooth estimate of the plain label colour, multiply by the target row colour
    sig=45
    num=cv2.GaussianBlur(img*bgr[...,None],(0,0),sig); den=cv2.GaussianBlur(bgr,(0,0),sig)[...,None]
    bg=num/np.maximum(den,1e-3)
    num2=cv2.GaussianBlur(img*bgr[...,None],(0,0),140); den2=cv2.GaussianBlur(bgr,(0,0),140)[...,None]
    a_=np.clip(den/0.08,0,1); bg=bg*a_+(num2/np.maximum(den2,1e-4))*(1-a_)     # inside big white or ink areas: the wider estimate
    gain=target[:,None,:]/np.maximum(bg,1)
    gl=gain.mean(2,keepdims=True)
    labs=cv2.GaussianBlur(bgr,(0,0),1.5)[...,None]          # plain label colour → full colour transfer; ink and white → brightness only
    flat=img*(labs*gain+(1-labs)*np.minimum(gl,1.15))
    good=(den2[...,0]>0.002)&((okr>0.99)|(np.arange(TH)[:,None]/TH<0.86))
    # columns this photo owns, feathered; wrap u past 1
    uu=np.where(u<a-0.2,u+1,u)
    w=np.clip((uu-a)/FE+0.5,0,1)*np.clip((b-uu)/FE+0.5,0,1)
    if trange:                                     # a patch that overrides the others (the barcode, sharper in this photo)
        t=np.arange(TH)/TH; wt=np.clip((t-trange[0])/0.006+0.5,0,1)*np.clip((trange[1]-t)/0.006+0.5,0,1)
        W=(wt[:,None]*w[None,:])*good
        out=out*(1-W[...,None])+flat*W[...,None]*np.maximum(wsum,1e-6)[...,None]
        continue
    W=w[None,:]*good
    out+=flat*W[...,None]; wsum+=W
back=out/np.maximum(wsum,1e-6)[...,None]
cov=np.clip(wsum,0,1)
# where no photo is usable (hand, edges): the plain row colour; soften the hole edges
cov=cv2.GaussianBlur(cov,(0,0),3)*np.clip((0.862-np.arange(TH)/TH)/0.025,0,1)[:,None]
tl=np.arange(TH)/TH
low=np.median(F[:,int(0.30*TW):int(0.36*TW),:],axis=1)*0.92        # the front's own red at the bottom, a shade darker (the back is in shadow)
mix=np.clip((tl-0.80)/0.06,0,1)[:,None]
fill=np.repeat((target*(1-mix)+low*mix)[:,None,:],TW,1)
back=back*cov[...,None]+fill*(1-cov[...,None])
# the front stays the product photo; the back from the photos
fw=np.clip((u-0.262)/0.012+0.5,0,1)*np.clip((0.690-u)/0.004+0.5,0,1)
res=F*fw[None,:,None]+back*(1-fw[None,:,None])
# the neck/rim rows above the label: the reference as is
top=int(0.013*TH); res[:top]=F[:top]
bot=int(0.962*TH); res[bot:]=F[bot:]
cv2.imwrite('label360.png',res.clip(0,255).astype(np.uint8))
cv2.imwrite('label360_s.jpg',cv2.resize(res.clip(0,255).astype(np.uint8),(1024,828)))
print('ok')
