import './style.css'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import Lenis  from 'lenis'

document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger)

    const lenis = new Lenis()

    lenis.on('scroll', ScrollTrigger.update)

    gsap.ticker.add((time)=>{
      lenis.raf(time * 1000)
    });

    gsap.ticker.lagSmoothing(0);
    
    // Page-specific elements
    const nav = document.querySelector('nav')
    const header = document.querySelector('.header')
    const heroImg = document.querySelector('.hero-img')
    const canvas = document.querySelector('canvas')
    const page2 = document.querySelector('.page-2');
    const advancedCapabilities = document.querySelector('.advanced-capabilities');
    const ctaFooter = document.querySelector('.cta-footer');
    const footer = document.querySelector('footer');

    // Hero and Canvas animation (index.html specific)
    if (canvas && header && heroImg) {
        const context = canvas.getContext("2d");
        
        const setCanvasSize = () => {
            const pixelRatio = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * pixelRatio;
            canvas.height = window.innerHeight * pixelRatio;
            canvas.style.width = window.innerWidth + 'px'
            canvas.style.height = window.innerHeight + 'px'
        }
        setCanvasSize();

        window.addEventListener('resize', () => {
          setCanvasSize();
          // Re-render the current frame after resize
          render();
        });

        const frameCount = 293;
        const currentFrame = (index) =>
      `/frame_${(index + 1).toString().padStart(4, "0")}.jpg`;

        let images = []
        let videoFrames = { frame: 0 }
        let imagesToLoad = frameCount;

        const onLoad = () => {
          imagesToLoad--;
          if (!imagesToLoad) {
            render();
            setupCanvasScrollTrigger();
          }
        }

        for(let i = 0; i < frameCount; i++){
          const img = new Image();
          img.onload = onLoad;
          img.onerror = function() {
            onload.call(this);
          }
          img.src = currentFrame(i);
          images.push(img);
        }

        const render = () => {
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          
          context.clearRect(0, 0, canvas.width, canvas.height);
          
          const img = images[Math.round(videoFrames.frame)];
          if(img && img.complete && img.naturalWidth > 0){
            const imageAspect = img.naturalWidth / img.naturalHeight;
            const canvasAspect = canvasWidth / canvasHeight;

            let drawWidth, drawHeight, drawx, drawy;

            if(imageAspect > canvasAspect ){
              drawHeight = canvasHeight;
              drawWidth = drawHeight * imageAspect;
              drawx = (canvasWidth - drawWidth) / 2;
              drawy = 0;
            } else {
              drawWidth = canvasWidth;
              drawHeight = drawWidth / imageAspect;
              drawx = 0;
              drawy = (canvasHeight - drawHeight) / 2;
            }

            context.drawImage(img, drawx, drawy, drawWidth, drawHeight);
          }
        }

        const setupCanvasScrollTrigger = () => {
            ScrollTrigger.create({
              trigger: '.hero',
              start: 'top top',
              end: `+=${window.innerHeight * 7}px`,
              pin: true,
              pinSpacing: true,
              scrub: 1,
              onUpdate: (self) => {
                const progress = self.progress;

                const animationProgress =Math.min(progress/0.9, 1);
                const targetFrame = Math.round(animationProgress * (frameCount - 1));
                
                videoFrames.frame = targetFrame;
                render();
                
                if(nav && progress <= 0.1){
                  const navProgress = progress / 0.1;
                  const opacity = 1 - navProgress;
                  gsap.set(nav, { opacity });
                } else {
                  gsap.set(nav, { opacity: 0 });
                }

                if(header && progress <= 0.25) {
                  const zProgress = progress / 0.25;
                  const translateZ = zProgress * -500;

                  let opacity = 1;
                  if(progress > 0.2){
                    const fadeProgress = Math.min((progress - 0.2) / (0.25-0.2), 1);
                    opacity = 1 - fadeProgress;
                  }
                  gsap.set(header, { 
                    transform: `translate(-50%, -50%) translateZ(${translateZ}px)`, opacity
                  });

                } else if (header) {
                  gsap.set(header, { opacity: 0 });
                }

                if(heroImg && progress < 0.6){
                    gsap.set(heroImg, {
                      opacity: 1
                    })
                } else if (progress >= 0.6 && progress <= 0.7){
                    const opacityProgress = (progress - 0.6) / 0.1;
                    const opacity = 1 - opacityProgress;
                    gsap.set(heroImg, {
                        transform: `translatez(1000px)`,
                        opacity: 0,
                    });
                } else if(progress >= 0.6 && progress <= 0.9){
                    const imgProgress = (progress - 0.6) / 0.3;
                    const translateZ = 1000 - imgProgress * 1000;
                      let opacity = 0;
                      if(progress <= 0.8){
                        const opacityProgress = (progress - 0.6) / 0.2;
                        opacity = opacityProgress;
                      }else{
                        opacity = 1;
                      }
                      gsap.set(heroImg, {
                        transform: `translateZ(${translateZ}px)`,
                        opacity: opacity,
                      });
                    }else{
                      gsap.set(heroImg, {
                        transform: `translateZ(0px)`,
                        opacity: 1,
                      });
                    }
              },
            });
        }

        window.addEventListener("resize", ()=> {
            setCanvasSize();
            render();
            ScrollTrigger.refresh();
        })
    }

    // Page 2 Animations
    if (page2) {
        const page2Timeline = gsap.timeline({
            scrollTrigger: {
                trigger: '.page-2',
                start: 'top bottom',
                end: 'center center',
                scrub: 1
            }
        });
        page2Timeline.from('.page-2-content > h1', {
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
        }).from('.page-2-content > p', {
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
        }, "-=0.5").from('.feature-card', {
            y: 50,
            opacity: 0,
            duration: 0.6,
            stagger: 0.2,
            ease: 'power3.out'
        }, "-=0.5");
    }

    // Advanced Capabilities Animations
    if (advancedCapabilities) {
        const advancedCapabilitiesTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: '.advanced-capabilities',
                start: 'top bottom',
                end: 'center center',
                scrub: 1
            }
        });
        advancedCapabilitiesTimeline.from('.advanced-capabilities h2', {
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
        }).from('.advanced-capabilities > p', {
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
        }, "-=0.5").from('.capability-card', {
            y: 50,
            opacity: 0,
            duration: 0.6,
            stagger: 0.2,
            ease: 'power3.out'
        }, "-=0.5");
    }

    // CTA Footer Animation
    if (ctaFooter) {
        const ctaFooterTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: '.cta-footer',
                start: 'top bottom',
                end: 'bottom bottom',
                scrub: 1
            }
        });
        ctaFooterTimeline.from('.cta-footer h2', {
            y: 50,
            opacity: 0,
            duration: 1,
            ease: 'power3.out'
        }).from('.cta-footer p', {
            y: 50,
            opacity: 0,
            duration: 1,
            ease: 'power3.out'
        }, "-=0.7");
    }

    // Footer Animation
    if (footer) {
        const footerTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: 'footer',
                start: 'top bottom',
                end: 'bottom bottom',
                scrub: 1
            }
        });
        footerTimeline.from('.footer-logo', {
            y: 20,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out'
        }).from('footer > p', {
            y: 20,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out'
        }, "-=0.5");
    }

    function cursorEffect(){
        const pageContent = document.querySelector(".main");
        const cursor = document.querySelector("#cursor");
        const nav = document.querySelector("nav");

        if (!pageContent || !cursor) {
            if (cursor) cursor.style.display = 'none';
            return;
        }

        pageContent.addEventListener("mousemove", function(dets){
            gsap.to(cursor,{
                x:dets.x,
                y:dets.y
            })
        })

        pageContent.addEventListener("mouseenter",function(){
            gsap.to(cursor,{
                scale:1,
                opacity:1
            })
        })
        pageContent.addEventListener("mouseleave",function(){
            gsap.to(cursor,{
                scale:0,
                opacity:0
            })
        })

        if (nav) {
            nav.addEventListener("mouseenter", function() {
                gsap.to(cursor, {
                    opacity: 0,
                    scale: 0
                })
            })
    
            nav.addEventListener("mouseleave", function() {
                gsap.to(cursor, {
                    opacity: 1,
                    scale: 1
                })
            })
        }
    }
    cursorEffect()
});
