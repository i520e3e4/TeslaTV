// API资源自动管理系统
// 负责搜集、检测和更新第三方API资源

class APIManager {
    constructor() {
        this.apiSources = new Map();
        this.qualityScores = new Map();
        this.lastUpdateTime = localStorage.getItem('apiLastUpdate') || 0;
        this.updateInterval = 7 * 24 * 60 * 60 * 1000; // 7天更新一次
        this.testTimeout = 10000; // 10秒超时
        this.maxConcurrentTests = 5; // 最大并发测试数
        
        // API发现源列表 - 这些是已知的API聚合站点
        this.discoveryUrls = [
            'https://raw.githubusercontent.com/yourname/api-list/main/apis.json',
            'https://api.github.com/repos/yourname/video-apis/contents/list.json',
            // 可以添加更多API发现源
        ];
        
        this.init();
    }

    async init() {
        // 加载已保存的API源
        await this.loadSavedAPIs();
        
        // 检查是否需要更新
        if (this.shouldUpdate()) {
            console.log('开始自动更新API资源...');
            await this.updateAPISources();
        }
        
        // 定期检查更新
        this.scheduleNextUpdate();
    }

    shouldUpdate() {
        const now = Date.now();
        return (now - this.lastUpdateTime) > this.updateInterval;
    }

    async loadSavedAPIs() {
        try {
            const savedAPIs = localStorage.getItem('discoveredAPIs');
            if (savedAPIs) {
                const apis = JSON.parse(savedAPIs);
                for (const [key, value] of Object.entries(apis)) {
                    this.apiSources.set(key, value);
                }
            }
            
            const savedScores = localStorage.getItem('apiQualityScores');
            if (savedScores) {
                const scores = JSON.parse(savedScores);
                for (const [key, value] of Object.entries(scores)) {
                    this.qualityScores.set(key, value);
                }
            }
        } catch (error) {
            console.error('加载已保存的API失败:', error);
        }
    }

    async saveAPIs() {
        try {
            const apisObj = Object.fromEntries(this.apiSources);
            const scoresObj = Object.fromEntries(this.qualityScores);
            
            localStorage.setItem('discoveredAPIs', JSON.stringify(apisObj));
            localStorage.setItem('apiQualityScores', JSON.stringify(scoresObj));
            localStorage.setItem('apiLastUpdate', Date.now().toString());
        } catch (error) {
            console.error('保存API失败:', error);
        }
    }

    async updateAPISources() {
        console.log('开始搜集新的API资源...');
        
        // 从多个发现源获取API列表
        const discoveredAPIs = await this.discoverAPIs();
        
        // 测试所有API的质量
        await this.testAPIQuality(discoveredAPIs);
        
        // 更新API_SITES配置
        this.updateGlobalAPISites();
        
        // 保存结果
        await this.saveAPIs();
        
        console.log(`API更新完成，发现 ${this.apiSources.size} 个可用API`);
    }

    async discoverAPIs() {
        const discoveredAPIs = new Set();
        
        // 从GitHub等源搜集API列表
        for (const url of this.discoveryUrls) {
            try {
                const response = await this.fetchWithTimeout(url, this.testTimeout);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        data.forEach(api => {
                            if (api.url && api.name) {
                                discoveredAPIs.add({
                                    url: api.url,
                                    name: api.name,
                                    adult: api.adult || false,
                                    source: 'discovered'
                                });
                            }
                        });
                    }
                }
            } catch (error) {
                console.warn(`从 ${url} 获取API列表失败:`, error);
            }
        }
        
        // 使用网络爬虫技术搜集更多API
        const crawledAPIs = await this.crawlForAPIs();
        crawledAPIs.forEach(api => discoveredAPIs.add(api));
        
        return Array.from(discoveredAPIs);
    }

    async crawlForAPIs() {
        // 这里可以实现更复杂的API发现逻辑
        // 例如搜索已知的API模式、检查常见的API端点等
        const patterns = [
            '/api.php/provide/vod',
            '/api/v1/video',
            '/provide/vod',
        ];
        
        const commonDomains = [
            // 这里可以添加一些已知的视频API域名模式
            // 注意：实际使用时需要遵守相关网站的robots.txt和使用条款
        ];
        
        const discoveredAPIs = [];
        
        // 实现API发现逻辑
        // 这里只是示例，实际实现需要更复杂的逻辑
        
        return discoveredAPIs;
    }

    async testAPIQuality(apis) {
        console.log(`开始测试 ${apis.length} 个API的质量...`);
        
        // 分批测试，避免过多并发请求
        const batches = this.chunkArray(apis, this.maxConcurrentTests);
        
        for (const batch of batches) {
            const promises = batch.map(api => this.testSingleAPI(api));
            await Promise.allSettled(promises);
        }
    }

    async testSingleAPI(api) {
        try {
            const startTime = Date.now();
            const score = await this.calculateAPIScore(api);
            const responseTime = Date.now() - startTime;
            
            if (score > 60) { // 只保留质量分数大于60的API
                const apiKey = this.generateAPIKey(api.url);
                this.apiSources.set(apiKey, {
                    api: api.url,
                    name: api.name,
                    adult: api.adult,
                    source: api.source,
                    lastTested: Date.now(),
                    responseTime: responseTime
                });
                this.qualityScores.set(apiKey, score);
                
                console.log(`API ${api.name} 测试通过，质量分数: ${score}，响应时间: ${responseTime}ms`);
            } else {
                console.log(`API ${api.name} 质量不达标，分数: ${score}`);
            }
        } catch (error) {
            console.warn(`测试API ${api.name} 失败:`, error);
        }
    }

    async calculateAPIScore(api) {
        let score = 0;
        
        try {
            // 测试API响应速度
            const startTime = Date.now();
            const testUrl = `${api.url}?ac=videolist&wd=测试`;
            
            const response = await this.fetchWithTimeout(
                PROXY_URL + encodeURIComponent(testUrl),
                this.testTimeout
            );
            
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
                score += 20; // 基础可用性分数
                
                // 响应速度评分 (大幅提高权重，优先低延迟)
                if (responseTime < 1000) score += 50; // 1秒内响应，最高分
                else if (responseTime < 2000) score += 40; // 2秒内响应
                else if (responseTime < 3000) score += 25; // 3秒内响应
                else if (responseTime < 5000) score += 15; // 5秒内响应
                else if (responseTime < 8000) score += 5;  // 8秒内响应，低分
                
                try {
                    const data = await response.json();
                    
                    // 数据质量评分
                    if (data && data.list && Array.isArray(data.list)) {
                        score += 15;
                        
                        // 内容数量评分
                        if (data.list.length > 20) score += 15; // 提高内容数量要求
                        else if (data.list.length > 10) score += 10;
                        else if (data.list.length > 5) score += 5;
                        
                        // 数据完整性和画质评分
                        const sampleItem = data.list[0];
                        if (sampleItem && sampleItem.vod_name && sampleItem.vod_id) {
                            score += 10;
                            
                            // 检查是否有高清标识
                            const name = sampleItem.vod_name || '';
                            const remarks = sampleItem.vod_remarks || '';
                            const content = (name + remarks).toLowerCase();
                            
                            // 画质评分 (优先高画质)
                            if (content.includes('4k') || content.includes('2160p')) {
                                score += 20; // 4K最高分
                            } else if (content.includes('1080p') || content.includes('fhd')) {
                                score += 15; // 1080p高分
                            } else if (content.includes('720p') || content.includes('hd')) {
                                score += 10; // 720p中等分
                            } else if (content.includes('480p') || content.includes('sd')) {
                                score += 5;  // 480p低分
                            }
                            
                            // 检查播放源质量
                            if (sampleItem.vod_play_url) {
                                const playUrl = sampleItem.vod_play_url.toLowerCase();
                                if (playUrl.includes('m3u8')) {
                                    score += 10; // M3U8格式加分
                                }
                                if (playUrl.includes('cdn') || playUrl.includes('cache')) {
                                    score += 5; // CDN加速加分
                                }
                            }
                        }
                    }
                } catch (jsonError) {
                    console.warn('API返回数据格式错误:', jsonError);
                }
            }
        } catch (error) {
            console.warn('API测试失败:', error);
        }
        
        return score;
    }

    async fetchWithTimeout(url, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    generateAPIKey(url) {
        // 从URL生成唯一键名
        const domain = new URL(url).hostname;
        return domain.replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    }

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    updateGlobalAPISites() {
        // 更新全局API_SITES配置
        const highQualityAPIs = {};
        
        // 按质量分数和响应时间排序，只保留前20个最好的API
        const sortedAPIs = Array.from(this.apiSources.entries())
            .filter(([key, api]) => (this.qualityScores.get(key) || 0) > 70) // 提高质量门槛
            .sort((a, b) => {
                const scoreA = this.qualityScores.get(a[0]) || 0;
                const scoreB = this.qualityScores.get(b[0]) || 0;
                // 首先按评分排序
                if (scoreB !== scoreA) {
                    return scoreB - scoreA;
                }
                // 评分相同时，按响应时间排序（越快越好）
                const timeA = a[1].responseTime || 9999;
                const timeB = b[1].responseTime || 9999;
                return timeA - timeB;
            })
            .slice(0, 20);
        
        sortedAPIs.forEach(([key, api]) => {
            highQualityAPIs[key] = {
                api: api.api,
                name: `${api.name} (${this.qualityScores.get(key)}分)`,
                adult: api.adult,
                quality: this.qualityScores.get(key)
            };
        });
        
        // 合并到全局配置
        if (window.extendAPISites) {
            window.extendAPISites(highQualityAPIs);
        }
        
        console.log('已更新全局API配置，新增', Object.keys(highQualityAPIs).length, '个高质量API');
    }

    scheduleNextUpdate() {
        // 计算下次更新时间
        const nextUpdate = this.updateInterval - (Date.now() - this.lastUpdateTime);
        
        if (nextUpdate > 0) {
            setTimeout(() => {
                this.updateAPISources();
                this.scheduleNextUpdate();
            }, nextUpdate);
            
            console.log(`下次API更新时间: ${new Date(Date.now() + nextUpdate).toLocaleString()}`);
        }
    }

    // 手动触发更新
    async forceUpdate() {
        console.log('手动触发API更新...');
        await this.updateAPISources();
    }

    // 获取API统计信息
    getStats() {
        return {
            totalAPIs: this.apiSources.size,
            averageQuality: Array.from(this.qualityScores.values()).reduce((a, b) => a + b, 0) / this.qualityScores.size,
            lastUpdate: new Date(parseInt(this.lastUpdateTime)).toLocaleString(),
            nextUpdate: new Date(parseInt(this.lastUpdateTime) + this.updateInterval).toLocaleString()
        };
    }

    // 移除低质量API
    cleanupLowQualityAPIs() {
        const toRemove = [];
        
        this.qualityScores.forEach((score, key) => {
            if (score < 50) {
                toRemove.push(key);
            }
        });
        
        toRemove.forEach(key => {
            this.apiSources.delete(key);
            this.qualityScores.delete(key);
        });
        
        if (toRemove.length > 0) {
            console.log(`清理了 ${toRemove.length} 个低质量API`);
            this.saveAPIs();
            this.updateGlobalAPISites();
        }
    }
}

// 创建全局API管理器实例
window.apiManager = new APIManager();

// 暴露一些有用的方法到全局
window.forceUpdateAPIs = () => window.apiManager.forceUpdate();
window.getAPIStats = () => window.apiManager.getStats();
window.cleanupAPIs = () => window.apiManager.cleanupLowQualityAPIs();