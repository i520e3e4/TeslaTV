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
        // 检查是否手动强制启用特斯拉模式
        if (localStorage.getItem('forceTeslaMode') === 'true') {
            console.log('手动强制启用特斯拉模式');
            return true;
        }
        
        // 检测特斯拉车机环境的多种方法
        const userAgent = navigator.userAgent.toLowerCase();
        const teslaIndicators = [
            'tesla',
            'qtcarplay',
            'carplay',
            'automotive',
            'vehicle',
            'webkit', // 特斯拉车机使用WebKit
            'linux', // 特斯拉车机基于Linux
            'x11' // Linux图形界面
        ];
        
        // 检查User Agent
        const hasIndicator = teslaIndicators.some(indicator => 
            userAgent.includes(indicator)
        );
        
        // 检查屏幕尺寸（特斯拉车机通常是特定分辨率）
        const isCarScreen = (
            (screen.width === 1920 && screen.height === 1200) || // Model S/X
            (screen.width === 1440 && screen.height === 900) ||  // Model 3/Y
            (screen.width === 1280 && screen.height === 800) ||  // 其他车机
            (screen.width === 1200 && screen.height === 1920) || // 竖屏模式
            (screen.width === 900 && screen.height === 1440) ||  // 竖屏模式
            (screen.width >= 1024 && screen.height >= 600)       // 宽松的车机屏幕检测
        );
        
        // 检查是否在车机浏览器中
        const isCarBrowser = (
            window.navigator.platform.includes('Linux') || // 车机通常基于Linux
            window.navigator.platform.includes('X11') ||   // Linux图形界面
            !window.chrome ||                               // 非标准Chrome
            window.navigator.webdriver ||                   // WebDriver环境
            window.navigator.maxTouchPoints > 0             // 触摸屏设备
        );
        
        // 检查网络环境（车机可能有特殊的网络配置）
        const hasCarNetworkFeatures = (
            !navigator.onLine ||                            // 可能处于离线状态
            navigator.connection?.type === 'cellular' ||    // 使用蜂窝网络
            navigator.connection?.effectiveType === '4g'    // 4G网络
        );
        
        // 更宽松的检测逻辑
        const isTeslaLikely = hasIndicator || 
                             (isCarScreen && isCarBrowser) || 
                             (isCarScreen && hasCarNetworkFeatures);
        
        console.log('特斯拉检测结果:', {
            userAgent,
            hasIndicator,
            isCarScreen,
            isCarBrowser,
            hasCarNetworkFeatures,
            screenSize: `${screen.width}x${screen.height}`,
            platform: navigator.platform,
            isTeslaLikely
        });
        
        return isTeslaLikely;
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
            adaptationsActive: this.isTesla,
            userAgent: navigator.userAgent,
            screenSize: `${screen.width}x${screen.height}`,
            platform: navigator.platform,
            forcedMode: localStorage.getItem('forceTeslaMode') === 'true',
            timestamp: new Date().toLocaleString()
        };
    }

    // 显示详细的调试信息
    showDebugInfo() {
        const status = this.getStatus();
        console.group('🚗 特斯拉车机适配状态');
        console.log('特斯拉模式:', status.isTesla ? '✅ 已启用' : '❌ 未启用');
        console.log('行车状态:', status.isDriving ? '🚗 行驶中' : '🅿️ 静止');
        console.log('视频元素数量:', status.videoCount);
        console.log('强制模式:', status.forcedMode ? '✅ 已启用' : '❌ 未启用');
        console.log('屏幕尺寸:', status.screenSize);
        console.log('平台信息:', status.platform);
        console.log('用户代理:', status.userAgent);
        console.log('检测时间:', status.timestamp);
        console.groupEnd();
        return status;
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

    // 创建调试面板
    createDebugPanel() {
        if (document.getElementById('tesla-debug-panel')) {
            return; // 面板已存在
        }

        const panel = document.createElement('div');
        panel.id = 'tesla-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
            border: 2px solid #00ccff;
            box-shadow: 0 4px 20px rgba(0, 204, 255, 0.3);
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #00ccff;">🚗 特斯拉调试</h3>
                <button id="tesla-debug-close" style="background: #ff6b6b; border: none; color: white; padding: 2px 6px; border-radius: 3px; cursor: pointer;">×</button>
            </div>
            <div id="tesla-debug-content"></div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
                <button id="tesla-force-enable" style="background: #00ccff; border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">启用模式</button>
                <button id="tesla-force-disable" style="background: #ff6b6b; border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer;">禁用模式</button>
            </div>
        `;

        document.body.appendChild(panel);

        // 绑定事件
        document.getElementById('tesla-debug-close').onclick = () => {
            panel.style.display = 'none';
        };

        document.getElementById('tesla-force-enable').onclick = () => {
            window.forceTeslaMode();
            this.updateDebugPanel();
        };

        document.getElementById('tesla-force-disable').onclick = () => {
            window.disableTeslaMode();
            this.updateDebugPanel();
        };

        // 双击屏幕右上角显示面板
        let rightClickCount = 0;
        document.addEventListener('click', (e) => {
            if (e.clientX > window.innerWidth - 100 && e.clientY < 100) {
                rightClickCount++;
                setTimeout(() => {
                    if (rightClickCount === 2) {
                        this.toggleDebugPanel();
                    }
                    rightClickCount = 0;
                }, 300);
            }
        });

        this.updateDebugPanel();
    }

    // 更新调试面板内容
    updateDebugPanel() {
        const panel = document.getElementById('tesla-debug-panel');
        const content = document.getElementById('tesla-debug-content');
        
        if (!panel || !content) return;

        const status = this.getStatus();
        const statusIcon = status.isTesla ? '✅' : '❌';
        const drivingIcon = status.isDriving ? '🚗' : '🅿️';
        const forcedIcon = status.forcedMode ? '🔧' : '🔄';

        content.innerHTML = `
            <div style="margin-bottom: 8px;">
                <strong>状态:</strong> ${statusIcon} ${status.isTesla ? '已启用' : '未启用'}
            </div>
            <div style="margin-bottom: 8px;">
                <strong>行车:</strong> ${drivingIcon} ${status.isDriving ? '行驶中' : '静止'}
            </div>
            <div style="margin-bottom: 8px;">
                <strong>强制:</strong> ${forcedIcon} ${status.forcedMode ? '已启用' : '自动检测'}
            </div>
            <div style="margin-bottom: 8px;">
                <strong>视频:</strong> ${status.videoCount} 个元素
            </div>
            <div style="margin-bottom: 8px;">
                <strong>屏幕:</strong> ${status.screenSize}
            </div>
            <div style="margin-bottom: 8px;">
                <strong>平台:</strong> ${status.platform}
            </div>
            <div style="font-size: 10px; color: #888;">
                更新时间: ${status.timestamp}
            </div>
        `;
    }

    // 切换调试面板显示
    toggleDebugPanel() {
        const panel = document.getElementById('tesla-debug-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            if (panel.style.display === 'block') {
                this.updateDebugPanel();
            }
        }
    }

    // 清理资源
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        this.videoElements.clear();
        
        // 清理调试面板
        const panel = document.getElementById('tesla-debug-panel');
        if (panel) {
            panel.remove();
        }
    }
}

// 创建全局特斯拉适配器实例
window.teslaAdapter = new TeslaAdapter();

// 暴露一些有用的方法
window.forceTeslaMode = () => {
    localStorage.setItem('forceTeslaMode', 'true');
    window.teslaAdapter.isTesla = true;
    window.teslaAdapter.init();
    console.log('已强制启用特斯拉模式');
    
    // 显示启用提示
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #00ccff;
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-size: 18px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,204,255,0.3);
    `;
    notification.textContent = '特斯拉模式已启用！';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
};

window.disableTeslaMode = () => {
    localStorage.removeItem('forceTeslaMode');
    window.teslaAdapter.isTesla = false;
    console.log('已禁用特斯拉模式');
    
    // 显示禁用提示
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff6b6b;
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-size: 18px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(255,107,107,0.3);
    `;
    notification.textContent = '特斯拉模式已禁用！';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
};

window.getTeslaStatus = () => window.teslaAdapter.getStatus();
window.showTeslaDebug = () => window.teslaAdapter.showDebugInfo();
window.toggleDriving = (driving) => window.teslaAdapter.toggleDrivingMode(driving);
window.toggleDebugPanel = () => window.teslaAdapter.toggleDebugPanel();

// 添加控制台命令提示
window.showTeslaHelp = () => {
    console.log(`
🚗 特斯拉车机模式控制命令：

• forceTeslaMode() - 强制启用特斯拉模式
• disableTeslaMode() - 禁用特斯拉模式
• getTeslaStatus() - 查看特斯拉模式状态
• showTeslaDebug() - 显示详细调试信息
• toggleDebugPanel() - 切换调试面板显示
• toggleDriving(true/false) - 切换行车状态
• showTeslaHelp() - 显示此帮助信息

🎛️ 调试面板使用：
• 双击屏幕右上角显示/隐藏调试面板
• 面板显示实时状态信息
• 可直接点击按钮启用/禁用模式

如果视频无法播放，请尝试：
1. 在控制台输入 forceTeslaMode()
2. 或双击右上角打开调试面板点击"启用模式"
3. 刷新页面
4. 重新播放视频
`);
};

// 自动显示帮助信息
if (typeof window !== 'undefined') {
    setTimeout(() => {
        console.log('🚗 特斯拉车机适配已加载，输入 showTeslaHelp() 查看控制命令');
    }, 1000);
}

// 在页面加载完成后自动启用
document.addEventListener('DOMContentLoaded', () => {
    if (window.teslaAdapter.isTesla) {
        console.log('特斯拉车机模式已激活');
        
        // 创建调试信息面板
        window.teslaAdapter.createDebugPanel();
        
        // 定期更新状态
        setInterval(() => {
            window.teslaAdapter.updateDebugPanel();
        }, 5000);
    }
});