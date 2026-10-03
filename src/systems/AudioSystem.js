export class AudioSystem {
  constructor(){
    this.ctx=null; this.master=null; this.music=null; this.sfx=null; this.started=false; this.stepCooldown=0;
  }
  ensure(){
    if(this.started) return;
    this.ctx=new (window.AudioContext||window.webkitAudioContext)();
    this.master=this.ctx.createGain(); this.master.gain.value=.3; this.master.connect(this.ctx.destination);
    this.music=this.ctx.createGain(); this.music.gain.value=.08; this.music.connect(this.master);
    this.sfx=this.ctx.createGain(); this.sfx.gain.value=.55; this.sfx.connect(this.master);
    this.started=true; this.startMusic();
  }
  tone(freq,dur=.1,type="sine",vol=.08,delay=0,dest=this.sfx){
    if(!this.started) return;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime+delay;
    o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur);
  }
  noise(dur=.05,vol=.02){
    if(!this.started) return;
    const b=this.ctx.createBuffer(1,this.ctx.sampleRate*dur,this.ctx.sampleRate),a=b.getChannelData(0);
    for(let i=0;i<a.length;i++) a[i]=(Math.random()*2-1)*(1-i/a.length);
    const s=this.ctx.createBufferSource(),g=this.ctx.createGain();s.buffer=b;g.gain.value=vol;s.connect(g);g.connect(this.sfx);s.start();
  }
  jump(){this.ensure();this.tone(250,.12,"triangle",.06);this.tone(360,.10,"sine",.035,.04);}
  land(){this.ensure();this.noise(.08,.035);this.tone(95,.08,"sine",.04);}
  step(){this.ensure();this.noise(.035,.014);}
  switchCat(){this.ensure();this.tone(350,.07,"sine",.03);this.tone(470,.08,"sine",.025,.03);}
  startMusic(){
    const chords=[[196,247,294],[220,277,330],[174,220,262],[196,247,294]]; let i=0;
    const play=()=>{if(!this.started)return;const c=chords[i++%chords.length];c.forEach((f,n)=>this.tone(f,2.7,"sine",.012,n*.02,this.music));setTimeout(play,2800)};play();
  }
}
