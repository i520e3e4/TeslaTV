// 特斯拉车机适配模块
// 专门为特斯拉车机优化，绕过行车时的视频播放限制

class TeslaAdapter {
    constructor() {
        this.isTesla = this.detectTesla();
        this.isDriving = false;
        this.originalUserAgent = navigator.userAgent;
        this.mockLocation = { speed: 0 };
        this.videoElements = new Set();
        this.observers = new Map();
        
        if (this.isTesla) {
            console.log('检测到特斯拉车机环境，启用适配模式');
            this.init();
        }
    }

    detectTesla() {
        // 检测特斯拉车机环境的多种方法
        const userAgent = navigator.userAgent.toLowerCase();
        const teslaIndicators = [
            'tesla',
            'qtcarplay',
            'carplay',
            'automotive',
            'vehicle'
        ];
        
        // 检查User Agent
        const hasIndicator = teslaIndicators.some(indicator => 
            userAgent.includes(indicator)
        );
        
        // 检查屏幕尺寸（特斯拉车机通常是特定分辨率）
        const isCarScreen = (
            (screen.width === 1920 && screen.height === 1200) || // Model S/X
            (screen.width === 1440 && screen.height === 900) ||  // Model 3/Y
            (screen.width === 1280 && screen.height === 800)     // 其他车机
        );
        
        // 检查是否在车机浏览器中
        const isCarBrowser = (
            !window.chrome || // 非标准Chrome
            window.navigator.webdriver || // WebDriver环境
            window.navigator.platform.includes('Linux') // 车机通常基于Linux
        );
        
        return hasIndicator || (isCarScreen && isCarBrowser);
    }

    init() {
        // 初始化特斯拉适配功能
        this.setupDrivingDetection();
        this.setupVideoInterception();
        this.setupLocationMocking();
        this.setupUserAgentMasking();
        this.setupTouchOptimization();
        this.setupSafetyOverrides();
        
        // 监听页面变化
        this.observePageChanges();
        
        console.log('特斯拉车机适配初始化完成');
    }

    setupDrivingDetection() {
        // 模拟静止状态，绕过行车检测
        if (navigator.geolocation) {
            const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
            const originalWatchPosition = navigator.geolocation.watchPosition;
            
            navigator.geolocation.getCurrentPosition = (success, error, options) => {
                // 返回模拟的静止位置
                const mockPosition = {
                    coords: {
                        latitude: 37.7749,
                        longitude: -122.4194,
                        accuracy: 10,
                        altitude: null,
                        altitudeAccuracy: null,
                        heading: null,
                        speed: 0 // 关键：速度为0表示静止
                    },
                    timestamp: Date.now()
                };
                
                if (success) {
                    success(mockPosition);
                }
            };
            
            navigator.geolocation.watchPosition = (success, error, options) => {
                // 持续返回静止状态
                const watchId = setInterval(() => {
                    const mockPosition = {
                        coords: {
                            latitude: 37.7749,
                            longitude: -122.4194,
                            accuracy: 10,
                            altitude: null,
                            altitudeAccuracy: null,
                            heading: null,
                            speed: 0
                        },
                        timestamp: Date.now()
                    };
                    
                    if (success) {
                        success(mockPosition);
                    }
                }, 1000);
                
                return watchId;
            };
        }
    }

    setupVideoInterception() {
        // 拦截并修改视频元素的行为
        const originalCreateElement = document.createElement;
        
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);
            
            if (tagName.toLowerCase() === 'video') {
                window.teslaAdapter.enhanceVideoElement(element);
            }
            
            return element;
        };
        
        // 处理已存在的视频元素
        document.addEventListener('DOMContentLoaded', () => {
            const videos = document.querySelectorAll('video');
            videos.forEach(video => this.enhanceVideoElement(video));
        });
    }

    enhanceVideoElement(video) {
        this.videoElements.add(video);
        
        // 强制设置视频属性以绕过限制
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x5-playsinline', 'true');
        video.setAttribute('x5-video-player-type', 'h5');
        video.setAttribute('x5-video-player-fullscreen', 'true');
        
        // 移除可能的行车限制
        video.removeAttribute('controls');
        
        // 监听视频事件
        video.addEventListener('loadstart', () => {
            this.handleVideoLoad(video);
        });
        
        video.addEventListener('error', (e) => {
            this.handleVideoError(video, e);
        });
        
        // 强制播放策略
        const originalPlay = video.play;
        video.play = function() {
            // 移除任何可能的播放限制
            this.muted = false; // 特斯拉车机通常允许音频
            
            return originalPlay.call(this).catch(error => {
                console.warn('视频播放被阻止，尝试静音播放:', error);
                this.muted = true;
                return originalPlay.call(this);
            });
        };
    }

    handleVideoLoad(video) {
        // 视频加载时的处理
        console.log('视频开始加载，应用特斯拉优化');
        
        // 设置最佳播放参数
        video.preload = 'auto';
        video.crossOrigin = 'anonymous';
        
        // 优化缓冲策略
        if (video.buffered && video.buffered.length === 0) {
            // 预加载一些数据
            video.load();
        }
    }

    handleVideoError(video, error) {
        console.warn('视频播放错误，尝试恢复:', error);
        
        // 尝试重新加载
        setTimeout(() => {
            video.load();
        }, 1000);
    }

    setupLocationMocking() {
        // 模拟GPS信号，让系统认为车辆静止
        Object.defineProperty(navigator, 'geolocation', {
            value: {
                getCurrentPosition: (success, error, options) => {
                    const position = {
                        coords: {
                            latitude: 37.7749,
                            longitude: -122.4194,
                            accuracy: 10,
                            altitude: 0,
                            altitudeAccuracy: 10,
                            heading: 0,
                            speed: 0 // 始终返回速度为0
                        },
                        timestamp: Date.now()
                    };
                    success && success(position);
                },
                watchPosition: (success, error, options) => {
                    return setInterval(() => {
                        const position = {
                            coords: {
                                latitude: 37.7749,
                                longitude: -122.4194,
                                accuracy: 10,
                                altitude: 0,
                                altitudeAccuracy: 10,
                                heading: 0,
                                speed: 0
                            },
                            timestamp: Date.now()
                        };
                        success && success(position);
                    }, 1000);
                },
                clearWatch: (id) => {
                    clearInterval(id);
                }
            },
            configurable: false,
            writable: false
        });
    }

    setupUserAgentMasking() {
        // 修改User Agent以避免被识别为车机
        const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        
        Object.defineProperty(navigator, 'userAgent', {
            value: desktopUA,
            configurable: false,
            writable: false
        });
        
        // 同时修改其他可能暴露车机身份的属性
        Object.defineProperty(navigator, 'platform', {
            value: 'Win32',
            configurable: false,
            writable: false
        });
    }

    setupTouchOptimization() {
        // 优化触摸交互，适配车机大屏
        const style = document.createElement('style');
        style.textContent = `
            /* 特斯拉车机优化样式 */
            .tesla-optimized {
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
            }
            
            /* 增大触摸目标 */
            button, .btn, a {
                min-height: 44px !important;
                min-width: 44px !important;
                padding: 12px 16px !important;
            }
            
            /* 优化视频播放器 */
            video {
                width: 100% !important;
                height: auto !important;
                object-fit: contain !important;
            }
            
            /* 隐藏可能触发限制的元素 */
            .driving-warning,
            .safety-notice,
            .vehicle-restriction {
                display: none !important;
            }
        `;
        
        document.head.appendChild(style);
        document.body.classList.add('tesla-optimized');
    }

    setupSafetyOverrides() {
        // 绕过安全限制（仅在静止时使用）
        
        // 拦截可能的限制检查
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            // 过滤掉可能触发行车限制的事件
            const restrictedEvents = ['devicemotion', 'deviceorientation', 'accelerometer'];
            
            if (restrictedEvents.includes(type)) {
                console.log('拦截限制事件:', type);
                return; // 不添加这些事件监听器
            }
            
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        // 模拟传感器数据
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', (e) => {
                // 阻止原始事件，发送静止状态的模拟数据
                e.stopImmediatePropagation();
                
                const mockEvent = new DeviceMotionEvent('devicemotion', {
                    acceleration: { x: 0, y: 0, z: 0 },
                    accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 },
                    rotationRate: { alpha: 0, beta: 0, gamma: 0 },
                    interval: 16
                });
                
                window.dispatchEvent(mockEvent);
            }, true);
        }
    }

    observePageChanges() {
        // 监听页面变化，确保新加载的内容也被适配
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 处理新添加的视频元素
                        const videos = node.querySelectorAll ? node.querySelectorAll('video') : [];
                        videos.forEach(video => this.enhanceVideoElement(video));
                        
                        if (node.tagName === 'VIDEO') {
                            this.enhanceVideoElement(node);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.observers.set('pageChanges', observer);
    }

    // 强制启用视频播放
    forceEnableVideo() {
        this.videoElements.forEach(video => {
            video.muted = false;
            video.autoplay = true;
            video.controls = true;
            
            // 尝试播放
            video.play().catch(error => {
                console.warn('强制播放失败，尝试其他方法:', error);
                
                // 尝试用户交互后播放
                const playOnInteraction = () => {
                    video.play();
                    document.removeEventListener('click', playOnInteraction);
                    document.removeEventListener('touchstart', playOnInteraction);
                };
                
                document.addEventListener('click', playOnInteraction);
                document.addEventListener('touchstart', playOnInteraction);
            });
        });
    }

    // 获取适配状态
    getStatus() {
        return {
            isTesla: this.isTesla,
            isDriving: this.isDriving,
            videoCount: this.videoElements.size,
            adaptationsActive: this.isTesla
        };
    }

    // 手动切换驾驶状态（用于测试）
    toggleDrivingMode(driving) {
        this.isDriving = driving;
        console.log('驾驶状态切换为:', driving ? '行驶中' : '静止');
        
        if (!driving) {
            // 静止时启用所有功能
            this.forceEnableVideo();
        }
    }

    // 清理资源
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        this.videoElements.clear();
    }
}

// 创建全局特斯拉适配器实例
window.teslaAdapter = new TeslaAdapter();

// 暴露一些有用的方法
window.forceTeslaMode = () => {
    window.teslaAdapter.isTesla = true;
    window.teslaAdapter.init();
};

window.getTeslaStatus = () => window.teslaAdapter.getStatus();
window.toggleDriving = (driving) => window.teslaAdapter.toggleDrivingMode(driving);

// 在页面加载完成后自动启用
document.addEventListener('DOMContentLoaded', () => {
    if (window.teslaAdapter.isTesla) {
        console.log('特斯拉车机模式已激活');
        
        // 添加调试信息
        const debugInfo = document.createElement('div');
        debugInfo.id = 'tesla-debug';
        debugInfo.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 9999;
            display: none;
        `;
        debugInfo.innerHTML = '特斯拉模式已启用';
        document.body.appendChild(debugInfo);
        
        // 双击显示调试信息
        let clickCount = 0;
        document.addEventListener('click', () => {
            clickCount++;
            setTimeout(() => {
                if (clickCount === 2) {
                    debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
                }
                clickCount = 0;
            }, 300);
        });
    }
});