import cv2,numpy as np
from layer import *
from PIL import Image, ImageDraw, ImageFont
EAN='7044610799490'
L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011']
G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111']
R=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100']
PAR=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL']
def ean_modules(code):
    assert (10-sum(int(c)*(3 if i%2 else 1) for i,c in enumerate(code[:12]))%10)%10==int(code[12])
    bits='101'; guard=[1,1,1]
    for i,c in enumerate(code[1:7]): bits+=(L if PAR[int(code[0])][i]=='L' else G)[int(c)]; guard+=[0]*7
    bits+='01010'; guard+=[1]*5
    for c in code[7:]: bits+=R[int(c)]; guard+=[0]*7
    bits+='101'; guard+=[1,1,1]
    return bits,guard
def draw_barcode(res,box=(1129,1416,1417,1703),k=4):
    """the white panel with the barcode, as printed on the can: turned a quarter, the start at the top, the digits on
    the left (rows top-down in this image)"""
    r0,r1,c0,c1=box; h,w=(r1-r0)*k,(c1-c0)*k
    img=Image.new('RGB',(w,h),(236,234,230)); d=ImageDraw.Draw(img)
    bits,guard=ean_modules(EAN)
    mod=(1392-1129)*k/(95+11+7); top=11*mod
    xd=int(w*0.115)                            # the digits' column
    for i,(b,g) in enumerate(zip(bits,guard)):
        if b=='1':
            y=top+i*mod; d.rectangle([xd-(int(w*0.05) if g else 0), y, w-int(w*0.035), y+mod-1], fill=(28,26,30))
    font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', int(mod*8.2))
    def txt(t,y_mid):
        tw_,th_=font.getbbox(t)[2:]; im2=Image.new('RGBA',(tw_+4,th_+4),(0,0,0,0)); ImageDraw.Draw(im2).text((2,0),t,font=font,fill=(28,26,30,255))
        im2=im2.rotate(-90,expand=True); img.paste(im2,(int(xd*0.12),int(y_mid-im2.size[1]/2)),im2)
    txt(EAN[0],top-mod*6); txt(EAN[1:7],top+mod*(3+21)); txt(EAN[7:],top+mod*(50+21))
    img=img.resize((c1-c0,r1-r0),Image.LANCZOS)
    pan=np.asarray(img,np.float32)[...,::-1]
    m=np.ones((r1-r0,c1-c0),np.float32); rr=6
    yy,xx=np.mgrid[0:r1-r0,0:c1-c0]
    for cy,cx in ((rr,rr),(rr,c1-c0-rr-1),(r1-r0-rr-1,rr),(r1-r0-rr-1,c1-c0-rr-1)):
        m[(np.abs(yy-cy)<=rr)&(np.abs(xx-cx)<=rr)&(np.hypot(yy-cy,xx-cx)>rr)&(((yy<rr)|(yy>r1-r0-rr-1))&((xx<rr)|(xx>c1-c0-rr-1)))]=0
    m=cv2.GaussianBlur(m,(0,0),0.7)[...,None]
    # the same light as the label around it (a touch darker toward the bottom, like the photo)
    shade=np.linspace(1.0,0.9,r1-r0)[:,None,None]
    res[r0:r1,c0:c1]=res[r0:r1,c0:c1]*(1-m)+pan*shade*m
    return res
F=cv2.imread('front.png').astype(np.float32); TH,TW=F.shape[:2]
T=[0.0,0.035,0.20,0.82,0.955,1.0]; Sm=[0.02,0.057,0.22,0.74,0.80,0.82]
s=np.interp(np.arange(TH)/TH,T,Sm)*TH
VX=np.tile(np.arange(TW,dtype=np.float32),(TH,1)); VY=np.repeat(s.astype(np.float32)[:,None],TW,1)
u=np.arange(TW)/TW
def plain(img):
    hsv=cv2.cvtColor(img.clip(0,255).astype(np.uint8),cv2.COLOR_BGR2HSV); return (hsv[...,1]>90)&(hsv[...,2]>90)
# who owns which part of the back (u: 0.5 = front centre), seams in empty label
OWN=[(1852,0.688,0.950,None),(1850,0.950,1.045,None),(1848,1.045,1.262,None),(1853,0.688,0.836,(0.673,0.885))]
FE=0.006
target=F[:,0,:]                                   # the label's own colour per row (the filler build_label uses on the back)
target=cv2.GaussianBlur(target[:,None,:],(1,0),sigmaX=0.1,sigmaY=6)[:,0,:]
out=np.zeros_like(F); wsum=np.zeros((TH,TW),np.float32)
for n,a,b,trange in OWN:
    p=unpack(P,order.index(n)); im=cv2.imread(f'{n}.jpg'); sc=im.shape[1]/1512   # the original, full resolution
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV); H_,S_,V_=[hsv[...,i].astype(int) for i in range(3)]
    lab=(((H_<=28)|(H_>=165))&(S_>130)&(V_>90))
    ok=(lab|(V_<85)|((V_>105)&(S_<65))).astype(np.uint8)
    ok=cv2.erode(cv2.morphologyEx(ok,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8)),np.ones((9,9),np.uint8))
    bgm=(lab&(V_>110)).astype(np.uint8)
    X,Y=fwd(n,p,PH,HH); X=X*sc; Y=Y*sc
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
pm=plain(back).astype(np.float32); r0,r1=int(0.80*TH),int(0.845*TH)
colc=(back[r0:r1]*pm[r0:r1,:,None]).sum(0)/np.maximum(pm[r0:r1].sum(0),1)[:,None]
colc=cv2.GaussianBlur(colc[None],(0,0),sigmaX=25,sigmaY=0.1)[0]
m=np.clip((tl-0.845)/0.11,0,1); m=(m*m*(3-2*m))[:,None,None]
fill2=colc[None]*(1-m)+np.repeat(low[:,None,:],TW,1)*m
fill=np.where((tl>0.80)[:,None,None],fill2,fill)
back=back*cov[...,None]+fill*(1-cov[...,None])
# a little sharper (the photos are soft)
back=back+0.45*(back-cv2.GaussianBlur(back,(0,0),1.3))
# the seams with the front: shift the back's colour, row by row, to meet the front there, fading out over 0.1 of a turn
pf,pb=plain(F),plain(back)
def band_mean(img,m,u0,u1):
    a,b=int(u0*TW),int(u1*TW); w=m[:,a:b].astype(np.float32)
    v=(img[:,a:b]*w[...,None]).sum(1)/np.maximum(w.sum(1),1)[:,None]
    ok=w.sum(1)>3
    v[~ok]=np.nan; return v
def fillnan(v):
    for c in range(3):
        x=v[:,c]; i=np.arange(len(x)); g=~np.isnan(x); x[~g]=np.interp(i[~g],i[g],x[g])
    return v
for seam,fside,bside,dirn in ((0.690,(0.670,0.688),(0.693,0.716),1),(0.262,(0.264,0.278),(0.236,0.259),-1)):
    d=fillnan(band_mean(F,pf,*fside))-fillnan(band_mean(back,pb,*bside))
    d=cv2.GaussianBlur(d[:,None,:],(1,0),sigmaX=0.1,sigmaY=18)[:,0,:]
    d[:int(0.03*TH)]=0; d[int(0.96*TH):]=0
    w=np.clip(1-(dirn*(u-seam))/0.10,0,1)*((dirn*(u-seam))>-0.01)
    back+=d[:,None,:]*w[None,:,None]
# the front stays the product photo; the back from the photos
fw=np.clip((u-0.262)/0.012+0.5,0,1)*np.clip((0.690-u)/0.004+0.5,0,1)
res=F*fw[None,:,None]+back*(1-fw[None,:,None])
# the neck/rim rows above the label: the reference as is
top=int(0.013*TH); res[:top]=F[:top]
bot=int(0.962*TH); res[bot:]=F[bot:]
res=draw_barcode(res)
cv2.imwrite('label360.png',res.clip(0,255).astype(np.uint8))
cv2.imwrite('label360_s.jpg',cv2.resize(res.clip(0,255).astype(np.uint8),(1024,828)))
print('ok')
