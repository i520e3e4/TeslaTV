// 搜索结果优化器
// 提供智能排序和过滤功能，提高搜索结果的准确性

class SearchOptimizer {
    constructor() {
        // 配置参数
        this.config = {
            // 权重配置
            weights: {
                exactMatch: 100,        // 完全匹配
                startsWith: 80,         // 开头匹配
                contains: 60,           // 包含匹配
                fuzzyMatch: 40,         // 模糊匹配
                yearMatch: 20,          // 年份匹配
                typeMatch: 15,          // 类型匹配
                actorMatch: 10,         // 演员匹配
                directorMatch: 10       // 导演匹配
            },
            // 过滤配置
            filters: {
                minScore: 10,           // 最低分数阈值
                maxResults: 500,        // 最大结果数
                duplicateThreshold: 0.8 // 重复内容阈值
            }
        };
    }

    /**
     * 优化搜索结果
     * @param {Array} results - 原始搜索结果
     * @param {string} query - 搜索关键词
     * @returns {Array} 优化后的搜索结果
     */
    optimizeResults(results, query) {
        if (!results || !Array.isArray(results) || results.length === 0) {
            return [];
        }

        // 1. 计算每个结果的相关性分数
        const scoredResults = this.calculateRelevanceScores(results, query);
        
        // 2. 过滤低分结果
        const filteredResults = this.filterLowScoreResults(scoredResults);
        
        // 3. 去重处理
        const deduplicatedResults = this.removeDuplicates(filteredResults);
        
        // 4. 按分数排序
        const sortedResults = this.sortByRelevance(deduplicatedResults);
        
        // 5. 限制结果数量
        return sortedResults.slice(0, this.config.filters.maxResults);
    }

    /**
     * 计算相关性分数
     */
    calculateRelevanceScores(results, query) {
        const normalizedQuery = this.normalizeText(query);
        const queryTerms = this.extractKeywords(normalizedQuery);
        
        return results.map(item => {
            const score = this.calculateItemScore(item, normalizedQuery, queryTerms);
            return {
                ...item,
                relevanceScore: score,
                matchDetails: this.getMatchDetails(item, normalizedQuery, queryTerms)
            };
        });
    }

    /**
     * 计算单个项目的分数
     */
    calculateItemScore(item, query, queryTerms) {
        let totalScore = 0;
        const title = this.normalizeText(item.vod_name || '');
        const actor = this.normalizeText(item.vod_actor || '');
        const director = this.normalizeText(item.vod_director || '');
        const content = this.normalizeText(item.vod_content || '');
        const year = item.vod_year || '';
        const type = this.normalizeText(item.type_name || '');

        // 标题匹配（最重要）
        totalScore += this.calculateTextScore(title, query, queryTerms, 3.0);
        
        // 演员匹配
        totalScore += this.calculateTextScore(actor, query, queryTerms, 1.5);
        
        // 导演匹配
        totalScore += this.calculateTextScore(director, query, queryTerms, 1.2);
        
        // 类型匹配
        totalScore += this.calculateTextScore(type, query, queryTerms, 1.0);
        
        // 内容描述匹配
        totalScore += this.calculateTextScore(content, query, queryTerms, 0.5);
        
        // 年份匹配
        if (year && query.includes(year)) {
            totalScore += this.config.weights.yearMatch;
        }
        
        // 质量加分（根据来源可靠性）
        totalScore += this.getSourceQualityBonus(item.source_code);
        
        return Math.round(totalScore);
    }

    /**
     * 计算文本匹配分数
     */
    calculateTextScore(text, query, queryTerms, multiplier = 1.0) {
        if (!text) return 0;
        
        let score = 0;
        
        // 完全匹配
        if (text === query) {
            score += this.config.weights.exactMatch;
        }
        // 开头匹配
        else if (text.startsWith(query)) {
            score += this.config.weights.startsWith;
        }
        // 包含匹配
        else if (text.includes(query)) {
            score += this.config.weights.contains;
        }
        
        // 关键词匹配
        queryTerms.forEach(term => {
            if (text.includes(term)) {
                score += this.config.weights.fuzzyMatch * (term.length / query.length);
            }
        });
        
        // 字符相似度匹配
        const similarity = this.calculateSimilarity(text, query);
        if (similarity > 0.6) {
            score += this.config.weights.fuzzyMatch * similarity;
        }
        
        return score * multiplier;
    }

    /**
     * 文本标准化
     */
    normalizeText(text) {
        if (!text) return '';
        return text.toLowerCase()
            .replace(/[\s\-_\.]+/g, '') // 移除空格、连字符、下划线、点
            .replace(/[（）()\[\]【】]/g, '') // 移除括号
            .replace(/第.*?季|第.*?部|第.*?集/g, '') // 移除季数、部数信息
            .trim();
    }

    /**
     * 提取关键词
     */
    extractKeywords(text) {
        if (!text) return [];
        
        // 分割文本并过滤短词
        const words = text.split(/[\s\-_\.]+/)
            .filter(word => word.length >= 2)
            .filter(word => !this.isStopWord(word));
            
        return [...new Set(words)]; // 去重
    }

    /**
     * 判断是否为停用词
     */
    isStopWord(word) {
        const stopWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'];
        return stopWords.includes(word);
    }

    /**
     * 计算字符串相似度
     */
    calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * 计算编辑距离
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * 获取来源质量加分
     */
    getSourceQualityBonus(sourceCode) {
        const qualityMap = {
            'tyyszy': 15,
            'dyttzy': 12,
            'bfzy': 10,
            'ruyi': 8,
            'custom': 5
        };
        return qualityMap[sourceCode] || 0;
    }

    /**
     * 过滤低分结果
     */
    filterLowScoreResults(results) {
        return results.filter(item => 
            item.relevanceScore >= this.config.filters.minScore
        );
    }

    /**
     * 去重处理
     */
    removeDuplicates(results) {
        const seen = new Map();
        const filtered = [];
        
        for (const item of results) {
            const normalizedTitle = this.normalizeText(item.vod_name || '');
            const key = `${normalizedTitle}_${item.vod_year || ''}`;
            
            if (!seen.has(key)) {
                seen.set(key, item);
                filtered.push(item);
            } else {
                // 如果发现重复，保留分数更高的
                const existing = seen.get(key);
                if (item.relevanceScore > existing.relevanceScore) {
                    const index = filtered.indexOf(existing);
                    if (index > -1) {
                        filtered[index] = item;
                        seen.set(key, item);
                    }
                }
            }
        }
        
        return filtered;
    }

    /**
     * 按相关性排序
     */
    sortByRelevance(results) {
        return results.sort((a, b) => {
            // 首先按分数排序
            if (b.relevanceScore !== a.relevanceScore) {
                return b.relevanceScore - a.relevanceScore;
            }
            
            // 分数相同时，按年份排序（新的在前）
            const yearA = parseInt(a.vod_year) || 0;
            const yearB = parseInt(b.vod_year) || 0;
            if (yearB !== yearA) {
                return yearB - yearA;
            }
            
            // 最后按名称排序
            return (a.vod_name || '').localeCompare(b.vod_name || '');
        });
    }

    /**
     * 获取匹配详情
     */
    getMatchDetails(item, query, queryTerms) {
        const details = {
            titleMatch: false,
            actorMatch: false,
            directorMatch: false,
            yearMatch: false,
            typeMatch: false
        };
        
        const title = this.normalizeText(item.vod_name || '');
        const actor = this.normalizeText(item.vod_actor || '');
        const director = this.normalizeText(item.vod_director || '');
        const year = item.vod_year || '';
        const type = this.normalizeText(item.type_name || '');
        
        details.titleMatch = title.includes(query) || queryTerms.some(term => title.includes(term));
        details.actorMatch = actor.includes(query) || queryTerms.some(term => actor.includes(term));
        details.directorMatch = director.includes(query) || queryTerms.some(term => director.includes(term));
        details.yearMatch = year && query.includes(year);
        details.typeMatch = type.includes(query) || queryTerms.some(term => type.includes(term));
        
        return details;
    }

    /**
     * 获取搜索建议
     */
    getSearchSuggestions(query, results) {
        const suggestions = [];
        
        if (results.length === 0) {
            suggestions.push('尝试使用更简短的关键词');
            suggestions.push('检查关键词拼写是否正确');
            suggestions.push('尝试使用影片的别名或英文名');
        } else if (results.length > 100) {
            suggestions.push('结果较多，建议添加年份或类型进行筛选');
            suggestions.push('使用更具体的关键词缩小搜索范围');
        }
        
        return suggestions;
    }
}

// 创建全局实例
window.searchOptimizer = new SearchOptimizer();

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchOptimizer;
}